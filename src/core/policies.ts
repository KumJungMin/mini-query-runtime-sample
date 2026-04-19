import type { QueryPolicy, QueryPolicyConfig } from './types.js'

/** 
   * static policy: Data fetched with this policy is considered always fresh and will never be garbage collected. This is useful for data that rarely changes, such as application configuration or user settings.
   * normal policy: This is the default policy. Data is considered fresh for 5 minutes and will be garbage collected after 5 minutes of being stale. The system will automatically refetch data when it becomes stale.
   * background policy: Data is considered fresh for 1 minute and will be garbage collected after 5 minutes of being stale. The system will automatically refetch data when it becomes stale. This is suitable for data that changes frequently but can tolerate some staleness, such as notifications or messages.
   * critical policy: Data fetched with this policy is considered always stale and will be garbage collected immediately when it becomes stale. This is useful for data that must always be
   * */ 
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
