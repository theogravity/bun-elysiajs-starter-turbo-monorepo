import { Elysia, t } from "elysia";
import { contextPlugin } from "@/plugins/context.plugin.js";
import { apiModels } from "@/schema/index.js";
import { UserSchema } from "@/schema/user.type.js";

const ListUsersQuerySchema = t.Object({
  limit: t.Optional(
    t.Number({
      default: 25,
      minimum: 1,
      maximum: 100,
      description: "Maximum number of users to return",
    }),
  ),
  offset: t.Optional(
    t.Number({
      default: 0,
      minimum: 0,
      description: "Number of users to skip, for pagination",
    }),
  ),
});

export type ListUsersQuery = typeof ListUsersQuerySchema.static;

const ListUsersResponseSchema = t.Object({
  users: t.Array(UserSchema, {
    description: "The requested page of users, newest first",
  }),
  total: t.Number({
    description: "Total number of users, ignoring pagination",
  }),
});

export type ListUsersResponse = typeof ListUsersResponseSchema.static;

export const listUsersRoute = new Elysia()
  .use(contextPlugin)
  .use(apiModels)
  .get(
    "/",
    async ({ query, ctx, log }) => {
      const limit = query.limit ?? 25;
      const offset = query.offset ?? 0;

      log?.info(`Listing users: limit=${limit} offset=${offset}`);

      const { users, total } = await ctx.services.users.listUsers({ limit, offset });

      // Map DB rows onto the response shape explicitly. Returning a row as-is would
      // leak columns (createdAt, updatedAt) that the response schema does not declare.
      const response: ListUsersResponse = {
        users: users.map((user) => ({
          id: user.id,
          givenName: user.givenName,
          familyName: user.familyName,
        })),
        total,
      };

      return response;
    },
    {
      query: ListUsersQuerySchema,
      response: {
        200: ListUsersResponseSchema,
        400: "ApiErrorResponse",
      },
      detail: {
        operationId: "listUsers",
        tags: ["user"],
        description: "List users, newest first",
      },
    },
  );
