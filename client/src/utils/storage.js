export const storageType = (type) =>
  ({
    rack: "Rack",
    floor_storage: "Floor Storage",
    walkway: "Walkway storage",
  })[type] || type;
export const locationLabel = (location) =>
  location.storage_type === "rack"
    ? `Rack ${location.code || location.location_code}`
    : location.code || location.location_code;
export const cellType = (type) =>
  ({
    floor_storage: "Floor Storage",
    door: "Warehouse Access Point",
    walkway: "Walkway",
    rack: "Rack",
    wall: "Wall",
    blocked: "Blocked area",
  })[type] || type;
export const cellDefaults = (type) => ({
  type,
  walkable: ["walkway", "door"].includes(type),
  active: true,
  can_store: ["rack", "floor_storage"].includes(type),
  availability: type === "blocked" ? "Blocked" : "Available",
  movement_cost: 1,
  door_usage: type === "door" ? "both" : null,
  directions: ["north", "south", "east", "west"],
});
