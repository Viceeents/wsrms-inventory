import {
  listTransactions,
  findTransaction,
} from "../models/transactionModel.js";
import { HttpError } from "../middleware/errorMiddleware.js";
export const list = async (req, res) =>
  res.json(await listTransactions(req.query));
export async function details(req, res) {
  const t = await findTransaction(req.params.id);
  if (!t) throw new HttpError(404, "Transaction not found.");
  res.json(t);
}
