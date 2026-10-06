import { get, run, atomic } from "../config/database.js";
import { listCategories } from "../models/categoryModel.js";
import { audit } from "../services/auditService.js";
import { HttpError } from "../middleware/errorMiddleware.js";
export const list = async (req, res) => res.json(await listCategories());
export async function create(req, res) {
  await atomic(async () => {
    const c = req.body;
    const id = Number(
      (
        await run(
          "INSERT INTO categories(name,color,active) VALUES(?,?,?)",
          c.name,
          c.color,
          c.active,
        )
      ).lastInsertRowid,
    );
    await audit(req.user.id, "Category created", {
      metadata: {
        id,
        ...c,
      },
    });
  });
  res.status(201).json(await listCategories());
}
export async function update(req, res) {
  await atomic(async () => {
    const old = await get("SELECT * FROM categories WHERE id=?", req.params.id);
    if (!old) throw new HttpError(404, "Category not found.");
    const c = req.body;
    await run(
      "UPDATE categories SET name=?,color=?,active=? WHERE id=?",
      c.name,
      c.color,
      c.active,
      old.id,
    );
    await audit(req.user.id, "Category updated", {
      metadata: {
        before: old,
        after: c,
      },
    });
  });
  res.json(await listCategories());
}
