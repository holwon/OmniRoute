import type { RegistryEntry } from "../../shared.ts";
import { GLM_SHARED_MODELS } from "../../../glmProvider.ts";

/**
 * Local ZCode app-server backend. Authentication remains in the user's local
 * ZCode profile (`builtin:zai-coding-plan`); OmniRoute does not receive or
 * persist the Z.ai credential.
 */
export const zcodeProvider: RegistryEntry = {
  id: "zcode",
  alias: "zc",
  format: "openai",
  executor: "zcode",
  baseUrl: "zcode://app-server/stdio",
  authType: "none",
  authHeader: "none",
  models: [...GLM_SHARED_MODELS],
};
