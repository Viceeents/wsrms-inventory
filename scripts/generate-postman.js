import { writeFileSync } from "node:fs";
const json = (body) => ({
  mode: "raw",
  raw: JSON.stringify(body, null, 2),
  options: { raw: { language: "json" } },
});
const make = (name, method, path, body, script) => ({
  name,
  request: {
    method,
    header: body ? [{ key: "Content-Type", value: "application/json" }] : [],
    url: `{{baseUrl}}${path}`,
    ...(body ? { body: json(body) } : {}),
  },
  ...(script
    ? {
        event: [
          { listen: "test", script: { type: "text/javascript", exec: script } },
        ],
      }
    : {}),
});
const parcel = {
  tracking_number: "POSTMAN-{{$timestamp}}",
  description: "Postman sample parcel",
  category_id: 1,
  size: "Small",
  weight: 1,
  quantity: 1,
};
const collection = {
  info: {
    name: "WSRMS · Warehouse operations",
    description:
      "Local API workflows. Sign in first. Cookies are stored automatically. Requests mutate warehouse records; use a development database.",
    schema:
      "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  },
  variable: [
    { key: "baseUrl", value: "http://127.0.0.1:3001/api" },
    { key: "parcelId", value: "1" },
    { key: "parcelCode", value: "" },
    { key: "locationId", value: "1" },
  ],
  item: [
    {
      name: "Authentication",
      item: [
        make("Health", "GET", "/health"),
        make("Sign in as administrator", "POST", "/auth/login", {
          email: "admin@wsrms.local",
          password: "Warehouse@2026",
        }),
        make("Current account", "GET", "/auth/me"),
        make("Sign in as staff", "POST", "/auth/login", {
          email: "staff@wsrms.local",
          password: "Staff@2026",
        }),
        make("Sign out", "POST", "/auth/logout"),
      ],
    },
    {
      name: "Parcel workflow · run in order",
      item: [
        make(
          "1. Recommend storage",
          "POST",
          "/parcels/recommendations",
          parcel,
          [
            "const locations = pm.response.json();",
            'if (locations.length) pm.collectionVariables.set("locationId", locations[0].id);',
          ],
        ),
        make(
          "2. Confirm check-in",
          "POST",
          "/parcels",
          { ...parcel, location_id: "{{locationId}}" },
          [
            "const p = pm.response.json();",
            'if (p.id) { pm.collectionVariables.set("parcelId", p.id); pm.collectionVariables.set("parcelCode", p.code); }',
          ],
        ),
        make("3. View parcel", "GET", "/parcels/{{parcelId}}"),
        make("4. Shortest route", "GET", "/parcels/{{parcelId}}/route"),
        make("5. Mark retrieved", "POST", "/parcels/{{parcelId}}/retrieve"),
        make(
          "6. Wrong code · expected 409",
          "POST",
          "/parcels/{{parcelId}}/dispatch",
          { scanned_code: "WRONG-CODE" },
          [
            'pm.test("Wrong parcel rejected", () => pm.response.to.have.status(409));',
          ],
        ),
        make(
          "7. Verify scanned label",
          "POST",
          "/parcels/{{parcelId}}/verify",
          {
            scanned_code: "{{parcelCode}}",
          },
        ),
        make(
          "8. Confirm verified dispatch",
          "POST",
          "/parcels/{{parcelId}}/dispatch",
          {
            scanned_code: "{{parcelCode}}",
          },
        ),
        make("9. Parcel history", "GET", "/transactions?parcel={{parcelId}}"),
      ],
    },
    {
      name: "Warehouse and records",
      item: [
        make("Dashboard", "GET", "/dashboard"),
        make("Warehouse layout and locations", "GET", "/warehouse"),
        make("All parcels", "GET", "/parcels"),
        make("Search parcels", "GET", "/parcels?q={{parcelCode}}"),
        make("Stored parcels", "GET", "/parcels?status=Stored"),
        make("All transactions", "GET", "/transactions"),
        make(
          "Transfer options (Stored parcel only)",
          "GET",
          "/parcels/{{parcelId}}/transfer-options",
        ),
        make(
          "Transfer parcel (Stored parcel only)",
          "POST",
          "/parcels/{{parcelId}}/transfer",
          { location_id: "{{locationId}}" },
        ),
      ],
    },
    {
      name: "Notifications and appearance",
      item: [
        make("Notifications", "GET", "/notifications"),
        make("Mark all notifications read", "POST", "/notifications/read-all"),
        make("My appearance", "GET", "/preferences"),
        make("Save appearance", "PUT", "/preferences", {
          font_size: "medium",
          accent_color: "green",
        }),
      ],
    },
    {
      name: "Administration",
      item: [
        make("Team members", "GET", "/users"),
        make("Categories", "GET", "/categories"),
        make("Create category", "POST", "/categories", {
          name: "New category",
          color: "#688d77",
          active: 1,
        }),
        make("Create staff account", "POST", "/users", {
          name: "New Staff",
          email: "newstaff@example.com",
          password: "ReplaceThis2026",
          role: "staff",
          active: 1,
        }),
        make("Reports", "GET", "/reports"),
        make("System and notification settings", "GET", "/system-settings"),
        make("Export parcels CSV", "GET", "/reports/export/parcels"),
        make("Export transactions CSV", "GET", "/reports/export/transactions"),
        make(
          "Export storage utilization CSV",
          "GET",
          "/reports/export/locations",
        ),
      ],
    },
  ],
};
writeFileSync(
  "docs/api/WSRMS.postman_collection.json",
  JSON.stringify(collection, null, 2) + "\n",
);
console.log("Postman collection generated.");
