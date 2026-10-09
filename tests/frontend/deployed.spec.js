import { test, expect as baseExpect } from "@playwright/test";
const expect = baseExpect.configure({ timeout: 30000 });
import sharp from "sharp";
import { readdirSync, readFileSync } from "node:fs";

test.skip(
  !process.env.DEPLOYED_BASE_URL,
  "Explicit deployed target and private test credentials required.",
);
test.setTimeout(360000);
test.use({ actionTimeout: 30000, deviceScaleFactor: 2 });

async function login(page, role) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(process.env[`${role}_EMAIL`]);
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env[`${role}_PASSWORD`]);
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await expect(
    page.getByRole("heading", { name: /Welcome back,/ }),
  ).toBeVisible({ timeout: 30000 });
}
async function json(response) {
  expect(response.ok()).toBeTruthy();
  return response.json();
}

test("Deployed staff check-in, visible location path, QR verification, dispatch and persistence", async ({
  page,
}) => {
  const errors = [];
  page.setDefaultTimeout(30000);
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page, "STAFF");
  const user = await json(await page.request.get("/api/auth/me"));
  expect(user.role).toBe("staff");
  for (const endpoint of [
    "/api/users",
    "/api/admin/database",
    "/api/admin/profile-requests",
  ])
    expect((await page.request.get(endpoint)).status()).toBe(403);
  const tracking = `DEPLOYMENT-VERIFY-${Date.now()}`;
  await page.goto("/check-in");
  await page
    .getByLabel("External tracking number", { exact: true })
    .fill(tracking);
  await page
    .getByLabel("Category", { exact: true })
    .selectOption({ label: "General" });
  await page
    .getByLabel("Parcel description")
    .fill("Deployment verification parcel");
  for (const [label, value] of [
    ["Length (cm)", "20"],
    ["Width (cm)", "15"],
    ["Height (cm)", "10"],
    ["Weight per item (kg)", "1.2"],
  ])
    await page.getByLabel(label).fill(value);
  await page.getByRole("button", { name: "Recommend storage" }).click();
  await expect(
    page.getByRole("heading", { name: "Choose a storage location" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Confirm check-in" }).click();
  await expect(
    page.getByRole("heading", { name: "Your parcel is ready for storage." }),
  ).toBeVisible();
  const parcels = await json(
    await page.request.get(`/api/parcels?q=${tracking}`),
  );
  const parcel = parcels.find((p) => p.tracking_number === tracking);
  expect(parcel.status).toBe("Stored");
  expect(Number(parcel.length_cm)).toBe(20);
  await page.getByRole("link", { name: "Print label", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Print 1 label" }),
  ).toBeEnabled();
  await expect(page.getByRole("img", { name: /QR code for/ })).toBeVisible();
  await expect(page.getByRole("img", { name: /Barcode for/ })).toBeVisible();
  const scannerModule = readdirSync("client/dist/assets").find(
    (file) =>
      file.endsWith(".js") &&
      readFileSync(`client/dist/assets/${file}`, "utf8").includes(
        "as Html5Qrcode,",
      ),
  );
  const qr = await page
    .getByRole("img", { name: /QR code for/ })
    .getAttribute("src");
  const barcode = await page
    .getByRole("img", { name: /Barcode for/ })
    .screenshot();
  const decoded = await page.evaluate(
    async ({ scannerModule, images }) => {
      const { Html5Qrcode } = await import(`/assets/${scannerModule}`);
      const element = document.createElement("div");
      element.id = "label-verification-reader";
      document.body.append(element);
      const scanner = new Html5Qrcode(element.id);
      const values = [];
      try {
        for (const image of images) {
          const bytes = Uint8Array.from(atob(image), (c) => c.charCodeAt(0));
          values.push(
            await scanner.scanFile(
              new File([bytes], "label.png", { type: "image/png" }),
              false,
            ),
          );
        }
      } finally {
        scanner.clear();
        element.remove();
      }
      return values;
    },
    { scannerModule, images: [qr.split(",")[1], barcode.toString("base64")] },
  );
  expect(decoded).toEqual([parcel.code, parcel.code]);
  await page.pdf({
    path: "test-results/deployed-label.pdf",
    format: "A4",
    printBackground: true,
  });
  const warehouse = await json(await page.request.get("/api/warehouse"));
  const location = warehouse.locations.find((l) => l.id === parcel.location_id);
  const storedOccupancy = location.occupancy;
  await page.goto("/warehouse");
  await page.getByRole("button", { name: new RegExp(location.code) }).click();
  const routeResponse = page.waitForResponse(
    (r) =>
      r.url().includes(`/warehouse/locations/${location.id}/route`) && r.ok(),
  );
  await page.getByRole("button", { name: "Show Best Path", exact: true }).click();
  const route = await (await routeResponse).json();
  expect(
    route.inbound.path.every(
      ({ row, col }) => Number.isInteger(row) && Number.isInteger(col),
    ),
  ).toBeTruthy();
  await expect(page.locator(".route-overlay")).toBeVisible();
  expect(await page.locator(".grid-cell.on-route").count()).toBe(
    route.inbound.path.length,
  );
  await expect(page.locator(".route-overlay circle").first()).toBeVisible();
  await expect(page.locator(".route-overlay rect")).toBeVisible();
  await expect(page.locator(".route-summary")).toContainText(
    `${route.totalSteps} steps`,
  );
  await page.screenshot({
    path: "test-results/deployed-route-light.png",
    fullPage: true,
  });
  await page.goto("/settings");
  await page.getByLabel("Theme", { exact: true }).selectOption("dark");
  await page.getByRole("button", { name: "Save appearance" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.goto(`/warehouse?parcel=${parcel.id}`);
  await expect(page.locator(".route-overlay")).toBeVisible();
  await page.screenshot({
    path: "test-results/deployed-route-dark.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  expect(
    await page
      .locator(".warehouse-map-viewport")
      .evaluate((e) => e.scrollWidth > e.clientWidth),
  ).toBeTruthy();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`/parcels/${parcel.id}`);
  await page.getByRole("button", { name: "Show Route", exact: true }).click();
  await expect(page.locator(".route-overlay")).toBeVisible();
  await page.getByRole("link", { name: "Retrieve & dispatch" }).click();
  await expect(
    page.getByRole("button", { name: "Confirm dispatch" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Mark as retrieved" }).click();
  await expect(
    page.getByRole("button", { name: "Retrieved", exact: true }),
  ).toBeDisabled();
  const wrong = await page.request.post(`/api/parcels/${parcel.id}/dispatch`, {
    data: { scanned_code: "WRONG-DEPLOYMENT-CODE" },
  });
  expect(wrong.status()).toBe(409);
  await page.getByLabel("Scanned parcel code").fill("WRONG-DEPLOYMENT-CODE");
  await expect(
    page.getByRole("button", { name: "Confirm dispatch" }),
  ).toBeDisabled();
  await page.getByLabel("Scanned parcel code").fill(parcel.code);
  await page.getByRole("button", { name: "Verify code", exact: true }).click();
  await expect(
    page.getByText("Parcel verified", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Confirm dispatch" }).click();
  await expect(
    page.getByRole("heading", { name: "Verified. Recorded. On its way." }),
  ).toBeVisible();
  const after = await json(await page.request.get(`/api/parcels/${parcel.id}`));
  expect(after.status).toBe("Dispatched");
  const updated = await json(await page.request.get("/api/warehouse"));
  expect(updated.locations.find((l) => l.id === location.id).occupancy).toBe(
    storedOccupancy - 1,
  );
  const history = await json(
    await page.request.get(`/api/transactions?parcel=${parcel.id}`),
  );
  expect(
    history.some(
      (t) =>
        t.type === "Dispatch" &&
        t.verified === 1 &&
        t.parcel_code === parcel.code &&
        t.user_code === user.code,
    ),
  ).toBeTruthy();
  await page.goto("/transactions");
  await expect(
    page.getByRole("heading", { name: "Transaction history" }),
  ).toBeVisible();
  await page.goto(`/parcels/${parcel.id}`);
  await page.reload();
  await expect(page.locator("h1")).toHaveText(parcel.code);
  expect(
    (await json(await page.request.get(`/api/parcels/${parcel.id}`))).status,
  ).toBe("Dispatched");
  await page.goto("/notifications");
  await expect(
    page.getByRole("heading", { name: "Notifications" }),
  ).toBeVisible();
  expect(
    (await page.request.post("/api/notifications/read-all")).ok(),
  ).toBeTruthy();
  expect(
    (await json(await page.request.get("/api/notifications"))).unread,
  ).toBe(0);
  expect(errors).toEqual([]);
});

test("Deployed administrator screens, profile approval/rejection, layout persistence and backup monitoring", async ({
  page,
  browser,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page, "ADMIN");
  for (const path of [
    "/admin/users",
    "/admin/layout",
    "/admin/profile-requests",
    "/admin/database",
    "/admin/reports",
    "/notifications",
    "/transactions",
  ]) {
    await page.goto(path);
    await expect(page.locator("h1")).toBeVisible();
    await expect(
      page.getByText("Loading warehouse records…", { exact: true }),
    ).toHaveCount(0, { timeout: 30000 });
    await expect(page.locator(".alert-error")).toHaveCount(0);
  }
  const users = await json(await page.request.get("/api/users"));
  expect(
    users.every(
      (u) => u.code.startsWith("USR-") && u.presence && !u.password_hash,
    ),
  ).toBeTruthy();
  const health = await json(await page.request.get("/api/admin/database"));
  expect(health.primary).toBeTruthy();
  const warehouse = await json(await page.request.get("/api/warehouse"));
  const saved = await json(
    await page.request.put("/api/warehouse", { data: warehouse }),
  );
  expect(saved.revision).toBe(warehouse.revision + 1);
  expect((await json(await page.request.get("/api/warehouse"))).revision).toBe(
    saved.revision,
  );
  const image = await sharp({
    create: { width: 32, height: 32, channels: 3, background: "#777777" },
  })
    .png()
    .toBuffer();
  await page.goto("/profile");
  await page
    .getByLabel("Change profile picture", { exact: true })
    .setInputFiles({
      name: "verification.png",
      mimeType: "image/png",
      buffer: image,
    });
  await page.getByRole("button", { name: "Save picture", exact: true }).click();
  await expect(
    page.getByText("Profile picture saved.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByAltText("Current profile", { exact: true }),
  ).toBeVisible();
  const staffContext = await browser.newContext();
  const staff = await staffContext.newPage();
  try {
    await login(staff, "STAFF");
    for (const status of ["Approved", "Rejected"]) {
      await staff.goto("/profile");
      await staff
        .getByLabel("Change profile picture", { exact: true })
        .setInputFiles({
          name: "verification.png",
          mimeType: "image/png",
          buffer: image,
        });
      await staff
        .getByRole("button", { name: "Submit request", exact: true })
        .click();
      await expect(
        staff.getByText("Pending admin approval", { exact: true }),
      ).toBeVisible();
      const own = await json(await staff.request.get("/api/profile/requests"));
      const pending = own.find((r) => r.status === "Pending");
      expect(
        (
          await staff.request.post(
            `/api/admin/profile-requests/${pending.id}/review`,
            { data: { status } },
          )
        ).status(),
      ).toBe(403);
      await page.goto("/admin/profile-requests");
      const row = page
        .locator("tbody tr")
        .filter({ hasText: "Deployment verification staff" })
        .filter({ hasText: "Pending" });
      await row.getByRole("button", { name: "View", exact: true }).click();
      await expect(
        page.getByAltText("Requested profile", { exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", {
          name: status === "Approved" ? "Approve" : "Reject",
          exact: true,
        })
        .click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await staff.reload();
      expect(
        (await json(await staff.request.get("/api/profile/requests"))).find(
          (r) => r.id === pending.id,
        ).status,
      ).toBe(status);
    }
    await expect(
      staff.getByAltText("Current profile", { exact: true }),
    ).toBeVisible();
  } finally {
    await staffContext.close();
  }
  for (const theme of ["dark", "light"]) {
    await page.goto("/settings");
    await page.getByLabel("Theme", { exact: true }).selectOption(theme);
    await page
      .getByRole("button", { name: "Save appearance", exact: true })
      .click();
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
  }
  expect(errors).toEqual([]);
  await page.request.post("/api/auth/logout");
  expect((await page.request.get("/api/auth/me")).status()).toBe(401);
  await page.goto("/admin/users");
  await expect(
    page.getByRole("button", { name: "Sign in to workspace" }),
  ).toBeVisible();
});
