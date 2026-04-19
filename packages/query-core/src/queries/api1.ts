import type { QueryDefinition } from '../types.js'

export type Api1Response = {
  requestId: number
  value: number
  fetchedAt: string
}

export type StaleTimeExampleResponse = {
  requestId: number
  value: number
  fetchedAt: string
}

export type DedupeExampleResponse = {
  requestId: number
  value: number
  fetchedAt: string
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function createPayload(requestId: number) {
  return {
    requestId,
    value: Math.random(),
    fetchedAt: new Date().toLocaleTimeString()
  }
}

let api1RequestCount = 0
let staleTimeRequestCount = 0
let dedupeRequestCount = 0

export async function fetchApi1(): Promise<Api1Response> {
  console.log('[FETCH] request')
  await wait(1000)
  api1RequestCount += 1
  const payload = createPayload(api1RequestCount)
  console.log('[FETCH] response:', payload.value)
  return payload
}

export async function fetchStaleTimeExample(): Promise<StaleTimeExampleResponse> {
  console.log('[FETCH][stale] request')
  await wait(1000)
  staleTimeRequestCount += 1
  const payload = createPayload(staleTimeRequestCount)
  console.log('[FETCH][stale] response:', payload.value)
  return payload
}

export async function fetchDedupeExample(): Promise<DedupeExampleResponse> {
  console.log('[FETCH][dedupe] request')
  await wait(1000)
  dedupeRequestCount += 1
  const payload = createPayload(dedupeRequestCount)
  console.log('[FETCH][dedupe] response:', payload.value)
  return payload
}

export const API1_QUERY: QueryDefinition<Api1Response> = {
  key: ['api1'] as const,
  fetcher: fetchApi1,
  policy: 'normal',
  config: {
    staleTime: 5_000
  }
}

export const STALE_TIME_EXAMPLE_QUERY: QueryDefinition<StaleTimeExampleResponse> = {
  key: ['stale-time-example'] as const,
  fetcher: fetchStaleTimeExample,
  policy: 'normal',
  config: {
    staleTime: 5_000,
    cacheTime: 15_000
  }
}

export const DEDUPE_EXAMPLE_QUERY: QueryDefinition<DedupeExampleResponse> = {
  key: ['dedupe-example'] as const,
  fetcher: fetchDedupeExample,
  policy: 'normal',
  config: {
    staleTime: 5_000,
    cacheTime: 15_000
  }
}

export const PRELOAD_EXAMPLE_QUERY: QueryDefinition<Api1Response> = {
  key: ['preload-example'] as const,
  fetcher: fetchApi1,
  policy: 'normal',
  config: {
    staleTime: 5_000,
    cacheTime: 15_000
  }
}

export const GC_EXAMPLE_QUERY: QueryDefinition<Api1Response> = {
  key: ['gc-example'] as const,
  fetcher: fetchApi1,
  policy: 'normal',
  config: {
    staleTime: 5_000,
    cacheTime: 8_000
  }
}
