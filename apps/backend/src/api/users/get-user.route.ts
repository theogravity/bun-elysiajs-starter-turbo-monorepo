import { BackendErrorCodes } from "@internal/backend-errors";
import { Elysia, t } from "elysia";
import { apiErrorBody } from "@/lib/api-error.js";
import { contextPlugin } from "@/plugins/context.plugin.js";
import { apiModels } from "@/schema/index.js";
import { UserSchema } from "@/schema/user.type.js";

const GetUserParamsSchema = t.Object({
  userId: t.String({
    format: "uuid",
    description: "ID of the user to fetch",
  }),
});

export type GetUserParams = typeof GetUserParamsSchema.static;

const GetUserResponseSchema = t.Object({
  user: UserSchema,
});

export type GetUserResponse = typeof GetUserResponseSchema.static;

export const getUserRoute = new Elysia()
  .use(contextPlugin)
  .use(apiModels)
  .get(
    "/:userId",
    async ({ params, ctx, log, status }) => {
      const { userId } = params;

      // Structured metadata rather than an interpolated string: the fields stay
      // queryable, and `log` is request-scoped so the request id is attached for you.
      log?.withMetadata({ userId }).info("Fetching user");

      const user = await ctx.services.users.getUserById({ userId });

      // Return the failure rather than throwing it. Only a returned status is
      // checked against the response schema below and narrowed by status code for
      // Eden Treaty clients.
      if (!user) {
        return status(
          404,
          apiErrorBody({
            code: BackendErrorCodes.NOT_FOUND_ERROR,
            message: "No user exists with that ID",
            metadataSafe: { userId },
          }),
        );
      }

      const response: GetUserResponse = {
        user: {
          id: user.id,
          givenName: user.givenName,
          familyName: user.familyName,
        },
      };

      return response;
    },
    {
      params: GetUserParamsSchema,
      response: {
        200: GetUserResponseSchema,
        // Reference a registered model by name so OpenAPI emits a $ref to the
        // shared ApiErrorResponse component instead of inlining a copy per route.
        404: "ApiErrorResponse",
      },
      detail: {
        operationId: "getUser",
        tags: ["user"],
        description: "Fetch a single user by ID",
      },
    },
  );
