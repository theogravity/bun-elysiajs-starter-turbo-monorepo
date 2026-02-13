import { Elysia } from "elysia";

export const testHeadersPlugin = new Elysia({ name: "test-headers" }).derive(({ headers }) => ({
  userId: (headers["test-user-id"] ?? "") as string,
}));
