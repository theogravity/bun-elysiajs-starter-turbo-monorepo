import type { UserProvidersRepository } from "@/db/repositories/user-providers.repository.js";
import type { UsersRepository } from "@/db/repositories/users.repository.js";

export interface Repositories {
  users: UsersRepository;
  userProviders: UserProvidersRepository;
}
