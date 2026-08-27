import { faker } from "@faker-js/faker";
import { sql } from "kysely";
import { db } from "@/db/index.js";
import { enableLoggingForTest } from "@/test-utils/logging.js";
import { testApp } from "@/test-utils/test-server.js";

/** Headers that authenticate a request as the generated user. */
export interface TestHeaders extends Record<string, string | undefined> {
  /** Better Auth session cookie. */
  cookie: string;
}

export interface TestUser {
  id: string;
  email: string;
  name: string;
}

export interface TestFacets {
  user: TestUser;
  /** Spread onto a `testApi` call to make it authenticated. */
  headers: TestHeaders;
  /** The generated password, for tests that sign in again. */
  password: string;
}

export interface TestFacetParams {
  /** Turns server-side logging on for the current test. */
  withLogging?: boolean;
  /** Promotes the user to `admin` so the Better Auth admin endpoints accept them. */
  asAdmin?: boolean;
}

/**
 * Creates real users through Better Auth rather than inserting rows.
 *
 * Going through the HTTP endpoint means tests exercise the same sign-up path as the
 * browser: password hashing, session creation, and the `Set-Cookie` header that
 * authenticates later requests.
 */
export class ApiTestingFramework {
  /**
   * Signs up a fresh user and returns the session cookie needed to act as them.
   */
  async generateTestFacets(params?: TestFacetParams): Promise<TestFacets> {
    if (params?.withLogging) {
      enableLoggingForTest();
    }

    const email = faker.internet.email().toLowerCase();
    const password = faker.internet.password({ length: 16 });
    const name = faker.person.fullName();

    const response = await testApp.handle(
      new Request("http://localhost/api/auth/sign-up/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      }),
    );

    if (!response.ok) {
      throw new Error(`Test sign-up failed (${response.status}): ${await response.text()}`);
    }

    const { user } = (await response.json()) as { user: TestUser };

    if (params?.asAdmin) {
      await this.promoteToAdmin(user.id);
    }

    return {
      user,
      password,
      headers: { cookie: extractSessionCookie(response) },
    };
  }

  /** Signs in an existing user and returns fresh auth headers. */
  async signIn({ email, password }: { email: string; password: string }): Promise<TestHeaders> {
    const response = await testApp.handle(
      new Request("http://localhost/api/auth/sign-in/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      }),
    );

    if (!response.ok) {
      throw new Error(`Test sign-in failed (${response.status}): ${await response.text()}`);
    }

    return { cookie: extractSessionCookie(response) };
  }

  /**
   * Sets a user's role directly.
   *
   * Better Auth's admin endpoints require an existing admin, so the first one has to
   * be made out of band. This is the only place that writes to a Better Auth table
   * directly; everything else goes through `auth.api.*`.
   */
  async promoteToAdmin(userId: string): Promise<void> {
    await sql`update users set role = 'admin' where id = ${userId}`.execute(db);
  }
}

/** Collapses the `Set-Cookie` headers of a response into a `Cookie` request header. */
function extractSessionCookie(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
}

export const testFramework: ApiTestingFramework = new ApiTestingFramework();
