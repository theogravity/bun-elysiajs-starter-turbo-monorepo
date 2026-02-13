import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import { testFramework } from "@/test-utils/test-framework/index.js";
import { testApi } from "@/test-utils/test-server.js";

describe("Create e-mail user API", () => {
  it("should create an e-mail user", async () => {
    const { headers } = await testFramework.generateTestFacets({
      withLogging: true,
    });

    const { data, status } = await testApi.users.email.post(
      {
        givenName: faker.person.firstName(),
        familyName: faker.person.firstName(),
        email: faker.internet.email(),
        password: faker.internet.password(),
      },
      {
        headers,
      },
    );

    expect(status).toBe(200);
    expect(data?.user.id).toBeDefined();
  });
});
