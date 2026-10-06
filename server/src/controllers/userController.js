import { get, run, atomic, nextCode } from "../config/database.js";
import { listUsers } from "../models/userModel.js";
import { hashPassword } from "../utils/password.js";
import { audit } from "../services/auditService.js";
import { HttpError } from "../middleware/errorMiddleware.js";
export const list = async (req, res) => res.json(await listUsers());
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
    if (!old) throw new HttpError(404, "User not found.");
    if (old.id === req.user.id && (u.active === 0 || u.role !== "admin"))
      throw new HttpError(
        400,
        "You cannot deactivate or demote your own administrator account.",
      );
    if (
      old.active &&
      old.role === "admin" &&
      (u.active === 0 || u.role !== "admin") &&
      (
        await get(
          "SELECT COUNT(*) AS count FROM users WHERE active=1 AND role='admin'",
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
    if (u.password || !u.active || u.role !== old.role)
      await run("DELETE FROM sessions WHERE user_id=?", old.id);
    await audit(req.user.id, "User updated", {
      metadata: {
        userId: old.id,
        before: {
          name: old.name,
          email: old.email,
          role: old.role,
          active: old.active,
        },
        after: {
          name: u.name,
          email: u.email,
          role: u.role,
          active: u.active,
        },
        passwordChanged: Boolean(u.password),
      },
    });
  });
  res.json((await listUsers()).find((u) => u.id === Number(req.params.id)));
}
