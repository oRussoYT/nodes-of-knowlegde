import { expect, test } from "@playwright/test";

// The plans page is public: three plans, and asking for one needs an account.
test("anyone can read the plans; asking needs sign-in", async ({ page }) => {
  await page.goto("/plans");
  await expect(page.getByRole("heading", { level: 1, name: "Plans" })).toBeVisible();
  for (const name of ["Conservation research", "University", "Research centre or museum"]) {
    await expect(page.getByRole("heading", { level: 2, name, exact: true })).toBeVisible();
  }
  await expect(page.getByText("Free (pro bono)")).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in to ask for a plan" })).toBeVisible();
});
