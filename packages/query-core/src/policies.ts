import type { QueryPolicy, QueryPolicyConfig } from './types.js'

export const policyMap: Record<QueryPolicy, QueryPolicyConfig> = {
  static: {
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  },
  normal: {
    staleTime: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  },
  background: {
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  },
  critical: {
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: false,
    refetchOnWindowFocus: false
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
