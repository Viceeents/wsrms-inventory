import { test, expect } from "@playwright/test";
import sharp from "sharp";
async function login(page, role = "staff") {
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
test("Check-in drafts survive refresh, create no transactions, restore and clear on confirmation", async ({
  page,
}) => {
  await login(page);
  const before = await (await page.request.get("/api/parcels")).json();
  await page.goto("/check-in");
  await page.getByLabel("Parcel description").fill("Recovered check-in input");
  await page.getByLabel("Category", { exact: true }).selectOption("1");
  await page.getByLabel("Length (cm)").fill("25");
  await page.getByLabel("Width (cm)").fill("20");
  await page.getByLabel("Height (cm)").fill("15");
  await page.getByLabel("Weight per item (kg)").fill("1.5");
  await expect(page.getByText("Draft saved ✓")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Unfinished check-in found")).toBeVisible();
  const during = await (await page.request.get("/api/parcels")).json();
  expect(during.length).toBe(before.length);
  await page.getByRole("button", { name: "Restore draft" }).click();
  await expect(page.getByLabel("Parcel description")).toHaveValue(
    "Recovered check-in input",
  );
  await expect(page.getByLabel("Length (cm)")).toHaveValue("25");
  await page.getByRole("button", { name: "Recommend storage" }).click();
  await page.getByRole("button", { name: "Confirm check-in" }).click();
  await expect(
    page.getByText("CHECK-IN COMPLETE", { exact: true }),
  ).toBeVisible();
  await page.goto("/check-in");
  await expect(page.getByRole("button", { name: "Restore draft" })).toHaveCount(
    0,
  );
  await page.getByLabel("Parcel description").fill("Discard this draft");
  await expect(page.getByText("Draft saved ✓")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Discard", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Restore draft" })).toHaveCount(
    0,
  );
});
test("Layout and rack configuration drafts recover without saving the warehouse", async ({
  page,
}) => {
  await login(page, "admin");
  await page.goto("/admin/layout");
  const before = await (await page.request.get("/api/warehouse")).json();
  await page.getByLabel("Warehouse name").fill("Unconfirmed recovery layout");
  await page.getByRole("button", { name: /Rack A-01/ }).click();
  await page.getByLabel("Width (cm)", { exact: true }).fill("130");
  await expect(page.getByText("Draft saved ✓")).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Unfinished layout configuration found"),
  ).toBeVisible();
  const untouched = await (await page.request.get("/api/warehouse")).json();
  expect(untouched.revision).toBe(before.revision);
  expect(untouched.name).toBe(before.name);
  await page.getByRole("button", { name: "Restore draft" }).click();
  await expect(page.getByLabel("Warehouse name")).toHaveValue(
    "Unconfirmed recovery layout",
  );
  await page.getByRole("button", { name: /Rack A-01/ }).click();
  await expect(page.getByLabel("Width (cm)", { exact: true })).toHaveValue(
    "130",
  );
  await page.getByRole("button", { name: "Save layout", exact: true }).click();
  await expect(page.getByText("Layout saved.", { exact: false })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Restore draft" })).toHaveCount(
    0,
  );
});
test("Blue routes remain visible in both explicit themes and maps pan on mobile", async ({
  page,
}) => {
  await login(page, "admin");
  const data = {
    description: "Visible route parcel",
    category_id: 1,
    length_cm: 20,
    width_cm: 15,
    height_cm: 10,
    weight: 1,
    quantity: 1,
  };
  const options = await (
    await page.request.post("/api/parcels/recommendations", { data })
  ).json();
  const parcel = await (
    await page.request.post("/api/parcels", {
      data: { ...data, location_id: options[0].id },
    })
  ).json();
  await page.goto(`/parcels/${parcel.id}`);
  await page.getByRole("button", { name: "Show Route", exact: true }).click();
  await expect(page.locator(".route-overlay")).toBeVisible();
  expect(await page.locator(".grid-cell.on-route").count()).toBeGreaterThan(1);
  await expect(page.locator(".route-overlay rect")).toBeVisible();
  await page.screenshot({
    path: "test-results/route-light.png",
    fullPage: true,
  });
  await page.goto("/warehouse");
  await page.getByRole("button", { name: new RegExp(options[0].code) }).click();
  await page.getByRole("button", { name: "Show Best Path", exact: true }).click();
  await expect(page.locator(".route-overlay")).toBeVisible();
  expect(await page.locator(".grid-cell.on-route").count()).toBeGreaterThan(1);
  await expect(page.locator(".route-overlay rect")).toBeVisible();
  await expect(page.locator(".route-summary")).toContainText("steps");
  await page.goto("/settings");
  await expect(
    page.getByLabel("Theme", { exact: true }).locator("option"),
  ).toHaveCount(2);
  await page.getByLabel("Theme", { exact: true }).selectOption("dark");
  await page.getByRole("button", { name: "Save appearance" }).click();
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.goto(`/warehouse?parcel=${parcel.id}`);
  await expect(page.locator(".route-overlay")).toBeVisible();
  const activeRoute = page.locator(".route-direction button.active");
  expect(await activeRoute.evaluate((el) => getComputedStyle(el).color)).toBe(
    "rgb(255, 255, 255)",
  );
  await page.screenshot({
    path: "test-results/route-dark.png",
    fullPage: true,
  });
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(
    await page
      .locator("body")
      .evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe("rgb(24, 25, 27)");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  const viewport = page.locator(".warehouse-map-viewport");
  expect(await viewport.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(
    true,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Fit to screen" }).click();
  await page.goto("/settings");
  await page.getByLabel("Theme", { exact: true }).selectOption("light");
  await page.getByRole("button", { name: "Save appearance" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(
    await page
      .locator("body")
      .evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe("rgb(240, 242, 245)");
});

test("Admin profile picture saves immediately and survives refresh", async ({
  page,
}) => {
  await login(page, "admin");
  await page.goto("/profile");
  const buffer = await sharp({
    create: { width: 16, height: 16, channels: 3, background: "#555555" },
  })
    .png()
    .toBuffer();
  await page
    .getByLabel("Change profile picture", { exact: true })
    .setInputFiles({ name: "admin.png", mimeType: "image/png", buffer });
  await page.getByRole("button", { name: "Save picture", exact: true }).click();
  await expect(
    page.getByText("Profile picture saved.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Pending admin approval")).toHaveCount(0);
  await expect(
    page.getByAltText("Current profile", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByAltText("Current profile", { exact: true }),
  ).toBeVisible();
});
test("Profile picture requests require approval and show both pictures to administrators", async ({
  page,
}) => {
  await login(page);
  await page.goto("/profile");
  const buffer = await sharp({
    create: { width: 16, height: 16, channels: 3, background: "#245d46" },
  })
    .png()
    .toBuffer();
  await page
    .getByLabel("Change profile picture", { exact: true })
    .setInputFiles({ name: "profile.png", mimeType: "image/png", buffer });
  await expect(page.getByAltText("Requested profile preview")).toBeVisible();
  await page.getByRole("button", { name: "Submit request" }).click();
  await expect(page.getByText("Pending admin approval")).toBeVisible();
  await page.request.post("/api/auth/logout");
  await login(page, "admin");
  await page.goto("/admin/profile-requests");
  await page.getByRole("button", { name: "View", exact: true }).first().click();
  await expect(
    page.getByAltText("Requested profile", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.request.post("/api/auth/logout");
  await login(page);
  await page.goto("/profile");
  await expect(
    page.getByAltText("Current profile", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Approved", { exact: true })).toBeVisible();
});
test("Database health and account presence stay compact and admin-only", async ({
  page,
}) => {
  await login(page, "admin");
  await page.goto("/admin/database");
  await expect(
    page.getByRole("heading", { name: "Database health" }),
  ).toBeVisible();
  await expect(page.getByText("Online", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "View backup history" }).click();
  await expect(
    page.getByRole("heading", { name: "Backup history" }),
  ).toBeVisible();
  await page.goto("/admin/users");
  await expect(
    page.getByRole("columnheader", { name: "Presence", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".presence-online").first()).toBeVisible();
  const height = await page
    .locator("tbody tr")
    .first()
    .evaluate((el) => el.getBoundingClientRect().height);
  expect(height).toBeLessThanOrEqual(56);
  await page.request.post("/api/auth/logout");
  await login(page);
  expect((await page.request.get("/api/admin/database")).status()).toBe(403);
  expect(
    (await page.request.post("/api/admin/database/backups")).status(),
  ).toBe(403);
});

test("Parcel correction drafts restore input without changing the saved parcel", async ({
  page,
}) => {
  await login(page, "admin");
  const data = {
    description: "Original correction record",
    category_id: 1,
    length_cm: 20,
    width_cm: 15,
    height_cm: 10,
    weight: 1,
    quantity: 1,
  };
  const options = await (
    await page.request.post("/api/parcels/recommendations", { data })
  ).json();
  const parcel = await (
    await page.request.post("/api/parcels", {
      data: { ...data, location_id: options[0].id },
    })
  ).json();
  await page.goto(`/parcels/${parcel.id}`);
  await page.getByRole("button", { name: "Correct record" }).click();
  await page
    .getByLabel("Parcel description")
    .fill("Recovered correction description");
  await page
    .getByLabel("Reason for correction")
    .fill("Correcting the description");
  await expect(page.getByText("Draft saved \u2713")).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Unfinished parcel correction found"),
  ).toBeVisible();
  expect(
    (await (await page.request.get(`/api/parcels/${parcel.id}`)).json())
      .description,
  ).toBe("Original correction record");
  await page.getByRole("button", { name: "Restore draft" }).click();
  await expect(page.getByLabel("Parcel description")).toHaveValue(
    "Recovered correction description",
  );
  await page.getByRole("button", { name: "Save correction" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("button", { name: "Restore draft" })).toHaveCount(
    0,
  );
  expect(
    (await (await page.request.get(`/api/parcels/${parcel.id}`)).json())
      .description,
  ).toBe("Recovered correction description");
});
test("Dispatch drafts restore selection but require fresh QR verification", async ({
  page,
}) => {
  await login(page);
  const data = {
    description: "Recovered dispatch selection",
    category_id: 1,
    length_cm: 20,
    width_cm: 15,
    height_cm: 10,
    weight: 1,
    quantity: 1,
  };
  const options = await (
    await page.request.post("/api/parcels/recommendations", { data })
  ).json();
  const parcel = await (
    await page.request.post("/api/parcels", {
      data: { ...data, location_id: options[0].id },
    })
  ).json();
  await page.goto(`/dispatch?parcel=${parcel.id}`);
  await page.getByRole("button", { name: "Mark as retrieved" }).click();
  await page.getByLabel("Scanned parcel code").fill(parcel.code);
  await page.getByRole("button", { name: "Verify code", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Confirm dispatch" }),
  ).toBeEnabled();
  await page.goto("/dispatch");
  await expect(page.getByRole("button", { name: "Restore draft" })).toBeVisible();
  await page.getByRole("button", { name: "Restore draft" }).click();
  await expect(page.getByLabel("Scanned parcel code")).toHaveValue("");
  await expect(
    page.getByRole("button", { name: "Confirm dispatch" }),
  ).toBeDisabled();
  expect(
    (await (await page.request.get(`/api/parcels/${parcel.id}`)).json()).status,
  ).toBe("Retrieved");
  await page.getByLabel("Scanned parcel code").fill(parcel.code);
  await page.getByRole("button", { name: "Verify code", exact: true }).click();
  await page.getByRole("button", { name: "Confirm dispatch" }).click();
  await expect(
    page.getByText("DISPATCH COMPLETE", { exact: true }),
  ).toBeVisible();
  await page.goto("/dispatch");
  await expect(page.getByRole("button", { name: "Restore draft" })).toHaveCount(
    0,
  );
});
