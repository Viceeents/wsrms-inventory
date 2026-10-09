import { test, expect } from "@playwright/test";
test("Batch labels remain printable when selections change", async ({
  page,
}) => {
  await login(page, "staff");
  for (let i = 0; i < 2; i++) {
    const data = {
      tracking_number: `BATCH-${i}`,
      description: `Batch print parcel ${i}`,
      category_id: 1,
      size: "Small",
      length_cm: 20,
      width_cm: 15,
      height_cm: 10,
      weight: 1,
      quantity: 1,
    };
    const locations = await (
      await page.request.post("/api/parcels/recommendations", { data })
    ).json();
    await page.request.post("/api/parcels", {
      data: { ...data, location_id: locations[0].id },
    });
  }
  await page.goto("/labels");
  const boxes = page.getByRole("checkbox");
  await boxes.nth(0).check();
  await expect(
    page.getByRole("button", { name: "Print 1 label" }),
  ).toBeEnabled();
  await boxes.nth(1).check();
  await expect(
    page.getByRole("button", { name: "Print 2 labels" }),
  ).toBeEnabled();
  await boxes.nth(0).uncheck();
  await expect(
    page.getByRole("button", { name: "Print 1 label" }),
  ).toBeEnabled();
  await boxes.nth(0).check();
  await expect(
    page.getByRole("button", { name: "Print 2 labels" }),
  ).toBeEnabled();
  await page.pdf({
    path: "test-results/parcel-labels.pdf",
    format: "A4",
    printBackground: true,
  });
});
async function login(page, role = "admin") {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(`${role}@wsrms.local`);
  await page
    .getByLabel("Password", { exact: true })
    .fill(role === "admin" ? "Warehouse@2026" : "Staff@2026");
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await expect(
    page.getByRole("heading", { name: /Welcome back,/ }),
  ).toBeVisible();
}
test("Staff checks in, generates printable labels, scans, and dispatches with verification", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page, "staff");
  await expect(page.getByRole("link", { name: "Team members" })).toHaveCount(0);
  await page
    .getByRole("link", { name: "Check-in parcel", exact: true })
    .first()
    .click();
  await page
    .getByLabel("External tracking number", { exact: true })
    .fill("UI-TEST-100");
  await page
    .getByLabel("Category", { exact: true })
    .selectOption({ label: "General" });
  await page.getByLabel("Parcel description").fill("Browser workflow parcel");
  await page.getByLabel("Length (cm)").fill("20");
  await page.getByLabel("Width (cm)").fill("15");
  await page.getByLabel("Height (cm)").fill("10");
  await page.getByLabel("Weight per item (kg)").fill("1.2");
  await page.getByRole("button", { name: "Recommend storage" }).click();
  await expect(
    page.getByRole("heading", { name: "Choose a storage location" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Confirm check-in" }).click();
  await expect(
    page.getByRole("heading", { name: "Your parcel is ready for storage." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Print label", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Print 1 label" }),
  ).toBeEnabled();
  await expect(page.getByRole("img", { name: /QR code for/ })).toBeVisible();
  await expect(page.getByRole("img", { name: /Barcode for/ })).toBeVisible();
  await page.getByRole("link", { name: "Scan QR / barcode" }).click();
  await page.getByLabel("Parcel code / tracking number").fill("UI-TEST-100");
  await page.getByRole("button", { name: "Find parcel", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Parcel information", exact: true }),
  ).toBeVisible();
  const parcelCode = await page.locator("h1").innerText();
  await page.getByRole("link", { name: "Retrieve & dispatch" }).click();
  await page.getByRole("button", { name: "Mark as retrieved" }).click();
  await expect(
    page.getByRole("button", { name: "Retrieved", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Scanned parcel code").fill("WRONG-CODE");
  await expect(page.getByText("Codes do not match")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Confirm dispatch" }),
  ).toBeDisabled();
  await page.getByLabel("Scanned parcel code").fill(parcelCode);
  await page.getByRole("button", { name: "Verify code", exact: true }).click();
  await expect(page.getByText("Parcel verified")).toBeVisible();
  await page.getByRole("button", { name: "Confirm dispatch" }).click();
  await expect(
    page.getByRole("heading", { name: "Verified. Recorded. On its way." }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("Admin screens load, layout saves, team and category forms work", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("link", { name: "Layout editor", exact: true }).click();
  await page.getByLabel("Warehouse name").fill("UI test warehouse");
  await page.getByRole("button", { name: "Save layout", exact: true }).click();
  await expect(page.getByText("Layout saved.", { exact: false })).toBeVisible();
  await page.getByRole("link", { name: "Team members", exact: true }).click();
  await page.getByRole("button", { name: "Add team member" }).click();
  await page.getByLabel("Full name").fill("Browser Worker");
  await page.getByLabel("Email address").fill("browser@wsrms.local");
  await page.getByLabel("Password", { exact: true }).fill("BrowserPass2026");
  await page.getByRole("button", { name: "Save team member" }).click();
  await expect(page.getByText("Browser Worker", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Categories", exact: true }).click();
  await page.getByRole("button", { name: "Add category" }).click();
  await page.getByLabel("Category name").fill("Browser Category");
  await page.getByRole("button", { name: "Save category" }).click();
  await expect(
    page.getByRole("heading", { name: "Browser Category" }),
  ).toBeVisible();
  await page.goto("/parcels");
  await page
    .getByRole("link", { name: /View PRC-/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Correct record" }).click();
  await page
    .getByLabel("Parcel description")
    .fill("Corrected by admin in browser");
  await page
    .getByLabel("Reason for correction")
    .pressSequentially("Fixing the original description");
  await page.getByRole("button", { name: "Save correction" }).click();
  await expect(
    page.getByText("Corrected by admin in browser", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("link", { name: "Reports", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Warehouse reports" }),
  ).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(2);
  await page.getByRole("link", { name: "Transactions", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Transaction history" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/transactions-desktop.png",
    fullPage: true,
  });
});
test("Mobile navigation and warehouse map remain usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("link", { name: "Warehouse map", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Warehouse map", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Rack A-01/ }).click();
  await expect(
    page.getByRole("heading", { name: "Rack A-01", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/warehouse-mobile.png",
    fullPage: true,
  });
});

test("Floor cells show inventory and dispatch displays both independently calculated routes", async ({
  page,
}) => {
  await login(page, "staff");
  const warehouse = await (await page.request.get("/api/warehouse")).json();
  const floor = warehouse.locations.find(
    (l) => l.storage_type === "floor_storage",
  );
  const data = {
    description: "Floor browser inventory",
    tracking_number: "UI-FLOOR-100",
    category_id: 1,
    size: "Small",
    length_cm: 20,
    width_cm: 15,
    height_cm: 10,
    weight: 1,
    quantity: 4,
    location_id: floor.id,
  };
  const response = await page.request.post("/api/parcels", { data });
  expect(response.status()).toBe(201);
  const p = await response.json();
  await page.goto("/warehouse");
  await page
    .getByRole("button", { name: new RegExp(`Floor Storage.*${floor.code}`) })
    .click();
  await expect(
    page.getByRole("heading", { name: floor.code, exact: true }),
  ).toBeVisible();
  await expect(page.getByText("4 / 5", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: new RegExp(`${p.code}.*ID ${p.id}`) }),
  ).toBeVisible();
  await page.goto(`/dispatch?parcel=${p.id}`);
  await expect(
    page.getByText("Total dispatch route", { exact: true }),
  ).toBeVisible();
  const route = await (
    await page.request.get(`/api/parcels/${p.id}/route`)
  ).json();
  await expect(page.locator(".route-summary dd").nth(0)).toHaveText(
    `${route.inboundSteps} steps`,
  );
  await expect(page.locator(".route-summary dd").nth(1)).toHaveText(
    `${route.returnSteps} steps`,
  );
  await expect(page.locator(".route-summary dd").nth(2)).toHaveText(
    `${route.totalSteps} steps`,
  );
  await page
    .getByRole("button", { name: "Return to Access Point", exact: true })
    .click();
  await expect(page.locator(".route-overlay polyline").last()).toHaveAttribute(
    "stroke-dasharray",
    ".20 .10",
  );
  await page.getByRole("button", { name: "Mark as retrieved" }).click();
  await page.getByLabel("Scanned parcel code").fill("WRONG-FLOOR");
  await page.getByRole("button", { name: "Verify code", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Confirm dispatch" }),
  ).toBeDisabled();
  await page.goto("/notifications");
  await expect(
    page.getByText(
      `Wrong parcel scanned for ${p.code}. Dispatch was blocked.`,
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mark all as read" }).click();
  await expect(
    page.getByRole("button", { name: "Mark all as read" }),
  ).toBeDisabled();
  await page.goto(`/dispatch?parcel=${p.id}`);
  await page.getByLabel("Scanned parcel code").fill(p.code);
  await page.getByRole("button", { name: "Verify code", exact: true }).click();
  await page.getByRole("button", { name: "Confirm dispatch" }).click();
  await expect(
    page.getByRole("heading", { name: "Verified. Recorded. On its way." }),
  ).toBeVisible();
  await page.goto("/warehouse");
  await page
    .getByRole("button", { name: new RegExp(`Floor Storage.*${floor.code}`) })
    .click();
  await expect(page.getByText("0 / 5", { exact: true })).toBeVisible();
});

test("Appearance persists per account and admin can configure floor access and notifications", async ({
  page,
}) => {
  await login(page);
  await page.goto("/settings");
  await page.getByLabel("Font size").selectOption("large");
  await page.getByLabel("Theme", { exact: true }).selectOption("dark");
  await page.getByRole("button", { name: "Save appearance" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute("data-font", "large");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(
    await page.locator("html").evaluate((el) => getComputedStyle(el).fontSize),
  ).toBe("17px");
  await page.mouse.move(0, 0);
  await expect
    .poll(() =>
      page
        .getByRole("button", { name: "Save appearance" })
        .evaluate((el) => getComputedStyle(el).backgroundColor),
    )
    .toBe("rgb(23, 105, 210)");
  await page.goto("/admin/layout");
  await page.getByRole("button", { name: /Floor Storage.*FLOOR-G09/ }).click();
  await page.getByLabel("Walkable", { exact: true }).check();
  await page.getByRole("button", { name: "Save layout", exact: true }).click();
  await expect(page.getByText("Layout saved.", { exact: false })).toBeVisible();
  const w = await (await page.request.get("/api/warehouse")).json();
  expect(w.cells.find((c) => c.id === "8-6").walkable).toBe(true);
  await page.goto("/admin/settings");
  await page.getByLabel("Allow new floor-storage assignments").uncheck();
  await page.getByLabel("Nearing capacity threshold (%)").fill("85");
  await page.getByRole("button", { name: "Save system settings" }).click();
  await expect(
    page.getByText("System settings saved and audited."),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByLabel("Allow new floor-storage assignments"),
  ).not.toBeChecked();
  await page.getByLabel("Allow new floor-storage assignments").check();
  await page.getByRole("button", { name: "Save system settings" }).click();
  await page.request.post("/api/auth/logout");
  await login(page, "staff");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.goto("/admin/settings");
  await expect(
    page.getByRole("heading", { name: /Welcome back,/ }),
  ).toBeVisible();
});
