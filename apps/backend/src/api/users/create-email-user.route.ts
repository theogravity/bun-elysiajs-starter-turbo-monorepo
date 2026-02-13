import { Elysia, t } from "elysia";
import { UserSchema } from "@/api-lib/types/user.type.js";
import { UserProviderSchema } from "@/api-lib/types/user-provider.type.js";
import { UserProviderType } from "@/db/types/user-providers.db-types.js";
import { contextPlugin } from "@/plugins/context.plugin.js";

const CreateEMailUserRequestSchema = t.Object({
  givenName: t.String({
    minLength: 1,
    maxLength: 50,
  }),
  familyName: t.String({
    minLength: 1,
    maxLength: 100,
  }),
  email: t.String({
    minLength: 3,
    maxLength: 255,
    format: "email",
  }),
  password: t.String({
    minLength: 8,
    maxLength: 64,
  }),
});

export type CreateEMailUserRequest = typeof CreateEMailUserRequestSchema.static;

const CreateEMailUserResponseSchema = t.Object({
  user: UserSchema,
  provider: UserProviderSchema,
});

export type CreateEMailUserResponse = typeof CreateEMailUserResponseSchema.static;

export const createEMailUserRoute = new Elysia().use(contextPlugin).post(
  "/email",
  async ({ body, ctx, log }) => {
    const { familyName, givenName, password, email } = body;

    log?.info(`Creating e-mail user: ${email}`);

    const user = await ctx.services.users.createEMailUser({
      user: {
        givenName,
        familyName,
      },
      email,
      password,
    });

    const response: CreateEMailUserResponse = {
      user: {
        id: user.id,
        givenName: user.givenName,
        familyName: user.familyName,
      },
      provider: {
        userId: user.id,
        providerType: UserProviderType.EMail,
        accountId: email,
      },
    };

    return response;
  },
  {
    body: CreateEMailUserRequestSchema,
    response: CreateEMailUserResponseSchema,
    detail: {
      operationId: "createEMailUser",
      tags: ["user"],
      description: "Create an e-mail-based account",
    },
  },
);
