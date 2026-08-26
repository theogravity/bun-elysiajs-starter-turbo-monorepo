import { Elysia } from "elysia";
import { ApiErrorResponseSchema } from "@/schema/error.type.js";
import { UserSchema } from "@/schema/user.type.js";
import { UserProviderSchema } from "@/schema/user-provider.type.js";

export const apiModels = new Elysia({ name: "api-models" }).model({
  ApiErrorResponse: ApiErrorResponseSchema,
  User: UserSchema,
  UserProvider: UserProviderSchema,
});
