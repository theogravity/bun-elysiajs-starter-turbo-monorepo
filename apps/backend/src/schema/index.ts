import { Elysia } from "elysia";
import { UserSchema } from "@/schema/user.type.js";
import { UserProviderSchema } from "@/schema/user-provider.type.js";

export const apiModels = new Elysia({ name: "api-models" }).model({
  User: UserSchema,
  UserProvider: UserProviderSchema,
});
