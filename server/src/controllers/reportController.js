import { overview, toCsv } from "../services/reportService.js";
import { listParcels } from "../models/parcelModel.js";
import { listTransactions } from "../models/transactionModel.js";
import { HttpError } from "../middleware/errorMiddleware.js";
export const summary = async (req, res) => res.json(await overview());
export async function exportCsv(req, res) {
  if (!["parcels", "transactions", "locations"].includes(req.params.kind))
    throw new HttpError(400, "Choose parcels, transactions, or locations.");
  const data =
    req.params.kind === "parcels"
      ? await listParcels()
      : req.params.kind === "transactions"
        ? await listTransactions()
        : (await overview()).locations;
  res
    .set("Content-Type", "text/csv; charset=utf-8")
    .attachment(`${req.params.kind}.csv`)
    .send(toCsv(data));
}
