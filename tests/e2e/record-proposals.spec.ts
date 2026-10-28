import { expect, test, type Page } from "@playwright/test";

import { waitForConfirmationLink } from "./helpers/mailpit";

// Knowledge enters as a proposal, never as a fact: a member proposes a
// period in someone's history from that person's page and sees it waiting
// for review. Acceptance rules are covered by
// supabase/tests/database/record_candidates.test.sql.

async function registerAndConfirm(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  const confirmLink = await waitForConfirmationLink(email);
  await page.goto(confirmLink);
}

test("a member proposes a period about someone, with its source", async ({ page }) => {
  await registerAndConfirm(page, `e2e-propose-${Date.now()}@example.com`, "correcthorse1");

  await page.goto("/people?q=arvoredo");
  await page.getByRole("link", { name: /Helena Arvoredo/ }).first().click();
  await page.getByRole("link", { name: /Know something about Helena Arvoredo/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: /Propose something about Helena Arvoredo/ })).toBeVisible();

  const period = page.locator("#period");
  await period.getByLabel("Institution name, if not in the list").fill("Estação Experimental do Km 41");
  await period.getByLabel("Role").selectOption({ index: 1 });
  await period.getByLabel("From (year)").fill("1988");
  await period.getByLabel("Until (year)").fill("1990");
  await period.getByLabel("What documents it").fill("Field roster 1988, page 2");
  await period.getByRole("button", { name: "Send for review" }).click();

  await expect(page.getByText("Sent. It waits for a steward")).toBeVisible();
  const mine = page.locator("#mine");
  await expect(mine.getByText(/Estação Experimental do Km 41 \(new institution\), 1988–1990/)).toBeVisible();
  await expect(mine.getByText("Waiting for review")).toBeVisible();
});

test("a proposal without a source is refused with a clear message", async ({ page }) => {
  await registerAndConfirm(page, `e2e-propose-bad-${Date.now()}@example.com`, "correcthorse1");
  await page.goto("/people?q=arvoredo");
  await page.getByRole("link", { name: /Helena Arvoredo/ }).first().click();
  await page.getByRole("link", { name: /Know something about Helena Arvoredo/ }).click();
  const period = page.locator("#period");
  await period.getByLabel("Institution name, if not in the list").fill("Somewhere");
  await period.getByLabel("Role").selectOption({ index: 1 });
  await period.getByLabel("What documents it").fill(" ");
  await period.getByRole("button", { name: "Send for review" }).click();
  await expect(page.getByText(/Say what documents this/)).toBeVisible();
});
