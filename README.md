# Mini Query Runtime

A small query runtime inspired by React Query, with a framework-agnostic core and thin React/Vue adapters.

## What This Project Focuses On

This repository keeps the runtime model explicit:

- `queryKey` identifies shared state
- `QueryDefinition` describes fetch + select + policy
- `QueryState` stores runtime data and observer lifecycle
- `promise` dedupe prevents duplicate in-flight requests
- `staleTime` controls freshness
- `gcTime` controls unused-state cleanup
- `refetchOnMount` and `refetchOnWindowFocus` drive event-based synchronization

The goal is clarity, not feature completeness.

## Core Model

### `QueryDefinition`

```ts
type QueryDefinition<TQueryFnData, TData = TQueryFnData> = {
  key: readonly unknown[]
  fetcher: () => Promise<TQueryFnData>
  select?: (data: TQueryFnData) => TData
  policy: QueryPolicy
  config?: Partial<QueryPolicyConfig>
}
```

`fetcher` returns raw server data.
`select` maps that raw payload into the data shape consumed by the UI.

Example:

```ts
export const API1_QUERY = {
  key: ['api1'] as const,
  fetcher: fetchApi1,
  select: (data) => data.payment,
  policy: 'normal'
}
```

### `QueryPolicyConfig`

```ts
type QueryPolicyConfig = {
  staleTime: number
  gcTime: number
  refetchOnMount: boolean
  refetchOnWindowFocus: boolean
}
```

`staleTime` answers: "Is cached data still fresh?"
`gcTime` answers: "How long should unused state remain in memory?"

### `QueryState`

Each query keeps runtime state such as:

- selected `data`
- `status`
- `error`
- `lastFetchedAt`
- `staleTime`
- `gcTime`
- `observers`
- in-flight `promise`
- resolved `fetcher`
- `refetchOnMount`
- `refetchOnWindowFocus`

The UI reads this state. The core owns the state transitions.

## Runtime Flow

### Mount

When `useQuery(queryDefinition)` mounts:

1. the runtime resolves or creates a shared `QueryState`
2. observer count increases
3. any scheduled GC timer is canceled
4. if the query has never fetched, it fetches immediately
5. otherwise, if the query is stale and `refetchOnMount` is true, it refetches

This keeps initial fetch and stale remount behavior separate.

### Window Focus

When the browser window regains focus, the runtime checks active queries:

- `observers > 0`
- `refetchOnWindowFocus === true`
- query is stale

If all three conditions match, the query refetches.

### Manual Refetch

`refetch()` always routes through the same `fetchQuery` path, so dedupe still works:

```ts
const { refetch } = useQuery(API1_QUERY)

await refetch()
```

If a request is already in flight, later calls reuse `state.promise`.

### Unmount and GC

When the last observer leaves:

1. observer count drops to `0`
2. the runtime schedules garbage collection using `gcTime`
3. if nothing remounts before the timer expires, the query state is removed

This is what creates a warm cache.

## Usage

### React

```ts
const { data, isLoading, refetch } = useQuery(API1_QUERY)
```

### Vue

```ts
const { data, isLoading, refetch } = useQuery(API1_QUERY)
```

In Vue, `data` and `isLoading` are refs.

### Preload with `refetch()`

For non-UI orchestration, the low-level core path is:

```ts
const resolvedConfig = resolveQueryConfig(
  PRELOAD_EXAMPLE_QUERY.policy,
  PRELOAD_EXAMPLE_QUERY.config
)

const state = getOrCreateState(
  PRELOAD_EXAMPLE_QUERY,
  createQueryStateConfig(PRELOAD_EXAMPLE_QUERY, resolvedConfig)
)

const refetch = () => fetchQuery(state)

await refetch()
```

This warms the cache through the same `refetch()`-driven fetch path used by the runtime.

## Design Notes

### `queryKey` is identity only

`queryKey` decides which shared state is reused.
It does not decide freshness or refetch timing.

### `staleTime` does not fetch by itself

When data becomes stale, nothing happens immediately.

Refetch only happens on explicit events:

- first mount
- stale remount with `refetchOnMount`
- window focus with `refetchOnWindowFocus`
- manual `refetch()`

### `gcTime` is separate from freshness

Stale data can still remain in memory.
Freshness and memory cleanup are different concerns.

### Critical flows may need stronger guarantees

This runtime now favors event-based synchronization over ad hoc freshness guards.

That makes the model simpler, but it does not automatically guarantee correctness for sensitive flows such as payments or account changes. Those cases may still need a higher-level orchestration layer that explicitly validates or refreshes data before continuing.

## Limitations

This project intentionally leaves out:

- retries
- cancellation
- invalidation
- mutations
- polling
- SSR hydration
- persistence

The adapters stay thin on purpose. More complex orchestration should live in the core, not inside React or Vue components.

## Summary

This repository demonstrates a small runtime with explicit rules:

- `select` shapes API data outside the UI
- `refetch()` is the manual fetch entry point
- `refetchOnMount` and `refetchOnWindowFocus` handle stale synchronization
- `staleTime` controls freshness
- `gcTime` controls memory cleanup
- `promise` dedupe prevents duplicate requests

It is meant to be read, extended, and used as a teaching-friendly architecture reference.
