import { Router } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import validate from "../middleware/validateRequest.js";
import role from "../middleware/roleMiddleware.js";
import { all, get, run, atomic } from "../config/database.js";
import { HttpError } from "../middleware/errorMiddleware.js";
import { audit } from "../services/auditService.js";

const r = Router();
const channelSchema = z.enum(["team", "announcements", "updates"]);
const idSchema = z.coerce.number().int().positive().max(2147483647);
const fields = `m.id,m.channel,m.title,m.message,m.priority,m.created_at,m.sender_user_id,
  COALESCE(u.name,'Storix') AS sender_name,u.code AS sender_code,
  (m.id > COALESCE(mr.last_read_id,0) AND m.sender_user_id IS DISTINCT FROM ?) AS unread`;
const joins =
  "FROM messages m LEFT JOIN users u ON u.id=m.sender_user_id LEFT JOIN message_reads mr ON mr.channel=m.channel AND mr.user_id=?";

r.get("/unread", async (req, res) => {
  const counts = await all(
    `SELECT m.channel,COUNT(*)::integer AS count ${joins}
    WHERE m.archived_at IS NULL AND m.id>COALESCE(mr.last_read_id,0)
    AND m.sender_user_id IS DISTINCT FROM ? GROUP BY m.channel`,
    req.user.id,
    req.user.id,
  );
  const channels = { team: 0, announcements: 0, updates: 0 };
  for (const row of counts) channels[row.channel] = row.count;
  res.json({
    channels,
    total: Object.values(channels).reduce((a, b) => a + b, 0),
  });
});
r.get("/:channel", async (req, res) => {
  const parsed = z
    .object({ channel: channelSchema, before: idSchema.optional() })
    .safeParse({ channel: req.params.channel, before: req.query.before });
  if (!parsed.success)
    throw new HttpError(
      400,
      "Choose a valid messaging channel and history cursor.",
    );
  const { channel, before } = parsed.data;
  const rows = await all(
    `SELECT ${fields} ${joins} WHERE m.channel=? AND m.archived_at IS NULL
    ${before ? "AND m.id<?" : ""} ORDER BY m.id DESC LIMIT 51`,
    req.user.id,
    req.user.id,
    channel,
    ...(before ? [before] : []),
  );
  res.json({ items: rows.slice(0, 50).reverse(), hasMore: rows.length > 50 });
});
r.post(
  "/:channel/read",
  validate(z.object({ through: idSchema })),
  async (req, res) => {
    const parsed = channelSchema.safeParse(req.params.channel);
    if (!parsed.success) throw new HttpError(400, "Invalid messaging channel.");
    const message = await get(
      "SELECT id FROM messages WHERE id=? AND channel=? AND archived_at IS NULL",
      req.body.through,
      parsed.data,
    );
    if (!message) throw new HttpError(404, "Message not found.");
    await run(
      `INSERT INTO message_reads(user_id,channel,last_read_id) VALUES(?,?,?)
    ON CONFLICT(user_id,channel) DO UPDATE SET last_read_id=GREATEST(message_reads.last_read_id,EXCLUDED.last_read_id)`,
      req.user.id,
      parsed.data,
      message.id,
    );
    res.json({ ok: true });
  },
);
const sendLimit = rateLimit({
  windowMs: 60000,
  limit: 20,
  keyGenerator: (req) => String(req.user.id),
  message: { message: "Please wait a moment before sending more messages." },
});
r.post(
  "/:channel",
  sendLimit,
  validate(
    z.object({
      message: z.string().trim().min(1).max(2000),
      title: z.string().trim().max(100).default(""),
      priority: z.enum(["Normal", "Important", "Urgent"]).default("Normal"),
    }),
  ),
  async (req, res) => {
    const channel = req.params.channel;
    if (!["team", "announcements"].includes(channel))
      throw new HttpError(400, "This channel does not accept messages.");
    if (channel === "announcements" && req.user.role !== "admin")
      throw new HttpError(
        403,
        "Only administrators can publish announcements.",
      );
    if (channel === "announcements" && !req.body.title)
      throw new HttpError(400, "Add an announcement title.");
    const message = await atomic(async () => {
      const row = await get(
        `INSERT INTO messages(channel,sender_user_id,title,message,priority,created_at)
      VALUES(?,?,?,?,?,?) RETURNING id`,
        channel,
        req.user.id,
        channel === "announcements" ? req.body.title : "",
        req.body.message,
        channel === "announcements" ? req.body.priority : "Normal",
        new Date().toISOString(),
      );
      if (channel === "announcements")
        await audit(req.user.id, "ANNOUNCEMENT_PUBLISHED", {
          metadata: { messageId: row.id, priority: req.body.priority },
        });
      return row;
    });
    res.status(201).json(message);
  },
);
r.delete("/announcements/:id", role("admin"), async (req, res) => {
  const parsed = idSchema.safeParse(req.params.id);
  if (!parsed.success) throw new HttpError(400, "Invalid announcement.");
  await atomic(async () => {
    const result = await run(
      "UPDATE messages SET archived_at=? WHERE id=? AND channel='announcements' AND archived_at IS NULL",
      new Date().toISOString(),
      parsed.data,
    );
    if (!result.changes) throw new HttpError(404, "Announcement not found.");
    await audit(req.user.id, "ANNOUNCEMENT_ARCHIVED", {
      metadata: { messageId: parsed.data },
    });
  });
  res.json({ ok: true });
});
export default r;
