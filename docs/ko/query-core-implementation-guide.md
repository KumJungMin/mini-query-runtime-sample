# packages/query-core

## 먼저 큰 그림

`packages/query-core`는 React나 Vue를 직접 알지 못합니다. UI 프레임워크와 독립적인 순수 코어입니다.

React/Vue 쪽에서는 `useQuery()` 같은 adapter를 제공하고, 그 안에서 `query-core`의 함수를 호출합니다.

큰 흐름은 다음과 같습니다.

```txt
사용자가 QueryDefinition 작성
  ↓
정책(policy + config) 해석
  ↓
query key 기준으로 QueryState 생성 또는 재사용
  ↓
컴포넌트 mount 시 observer 증가
  ↓
필요하면 fetch 실행
  ↓
fetch 결과를 QueryState에 저장
  ↓
listener에게 상태 변경 알림
  ↓
컴포넌트 unmount 시 observer 감소
  ↓
observer가 0이면 gcTime 뒤 캐시 삭제 예약
```

핵심은 `QueryDefinition`과 `QueryState`를 구분하는 것입니다.

- `QueryDefinition`: 어떤 데이터를 어떻게 가져올지에 대한 선언
- `QueryState`: 실제 런타임에서 변하는 상태

`QueryDefinition`은 사용자가 작성하는 설정에 가깝고, `QueryState`는 코어가 관리하는 내부 상태에 가깝습니다.

## 파일 구성

`packages/query-core/src`의 주요 파일은 다음 역할을 가집니다.

| 파일 | 역할 |
| --- | --- |
| [`types.ts`](../../packages/query-core/src/types.ts) | 핵심 타입 정의 |
| [`policies.ts`](../../packages/query-core/src/policies.ts) | query 정책 기본값과 override 병합 |
| [`queryStore.ts`](../../packages/query-core/src/queryStore.ts) | query 상태 저장소, state 생성/조회, listener 관리 |
| [`fetchQuery.ts`](../../packages/query-core/src/fetchQuery.ts) | fetch 실행, 상태 전이, promise dedupe |
| [`queryFreshness.ts`](../../packages/query-core/src/queryFreshness.ts) | fresh/stale 판단 |
| [`queryObserver.ts`](../../packages/query-core/src/queryObserver.ts) | mount/unmount lifecycle 처리 |
| [`gc.ts`](../../packages/query-core/src/gc.ts) | 사용하지 않는 query state 정리 |
| [`windowFocusRefetch.ts`](../../packages/query-core/src/windowFocusRefetch.ts) | 브라우저 focus 복귀 시 stale query refetch |
| [`queries/api1.ts`](../../packages/query-core/src/queries/api1.ts) | 데모용 query definition과 mock API |
| [`index.ts`](../../packages/query-core/src/index.ts) | 외부로 export하는 진입점 |

처음 읽는다면 다음 순서를 추천합니다.

1. `types.ts`
2. `policies.ts`
3. `queryStore.ts`
4. `fetchQuery.ts`
5. `queryFreshness.ts`
6. `queryObserver.ts`
7. `gc.ts`
8. `windowFocusRefetch.ts`
9. React/Vue adapter의 `useQuery`

## 1. 개념

### 1.1 이 시스템이 해결하려는 문제

일반적인 UI 컴포넌트에서 API를 직접 호출하면 다음 문제가 생깁니다.

- 여러 컴포넌트가 같은 API를 중복 호출할 수 있습니다.
- 로딩, 에러, 성공 상태 관리가 컴포넌트마다 반복됩니다.
- 데이터를 언제 다시 가져와야 하는지 기준이 흩어집니다.
- 컴포넌트가 unmount된 뒤에도 캐시를 유지할지 삭제할지 규칙이 없습니다.
- API 응답 구조가 UI 곳곳으로 퍼집니다.

`query-core`는 이런 문제를 중앙 런타임으로 모읍니다.

컴포넌트는 다음처럼 사용할 수 있습니다.

```ts
const { data, isLoading, error, refetch } = useQuery(API1_QUERY)
```

컴포넌트는 `fetchApi1()`을 직접 호출하지 않습니다. 대신 `API1_QUERY`라는 query 선언을 넘기고, 코어는 해당 query의 상태를 관리합니다.

### 1.2 QueryDefinition

`QueryDefinition`은 query의 선언입니다.

```ts
type QueryDefinition<TQueryFnData, TData = TQueryFnData> = {
  key: readonly unknown[]
  fetcher: () => Promise<TQueryFnData>
  select?: (data: TQueryFnData) => TData
  policy: QueryPolicy
  config?: Partial<QueryPolicyConfig>
}
```

각 필드의 의미는 다음과 같습니다.

| 필드 | 의미 |
| --- | --- |
| `key` | query를 식별하는 key |
| `fetcher` | 원본 데이터를 가져오는 비동기 함수 |
| `select` | 원본 데이터를 UI가 쓸 형태로 변환하는 함수 |
| `policy` | 기본 캐시/동기화 정책 |
| `config` | policy 기본값을 query별로 덮어쓰는 설정 |

예시는 다음과 같습니다.

```ts
export const API1_QUERY: QueryDefinition<ApiEnvelope<Api1Response>, Api1Response> = {
  key: ['api1'] as const,
  fetcher: fetchApi1,
  select: (data) => data.payment,
  policy: 'normal',
  config: {
    staleTime: 5_000
  }
}
```

여기서 `fetchApi1`은 API 응답 전체를 반환합니다.

```ts
{
  payment: {
    requestId: 1,
    value: 0.123,
    fetchedAt: '12:00:00'
  }
}
```

하지만 UI는 `payment` 안의 값만 필요합니다. 그래서 `select`가 `data.payment`만 꺼냅니다.

결과적으로 `state.data`에는 API envelope 전체가 아니라 다음 값만 저장됩니다.

```ts
{
  requestId: 1,
  value: 0.123,
  fetchedAt: '12:00:00'
}
```

이 구조 덕분에 UI는 서버 응답 envelope 구조를 몰라도 됩니다.

### 1.3 QueryState

`QueryState`는 query의 실제 런타임 상태입니다.

