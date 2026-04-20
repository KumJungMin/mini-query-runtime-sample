# Query Runtime Deep Dive

## 1. 목적

이 프로젝트는 React Query 스타일의 핵심 메커니즘을 작은 코드베이스로 설명하기 위한 샘플입니다.

핵심 목표는 다음과 같습니다.

- UI에서 fetch 로직을 분리한다
- query 상태를 공유한다
- stale 판단을 명시적으로 관리한다
- observer lifecycle 기반으로 GC를 관리한다
- 이벤트 기반으로 refetch한다

즉, 이 런타임은 단순 fetch wrapper가 아니라
**데이터 상태와 생명주기를 관리하는 작은 코어 런타임**입니다.

## 2. 핵심 개념

### 2.1 queryKey

```ts
['api1']
```

`queryKey`는 데이터를 식별하는 키입니다.

역할:

- 동일 query 여부 판단
- 공유 state 재사용 기준
- dedupe 기준

중요한 점:

- `queryKey`는 identity만 담당합니다
- freshness, mount, focus 같은 refetch 조건은 담당하지 않습니다

### 2.2 QueryDefinition

```ts
type QueryDefinition<TQueryFnData, TData = TQueryFnData> = {
  key: readonly unknown[]
  fetcher: () => Promise<TQueryFnData>
  select?: (data: TQueryFnData) => TData
  policy: QueryPolicy
  config?: Partial<QueryPolicyConfig>
}
```

여기서 역할을 분리합니다.

- `fetcher`: raw API 응답을 가져온다
- `select`: UI가 사용할 형태로 변환한다

예시:

```ts
export const API1_QUERY = {
  key: ['api1'] as const,
  fetcher: fetchApi1,
  select: (data) => data.payment,
  policy: 'normal'
}
```

이 구조 덕분에 UI는 API 응답 구조를 직접 알 필요가 없습니다.

### 2.3 staleTime

`staleTime`은 데이터가 fresh로 간주되는 시간입니다.

```ts
Date.now() - lastFetchedAt > staleTime
```

의미:

- `staleTime` 이내: fresh
- `staleTime` 초과: stale

중요:

- stale이 된다고 즉시 fetch 되지 않습니다
- stale은 "이벤트가 발생하면 다시 가져올 수 있는 상태"를 의미합니다

### 2.4 gcTime

`gcTime`은 사용되지 않는 query state를 메모리에 얼마나 유지할지 결정합니다.

```ts
setTimeout(() => {
  if (observers === 0) {
    delete queryState
  }
}, gcTime)
```

역할:

- inactive query 정리
- warm cache 유지 시간 제어

### 2.5 observers

`observers`는 현재 query를 사용하는 활성 UI 소비자 수입니다.

- mount: 증가
- unmount: 감소
- `0`이 되면 GC 예약 가능

이 값으로 active / inactive 상태를 구분합니다.

### 2.6 promise dedupe

동일 query에 대한 요청이 동시에 들어오면 기존 in-flight promise를 재사용합니다.

```ts
if (state.promise) {
  return state.promise
}
```

결과:

- 네트워크 요청 1회
- 결과 공유

### 2.7 refetchOnMount / refetchOnWindowFocus

이제 freshness 동기화는 개별 freshness guard가 아니라 이벤트 기반입니다.

정책:

```ts
type QueryPolicyConfig = {
  staleTime: number
  gcTime: number
  refetchOnMount: boolean
  refetchOnWindowFocus: boolean
}
```

동작:

- mount 시 stale이면 refetch
- window focus 시 active + stale이면 refetch

## 3. QueryState 구조

런타임은 각 query마다 다음 상태를 가집니다.

```ts
type QueryState<TData> = {
  key: readonly unknown[]
  data?: TData
  status: 'idle' | 'loading' | 'success' | 'error'
  error?: unknown
  lastFetchedAt: number
  staleTime: number
  gcTime: number
  observers: number
  promise?: Promise<TData>
  fetcher: () => Promise<TData>
  refetchOnMount: boolean
  refetchOnWindowFocus: boolean
}
```

핵심은 `fetcher`가 raw API가 아니라 `select`까지 적용된 실행 경로라는 점입니다.

즉:

- `fetcher`는 상태 계층에서 최종 데이터 타입을 반환합니다
- UI는 `state.data`만 읽습니다

## 4. 런타임 흐름

### 4.1 useQuery mount

1. query state 조회 또는 생성
2. observer 증가
3. 예약된 GC 취소
4. 아직 한 번도 fetch되지 않았으면 즉시 fetch
5. 이미 fetch된 상태라면 stale 여부 판단
6. stale + `refetchOnMount` 이면 refetch

### 4.2 manual refetch

```ts
const { refetch } = useQuery(API1_QUERY)

await refetch()
```

manual refetch는 항상 새 요청 경로로 들어가지만, 이미 진행 중인 요청이 있으면 dedupe 됩니다.

### 4.3 preload

UI 밖에서 캐시를 미리 데우고 싶다면 같은 실행 경로를 직접 사용할 수 있습니다.

```ts
const resolvedConfig = resolveQueryConfig(query.policy, query.config)
const state = getOrCreateState(
  query,
  createQueryStateConfig(query, resolvedConfig)
)

const refetch = () => fetchQuery(state)

await refetch()
```

핵심은 별도 guard 없이도 동일한 fetch 경로를 재사용한다는 점입니다.

### 4.4 window focus

focus 이벤트가 발생하면 런타임은 모든 query를 순회합니다.

조건:

- `observers > 0`
- `refetchOnWindowFocus === true`
- stale 상태

조건이 맞으면 refetch 합니다.

### 4.5 unmount + GC

1. observer 감소
2. `0`이면 `gcTime` 기준으로 GC 예약
3. 그 전에 다시 mount 되면 GC 취소
4. 시간이 지나면 state 삭제

이 구조 때문에 warm cache가 생깁니다.

## 5. 철학 변화

이전 모델:

- 필요 시점마다 개별 guard로 최신성을 보장한다

현재 모델:

- 이벤트가 발생했을 때 stale query를 다시 동기화한다
- manual action은 `refetch()`로 동일 경로를 사용한다

즉,

- Before: guarantee-based
- After: event-based synchronization

## 6. 주의할 점

이 구조는 개념을 단순하게 만들지만, 모든 critical flow를 완전히 대체하지는 않습니다.

예를 들어:

- 결제 직전 데이터
- 계좌 변경 직전 데이터
- 강한 최신성 보장이 필요한 승인 플로우

이런 경우에는 상위 orchestration 계층에서 별도의 검증 또는 보장 로직이 필요할 수 있습니다.

## 7. 요약

현재 런타임의 핵심은 다음과 같습니다.

- `select`로 API 응답 구조를 UI 밖에서 정리한다
- `refetch()`가 수동 fetch의 단일 진입점이다
- `refetchOnMount` / `refetchOnWindowFocus`로 stale sync를 처리한다
- `staleTime`은 freshness 기준이다
- `gcTime`은 메모리 정리 기준이다
- `promise` dedupe로 중복 요청을 막는다

이 저장소는 큰 프레임워크보다 작은 구조로 원리를 보여주는 데 목적이 있습니다.
