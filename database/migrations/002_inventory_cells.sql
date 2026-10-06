-- Preserve identifiers, parcel assignments, and transaction history from v1.
DO $$
DECLARE is_default BOOLEAN;
BEGIN
 IF to_regclass('racks') IS NOT NULL THEN
  SELECT EXISTS(SELECT 1 FROM grid_cells WHERE id='9-2' AND type='entrance')
    AND EXISTS(SELECT 1 FROM grid_cells WHERE id='9-11' AND type='exit')
    AND (SELECT COUNT(*) FROM grid_cells)=140 INTO is_default;
  ALTER TABLE racks RENAME TO storage_locations;
  ALTER TABLE parcels RENAME COLUMN rack_id TO location_id;
  ALTER TABLE storage_locations ADD COLUMN unit_capacity INTEGER;
  UPDATE storage_locations SET unit_capacity=capacity;
  ALTER TABLE storage_locations ALTER COLUMN unit_capacity SET NOT NULL;
  ALTER TABLE storage_locations ADD COLUMN storage_type TEXT NOT NULL DEFAULT 'rack';
  ALTER TABLE grid_cells DROP CONSTRAINT IF EXISTS grid_cells_type_check;
  ALTER TABLE grid_cells ADD COLUMN walkable BOOLEAN NOT NULL DEFAULT false;
  ALTER TABLE grid_cells ADD COLUMN active BOOLEAN NOT NULL DEFAULT true;
  ALTER TABLE grid_cells ADD COLUMN can_store BOOLEAN NOT NULL DEFAULT false;
  ALTER TABLE grid_cells ADD COLUMN movement_cost DOUBLE PRECISION NOT NULL DEFAULT 1;
  ALTER TABLE grid_cells ADD COLUMN availability TEXT NOT NULL DEFAULT 'Available';
  ALTER TABLE grid_cells ADD COLUMN door_usage TEXT;
  ALTER TABLE grid_cells ADD COLUMN directions JSONB NOT NULL DEFAULT '["north","south","east","west"]';
  UPDATE grid_cells SET walkable=type IN ('walkway','door','entrance','exit'),can_store=type='rack',availability=CASE WHEN type='blocked' THEN 'Blocked' ELSE 'Available' END;
  UPDATE grid_cells SET door_usage=CASE WHEN type='exit' THEN 'dispatch' ELSE 'both' END,type='door' WHERE type IN ('entrance','exit','door');
  IF is_default THEN
   UPDATE grid_cells SET type='wall',walkable=false,door_usage=NULL WHERE id='9-11';
   UPDATE grid_cells SET type='floor_storage',can_store=true,walkable=false WHERE id IN ('8-6','8-9') AND type='walkway';
   INSERT INTO storage_locations(code,cell_id,capacity,unit_capacity,max_weight,max_size,category_id,status,storage_type)
     SELECT CASE WHEN id='8-6' THEN 'FLOOR-G09' ELSE 'FLOOR-J09' END,id,5,20,100,'Large',NULL,'Available','floor_storage' FROM grid_cells WHERE id IN ('8-6','8-9') AND type='floor_storage';
  END IF;
  ALTER TABLE grid_cells ADD CONSTRAINT grid_cells_type_check CHECK(type IN ('walkway','rack','floor_storage','door','wall','blocked'));
  ALTER TABLE grid_cells ADD CONSTRAINT grid_cells_cost_check CHECK(movement_cost>0);
  ALTER TABLE grid_cells ADD CONSTRAINT grid_cells_availability_check CHECK(availability IN ('Available','Blocked'));
  ALTER TABLE grid_cells ADD CONSTRAINT grid_cells_usage_check CHECK(door_usage IS NULL OR door_usage IN ('receiving','dispatch','both'));
  ALTER TABLE storage_locations ADD CONSTRAINT storage_locations_type_check CHECK(storage_type IN ('rack','floor_storage','walkway'));
  ALTER TABLE storage_locations ADD CONSTRAINT storage_locations_units_check CHECK(unit_capacity>0);
  UPDATE warehouse SET revision=revision+1;
 END IF;
END $$;