```ts
type QueryState<TData = unknown> = {
  key: readonly unknown[]
  data?: TData
  status: QueryStatus
  error?: unknown
  lastFetchedAt: number
  staleTime: number
  observers: number
  promise?: Promise<TData>
  gcTime: number
  fetcher: QueryExecutor<TData>
  refetchOnMount: boolean
  refetchOnWindowFocus: boolean
  gcTimeoutId?: ReturnType<typeof setTimeout>
  gcScheduledAt?: number
  gcExpiresAt?: number
  listeners: Set<QueryListener>
  revision: number
}
```

중요한 필드는 다음과 같습니다.

| 필드 | 의미 |
| --- | --- |
| `data` | 마지막 fetch 성공 결과 |
| `status` | `idle`, `loading`, `success`, `error` 중 하나 |
| `error` | 마지막 fetch 실패 이유 |
| `lastFetchedAt` | 마지막 성공 fetch 시각 |
| `staleTime` | 데이터를 fresh로 간주할 시간 |
| `observers` | 현재 이 query를 사용하는 소비자 수 |
| `promise` | 현재 진행 중인 fetch promise |
| `gcTime` | observer가 0이 된 뒤 캐시를 유지할 시간 |
| `fetcher` | `select`까지 적용된 최종 fetch 함수 |
| `listeners` | 상태 변경을 구독하는 listener 목록 |
| `revision` | 상태 변경 버전 번호 |

처음 생성된 state는 대략 이런 모습입니다.

```ts
{
  key: ['api1'],
  status: 'idle',
  lastFetchedAt: 0,
  staleTime: 5000,
  gcTime: 300000,
  observers: 0,
  fetcher: async () => selectedData,
  refetchOnMount: true,
  refetchOnWindowFocus: true,
  listeners: new Set(),
  revision: 0
}
```

아직 데이터를 가져오지 않았기 때문에 `data`는 없고, `status`는 `idle`입니다.

### 1.4 queryMap

`queryMap`은 모든 query state를 저장하는 전역 Map입니다.

```ts
export const queryMap = new Map<string, QueryState>()
```

query key는 배열입니다.

```ts
['api1']
['user', 1]
['todos', { page: 1 }]
```

Map의 key로 쓰기 위해 문자열로 바꿉니다.

```ts
export function getQueryKeyString(key: readonly unknown[]): string {
  return JSON.stringify(key)
}
```

따라서 `['api1']`은 `'["api1"]'`이라는 문자열 key로 저장됩니다.

이 key가 같으면 같은 `QueryState`를 공유합니다.

```txt
Component A: useQuery(API1_QUERY)
Component B: useQuery(API1_QUERY)

둘 다 key가 ['api1']
  ↓
같은 QueryState 재사용
  ↓
data, loading, error, promise 공유
```

### 1.5 fetchQuery

`fetchQuery`는 실제 데이터를 가져오는 함수입니다.

역할은 단순 fetch 이상입니다.

- 이미 fetch 중인지 확인합니다.
- fetch 중이면 기존 promise를 반환합니다.
- 새 fetch라면 `status`를 `loading`으로 바꿉니다.
- 성공하면 `data`, `status`, `lastFetchedAt`을 업데이트합니다.
- 실패하면 `status`, `error`를 업데이트합니다.
- 상태가 바뀔 때 listener에게 알립니다.

핵심 구조는 다음과 같습니다.

```ts
export async function fetchQuery<TData>(state: QueryState<TData>): Promise<TData> {
  if (state.promise) {
    return state.promise
  }

  state.status = 'loading'
  state.error = undefined

  const promise = Promise.resolve()
    .then(state.fetcher)
    .then((data) => {
      state.data = data
      state.status = 'success'
      state.error = undefined
      state.lastFetchedAt = Date.now()
      state.promise = undefined
      notifyQueryListeners(state)
      return data
    })
    .catch((error: unknown) => {
      state.status = 'error'
      state.error = error
      state.promise = undefined
      notifyQueryListeners(state)
      throw error
    })

  state.promise = promise
  notifyQueryListeners(state)
  return promise
}
```

가장 중요한 부분은 이 코드입니다.

```ts
if (state.promise) {
  return state.promise
}
```

이미 요청이 진행 중이면 새 요청을 만들지 않습니다. 이것이 promise dedupe입니다.

### 1.6 freshness

freshness는 데이터가 아직 신선한지 판단하는 개념입니다.

```ts
export function isQueryStale(state: QueryState): boolean {
  if (hasFetchedQuery(state)) {
    return Date.now() - state.lastFetchedAt > state.staleTime
  } else {
    return true
  }
}
```

아직 한 번도 fetch하지 않은 query는 항상 stale입니다.

```ts
export function hasFetchedQuery(state: QueryState): boolean {
  return state.lastFetchedAt > 0
}
```

`lastFetchedAt`이 `0`이면 fetch 성공 이력이 없다는 뜻입니다.

주의할 점은 stale이 된다고 즉시 fetch하지 않는다는 것입니다.

`staleTime`은 자동 타이머가 아닙니다.

```txt
데이터가 stale이 됨
  ↓
아무 일도 바로 일어나지 않음
  ↓
mount, window focus, manual refetch 같은 이벤트가 발생
  ↓
그때 stale 여부를 확인하고 refetch할 수 있음
```

### 1.7 observer

observer는 현재 query를 사용하는 활성 소비자 수입니다.

React 컴포넌트 하나가 `useQuery(API1_QUERY)`를 사용하면 observer가 1 증가합니다.

```txt
컴포넌트 mount
  ↓
observers += 1
```

컴포넌트가 unmount되면 observer가 1 감소합니다.

```txt
컴포넌트 unmount
  ↓
observers -= 1
```

`observers`가 0이면 현재 화면에서 이 query를 사용하는 곳이 없다는 뜻입니다.

이때 바로 state를 삭제하지 않고, `gcTime` 뒤에 삭제 예약을 합니다. 그래야 사용자가 잠깐 다른 화면으로 갔다가 돌아왔을 때 캐시를 재사용할 수 있습니다.

