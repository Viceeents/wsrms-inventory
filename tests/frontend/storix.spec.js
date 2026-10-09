import { test, expect } from "@playwright/test";
test.skip(!!process.env.DEPLOYED_BASE_URL, "Local isolated database only");
async function login(page) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill("admin@wsrms.local");
  await page.getByLabel("Password", { exact: true }).fill("Warehouse@2026");
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await expect(
    page.getByRole("heading", { name: /Welcome back,/ }),
  ).toBeVisible();
}
test("Storix phone navigation, chat, rack routes and both themes", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await expect(page).toHaveTitle(/Storix/);
  const nav = page.getByRole("navigation", { name: "Main mobile navigation" });
  await expect(nav.getByRole("link")).toHaveCount(5);
  await expect(page.locator(".sidebar")).toBeHidden();
  const chat = page.getByRole("button", { name: /Open Storix messages/ });
  const chatBox = await chat.boundingBox(),
    navBox = await nav.boundingBox();
  expect(chatBox.y + chatBox.height).toBeLessThan(navBox.y);
  await chat.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByLabel("Team message", { exact: true })
    .fill("Phone warehouse message");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(
    page.getByRole("log").getByText("Phone warehouse message", { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/storix-chat-phone.png" });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await nav.getByRole("link", { name: "Map", exact: true }).click();
  for (const rack of ["A", "B", "C"]) {
    await page
      .getByRole("button", { name: `Rack ${rack}`, exact: true })
      .click();
    await page.getByRole("button", { name: "Show Best Path" }).click();
    await expect(
      page.getByText(`Destination: Rack ${rack}`, { exact: true }),
    ).toBeVisible();
    await expect(page.locator(".route-overlay polyline")).toHaveCount(2);
  }
  const gridRack = page.locator(".grid-cell.cell-rack").first();
  const rackCode = await gridRack.locator("b").innerText();
  await gridRack.click();
  await expect(gridRack).toHaveAttribute("aria-pressed", "true");
  await expect(gridRack.locator("b")).toHaveText(rackCode);
  await expect(
    page
      .locator(".rack-info")
      .getByRole("heading", { name: `Rack ${rackCode}`, exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Show Best Path", exact: true })
    .click();
  await expect(page.locator(".route-overlay polyline")).toHaveCount(2);
  await page.screenshot({
    path: "test-results/storix-mobile-light.png",
    fullPage: true,
  });
  await page.request.put("/api/preferences", {
    data: { font_size: "medium", theme: "dark" },
  });
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Show Best Path" }).click();
  await expect(page.locator(".route-overlay")).toBeVisible();
  await page.screenshot({
    path: "test-results/storix-mobile-dark.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(nav).toBeHidden();
  await expect(page.locator(".sidebar")).toBeVisible();
  await page.screenshot({
    path: "test-results/storix-desktop-dark.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("Administrator can confirm deletion and inspect archived accounts", async ({
  page,
}) => {
  await login(page);
  const email = `ui-delete-${Date.now()}@wsrms.local`;
  const response = await page.request.post("/api/users", {
    data: {
      name: "UI deletion user",
      email,
      password: "DeleteTest@2026",
      role: "staff",
      active: 1,
    },
  });
  expect(response.status()).toBe(201);
  const user = await response.json();
  await page.goto("/admin/users");
  const row = page.getByRole("row").filter({ hasText: email });
  await row
    .getByRole("button", { name: "Edit UI deletion user", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete Account" })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText(user.code, { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(row).toBeVisible();
  await row
    .getByRole("button", { name: "Edit UI deletion user", exact: true })
    .click();
  await dialog.getByRole("button", { name: "Delete Account" }).click();
  await dialog
    .getByRole("button", { name: "Delete Account", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(row).toHaveCount(0);
  await page.getByRole("button", { name: "Archived users" }).click();
  await expect(row.getByText("Deleted", { exact: true })).toBeVisible();
  await expect(row.getByRole("button", { name: "Delete Account" })).toHaveCount(
    0,
  );
});

test("Staff messages and administrator announcements persist across accounts", async ({
  page,
  browser,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page);
  const staffContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const staffPage = await staffContext.newPage();
  await staffPage.goto("/login");
  await staffPage.getByLabel("Email address").fill("staff@wsrms.local");
  await staffPage.getByLabel("Password", { exact: true }).fill("Staff@2026");
  await staffPage.getByRole("button", { name: "Sign in to workspace" }).click();
  await expect(
    staffPage.getByRole("heading", { name: /Welcome back,/ }),
  ).toBeVisible();
  await staffPage.getByRole("button", { name: /Open Storix messages/ }).click();
  await staffPage
    .getByLabel("Team message", { exact: true })
    .fill("Staff unloading completed.");
  await staffPage.getByRole("button", { name: "Send", exact: true }).click();
  await expect(
    staffPage
      .getByRole("log")
      .getByText("Staff unloading completed.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Open Storix messages/ }).click();
  await expect(
    page
      .getByRole("log")
      .getByText("Staff unloading completed.", { exact: true }),
  ).toBeVisible();
  await staffPage
    .getByLabel("Team message", { exact: true })
    .fill("Rack B is ready");
  await expect(
    page.getByRole("status").filter({ hasText: "is typing" }),
  ).toBeVisible({ timeout: 8000 });
  await page.screenshot({ path: "test-results/storix-typing-desktop.png" });
  await staffPage.getByLabel("Team message", { exact: true }).fill("");
  await expect(
    page.getByRole("status").filter({ hasText: "is typing" }),
  ).toHaveCount(0, { timeout: 8000 });
  await page.getByRole("button", { name: "Minimize messages" }).click();
  await staffPage
    .getByLabel("Team message", { exact: true })
    .fill("Chat head verification");
  await staffPage.getByRole("button", { name: "Send", exact: true }).click();
  await expect(
    staffPage
      .getByRole("log")
      .getByText("Chat head verification", { exact: true }),
  ).toBeVisible();
  await page.reload();
  const head = page
    .getByRole("button", { name: /Open team chat, .* unread from/ })
    .first();
  await expect(head).toBeVisible();
  await page.screenshot({ path: "test-results/storix-chat-heads.png" });
  await head.click();
  await expect(
    page.getByRole("log").getByText("Chat head verification", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Announcements/ }).click();
  await page.getByLabel("Announcement title").fill("Warehouse maintenance");
  await page
    .getByLabel("Announcement message")
    .fill("Maintenance tomorrow at 9 AM.");
  await page.getByLabel("Priority", { exact: true }).selectOption("Important");
  await page.getByRole("button", { name: "Publish announcement" }).click();
  await expect(
    page.getByRole("log").getByText("Warehouse maintenance", { exact: true }),
  ).toBeVisible();
  await staffPage.reload();
  await expect(
    staffPage.getByRole("button", { name: /Open Storix messages, \d+ unread/ }),
  ).toBeVisible();
  await staffPage.getByRole("button", { name: /Open Storix messages/ }).click();
  await staffPage.getByRole("button", { name: /^Announcements/ }).click();
  await expect(
    staffPage
      .getByRole("log")
      .getByText("Warehouse maintenance", { exact: true }),
  ).toBeVisible();
  await expect(
    staffPage.getByRole("button", { name: "Publish announcement" }),
  ).toHaveCount(0);
  await staffPage.getByRole("button", { name: /^Updates/ }).click();
  await expect(
    staffPage
      .getByRole("log")
      .getByText("Storix team messaging", { exact: true }),
  ).toBeVisible();
  await staffPage.request.put("/api/preferences", {
    data: { font_size: "medium", theme: "dark" },
  });
  await staffPage.reload();
  await staffPage.getByRole("button", { name: /Open Storix messages/ }).click();
  await staffPage.screenshot({
    path: "test-results/storix-chat-phone-dark.png",
  });
  await page.screenshot({ path: "test-results/storix-chat-desktop.png" });
  await page
    .getByRole("button", { name: "Archive announcement Warehouse maintenance" })
    .click();
  await page.getByRole("button", { name: "Archive", exact: true }).click();
  await expect(
    page.getByRole("log").getByText("Warehouse maintenance", { exact: true }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
  await staffPage.request.put("/api/preferences", {
    data: { font_size: "medium", theme: "light" },
  });
  await staffContext.close();
});
