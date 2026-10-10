import { Router } from "express";
import { z } from "zod";
import { all, get, run, atomic } from "../config/database.js";
import { tokenHash, readToken } from "../middleware/authMiddleware.js";
import role from "../middleware/roleMiddleware.js";
import validate from "../middleware/validateRequest.js";
import { HttpError } from "../middleware/errorMiddleware.js";
import { audit } from "../services/auditService.js";
import { notify } from "../services/notificationService.js";
import { verifyPassword } from "../utils/password.js";
import {
  databaseHealth,
  createBackup,
  restoreBackup,
} from "../services/backupService.js";
import { validateImage } from "../utils/profileImage.js";
import { highAvailabilityHealth } from "../services/highAvailabilityService.js";
const r = Router();
r.post(
  "/presence/heartbeat",
  validate(z.object({ activity_at: z.string().datetime() })),
  async (req, res) => {
    const now = new Date(),
      activity = new Date(
        Math.min(now.getTime(), Date.parse(req.body.activity_at)),
      );
    const token = tokenHash(readToken(req));
    await atomic(async () => {
      const session = await get(
        "SELECT * FROM sessions WHERE token_hash=?",
        token,
      );
      if (session.last_seen_at && now - new Date(session.last_seen_at) < 45000)
        return;
      const previous = session.last_activity_at
        ? new Date(session.last_activity_at)
        : new Date(0);
      const recent =
        activity > previous ? activity.toISOString() : session.last_activity_at;
      await run(
        "UPDATE sessions SET last_seen_at=?,last_activity_at=? WHERE token_hash=?",
        now.toISOString(),
        recent,
        token,
      );
      await run(
        "UPDATE users SET last_activity_at=? WHERE id=? AND (last_activity_at IS NULL OR last_activity_at<?)",
        recent,
        req.user.id,
        recent,
      );
    });
    res.json({ ok: true, profile_image: req.user.profile_image });
  },
);
r.get("/profile/requests", async (req, res) =>
  res.json(
    await all(
      "SELECT id,status,requested_at,reviewed_at FROM profile_image_requests WHERE user_id=? ORDER BY id DESC LIMIT 20",
      req.user.id,
    ),
  ),
);
r.post(
  "/profile/requests",
  validate(z.object({ image: z.string().max(700000) })),
  async (req, res) => {
    const image = await validateImage(req.body.image);
    if (req.user.role === "admin") {
      await atomic(async () => {
        await run(
          "UPDATE users SET profile_image=? WHERE id=?",
          image,
          req.user.id,
        );
        await run(
          "UPDATE profile_image_requests SET status='Rejected',reviewed_at=?,reviewed_by=? WHERE user_id=? AND status='Pending'",
          new Date().toISOString(),
          req.user.id,
          req.user.id,
        );
        await audit(req.user.id, "PROFILE_IMAGE_CHANGED");
      });
      return res.json({ status: "Saved", profile_image: image });
    }
    const request = await atomic(async () => {
      if (
        await get(
          "SELECT id FROM profile_image_requests WHERE user_id=? AND status='Pending'",
          req.user.id,
        )
      )
        throw new HttpError(409, "A profile image request is already pending.");
      const created = await get(
        "INSERT INTO profile_image_requests(user_id,current_image,requested_image,requested_at) VALUES(?,?,?,?) RETURNING id",
        req.user.id,
        req.user.profile_image,
        image,
        new Date().toISOString(),
      );
      for (const admin of await all(
        "SELECT id FROM users WHERE role='admin' AND active=1 AND suspended=false",
      ))
        await notify(
          "profile_request",
          `${req.user.name} (${req.user.code}) requested a profile picture change.`,
          { userId: admin.id },
        );
      await audit(req.user.id, "PROFILE_IMAGE_REQUESTED", {
        metadata: { requestId: created.id },
      });
      return created;
    });
    res.status(201).json({ ...request, status: "Pending" });
  },
);
r.get("/admin/profile-requests", role("admin", "manager"), async (req, res) =>
  res.json(
    await all(
      "SELECT p.*,u.name,u.code FROM profile_image_requests p JOIN users u ON u.id=p.user_id ORDER BY (p.status='Pending') DESC,p.id DESC LIMIT 100",
    ),
  ),
);
r.post(
  "/admin/profile-requests/:id/review",
  role("admin", "manager"),
  validate(z.object({ status: z.enum(["Approved", "Rejected"]) })),
  async (req, res) => {
    await atomic(async () => {
      const request = await get(
        "SELECT * FROM profile_image_requests WHERE id=?",
        req.params.id,
      );
      if (!request) throw new HttpError(404, "Request not found.");
      if (request.status !== "Pending")
        throw new HttpError(409, "This request has already been reviewed.");
      if (request.user_id === req.user.id)
        throw new HttpError(
          403,
          "Another administrator or manager must review your picture request.",
        );
      if (req.body.status === "Approved")
        await run(
          "UPDATE users SET profile_image=? WHERE id=?",
          request.requested_image,
          request.user_id,
        );
      await run(
        "UPDATE profile_image_requests SET status=?,reviewed_at=?,reviewed_by=? WHERE id=?",
        req.body.status,
        new Date().toISOString(),
        req.user.id,
        request.id,
      );
      await audit(
        req.user.id,
        req.body.status === "Approved"
          ? "PROFILE_IMAGE_APPROVED"
          : "PROFILE_IMAGE_REJECTED",
        { metadata: { requestId: request.id, userId: request.user_id } },
      );
      await notify(
        req.body.status === "Approved"
          ? "profile_approved"
          : "profile_rejected",
        `Your profile picture was ${req.body.status.toLowerCase()}.`,
        {
          userId: request.user_id,
          severity: req.body.status === "Approved" ? "success" : "info",
        },
      );
    });
    res.json({ ok: true, profile_image: req.user.profile_image });
  },
);
r.get("/admin/database", role("admin"), async (req, res) =>
  res.json({
    ...(await databaseHealth()),
    high_availability: await highAvailabilityHealth(),
  }),
);
r.post("/admin/database/backups", role("admin"), async (req, res) => {
  res.status(201).json(await createBackup(req.user.id));
});
r.post(
  "/admin/database/restore",
  role("admin"),
  validate(
    z.object({
      backup_id: z.string().regex(/^[0-9T.Z-]+$/),
      confirmation: z.literal("RESTORE EMERGENCY DATABASE"),
      password: z.string().min(1).max(128),
    }),
  ),
  async (req, res) => {
    const user = await get(
      "SELECT password_hash FROM users WHERE id=?",
      req.user.id,
    );
    if (!verifyPassword(req.body.password, user.password_hash))
      throw new HttpError(403, "Administrator password is incorrect.");
    res.json(await restoreBackup(req.body.backup_id, req.user.id));
  },
);
export default r;