### 1.8 GC

GC는 garbage collection입니다. 여기서는 사용하지 않는 query state를 `queryMap`에서 삭제하는 것을 의미합니다.

```ts
export function scheduleGC(state: QueryState): void {
  cancelScheduledGC(state)

  if (state.gcTime === Infinity) {
    state.gcTimeoutId = undefined
    state.gcScheduledAt = undefined
    state.gcExpiresAt = undefined
  } else {
    state.gcScheduledAt = Date.now()
    state.gcExpiresAt = state.gcScheduledAt + state.gcTime
    const keyString = getQueryKeyString(state.key)

    state.gcTimeoutId = setTimeout(() => {
      if (state.observers === 0) {
        queryMap.delete(keyString)
      }
    }, state.gcTime)
  }
}
```

중요한 점은 타이머가 끝났을 때도 다시 `state.observers === 0`을 확인한다는 것입니다.

GC 예약 후 사용자가 다시 같은 query를 사용하는 화면으로 돌아오면 `cancelScheduledGC`가 호출되어 삭제 예약이 취소됩니다.

### 1.9 window focus refetch

브라우저 탭이 다시 visible 상태가 되면 stale query를 다시 가져올 수 있습니다.

```ts
function handleVisibilityChange(): void {
  if (document.visibilityState !== 'visible') {
    return
  }

  for (const state of queryMap.values()) {
    if (state.observers === 0) {
      continue
    }
    if (!state.refetchOnWindowFocus) {
      continue
    }
    if (!isQueryStale(state)) {
      continue
    }
    fetchQuery(state)
  }
}
```

조건은 세 가지입니다.

1. 현재 사용 중이어야 합니다: `observers > 0`
2. focus refetch가 켜져 있어야 합니다: `refetchOnWindowFocus === true`
3. stale이어야 합니다: `isQueryStale(state) === true`

세 조건이 모두 맞으면 `fetchQuery(state)`를 호출합니다.

## 2. 이 시스템을 이해하기 위해 알아야 할 개념/용어/기본 지식

### 2.1 Promise

이 시스템의 fetch는 모두 Promise 기반입니다.

```ts
type QueryExecutor<TData> = () => Promise<TData>
```

`fetchQuery`는 promise를 `state.promise`에 저장합니다.

왜 저장할까요?

동시에 같은 query가 fetch되면 중복 네트워크 요청을 막기 위해서입니다.

```txt
첫 번째 호출: state.promise 없음
  ↓
새 fetch 시작, state.promise에 저장

두 번째 호출: state.promise 있음
  ↓
새 fetch를 만들지 않고 기존 promise 반환
```

이 방식은 같은 query에 대한 in-flight 요청을 하나로 합칩니다.

### 2.2 상태 머신

`QueryStatus`는 네 가지 상태를 가집니다.

```ts
export type QueryStatus = 'idle' | 'loading' | 'success' | 'error'
```

상태 전이는 보통 다음과 같습니다.

```txt
idle
  ↓ fetch 시작
loading
  ↓ 성공
success
```

실패하면 다음과 같습니다.

```txt
idle
  ↓ fetch 시작
loading
  ↓ 실패
error
```

이미 성공한 query를 다시 refetch하면 다음처럼 움직입니다.

```txt
success
  ↓ refetch 시작
loading
  ↓ 성공
success
```

이 구현에서는 `loading`이 되더라도 기존 `data`를 지우지 않습니다. 그래서 refetch 중에도 이전 데이터를 계속 보여줄 수 있습니다.

### 2.3 cache key

query key는 query identity입니다.

```ts
key: ['api1'] as const
```

key가 같으면 같은 데이터로 취급합니다.

중요한 점은 `queryKey`가 refetch 여부를 결정하지 않는다는 것입니다.

`queryKey`의 역할은 identity입니다.

```txt
queryKey가 하는 일:
- 같은 query인지 구분
- 같은 QueryState를 재사용할지 결정
- promise dedupe의 기준 제공

queryKey가 하지 않는 일:
- stale 여부 판단
- mount 시 refetch 여부 판단
- GC 시간 결정
```

### 2.4 staleTime과 gcTime의 차이

`staleTime`과 `gcTime`은 자주 헷갈립니다.

둘은 완전히 다른 개념입니다.

| 개념 | 질문 | 예시 |
| --- | --- | --- |
| `staleTime` | 이 데이터가 아직 신선한가? | 5초 동안은 fresh |
| `gcTime` | 사용하지 않는 캐시를 얼마나 유지할까? | unmount 후 15초 동안 유지 |

예를 들어 `staleTime = 5초`, `gcTime = 15초`라고 해보겠습니다.

```txt
0초: fetch 성공
3초: 데이터 fresh
6초: 데이터 stale
8초: 컴포넌트 unmount
23초: 아직 remount 안 됐으면 GC로 삭제
```

6초에 stale이 되어도 바로 삭제되지 않습니다.

stale은 최신성 판단이고, GC는 메모리 정리입니다.

### 2.5 subscription

코어는 React/Vue를 모르기 때문에 직접 re-render를 호출할 수 없습니다.

대신 listener를 등록하고, 상태가 바뀔 때 listener를 호출합니다.

```ts
export function subscribeToQuery(
  state: QueryState,
  listener: QueryListener
): () => void {
  state.listeners.add(listener)

  return () => {
    state.listeners.delete(listener)
  }
}
```

상태가 바뀌면 다음 함수가 호출됩니다.

```ts
export function notifyQueryListeners(state: QueryState): void {
  state.revision += 1

  for (const listener of state.listeners) {
    listener()
  }
}
```

React adapter는 `useSyncExternalStore`로 이 변경을 감지합니다.

Vue adapter는 listener에서 `shallowRef` 값을 갱신합니다.

### 2.6 policy

policy는 자주 쓰는 query 설정 묶음입니다.

```ts
export type QueryPolicy = 'static' | 'normal' | 'background' | 'critical'
```

각 policy의 기본값은 `policyMap`에 있습니다.

```ts
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
```

`resolveQueryConfig`는 policy 기본값과 query별 config를 합칩니다.

