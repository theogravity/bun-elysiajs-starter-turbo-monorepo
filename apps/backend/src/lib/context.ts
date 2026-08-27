import type { Kysely } from "kysely";
import type { ILogLayer } from "loglayer";
import { db } from "@/db/index.js";
import { NotesRepository } from "@/db/repositories/notes.repository.js";
import type { Database } from "@/db/types/index.js";
import type { Services } from "@/services/index.js";
import { NotesService } from "@/services/notes.service.js";
import { getLogger } from "@/utils/logger.js";

export type ApiContextParams = {
  db: Kysely<Database>;
  log: ILogLayer;
};

export class ApiContext {
  readonly log: ILogLayer;
  services: Services;
  private readonly params: ApiContextParams;

  constructor(params: ApiContextParams) {
    this.params = params;
    this.log = params.log;
    this.services = {} as Services;
    this.init();
  }

  private init() {
    const params = this.params;

    const serviceParams = {
      log: params.log,
      db: params.db,
      repos: {
        notes: new NotesRepository(params),
      },
    };

    this.services = {
      notes: new NotesService(serviceParams),
    };

    for (const service of Object.values(this.services)) {
      service.withServices(this.services);
    }
  }
}

let requestlessContext: ApiContext;

/**
 * This is a singleton context that can be used outside of a request.
 * It will not have anything request-specific attached to it.
 */
export function getRequestlessContext(): ApiContext {
  if (!requestlessContext) {
    requestlessContext = new ApiContext({
      db,
      log: getLogger(),
    });
  }

  return requestlessContext;
}
