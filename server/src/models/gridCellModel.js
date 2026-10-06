import { all } from "../config/database.js";
export const listGridCells = async () =>
  await all("SELECT * FROM grid_cells ORDER BY row,col");
