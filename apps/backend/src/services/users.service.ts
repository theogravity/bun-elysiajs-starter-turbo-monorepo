import bcrypt from "bcryptjs";
import { PasswordAlgo, UserProviderType } from "@/db/types/user-providers.db-types.js";
import type { NewUser, UserDb } from "@/db/types/users.db-types.js";
import { BaseService } from "@/services/base.service.js";

export class UsersService extends BaseService {
  /**
   * Creates a user together with their e-mail auth provider record.
   *
   * Both writes share a single transaction: the `db` handle produced by
   * `this.db.transaction()` is threaded into each repository call.
   */
  async createEMailUser({
    user,
    email,
    password,
  }: {
    user: NewUser;
    email: string;
    password: string;
  }): Promise<UserDb> {
    const pass = await bcrypt.hash(password, 12);

    // Take the row from inside the transaction callback: `execute()` resolves to
    // whatever the callback returns. Assigning to an outer `let` instead would give
    // it type `UserDb | undefined`, since the compiler cannot prove the callback ran.
    const createdUser = await this.db.transaction().execute(async (db) => {
      const created = await this.repos.users.createUser({
        db,
        user,
      });

      await this.repos.userProviders.createUserProvider({
        db,
        userProvider: {
          providerType: UserProviderType.EMail,
          providerAccountId: email,
          passwordAlgo: PasswordAlgo.BCrypt12,
          passwordHash: pass,
          userId: created.id,
        },
      });

      return created;
    });

    // `this.log` comes from BaseService and is the request-scoped logger, so this
    // line carries the same request id as the route's. Services log outcomes and
    // decisions; repositories do not log at all.
    this.log
      .withMetadata({ userId: createdUser.id, providerType: UserProviderType.EMail })
      .debug("Created e-mail user");

    return createdUser;
  }

  /**
   * Fetches a single user.
   *
   * Returns `undefined` rather than raising when the user does not exist. Mapping
   * that outcome onto an HTTP status is the route's job — see the note on
   * never-throw in `apps/backend/AGENTS.md`.
   *
   * @param userId - ID of the user to fetch
   * @returns The user record, or `undefined` if no user has that ID
   */
  async getUserById({ userId }: { userId: string }): Promise<UserDb | undefined> {
    return this.repos.users.getUserById({ db: this.db, userId });
  }

  /**
   * Returns a page of users along with the total row count.
   */
  async listUsers({ limit, offset }: { limit: number; offset: number }): Promise<{ users: UserDb[]; total: number }> {
    const [users, total] = await Promise.all([
      this.repos.users.listUsers({ db: this.db, limit, offset }),
      this.repos.users.countUsers({ db: this.db }),
    ]);

    return { users, total };
  }
}
