import type { UserProvidersTable } from "@/db/types/user-providers.db-types.js";
import type { UsersTable } from "@/db/types/users.db-types.js";

export interface Database {
  users: UsersTable;
  userProviders: UserProvidersTable;
}
