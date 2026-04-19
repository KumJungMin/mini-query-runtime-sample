import type { QueryPolicy, QueryPolicyConfig } from './types.js'

export const policyMap: Record<QueryPolicy, QueryPolicyConfig> = {
  static: {
    staleTime: Infinity,
    cacheTime: Infinity,
    autoRefetch: false
  },
  normal: {
    staleTime: 5 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
    autoRefetch: true
  },
  background: {
    staleTime: 60 * 1000,
    cacheTime: 5 * 60 * 1000,
    autoRefetch: true
  },
  critical: {
    staleTime: 0,
    cacheTime: 0,
    autoRefetch: false
  }
}

export function resolveQueryConfig(
  policy: QueryPolicy,
  override?: Partial<QueryPolicyConfig>
): QueryPolicyConfig {
  return {
    ...policyMap[policy],
    ...override
  }
}
