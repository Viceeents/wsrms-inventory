import { randomBytes } from "node:crypto";
import { get, run, atomic } from "../config/database.js";
import { verifyPassword, hashPassword } from "../utils/password.js";
import { tokenHash, readToken } from "../middleware/authMiddleware.js";
import { env } from "../config/env.js";
import { audit } from "../services/auditService.js";
import { HttpError } from "../middleware/errorMiddleware.js";
const cookieOptions = {
  httpOnly: true,
  sameSite: "strict",
  secure: env.production,
  path: "/",
  maxAge: 8 * 60 * 60 * 1000,
};
export async function login(req, res) {
  const user = await get(
    "SELECT * FROM users WHERE email=? AND active=1",
    req.body.email.toLowerCase(),
  );
  // Always run a password hash to reduce account-discovery timing differences.
  const valid = verifyPassword(
    req.body.password,
    user?.password_hash || hashPassword("unavailable-account"),
  );
  if (!user || !valid)
    throw new HttpError(401, "Email or password is incorrect.");
  const token = randomBytes(32).toString("hex");
  await atomic(async () => {
    await run(
      "DELETE FROM sessions WHERE expires_at<=?",
      new Date().toISOString(),
    );
    await run(
      "INSERT INTO sessions VALUES(?,?,?)",
      tokenHash(token),
      user.id,
      new Date(Date.now() + cookieOptions.maxAge).toISOString(),
    );
    await audit(user.id, "Sign-in");
  });
  const { password_hash, ...safe } = user;
  res.cookie("wsrms_session", token, cookieOptions).json(safe);
}
export async function logout(req, res) {
  await run(
    "DELETE FROM sessions WHERE token_hash=?",
    tokenHash(readToken(req)),
  );
  res
    .clearCookie("wsrms_session", {
      path: "/",
      sameSite: "strict",
      secure: env.production,
    })
    .json({
      ok: true,
    });
}
export const me = (req, res) => res.json(req.user);
