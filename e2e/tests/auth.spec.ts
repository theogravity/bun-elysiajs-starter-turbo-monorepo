import { expect, type Page, test } from "@playwright/test";
import { extractLink, uniqueEmail, waitForEmail } from "../mail";

const PASSWORD = "correct-horse-battery";

/** Signs a new user up through the UI and returns the address used. */
async function signUp(page: Page): Promise<string> {
  const email = uniqueEmail("auth");

  await page.goto("/signup");
  await page.getByLabel("Name", { exact: true }).fill("Ada Lovelace");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign up" }).click();

  await expect(page.getByRole("heading", { name: /Notes/ })).toBeVisible();

  return email;
}

test.describe("Authentication", () => {
  test("signs up, lands on notes, and shows the user in the nav", async ({ page }) => {
    await signUp(page);

    await expect(page).toHaveURL(/\/notes$/);
    await expect(page.getByRole("link", { name: "Ada Lovelace" })).toBeVisible();
  });

  test("sends a verification email on sign-up", async ({ page }) => {
    const email = await signUp(page);

    const body = await waitForEmail({ to: email, subject: "Verify your email address" });

    expect(extractLink(body)).toContain("/api/auth/verify-email");
  });

  test("validates on the client before calling the API", async ({ page }) => {
    await page.goto("/signin");

    let called = false;
    await page.route("**/api/auth/sign-in/**", (route) => {
      called = true;
      return route.abort();
    });

    await page.getByLabel("Email", { exact: true }).fill("not-an-email");
    await page.getByLabel("Password", { exact: true }).fill("something");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Enter a valid email address")).toBeVisible();
    expect(called, "the client schema should have stopped this before any request").toBe(false);
  });

  test("shows the server's message for a wrong password", async ({ page }) => {
    const email = await signUp(page);

    await page.goto("/account");
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/signin$/);

    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill("definitely-the-wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL(/\/signin$/);
  });

  test("resets a password end to end, through the emailed link", async ({ page }) => {
    const email = await signUp(page);
    const newPassword = "a-brand-new-password";

    await page.goto("/account");
    await page.getByRole("button", { name: "Sign out" }).click();

    await page.goto("/forgot-password");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();

    // The link goes to the backend, which validates the token and redirects to
    // /reset-password?token=… — following it exercises that whole handoff.
    const body = await waitForEmail({ to: email, subject: "Reset your password" });
    await page.goto(extractLink(body));

    await expect(page.getByRole("heading", { name: "Choose a new password" })).toBeVisible();
    await page.getByLabel("New password", { exact: true }).fill(newPassword);
    await page.getByLabel("Confirm password", { exact: true }).fill(newPassword);
    await page.getByRole("button", { name: "Set new password" }).click();

    await expect(page).toHaveURL(/\/signin$/);

    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(newPassword);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByRole("heading", { name: /Notes/ })).toBeVisible();
  });

  test("sends an unauthenticated visitor to sign in", async ({ page }) => {
    await page.goto("/notes");

    await expect(page).toHaveURL(/\/signin$/);
  });
});
