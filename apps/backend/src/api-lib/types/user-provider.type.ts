import { t } from "elysia";
import { UserProviderTypeSchema } from "@/api-lib/types/enums.type.js";

export const UserProviderSchema = t.Object({
  userId: t.String({
    description: "ID of the user",
    format: "uuid",
  }),
  providerType: UserProviderTypeSchema,
  accountId: t.String({
    description: "The account id associated with the provider",
  }),
});

export type UserProvider = typeof UserProviderSchema.static;
