import { expect, type Page, test } from "@playwright/test";
import { uniqueEmail } from "../mail";

const PASSWORD = "correct-horse-battery";

async function signUp(page: Page): Promise<string> {
  const email = uniqueEmail("notes");

  await page.goto("/signup");
  await page.getByLabel("Name", { exact: true }).fill("Note Owner");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page.getByRole("heading", { name: /Notes/ })).toBeVisible();

  return email;
}

test.describe("Notes", () => {
  test("creates a note and shows it in the list", async ({ page }) => {
    await signUp(page);

    await page.getByLabel("Title", { exact: true }).fill("Buy milk");
    await page.getByLabel("Body", { exact: true }).fill("Two litres, semi-skimmed");
    await page.getByRole("button", { name: "Add note" }).click();

    await expect(page.getByText("Buy milk")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Notes (1)" })).toBeVisible();
  });

  test("shows a field error without submitting an empty note", async ({ page }) => {
    await signUp(page);

    await page.getByRole("button", { name: "Add note" }).click();

    await expect(page.getByText("Give the note a title")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Notes (0)" })).toBeVisible();
  });

  test("keeps one user's notes invisible to another", async ({ page, context }) => {
    await signUp(page);
    await page.getByLabel("Title", { exact: true }).fill("Private thought");
    await page.getByLabel("Body", { exact: true }).fill("Not for you");
    await page.getByRole("button", { name: "Add note" }).click();
    await expect(page.getByText("Private thought")).toBeVisible();

    // A second browser context is a second cookie jar, so this is a genuinely
    // different signed-in user rather than the same session.
    const browser = context.browser();

    if (!browser) {
      throw new Error("no browser available for a second context");
    }

    const otherPage = await browser.newPage();
    await signUp(otherPage);

    await expect(otherPage.getByRole("heading", { name: "Notes (0)" })).toBeVisible();
    await expect(otherPage.getByText("Private thought")).toBeHidden();

    await otherPage.close();
  });
});