```ts
export function resolveQueryConfig(
  policy: QueryPolicy,
  override?: Partial<QueryPolicyConfig>
): QueryPolicyConfig {
  return {
    ...policyMap[policy],
    ...override
  }
}
```

예를 들어 `normal` policy의 기본 `staleTime`은 5분입니다. 하지만 query에서 `staleTime: 5_000`을 설정하면 5초로 덮어씁니다.

### 2.7 select

`select`는 API 응답을 UI 데이터로 바꾸는 함수입니다.

```ts
select: (data) => data.payment
```

이 변환은 `createQueryFetcher`에서 적용됩니다.

```ts
function createQueryFetcher<TQueryFnData, TData>(
  queryDefinition: QueryDefinition<TQueryFnData, TData>
): QueryStateConfig<TData>['fetcher'] {
  return async () => {
    const rawData = await queryDefinition.fetcher()

    if (queryDefinition.select) {
      return queryDefinition.select(rawData)
    } else {
      return rawData as TData
    }
  }
}
```

즉, `QueryState`에 들어가는 `fetcher`는 원본 API fetcher가 아닙니다.

원본 fetcher에 `select`까지 적용한 최종 fetcher입니다.

### 2.8 framework adapter

`query-core`는 React/Vue를 모릅니다. 그래서 React/Vue는 얇은 adapter를 둡니다.

React adapter의 흐름은 다음과 같습니다.

```ts
const resolvedConfig = resolveQueryConfig(queryDefinition.policy, queryDefinition.config)
const state = getOrCreateState(
  queryDefinition,
  createQueryStateConfig(queryDefinition, resolvedConfig)
)

useSyncExternalStore(
  (onStoreChange) => subscribeToQuery(state, onStoreChange),
  () => state.revision,
  () => state.revision
)

useEffect(() => {
  mountQueryObserver(state)

  return () => {
    unmountQueryObserver(state)
  }
}, [state])
```

Vue adapter의 흐름도 거의 같습니다.

```ts
const data = shallowRef<TData | undefined>(state.data)
const isLoading = shallowRef(state.status === 'loading')
const error = shallowRef<unknown>(state.error)

const unsubscribe = subscribeToQuery(state, () => {
  syncStateToRefs(state, data, isLoading, error)
})

onMounted(() => {
  mountQueryObserver(state)
})

onUnmounted(() => {
  unsubscribe()
  unmountQueryObserver(state)
})
```

핵심 로직은 코어에 있고, adapter는 구독과 lifecycle 연결만 담당합니다.

## 3. 목표와 기대 예시

### 3.1 목표 1: UI에서 API 호출 세부사항 분리

UI는 다음처럼 query만 사용합니다.

```ts
const { data, isLoading, error, refetch } = useQuery(API1_QUERY)
```

UI가 알 필요 없는 것들:

- 실제 API 함수 이름
- API envelope 구조
- stale 판단 방식
- 중복 요청 방지 방식
- GC 방식
- focus 복귀 시 refetch 방식

이 정보는 `QueryDefinition`과 core 내부에 있습니다.

### 3.2 목표 2: 같은 query 상태 공유

두 컴포넌트가 같은 query를 사용한다고 해보겠습니다.

```ts
function A() {
  return useQuery(API1_QUERY)
}

function B() {
  return useQuery(API1_QUERY)
}
```

둘 다 `key: ['api1']`를 사용합니다.

따라서 `queryMap`에서 같은 `QueryState`를 공유합니다.

기대 결과:

- fetch 결과가 공유됩니다.
- loading 상태가 공유됩니다.
- error 상태가 공유됩니다.
- in-flight promise가 공유됩니다.
- observer count는 2가 됩니다.

### 3.3 목표 3: 중복 요청 방지

`DuplicateRequestCard` 같은 데모는 두 consumer가 동시에 같은 query를 mount하는 상황을 보여줍니다.

기대 흐름은 다음과 같습니다.

```txt
Consumer A mount
  ↓
fetchQuery 호출
  ↓
state.promise 생성

Consumer B mount
  ↓
fetchQuery 호출
  ↓
state.promise가 이미 있음
  ↓
새 요청을 만들지 않고 기존 promise 반환
```

결과적으로 네트워크 요청은 1회만 발생합니다.

### 3.4 목표 4: staleTime으로 fresh/stale 구분

`STALE_TIME_EXAMPLE_QUERY`는 `staleTime: 5_000`을 사용합니다.

기대 흐름:

```txt
0초: fetch 성공
1초: fresh
2초: fresh
3초: fresh
4초: fresh
5초 초과: stale
```

stale이 된 직후 자동으로 fetch하지는 않습니다.

대신 다음 이벤트가 발생하면 stale 여부를 보고 fetch합니다.

- mount
- window focus
- manual refetch

### 3.5 목표 5: warm cache

preload 예시는 화면을 mount하기 전에 데이터를 미리 가져옵니다.

```ts
const resolvedConfig = resolveQueryConfig(
  PRELOAD_EXAMPLE_QUERY.policy,
  PRELOAD_EXAMPLE_QUERY.config
)

const state = getOrCreateState(
  PRELOAD_EXAMPLE_QUERY,
  createQueryStateConfig(PRELOAD_EXAMPLE_QUERY, resolvedConfig)
)

await fetchQuery(state)
```

이렇게 하면 화면이 mount되기 전에 `queryMap`에 data가 들어갑니다.

그 후 페이지 컴포넌트가 `useQuery(PRELOAD_EXAMPLE_QUERY)`를 호출하면 같은 state를 재사용합니다.

기대 결과:

- 캐시가 fresh이면 loading 없이 바로 data 렌더링
- 캐시가 stale이면 mount 시 `refetchOnMount`에 따라 다시 fetch

### 3.6 목표 6: GC로 메모리 정리

`GC_EXAMPLE_QUERY`는 `gcTime: 8_000`을 사용합니다.

기대 흐름:

```txt
컴포넌트 mount
  ↓
observers = 1

컴포넌트 unmount
  ↓
observers = 0
  ↓
8초 뒤 GC 예약

8초 안에 다시 mount
  ↓
GC 취소
  ↓
기존 캐시 재사용

8초 동안 mount 없음
  ↓
queryMap에서 state 삭제
```

