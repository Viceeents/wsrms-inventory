import {
  get,
  run,
  atomic,
  nextCode,
} from "../../server/src/config/database.js";
import { env } from "../../server/src/config/env.js";
import { hashPassword } from "../../server/src/utils/password.js";
export async function seed() {
  if (await get("SELECT id FROM warehouse")) return;
  await atomic(async () => {
    const now = new Date().toISOString();
    await run(
      "INSERT INTO users(code,name,email,password_hash,role,created_at) VALUES(?,?,?,?,?,?)",
      await nextCode("USR", false),
      "Alex Morgan",
      "admin@wsrms.local",
      hashPassword(env.adminPassword),
      "admin",
      now,
    );
    await run(
      "INSERT INTO users(code,name,email,password_hash,role,created_at) VALUES(?,?,?,?,?,?)",
      await nextCode("USR", false),
      "Jamie Reyes",
      "staff@wsrms.local",
      hashPassword(env.staffPassword),
      "staff",
      now,
    );
    for (const [name, color] of [
      ["General", "#688d77"],
      ["Electronics", "#678aad"],
      ["Fragile", "#b7996b"],
      ["Apparel", "#a283ac"],
    ])
      await run("INSERT INTO categories(name,color) VALUES(?,?)", name, color);
    await run(
      "INSERT INTO warehouse(id,name,rows,cols) VALUES(1,?,?,?)",
      "Main warehouse",
      10,
      14,
    );
    let rack = 0;
    for (let row = 0; row < 10; row++)
      for (let col = 0; col < 14; col++) {
        const id = `${row}-${col}`;
        let type =
          row === 0 || row === 9 || col === 0 || col === 13
            ? "wall"
            : "walkway";
        if (row === 9 && col === 2) type = "door";
        if (row === 8 && [6, 9].includes(col)) type = "floor_storage";
        if ([2, 3, 5, 6].includes(row) && [3, 4, 6, 7, 9, 10].includes(col))
          type = "rack";
        await run(
          "INSERT INTO grid_cells(id,row,col,type,walkable,can_store,door_usage) VALUES(?,?,?,?,?,?,?)",
          id,
          row,
          col,
          type,
          ["walkway", "door"].includes(type),
          ["rack", "floor_storage"].includes(type),
          type === "door" ? "both" : null,
        );
        if (type === "rack") {
          const code = `${String.fromCharCode(65 + Math.floor(rack / 8))}-${String((rack % 8) + 1).padStart(2, "0")}`;
          await run(
            "INSERT INTO storage_locations(code,cell_id,capacity,unit_capacity,max_weight,max_size,category_id,storage_type) VALUES(?,?,20,20,200,?,?,'rack')",
            code,
            id,
            rack % 3 === 0 ? "Large" : "Medium",
            (rack % 4) + 1,
          );
          rack++;
        }
        if (type === "floor_storage")
          await run(
            "INSERT INTO storage_locations(code,cell_id,capacity,unit_capacity,max_weight,max_size,storage_type) VALUES(?,?,5,20,100,'Large','floor_storage')",
            `FLOOR-${String.fromCharCode(65 + col)}${String(row + 1).padStart(2, "0")}`,
            id,
          );
      }
    if (!env.seedDemo) return;
    const descriptions = [
      "Wireless headphones",
      "Cotton shirts · assorted",
      "Ceramic dinner set",
      "Office supplies",
      "Portable speakers",
      "Linen cushion covers",
      "Glass vases",
      "Packing accessories",
      "Tablet accessories",
      "Sportswear collection",
      "Handcrafted mugs",
      "Books and stationery",
    ];
    for (let i = 0; i < 36; i++) {
      const r = await get(
        "SELECT * FROM storage_locations WHERE id=?",
        (i % 24) + 1,
      );
      const code = await nextCode("PRC");
      const date = new Date(
        Date.now() - ((i % 7) * 86400000 + i * 160000),
      ).toISOString();
      const status = i < 5 ? "Dispatched" : "Stored";
      const parcelId = Number(
        (
          await run(
            "INSERT INTO parcels(code,tracking_number,description,category_id,size,weight,quantity,status,location_id,checked_in_by,checked_in_at,dispatched_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
            code,
            `TRK-${String(860001 + i)}`,
            descriptions[i % 12],
            r.category_id,
            "Small",
            Number((0.5 + (i % 5) * 0.4).toFixed(1)),
            1 + (i % 3),
            status,
            r.id,
            2,
            date,
            status === "Dispatched" ? now : null,
          )
        ).lastInsertRowid,
      );
      await run(
        "INSERT INTO transactions(code,parcel_id,user_id,type,new_status,new_location,created_at) VALUES(?,?,?,?,?,?,?)",
        await nextCode("TXN"),
        parcelId,
        2,
        "Check-in",
        "Stored",
        r.code,
        date,
      );
      if (status === "Dispatched")
        await run(
          "INSERT INTO transactions(code,parcel_id,user_id,type,previous_status,new_status,previous_location,verified,created_at) VALUES(?,?,?,?,?,?,?,?,?)",
          await nextCode("TXN"),
          parcelId,
          2,
          "Dispatch",
          "Stored",
          "Dispatched",
          r.code,
          1,
          now,
        );
    }
  });
}
