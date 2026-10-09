import { get, run, atomic, nextCode } from "../config/database.js";
import { listUsers } from "../models/userModel.js";
import { hashPassword } from "../utils/password.js";
import { audit } from "../services/auditService.js";
import { HttpError } from "../middleware/errorMiddleware.js";
export const list = async (req, res) =>
  res.json(await listUsers(req.query.archived === "true"));
export async function create(req, res) {
  const id = await atomic(async () => {
    const u = req.body;
    const id = Number(
      (
        await run(
          "INSERT INTO users(code,name,email,password_hash,role,active,created_at) VALUES(?,?,?,?,?,?,?)",
          await nextCode("USR", false),
          u.name,
          u.email,
          hashPassword(u.password),
          u.role,
          u.active,
          new Date().toISOString(),
        )
      ).lastInsertRowid,
    );
    await run("UPDATE users SET suspended=? WHERE id=?", u.suspended, id);
    await audit(req.user.id, "User created", {
      metadata: {
        userId: id,
        name: u.name,
        role: u.role,
      },
    });
    return id;
  });
  res.status(201).json((await listUsers()).find((u) => u.id === id));
}
export async function update(req, res) {
  await atomic(async () => {
    const old = await get("SELECT * FROM users WHERE id=?", req.params.id),
      u = req.body;
    if (!old || old.deleted_at) throw new HttpError(404, "User not found.");
    if (
      old.id === req.user.id &&
      (u.active === 0 || u.suspended || u.role !== "admin")
    )
      throw new HttpError(
        400,
        "You cannot deactivate or demote your own administrator account.",
      );
    if (
      old.active &&
      old.role === "admin" &&
      (u.active === 0 || u.suspended || u.role !== "admin") &&
      (
        await get(
          "SELECT COUNT(*) AS count FROM users WHERE active=1 AND suspended=false AND role='admin'",
        )
      ).count <= 1
    )
      throw new HttpError(409, "Keep at least one active administrator.");
    await run(
      "UPDATE users SET name=?,email=?,role=?,active=?,password_hash=? WHERE id=?",
      u.name,
      u.email,
      u.role,
      u.active,
      u.password ? hashPassword(u.password) : old.password_hash,
      old.id,
    );
    await run("UPDATE users SET suspended=? WHERE id=?", u.suspended, old.id);
    if (u.password || !u.active || u.suspended || u.role !== old.role)
      await run("DELETE FROM sessions WHERE user_id=?", old.id);
    await audit(req.user.id, "USER_STATUS_CHANGED", {
      metadata: {
        userId: old.id,
        before: {
          name: old.name,
          email: old.email,
          role: old.role,
          active: old.active,
          suspended: old.suspended,
        },
        after: {
          name: u.name,
          email: u.email,
          role: u.role,
          active: u.active,
          suspended: u.suspended,
        },
        passwordChanged: Boolean(u.password),
      },
    });
  });
  res.json((await listUsers()).find((u) => u.id === Number(req.params.id)));
}

export async function remove(req, res) {
  if (req.user.role !== "admin")
    throw new HttpError(403, "Administrator permission required.");
  await atomic(async () => {
    const user = await get("SELECT * FROM users WHERE id=?", req.params.id);
    if (!user || user.deleted_at) throw new HttpError(404, "User not found.");
    if (user.id === req.user.id)
      throw new HttpError(
        400,
        "You cannot delete your currently logged-in administrator account.",
      );
    if (
      user.role === "admin" &&
      user.active &&
      !user.suspended &&
      (
        await get(
          "SELECT COUNT(*) AS count FROM users WHERE active=1 AND suspended=false AND deleted_at IS NULL AND role='admin'",
        )
      ).count <= 1
    )
      throw new HttpError(409, "Keep at least one active administrator.");
    await run(
      "UPDATE users SET active=0,deleted_at=? WHERE id=?",
      new Date().toISOString(),
      user.id,
    );
    await run("DELETE FROM sessions WHERE user_id=?", user.id);
    await audit(req.user.id, "USER_DELETED", {
      metadata: {
        administratorCode: req.user.code,
        reason: req.body.reason || null,
        userId: user.id,
        code: user.code,
        name: user.name,
        role: user.role,
      },
    });
  });
  res.json({ ok: true });
}