### 3.7 목표 7: window focus refetch

사용자가 브라우저 탭을 떠났다가 다시 돌아왔을 때 stale data를 다시 가져올 수 있습니다.

기대 흐름:

```txt
탭이 다시 visible 상태가 됨
  ↓
queryMap의 모든 query 순회
  ↓
active query인지 확인
  ↓
refetchOnWindowFocus 설정 확인
  ↓
stale 여부 확인
  ↓
조건이 맞으면 fetchQuery 호출
```

## 4. 인터페이스별 역할

### 4.1 `QueryStatus`

```ts
export type QueryStatus = 'idle' | 'loading' | 'success' | 'error'
```

query의 fetch 상태를 표현합니다.

| 값 | 의미 |
| --- | --- |
| `idle` | 아직 fetch를 시작하지 않음 |
| `loading` | fetch 진행 중 |
| `success` | 마지막 fetch 성공 |
| `error` | 마지막 fetch 실패 |

### 4.2 `QueryPolicy`

```ts
export type QueryPolicy = 'static' | 'normal' | 'background' | 'critical'
```

query의 기본 동작 묶음입니다.

| policy | 의미 |
| --- | --- |
| `static` | 거의 변하지 않는 데이터 |
| `normal` | 일반적인 서버 데이터 |
| `background` | mount/focus 때 적극적으로 갱신할 데이터 |
| `critical` | 별도 상위 보장이 필요할 수 있는 민감한 흐름 |

이 이름들은 런타임 정책을 이해하기 위한 샘플입니다. 실제 제품에서는 도메인에 맞게 조정할 수 있습니다.

### 4.3 `QueryPolicyConfig`

```ts
export type QueryPolicyConfig = {
  staleTime: number
  gcTime: number
  refetchOnMount: boolean
  refetchOnWindowFocus: boolean
}
```

query 동작을 결정하는 실제 설정입니다.

| 필드 | 역할 |
| --- | --- |
| `staleTime` | fetch 성공 후 fresh로 볼 시간 |
| `gcTime` | observer가 0이 된 뒤 캐시를 유지할 시간 |
| `refetchOnMount` | mount 시 stale이면 refetch할지 |
| `refetchOnWindowFocus` | window focus 복귀 시 stale이면 refetch할지 |

### 4.4 `resolveQueryConfig`

policy 기본값과 query별 override를 합칩니다.

```ts
resolveQueryConfig('normal', {
  staleTime: 5_000
})
```

결과는 다음과 비슷합니다.

```ts
{
  staleTime: 5000,
  gcTime: 300000,
  refetchOnMount: true,
  refetchOnWindowFocus: true
}
```

### 4.5 `QueryDefinition`

사용자가 작성하는 query 선언입니다.

```ts
type QueryDefinition<TQueryFnData, TData = TQueryFnData> = {
  key: readonly unknown[]
  fetcher: () => Promise<TQueryFnData>
  select?: (data: TQueryFnData) => TData
  policy: QueryPolicy
  config?: Partial<QueryPolicyConfig>
}
```

제네릭의 의미:

- `TQueryFnData`: fetcher가 반환하는 원본 데이터 타입
- `TData`: select 이후 UI가 사용하는 데이터 타입

예:

```ts
QueryDefinition<ApiEnvelope<Api1Response>, Api1Response>
```

의미:

- fetcher 결과는 `ApiEnvelope<Api1Response>`
- UI가 받는 최종 data는 `Api1Response`

### 4.6 `QueryState`

코어가 관리하는 실제 상태입니다.

사용자가 직접 만들기보다 `getOrCreateState`를 통해 얻습니다.

`QueryState`는 다음을 함께 관리합니다.

- 데이터 상태
- fetch 상태
- stale 판단 기준
- GC 정보
- observer 수
- 진행 중 promise
- listener 집합

### 4.7 `createQueryStateConfig`

`QueryDefinition`과 resolved config를 받아 `QueryState` 생성에 필요한 config를 만듭니다.

가장 중요한 일은 `fetcher`를 다시 만드는 것입니다.

```txt
원본 fetcher
  ↓
raw API data
  ↓
select 적용
  ↓
UI data
```

따라서 `QueryState.fetcher`는 이미 `select`까지 포함합니다.

### 4.8 `getOrCreateState`

query key를 기준으로 state를 찾거나 만듭니다.

```ts
const keyString = getQueryKeyString(queryDefinition.key)
const existingState = queryMap.get(keyString)
```

이미 state가 있으면 config를 최신 값으로 갱신하고 반환합니다.

```ts
if (existingState) {
  existingState.staleTime = config.staleTime
  existingState.gcTime = config.gcTime
  existingState.fetcher = config.fetcher
  existingState.refetchOnMount = config.refetchOnMount
  existingState.refetchOnWindowFocus = config.refetchOnWindowFocus

  return existingState as QueryState<TData>
}
```

없으면 새 state를 만들고 `queryMap`에 저장합니다.

### 4.9 `getExistingState`

이미 존재하는 state만 조회합니다.

```ts
export function getExistingState<TData>(
  key: readonly unknown[]
): QueryState<TData> | undefined
```

디버그 UI처럼 "없으면 만들지 않고 현재 cache 상태만 보고 싶은 경우"에 유용합니다.

### 4.10 `subscribeToQuery`

query 상태 변경을 구독합니다.

```ts
const unsubscribe = subscribeToQuery(state, listener)
```

반환값은 unsubscribe 함수입니다.

컴포넌트가 unmount될 때 listener를 제거해야 메모리 누수를 막을 수 있습니다.

### 4.11 `notifyQueryListeners`

state가 바뀌었음을 listener들에게 알립니다.

```ts
state.revision += 1

for (const listener of state.listeners) {
  listener()
}
```

`revision`은 React의 `useSyncExternalStore`에서 snapshot 값으로 사용됩니다.

### 4.12 `fetchQuery`

fetch 실행의 단일 진입점입니다.

