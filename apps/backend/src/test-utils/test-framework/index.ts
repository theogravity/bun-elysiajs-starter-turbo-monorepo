import { faker } from "@faker-js/faker";
import { db } from "@/db/index.js";
import { ApiContext } from "@/lib/context.js";
import type { User } from "@/schema/user.type.js";
import { enableLoggingForTest } from "@/test-utils/logging.js";
import { getLogger } from "@/utils/logger.js";

export interface TestHeaders extends Record<string, string | undefined> {
  // test- prefix are test-specific headers
  "test-user-id": string;
}

export interface TestFacets {
  user: User;
  headers: TestHeaders;
}

export interface TestFacetParams {
  /**
   * Turns server-side logging on for the rest of the current test. Equivalent to
   * calling `enableLoggingForTest()` yourself; see `@/test-utils/logging.js`.
   */
  withLogging?: boolean;
}

export class ApiTestingFramework {
  context: ApiContext;

  constructor() {
    this.context = new ApiContext({
      db,
      log: getLogger(),
    });
  }

  /**
   * Generates a set of test facets that can be used to test the API.
   * This includes an organization, an owner user, and an API key.
   */
  async generateTestFacets(params?: TestFacetParams): Promise<TestFacets> {
    if (params?.withLogging) {
      // Must happen before any request: a per-request child logger derived while
      // the parent is disabled stays silent for the life of that request.
      enableLoggingForTest();
    }

    const user = await this.context.services.users.createEMailUser({
      email: faker.internet.email(),
      password: faker.internet.password(),
      user: {
        familyName: faker.person.lastName(),
        givenName: faker.person.firstName(),
      },
    });

    return {
      user,
      headers: this.generateTestHeaders({ user }),
    };
  }

  async generateNewUsers(count: number): Promise<User[]> {
    const users: User[] = [];

    for (let i = 0; i < count; i++) {
      const user = await this.context.services.users.createEMailUser({
        email: faker.internet.email(),
        password: faker.internet.password(),
        user: {
          familyName: faker.person.lastName(),
          givenName: faker.person.firstName(),
        },
      });
      users.push(user);
    }

    return users;
  }

  private generateTestHeaders(facets: Omit<TestFacets, "headers">): TestHeaders {
    return {
      "test-user-id": facets.user.id,
    };
  }
}

export const testFramework: ApiTestingFramework = new ApiTestingFramework();
