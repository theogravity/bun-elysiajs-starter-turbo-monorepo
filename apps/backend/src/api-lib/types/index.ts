import { Elysia } from "elysia";
import { UserSchema } from "@/api-lib/types/user.type.js";
import { UserProviderSchema } from "@/api-lib/types/user-provider.type.js";

export const apiModels = new Elysia({ name: "api-models" }).model({
  User: UserSchema,
  UserProvider: UserProviderSchema,
});
