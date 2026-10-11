import { test, expect } from "@playwright/test";
test.skip(!!process.env.DEPLOYED_BASE_URL, "Isolated test data only");

test("Stored chat markup stays inert and authenticated API data is not cached", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill("staff@wsrms.local");
  await page.getByLabel("Password", { exact: true }).fill("Staff@2026");
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await expect(
    page.getByRole("heading", { name: /Welcome back,/ }),
  ).toBeVisible();
  const payload =
    '<img src=x onerror="window.storixXss=true"><script>window.storixXss=true</script>';
  const sent = await page.request.post("/api/messages/team", {
    data: { message: payload },
  });
  expect(sent.ok()).toBeTruthy();
  await page.getByRole("button", { name: /Open Storix messages/ }).click();
  const history = page.getByRole("log");
  await expect(history.getByText(payload, { exact: true })).toBeVisible();
  await expect(history.locator("script, img[src=x]")).toHaveCount(0);
  expect(await page.evaluate(() => window.storixXss)).toBeUndefined();
  const account = await page.request.get("/api/auth/me");
  expect(account.headers()["cache-control"]).toBe("no-store");
});
