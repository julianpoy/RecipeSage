import { SearchManager } from "../utils/SearchManager";
import { getLocalDb } from "../utils/localDb";

class SearchService {
  private managerP = getLocalDb().then((localDb) => new SearchManager(localDb));

  async getManager(): Promise<SearchManager> {
    return this.managerP;
  }
}

export const searchService = new SearchService();
