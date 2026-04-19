# Mini Query Runtime

A minimal query runtime system inspired by React Query, built to explain the core mechanics without hiding them behind a large framework abstraction.

## What This Project Is

This repository is a small, framework-aware data query runtime with a framework-agnostic core.

It includes:

- A pure TypeScript core for query state, freshness checks, fetch deduplication, and cache garbage collection
- A React `useQuery` hook
- A Vue `useQuery` hook
- A small sample query and entry file for runtime experimentation

The goal is not to re-create all of React Query. The goal is to make the runtime model easy to read, reason about, and extend.

## Why This Project Exists

Most production query libraries are powerful, but their internals can feel opaque when you are learning how cache state, stale checks, and request deduplication work.

This repository exists to make those internals explicit:

- Why data is fetched
- When cached data is considered stale
- How duplicate in-flight requests are prevented
- Why unused cache entries are eventually removed
- How UI frameworks connect to the runtime without owning the core logic

It is intentionally small so developers can study the design and migrate the ideas into a larger architecture later.

## Problems This Project Solves

Without a query runtime, UI code often ends up with:

- Repeated fetch logic inside components
- Duplicate requests for the same resource
- No shared understanding of cached vs stale data
- Ad hoc loading and error handling
- Memory that grows because old results are never cleaned up

This project solves those problems with a few explicit runtime rules:

- `queryKey` identifies one logical piece of data
- `QueryDefinition` defines how that data is fetched
- `QueryState` stores the shared runtime state
- `promise` deduplication prevents duplicate in-flight requests
- `observers` track active usage from the UI
- `cacheTime` removes unused cache entries later
- `ensureFresh` can guarantee freshness before important actions

## Core Concepts

### `queryKey`

`queryKey` is the identity of the data.

It does:

- identify one query in the store
- decide which cache entry is reused

It does not:

- decide whether data is stale
- decide when to refetch

Example:

```ts
['api1']
```

This project intentionally treats `queryKey` as identity only.

### `QueryDefinition`

A `QueryDefinition` bundles the query identity, fetch logic, and policy.

```ts
export const API1_QUERY = {
  key: ['api1'] as const,
  fetcher: fetchApi1,
  policy: 'normal'
}
```

This keeps query metadata outside the UI layer.

### `QueryState`

`QueryState` is the in-memory runtime record for one query.

It stores:

- current `data`
- `status` such as `idle`, `loading`, `success`, or `error`
- `error`
- `lastFetchedAt`
- `staleTime`
- `cacheTime`
- active `observers`
- current in-flight `promise`

The hooks read from this state. The core mutates it.

### `staleTime`

`staleTime` controls freshness.

- If data is still within `staleTime`, it is treated as fresh.
- If data is older than `staleTime`, it is stale and may be refetched.

This answers: "Should the runtime trust the cached data?"

### `cacheTime`

`cacheTime` controls memory cleanup.

- If no one is observing a query, the runtime schedules garbage collection.
- When `cacheTime` passes, the cached state can be removed.

This answers: "How long should unused query state stay in memory?"

### `observers`

`observers` count how many active UI consumers are using the query.

- mount: increment
- unmount: decrement
- when the count reaches `0`, GC can be scheduled

This lets the runtime separate active usage from passive cache storage.

### `promise` dedupe

If a fetch is already running, the state stores the in-flight `promise`.

Any later request for the same query returns the same promise instead of starting another network call.

This is the core deduplication rule.

### `ensureFresh`

`ensureFresh` is an explicit freshness guard.

- `useQuery` reads and subscribes to state from the UI
- `ensureFresh` guarantees freshness before an important action

That distinction is intentional. Reads and actions are not the same concern.

## How the Runtime Works

### When `useQuery` mounts

When a React or Vue component calls `useQuery(queryDef)`:

1. the runtime resolves the shared `QueryState` from the store
2. observer count increases
3. any pending GC timer is canceled
4. the runtime checks whether the query should auto-refetch
5. the hook subscribes to state updates and renders the latest snapshot

### How stale data is checked

The core compares:

- `Date.now()`
- `state.lastFetchedAt`
- `state.staleTime`