manual refetch, mount refetch, window focus refetch가 모두 이 함수를 사용합니다.

그래서 어떤 경로로 fetch가 시작되든 다음 규칙이 동일하게 적용됩니다.

- promise dedupe
- loading 상태 전환
- success/error 처리
- listener 알림

### 4.13 `isQueryStale`

현재 query가 stale인지 판단합니다.

```ts
Date.now() - state.lastFetchedAt > state.staleTime
```

아직 fetch한 적이 없으면 stale입니다.

### 4.14 `mountQueryObserver`

컴포넌트 mount 시 호출됩니다.

```ts
export function mountQueryObserver<TData>(state: QueryState<TData>): void {
  state.observers += 1
  cancelScheduledGC(state)
  acquireWindowFocusRefetch()

  if (!hasFetchedQuery(state) || (state.refetchOnMount && isQueryStale(state))) {
    fetchQuery(state)
  }
}
```

하는 일:

1. observer 증가
2. 예약된 GC 취소
3. window focus listener 확보
4. 필요하면 fetch

fetch 조건:

```txt
아직 fetch한 적 없음
  또는
refetchOnMount가 true이고 stale 상태
```

### 4.15 `unmountQueryObserver`

컴포넌트 unmount 시 호출됩니다.

```ts
export function unmountQueryObserver(state: QueryState): void {
  state.observers = Math.max(0, state.observers - 1)
  releaseWindowFocusRefetch()

  if (state.observers === 0) {
    scheduleGC(state)
  }
}
```

하는 일:

1. observer 감소
2. window focus listener release
3. observer가 0이면 GC 예약

`Math.max(0, ...)`을 쓰기 때문에 observer가 음수가 되는 것을 막습니다.

### 4.16 `scheduleGC`

observer가 0이 된 query를 나중에 삭제하도록 예약합니다.

`gcTime === Infinity`이면 삭제하지 않습니다.

그 외에는 `setTimeout`을 걸고, 시간이 지나도 observer가 0이면 `queryMap.delete(keyString)`을 실행합니다.

### 4.17 `cancelScheduledGC`

예약된 GC를 취소합니다.

컴포넌트가 다시 mount되면 이 함수가 호출됩니다.

```txt
unmount
  ↓
GC 예약
  ↓
gcTime 안에 remount
  ↓
GC 취소
  ↓
캐시 재사용
```

### 4.18 `acquireWindowFocusRefetch` / `releaseWindowFocusRefetch`

브라우저 `visibilitychange` listener를 관리합니다.

`visibilityListenerCount`를 두는 이유는 여러 query observer가 mount되어도 document listener는 하나만 등록하기 위해서입니다.

```txt
첫 observer mount
  ↓
document.addEventListener 등록

두 번째 observer mount
  ↓
count만 증가

마지막 observer unmount
  ↓
document.removeEventListener
```

### 4.19 `handleVisibilityChange`

브라우저 탭이 visible 상태가 되었을 때 실행됩니다.

각 query에 대해 다음 조건을 확인합니다.

```txt
observers > 0
refetchOnWindowFocus === true
isQueryStale(state) === true
```

조건을 통과하면 `fetchQuery(state)`를 호출합니다.

### 4.20 `index.ts`

코어의 public export 진입점입니다.

```ts
export * from './queryStore.js'
export * from './fetchQuery.js'
export * from './policies.js'
export * from './types.js'
export * from './gc.js'
export * from './queryObserver.js'
export * from './queryFreshness.js'
export * from './windowFocusRefetch.js'
export * from './queries/api1.js'
```

외부 패키지는 보통 `@query/core`에서 필요한 API를 import합니다.

## 5. 동작 순서와 작동 원리

### 5.1 첫 mount 시나리오

가장 기본적인 흐름입니다.

```ts
const { data, isLoading, error, refetch } = useQuery(API1_QUERY)
```

실제로는 다음 순서로 동작합니다.

```txt
1. useQuery(API1_QUERY) 호출
2. resolveQueryConfig로 최종 config 계산
3. createQueryStateConfig로 select 포함 fetcher 생성
4. getOrCreateState로 QueryState 생성 또는 재사용
5. subscribeToQuery로 상태 변경 구독
6. 컴포넌트 mount
7. mountQueryObserver 호출
8. observers 증가
9. GC 예약 취소
10. window focus listener 등록 또는 count 증가
11. fetch 이력이 없으므로 fetchQuery 호출
12. status = loading
13. listener 알림
14. fetcher 실행
15. raw API data 수신
16. select 적용
17. state.data 저장
18. status = success
19. lastFetchedAt = Date.now()
20. state.promise 제거
21. listener 알림
22. UI가 새 상태를 읽고 렌더링
```

상태 변화는 다음과 같습니다.

```txt
처음:
status = idle
data = undefined
lastFetchedAt = 0
observers = 0

mount 직후:
observers = 1

fetch 시작:
status = loading
promise = Promise

fetch 성공:
status = success
data = selectedData
lastFetchedAt = 현재 시각
promise = undefined
```

### 5.2 첫 fetch가 실패하는 경우

fetcher가 reject하면 다음 흐름이 됩니다.

```txt
fetch 시작
  ↓
status = loading
  ↓
fetcher reject
  ↓
status = error
error = thrown value
promise = undefined
  ↓
listener 알림
```

이때 `fetchQuery`는 error를 다시 throw합니다.

```ts
.catch((error: unknown) => {
  state.status = 'error'
  state.error = error
  state.promise = undefined
  notifyQueryListeners(state)
  throw error
})
```

그래서 `await refetch()`를 호출하는 쪽에서는 try/catch로 에러를 잡을 수 있습니다.

### 5.3 같은 query를 두 컴포넌트가 쓰는 경우

예를 들어 A와 B가 같은 query를 씁니다.

```txt
A mount
  ↓
getOrCreateState(['api1'])
  ↓
새 QueryState 생성
  ↓
observers = 1
  ↓
fetch 시작

B mount
  ↓
getOrCreateState(['api1'])
  ↓
기존 QueryState 반환
  ↓
observers = 2
  ↓
fetchQuery 호출
  ↓
state.promise가 이미 있으므로 기존 promise 반환
```

