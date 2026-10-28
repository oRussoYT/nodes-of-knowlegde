import { expect, test } from "@playwright/test";

// The Observatory of a Node is public and names nobody.
test("anyone can open the PDBFF Observatory from the Node page", async ({ page }) => {
  await page.goto("/n/pdbff");
  await page.getByRole("link", { name: /Observatory/ }).click();
  await expect(page).toHaveURL(/\/n\/pdbff\/observatory$/);
  await expect(page.getByRole("heading", { level: 1, name: /Observatory/ })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "How these are counted" })).toBeVisible();
});
