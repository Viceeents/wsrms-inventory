import { all, get } from "../config/database.js";
import { listLocations } from "../models/storageLocationModel.js";
import { listTransactions } from "../models/transactionModel.js";
export async function overview() {
  const locations = (await listLocations()).filter(
      (l) => l.can_store && l.active,
    ),
    days = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(Date.now() + 8 * 3600000 - (6 - i) * 86400000)
      .toISOString()
      .slice(0, 10);
    const checkins = await get(
      "SELECT COUNT(*) AS count FROM parcels WHERE (checked_in_at::timestamptz AT TIME ZONE 'Asia/Manila')::date::text=?",
      day,
    );
    const dispatches = await get(
      "SELECT COUNT(*) AS count FROM parcels WHERE (dispatched_at::timestamptz AT TIME ZONE 'Asia/Manila')::date::text=?",
      day,
    );
    days.push({
      date: day,
      checkins: checkins.count,
      dispatches: dispatches.count,
    });
  }
  const counts = await get(
    "SELECT COUNT(*) FILTER(WHERE status!='Dispatched') AS total, COUNT(*) FILTER(WHERE status='Stored') AS stored, COUNT(*) FILTER(WHERE status='Retrieved') AS retrieved, COUNT(*) FILTER(WHERE status='Dispatched') AS dispatched FROM parcels",
  );
  return {
    ...counts,
    todayCheckins: days.at(-1).checkins,
    todayDispatches: days.at(-1).dispatches,
    capacity: locations.reduce((n, r) => n + r.capacity, 0),
    occupancy: locations.reduce((n, r) => n + r.occupancy, 0),
    unitCapacity: locations.reduce((n, r) => n + r.unit_capacity, 0),
    usedUnits: locations.reduce((n, r) => n + r.used_units, 0),
    locationCount: locations.length,
    availableLocations: locations.filter(
      (r) =>
        r.status === "Available" &&
        r.utilization < 1 &&
        r.active &&
        r.can_store,
    ).length,
    days,
    categories: await all(
      "SELECT c.name,c.color,COUNT(p.id) AS count FROM categories c LEFT JOIN parcels p ON p.category_id=c.id AND p.status!='Dispatched' GROUP BY c.id ORDER BY count DESC",
    ),
    recent: (await listTransactions()).slice(0, 7),
    locations,
  };
}
export function toCsv(rows) {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  const escape = (v) => {
    let s = String(v ?? "");
    if (/^[=+@\-\t\r]/.test(s)) s = `'${s}`;
    return `"${s.replaceAll('"', '""')}"`;
  };
  return [
    keys.map(escape).join(","),
    ...rows.map((r) =>
      keys
        .map((k) =>
          escape(typeof r[k] === "object" ? JSON.stringify(r[k]) : r[k]),
        )
        .join(","),
    ),
  ].join("\r\n");
}
