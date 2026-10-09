import { test, expect } from "@playwright/test";

test.skip(
  !!process.env.DEPLOYED_BASE_URL,
  "Uses isolated local accounts and a simulated camera",
);
test.use({
  viewport: { width: 390, height: 844 },
  permissions: ["camera"],
  launchOptions: {
    args: [
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
    ],
  },
});

test("Mobile camera can stop, reopen rapidly and remount without blanking the app", async ({
  page,
}) => {
  const errors = [];
  await page.addInitScript(() => {
    window.scannerTestTracks = [];
    const acquire = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices,
    );
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      await new Promise((resolve) => setTimeout(resolve, 350));
      const stream = await acquire(constraints);
      window.scannerTestTracks.push(...stream.getTracks());
      return stream;
    };
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/login");
  await page.getByLabel("Email address").fill("staff@wsrms.local");
  await page.getByLabel("Password", { exact: true }).fill("Staff@2026");
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await expect(
    page.getByRole("heading", { name: /Welcome back,/ }),
  ).toBeVisible();
  await page.goto("/scan");
  for (let cycle = 0; cycle < 4; cycle++) {
    await page
      .getByRole("button", { name: "Enable camera", exact: true })
      .click();
    await expect(page.locator(".scanner video")).toBeVisible();
    await expect(page.locator(".scanner-view")).toHaveClass(/camera-active/);
    await page
      .getByRole("button", { name: "Stop camera", exact: true })
      .click();
    await expect(
      page.getByText("Scan a parcel label", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Scan a parcel", exact: true }),
    ).toBeVisible();
  }
  // Close while media acquisition is still pending, then immediately reopen.
  await page
    .getByRole("button", { name: "Enable camera", exact: true })
    .click();
  await page.getByRole("button", { name: "Stop camera", exact: true }).click();
  await page
    .getByRole("button", { name: "Enable camera", exact: true })
    .click();
  await expect(page.locator(".scanner-view")).toHaveClass(/camera-active/);
  await expect(page.locator(".scanner video")).toHaveCount(1);
  await page
    .getByRole("navigation", { name: "Main mobile navigation" })
    .getByRole("link", { name: "Find", exact: true })
    .click();
  await page.goto("/scan");
  await page
    .getByRole("button", { name: "Enable camera", exact: true })
    .click();
  await expect(page.locator(".scanner-view")).toHaveClass(/camera-active/);
  await page.getByRole("button", { name: "Stop camera", exact: true }).click();
  await expect(page.locator(".scanner video")).toHaveCount(0);
  const payload = {
    tracking_number: `CAMERA-${Date.now()}`,
    description: "Camera regression test",
    category_id: 1,
    size: "Small",
    length_cm: 20,
    width_cm: 15,
    height_cm: 10,
    weight: 1,
    quantity: 1,
  };
  const recommendation = await page.request.post(
    "/api/parcels/recommendations",
    { data: payload },
  );
  expect(recommendation.ok()).toBeTruthy();
  const locations = await recommendation.json();
  const created = await page.request.post("/api/parcels", {
    data: { ...payload, location_id: locations[0].id },
  });
  expect(created.status()).toBe(201);
  const stored = await created.json();
  expect(stored).toBeTruthy();
  await page.goto(`/dispatch?parcel=${stored.id}`);
  for (let cycle = 0; cycle < 3; cycle++) {
    await page
      .getByRole("button", { name: "Open camera scanner", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog
      .getByRole("button", { name: "Enable camera", exact: true })
      .click();
    await expect(dialog.locator(".scanner-view")).toHaveClass(/camera-active/);
    await dialog.getByRole("button", { name: "Close dialog" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Retrieve & dispatch", exact: true }),
    ).toBeVisible();
  }
  await page
    .getByRole("button", { name: "Open camera scanner", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Enable camera", exact: true })
    .click();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page
    .getByRole("button", { name: "Open camera scanner", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Enable camera", exact: true })
    .click();
  await expect(page.locator(".scanner-view")).toHaveClass(/camera-active/);
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(page.locator('body > [id^="reader-"]')).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.scannerTestTracks.every((track) => track.readyState === "ended"),
      ),
    )
    .toBe(true);
  expect(errors).toEqual([]);
});
