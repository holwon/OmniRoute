import { SEARCH_PROVIDERS } from "../../config/searchRegistry";

/**
 * Dynamically generates a tuple of active search provider IDs for Zod enums.
 * Filters out any providers marked as disabled in the registry.
 */
export function getActiveSearchProviders(): [string, ...string[]] {
  const activeProviders = Object.values(SEARCH_PROVIDERS)
    .filter((provider) => !provider.disabled)
    .map((provider) => provider.id);

  if (activeProviders.length === 0) {
    return ["none_available"];
  }

  return activeProviders as [string, ...string[]];
}
