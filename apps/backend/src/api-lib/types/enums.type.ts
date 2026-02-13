import { t } from "elysia";
import { UserProviderType } from "@/db/types/user-providers.db-types.js";

// Don't use t.Enum. You won't get proper typescript types in
// the client generation or Swagger UI.
export const UserProviderTypeSchema = t.String({
  enum: Object.values(UserProviderType),
  title: "Auth provider type",
  description: "The type of the auth provider",
});
