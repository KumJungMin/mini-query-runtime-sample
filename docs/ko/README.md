# Query Runtime Deep Dive

## 1. 문제 정의

일반적인 API 호출 방식은 다음과 같습니다.

```ts
const data = await fetchApi1()
```

이 방식은 단순한 애플리케이션에서는 문제가 없으나, 서비스가 확장되면 다음과 같은 문제가 발생합니다.

- 동일한 데이터를 여러 컴포넌트에서 중복 요청
- 데이터의 최신성(freshness)에 대한 기준 부재
- 동시에 동일 요청이 여러 번 발생 (race condition)
- 사용되지 않는 데이터의 메모리 지속 점유
- 상태 관리 로직의 분산

이러한 문제는 단순한 함수 호출이 아닌, **데이터의 생명주기를 체계적으로 관리하는 런타임 계층의 필요성**을 요구합니다.

<br/><br/>

## 2. Query Runtime의 역할

Query Runtime은 다음의 요소를 관리합니다.

- 데이터 식별 (identity)
- 데이터 최신성 (freshness)
- 네트워크 요청 상태 (in-flight)
- 구독 상태 (observer lifecycle)
- 메모리 관리 (garbage collection)

즉, Query Runtime은 단순한 fetch abstraction이 아니라,  
**데이터의 상태와 생명주기를 통합적으로 관리하는 시스템**입니다.

<br/><br/>

## 3. 핵심 개념

### 3.1 queryKey

#### 정의

```ts
['api1']
```

queryKey는 특정 데이터를 식별하는 고유한 키입니다.

#### 역할

- 동일 데이터 여부 판단
- 캐시 재사용 기준
- deduplication 기준

#### 주의사항

queryKey는 다음을 포함해서는 안 됩니다.

- 라우트 정보
- UI 상태
- 액션 흐름

#### 결론

> queryKey는 "언제"가 아니라 "무엇"을 나타낸다.

<br/><br/>

### 3.2 staleTime

#### 정의

데이터가 최신 상태로 간주되는 시간

#### 내부 로직

```ts
Date.now() - lastFetchedAt > staleTime
```

#### 의미

- staleTime 이내 → fresh
- staleTime 초과 → stale

#### 특징

- stale 상태가 되더라도 즉시 삭제되지 않음
- stale은 재요청 가능 상태를 의미

<br/><br/>

### 3.3 cacheTime

#### 정의

데이터가 메모리에 유지되는 시간

#### 동작 방식

```ts
setTimeout(() => {
  if (observers === 0) {
    delete queryState
  }
}, cacheTime)
```

#### 역할

- 비활성 query 정리
- 메모리 관리

<br/><br/>

### 3.4 observers

#### 정의

현재 query를 사용 중인 컴포넌트 수

#### 동작

- mount → 증가
- unmount → 감소

#### 역할

- active/inactive 상태 판단
- GC 트리거 조건

<br/><br/>

### 3.5 promise (Deduplication)

#### 문제

동일 요청이 동시에 여러 번 발생할 수 있음

#### 해결

```ts
if (state.promise) return state.promise
```

#### 결과

- 네트워크 요청 1회
- 결과 공유

<br/><br/>

### 3.6 ensureFresh

#### 정의

특정 시점에서 데이터 최신성을 보장하는 함수

#### 사용 예

```ts
await ensureFresh(API1_QUERY)
```

#### 역할

- stale 상태일 경우 fetch 수행
- 이미 진행 중인 요청 reuse
- 중요 로직 수행 전 데이터 보장

#### 특징

- 자동 실행되지 않음
- 명시적으로 호출해야 함

<br/><br/>

## 4. QueryState 구조

```ts
type QueryState = {
  data
  status
  error
  lastFetchedAt
  staleTime
  observers
  promise
  cacheTime
  gcTimeoutId
}
```

각 필드는 다음을 의미합니다.

- data: 마지막 성공 데이터
- status: 현재 요청 상태
- error: 에러 정보
- lastFetchedAt: 마지막 fetch 시간
- staleTime: 최신성 기준
- observers: 구독 수
- promise: 진행 중 요청
- cacheTime: GC 기준
- gcTimeoutId: GC 타이머

<br/><br/>

## 5. 런타임 동작 흐름

### 5.1 useQuery 실행

1. QueryState 조회 또는 생성
2. observer 증가
3. stale 판단
4. 필요 시 fetch 실행

<br/><br/>

### 5.2 fetch 흐름

1. 기존 promise 확인
2. 없으면 fetch 시작
3. 완료 후 상태 업데이트

<br/><br/>

### 5.3 unmount

1. observer 감소
2. 0일 경우 GC 예약

<br/><br/>

### 5.4 ensureFresh 흐름

1. GC 취소
2. stale 여부 판단
3. 필요 시 fetch 수행

<br/><br/>

## 6. Warm Cache 개념

Warm Cache란:

- 현재 사용되지 않지만
- 최근에 fetch된 데이터

#### 장점

- 빠른 재진입
- UX 개선

<br/><br/>
