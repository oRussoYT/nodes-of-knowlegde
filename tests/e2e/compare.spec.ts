import { expect, test } from "@playwright/test";

test("anyone can open the comparison page from the Nodes list", async ({ page }) => {
  await page.goto("/nodes");
  await page.getByRole("link", { name: "Compare Nodes" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Compare Nodes" })).toBeVisible();
});