If the data has never been fetched, it is treated as stale.  
If enough time has passed, it is also stale.

### When fetch happens

Fetch runs when:

- the query is stale and the policy enables auto refetch on mount
- `refetch()` is called
- `ensureFresh(...)` decides the query must be refreshed before an action

### How duplicate requests are prevented

`fetchQuery` stores the current promise in `state.promise`.

If another request arrives before the first one finishes:

- the runtime returns the same promise
- no second fetch starts

This is promise-based deduplication.

### What happens on unmount

When a component unmounts:

1. observer count decreases
2. if the count becomes `0`, the runtime schedules garbage collection using `cacheTime`

The cached data is still available for a while. That is what creates a warm cache.

### How GC works

GC does not remove state immediately when a component unmounts.

Instead:

1. the runtime sets a timeout
2. if no observer comes back before the timeout finishes, the query is removed from the store
3. if an observer returns in time, the scheduled GC is canceled

This balances reuse and memory cleanup.

### What "warm cache" means

A warm cache means:

- the component that used the query may be gone
- but the query state is still in memory
- so a later mount can reuse the cached result immediately

Warm cache is controlled by `cacheTime`, not `staleTime`.

## Usage Examples

### Define a query

```ts
import { fetchApi1 } from '../api/api1'

export const API1_QUERY = {
  key: ['api1'] as const,
  fetcher: fetchApi1,
  policy: 'normal'
}
```

### React `useQuery`

```ts
const { data, isLoading } = useQuery(API1_QUERY)
```

### Vue `useQuery`

```ts
const { data, isLoading } = useQuery(API1_QUERY)
```

In Vue, `data` and `isLoading` are refs.

### `ensureFresh`

Conceptual usage:

```ts
await ensureFresh(API1_QUERY)
```

Current low-level usage in this repository:

```ts
const config = policyMap[API1_QUERY.policy]
const state = getOrCreateState(API1_QUERY.key, config)

await ensureFresh(API1_QUERY, state)
```

### Before a critical action

Conceptual flow:

```ts
await ensureFresh(API1_QUERY)
router.push('/account-change')
```

Current low-level flow:

```ts
const config = policyMap[API1_QUERY.policy]
const state = getOrCreateState(API1_QUERY.key, config)

await ensureFresh(API1_QUERY, state)
router.push('/account-change')
```

Use this pattern when navigation, mutation, or another important action should not continue with stale data.

## Important Design Decisions

### Explicit freshness control

Freshness is not magical. The core checks freshness from `lastFetchedAt` and `staleTime`.

### `queryKey` is identity only

`queryKey` identifies cached data. It is not a refetch condition system.

### `ensureFresh` is manual, not automatic

`ensureFresh` is reserved for important action boundaries, preload steps, or orchestration code.

This keeps intent explicit:

- `useQuery` reads data
- `ensureFresh` guarantees freshness

### `cacheTime` manages memory

Unused state remains reusable for a period of time, then gets removed.

That trade-off keeps cache useful without growing forever.

## Trade-Offs / Limitations

This project intentionally chooses clarity over feature completeness.

Current limitations include:

- no retries
- no cancellation
- no mutation system
- no invalidation API
- no pagination or infinite query support
- no background refetch intervals
- no SSR hydration model
- no persistence layer

The hooks are intentionally thin. More advanced orchestration should live in the core, not in React or Vue components.

## Future Direction

A likely migration path for this repository is:

1. keep the current core framework-agnostic
2. add a public query client or orchestrator layer
3. move explicit state resolution behind higher-level APIs
4. introduce invalidation and mutations
5. support prefetch, server rendering, and persistence

That direction keeps the clean architecture boundary intact:

- framework adapters in the presentation layer
- runtime logic in the core/domain-oriented layer

## Summary

This project is a teaching-friendly query runtime with a small but explicit design:

- `useQuery` reads data
- `ensureFresh` guards important actions
- `queryKey` identifies data
- `staleTime` controls freshness
- `cacheTime` controls memory cleanup
- `promise` dedupe prevents duplicate requests
- `observers` track active usage

If you want to understand how a query system works internally before adopting or designing a larger one, this repository is the starting point.