결과:

- state는 하나입니다.
- observer는 2입니다.
- 요청은 하나입니다.
- 결과 data는 두 컴포넌트가 공유합니다.

### 5.4 fresh 상태에서 다시 mount하는 경우

한 번 fetch가 성공한 뒤, `staleTime` 안에 다시 mount한다고 가정합니다.

```txt
0초: fetch 성공
2초: 컴포넌트 unmount
3초: 다시 mount
```

`staleTime`이 5초라면 3초 시점의 데이터는 fresh입니다.

`mountQueryObserver`는 다음 조건을 확인합니다.

```ts
if (!hasFetchedQuery(state) || (state.refetchOnMount && isQueryStale(state))) {
  fetchQuery(state)
}
```

이미 fetch한 적이 있고, stale도 아니므로 fetch하지 않습니다.

기대 결과:

- 기존 data를 즉시 사용합니다.
- loading 요청이 새로 발생하지 않습니다.

### 5.5 stale 상태에서 다시 mount하는 경우

이번에는 `staleTime`이 지난 뒤 다시 mount한다고 가정합니다.

```txt
0초: fetch 성공
7초: 다시 mount
```

`staleTime`이 5초라면 7초 시점의 데이터는 stale입니다.

그리고 `refetchOnMount`가 true라면 다시 fetch합니다.

```txt
mount
  ↓
hasFetchedQuery = true
isQueryStale = true
refetchOnMount = true
  ↓
fetchQuery 호출
```

기존 `data`는 지우지 않습니다. 그래서 refetch 중에도 이전 data를 보여줄 수 있습니다.

### 5.6 manual refetch

사용자가 버튼을 눌러 직접 다시 가져오는 경우입니다.

```ts
const { refetch } = useQuery(API1_QUERY)

await refetch()
```

adapter의 `refetch`는 단순히 `fetchQuery(state)`입니다.

manual refetch는 stale 여부와 상관없이 fetch를 시도합니다.

하지만 이미 fetch 중이면 promise dedupe가 적용됩니다.

```txt
버튼 클릭
  ↓
fetchQuery 호출
  ↓
state.promise가 없으면 새 fetch
state.promise가 있으면 기존 promise 반환
```

### 5.7 preload

preload는 컴포넌트가 mount되기 전에 데이터를 미리 가져오는 흐름입니다.

```ts
const resolvedConfig = resolveQueryConfig(
  PRELOAD_EXAMPLE_QUERY.policy,
  PRELOAD_EXAMPLE_QUERY.config
)

const state = getOrCreateState(
  PRELOAD_EXAMPLE_QUERY,
  createQueryStateConfig(PRELOAD_EXAMPLE_QUERY, resolvedConfig)
)

await fetchQuery(state)
```

여기서 중요한 점은 preload도 별도 경로가 아니라 같은 `fetchQuery`를 쓴다는 것입니다.

따라서 preload에도 다음 규칙이 그대로 적용됩니다.

- select 적용
- promise dedupe
- loading/success/error 상태 전이
- listener 알림
- lastFetchedAt 기록

preload 후 페이지가 mount되면 같은 query key로 기존 state를 재사용합니다.

```txt
preload
  ↓
queryMap에 data 저장
  ↓
page mount
  ↓
getOrCreateState가 기존 state 반환
  ↓
fresh이면 즉시 data 렌더링
```

### 5.8 window focus refetch

브라우저 탭이 다시 visible 상태가 되면 `handleVisibilityChange`가 실행됩니다.

```txt
document.visibilityState === 'visible'
  ↓
queryMap.values() 순회
  ↓
각 query에 대해 조건 확인
```

조건을 하나씩 보면 다음과 같습니다.

```ts
if (state.observers === 0) {
  continue
}
```

현재 화면에서 사용하지 않는 query는 refetch하지 않습니다.

```ts
if (!state.refetchOnWindowFocus) {
  continue
}
```

focus refetch가 꺼진 query는 건너뜁니다.

```ts
if (!isQueryStale(state)) {
  continue
}
```

아직 fresh이면 refetch하지 않습니다.

모든 조건을 통과한 query만 fetch합니다.

```ts
fetchQuery(state)
```

### 5.9 unmount와 GC

컴포넌트가 unmount되면 `unmountQueryObserver`가 호출됩니다.

```txt
unmount
  ↓
observers 감소
  ↓
observer가 0인지 확인
```

아직 같은 query를 쓰는 다른 컴포넌트가 있으면 GC를 예약하지 않습니다.

```txt
observers = 2
  ↓ unmount 하나
observers = 1
  ↓
아직 active query
```

마지막 observer까지 unmount되면 GC를 예약합니다.

```txt
observers = 1
  ↓ unmount
observers = 0
  ↓
scheduleGC
```

`gcTime`이 8초라면 다음처럼 동작합니다.

```txt
0초: observer 0, GC 예약
5초: 다시 mount
  ↓
cancelScheduledGC
  ↓
캐시 유지
```

또는:

```txt
0초: observer 0, GC 예약
8초: 여전히 observers 0
  ↓
queryMap.delete(key)
```

### 5.10 상태 변경과 UI 반영

코어는 상태를 바꾼 뒤 `notifyQueryListeners`를 호출합니다.

```txt
state 변경
  ↓
revision 증가
  ↓
listeners 호출
  ↓
React/Vue adapter가 변경 감지
  ↓
UI가 data/isLoading/error를 다시 읽음
```

React에서는 `useSyncExternalStore`가 `state.revision`을 snapshot으로 사용합니다.

```ts
useSyncExternalStore(
  (onStoreChange) => subscribeToQuery(state, onStoreChange),
  () => state.revision,
  () => state.revision
)
```

Vue에서는 listener가 ref 값을 갱신합니다.

```ts
const unsubscribe = subscribeToQuery(state, () => {
  syncStateToRefs(state, data, isLoading, error)
})
```

## 실제 예시로 전체 흐름 따라가기

다음 query를 기준으로 보겠습니다.

