import type { DeleteResult, Kysely } from "kysely";
import { BaseRepository } from "@/db/repositories/base.repository.js";
import type { Database } from "@/db/types/index.js";
import type { NewUser, UserDb, UserUpdate } from "@/db/types/users.db-types.js";

/**
 * Stores profile information for users.
 */
export class UsersRepository extends BaseRepository {
  async createUser({ db, user }: { db: Kysely<Database>; user: NewUser }): Promise<UserDb> {
    return db.insertInto("users").values(user).returningAll().executeTakeFirstOrThrow();
  }

  async getUserById({ db, userId }: { db: Kysely<Database>; userId: string }): Promise<UserDb | undefined> {
    return db.selectFrom("users").selectAll().where("id", "=", userId).executeTakeFirst();
  }

  /**
   * Returns a page of users, newest first.
   */
  async listUsers({ db, limit, offset }: { db: Kysely<Database>; limit: number; offset: number }): Promise<UserDb[]> {
    return db.selectFrom("users").selectAll().orderBy("createdAt", "desc").limit(limit).offset(offset).execute();
  }

  /**
   * Returns the total number of users, ignoring pagination.
   */
  async countUsers({ db }: { db: Kysely<Database> }): Promise<number> {
    const { count } = await db
      .selectFrom("users")
      .select((eb) => eb.fn.countAll().as("count"))
      .executeTakeFirstOrThrow();

    return Number(count);
  }

  async removeUserById({ db, userId }: { db: Kysely<Database>; userId: string }): Promise<DeleteResult[]> {
    return db.deleteFrom("users").where("id", "=", userId).execute();
  }

  async updateUser({ db, userId, user }: { db: Kysely<Database>; userId: string; user: UserUpdate }): Promise<UserDb> {
    return db.updateTable("users").set(user).where("id", "=", userId).returningAll().executeTakeFirstOrThrow();
  }
}
