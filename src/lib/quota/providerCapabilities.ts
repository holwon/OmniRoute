export interface ProviderCapabilities {
  providerId: string;
  quotaApi: boolean;
  usageApi: boolean;
  rateLimitHeaders: boolean;
  streaming: boolean;
  toolUse: boolean;
  coding: boolean;
  vision: boolean;
  longContext: boolean;
}

const registry = new Map<string, ProviderCapabilities>();

export function registerProviderCapabilities(capabilities: ProviderCapabilities): void {
  registry.set(capabilities.providerId, { ...capabilities });
}

export function getProviderCapabilities(providerId: string): ProviderCapabilities {
  return (
    registry.get(providerId) ?? {
      providerId,
      quotaApi: false,
      usageApi: false,
      rateLimitHeaders: false,
      streaming: false,
      toolUse: false,
      coding: false,
      vision: false,
      longContext: false,
    }
  );
}

export function listProviderCapabilities(): ProviderCapabilities[] {
  return [...registry.values()].map((capabilities) => ({ ...capabilities }));
}