```ts
export const STALE_TIME_EXAMPLE_QUERY = {
  key: ['stale-time-example'] as const,
  fetcher: fetchStaleTimeExample,
  select: (data) => data.payment,
  policy: 'normal',
  config: {
    staleTime: 5_000,
    gcTime: 15_000
  }
}
```

### 첫 진입

```txt
useQuery(STALE_TIME_EXAMPLE_QUERY)
  ↓
policy normal + config override
  ↓
staleTime = 5000
gcTime = 15000
refetchOnMount = true
refetchOnWindowFocus = true
  ↓
QueryState 생성
  ↓
mount
  ↓
fetch 실행
  ↓
data 저장
```

### 3초 뒤 다시 mount

```txt
마지막 fetch 후 3초 경과
  ↓
Date.now() - lastFetchedAt <= 5000
  ↓
fresh
  ↓
refetch 안 함
  ↓
캐시 data 즉시 사용
```

### 7초 뒤 다시 mount

```txt
마지막 fetch 후 7초 경과
  ↓
Date.now() - lastFetchedAt > 5000
  ↓
stale
  ↓
refetchOnMount = true
  ↓
fetchQuery 실행
```

### unmount 후 10초 뒤 remount

```txt
unmount
  ↓
observers = 0
  ↓
15초 뒤 GC 예약

10초 뒤 remount
  ↓
GC 취소
  ↓
기존 state 재사용
```

### unmount 후 20초 뒤 remount

```txt
unmount
  ↓
15초 뒤 queryMap에서 삭제

20초 뒤 remount
  ↓
기존 state 없음
  ↓
새 QueryState 생성
  ↓
새 fetch 실행
```

## 흔히 헷갈리는 지점

### stale이 되면 자동으로 fetch되나요?

아닙니다.

`staleTime`이 지났다는 것은 "다음 동기화 이벤트에서 다시 가져올 수 있다"는 뜻입니다.

자동으로 fetch되는 시점은 이 구현에 없습니다. 대신 다음 이벤트에서 stale 여부를 확인합니다.

- mount
- window focus
- manual refetch

### stale data는 삭제되나요?

아닙니다.

stale은 최신성 상태이고, 삭제는 GC가 담당합니다.

stale이어도 `gcTime`이 지나지 않았고 query state가 남아 있다면 data는 계속 메모리에 있습니다.

### refetch 중에는 기존 data가 없어지나요?

이 구현에서는 없어지지 않습니다.

`fetchQuery`는 fetch 시작 시 `status`와 `error`만 바꿉니다.

```ts
state.status = 'loading'
state.error = undefined
```

`state.data`는 성공 결과가 오기 전까지 그대로 남습니다.

### 같은 key인데 fetcher가 달라지면 어떻게 되나요?

`getOrCreateState`는 기존 state가 있으면 config와 fetcher를 갱신합니다.

```ts
existingState.fetcher = config.fetcher
```

하지만 같은 key에 서로 다른 의미의 fetcher를 연결하는 것은 피해야 합니다. query key는 "이 데이터가 무엇인가"를 나타내야 하므로, 데이터 의미가 다르면 key도 달라야 합니다.

### `critical` policy는 항상 더 안전한가요?

이 샘플의 `critical`은 `staleTime: 0`, `gcTime: 0`, `refetchOnMount: false`, `refetchOnWindowFocus: false`입니다.

이 이름만 보고 "중요한 데이터는 자동으로 안전해진다"고 이해하면 안 됩니다.

README에서도 언급하듯 결제, 계좌 변경, 승인 같은 민감한 흐름은 상위 orchestration 계층에서 명시적으로 검증하거나 새로고침하는 로직이 필요할 수 있습니다.

## 이 구현이 의도적으로 하지 않는 것

이 프로젝트는 학습용으로 핵심 원리만 보여줍니다.

따라서 다음 기능은 없습니다.

- retry
- cancellation
- query invalidation
- mutation
- polling
- SSR hydration
- persistence
- optimistic update
- pagination helper
- infinite query

이 기능들이 빠져 있기 때문에 코드가 작고, query runtime의 본질적인 흐름을 읽기 쉽습니다.

## 확장한다면 어디를 보면 좋을까

### retry를 추가하고 싶다면

`fetchQuery.ts`가 중심입니다.

현재는 `state.fetcher`를 한 번 실행하고 실패하면 바로 error 상태로 갑니다.

retry를 넣으려면 fetcher 실행 부분을 retry 가능한 함수로 감싸야 합니다.

### cancellation을 추가하고 싶다면

`QueryExecutor` 타입과 `fetchQuery`에 abort signal 개념이 필요합니다.

예를 들어 `fetcher: (signal: AbortSignal) => Promise<TData>` 형태로 바꿀 수 있습니다.

### invalidation을 추가하고 싶다면

`queryStore.ts`에 key 기준으로 state를 찾고 stale 처리하거나 refetch하는 API가 필요합니다.

예:

```ts
invalidateQuery(['api1'])
```

### mutation을 추가하고 싶다면

query와 별도의 mutation runtime을 만들거나, mutation 성공 후 관련 query를 invalidate/refetch하는 흐름을 추가해야 합니다.

## 요약

`packages/query-core`는 작은 query runtime입니다.

핵심 구조는 다음 다섯 가지입니다.

1. `QueryDefinition`으로 query를 선언합니다.
2. `queryMap`이 key 기준으로 `QueryState`를 공유합니다.
3. `fetchQuery`가 fetch 실행과 상태 전이를 담당합니다.
4. `staleTime`, `refetchOnMount`, `refetchOnWindowFocus`가 재동기화 시점을 결정합니다.
5. `observers`와 `gcTime`이 캐시 생명주기를 관리합니다.

가장 중요한 설계 포인트는 fetch 경로가 하나라는 점입니다.

```txt
mount refetch
manual refetch
window focus refetch
preload
  ↓
모두 fetchQuery(state)를 사용
```

그래서 어떤 이유로 fetch가 시작되더라도 다음 규칙이 항상 동일하게 적용됩니다.

- promise dedupe
- status 업데이트
- error 처리
- lastFetchedAt 기록
- listener 알림
- UI 반영
