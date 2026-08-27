import { expect } from "@playwright/test";
import { SMTP_WEB_URL } from "./ports";

interface Smtp4devMessage {
  id: string;
  to: string[];
  subject: string;
}

/**
 * Waits for an email to reach smtp4dev and returns its plain-text body.
 *
 * Mail is sent from inside a Better Auth handler and is not awaited by the
 * request, so it lands shortly after the response. Polling rather than sleeping
 * keeps the test fast when it is quick and reliable when the machine is loaded.
 */
export async function waitForEmail({
  to,
  subject,
  timeoutMs = 15_000,
}: {
  to: string;
  subject: string;
  timeoutMs?: number;
}): Promise<string> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const response = await fetch(
      `${SMTP_WEB_URL}/api/messages?pageSize=100&sortColumn=receivedDate&sortIsDescending=true`,
    );
    const { results } = (await response.json()) as { results: Smtp4devMessage[] };

    const match = results.find((message) => message.to.includes(to) && message.subject === subject);

    if (match) {
      const body = await fetch(`${SMTP_WEB_URL}/api/messages/${match.id}/plaintext`);

      return body.text();
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`No email to ${to} with subject "${subject}" arrived within ${timeoutMs}ms`);
}

/** Pulls the first http(s) URL out of an email body. */
export function extractLink(body: string): string {
  const match = body.match(/https?:\/\/\S+/);

  expect(match, `no link found in email body:\n${body}`).not.toBeNull();

  return match?.[0] ?? "";
}

/** A fresh address per test, so specs never collide over a unique email. */
export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@e2e.test`;
}
