import { ensureFresh } from './core/ensureFresh.js'
import { policyMap } from './core/policies.js'
import { getOrCreateState } from './core/queryStore.js'
import { API1_QUERY } from './queries/api1.query.js'

async function main(): Promise<void> {
  const config = policyMap[API1_QUERY.policy]
  const state = getOrCreateState<Awaited<ReturnType<typeof API1_QUERY.fetcher>>>(
    API1_QUERY.key,
    config
  )

  console.log('First call')
  await ensureFresh(API1_QUERY, state)

  console.log('Second call (dedupe / cache)')
  await ensureFresh(API1_QUERY, state)

  console.log('Done')
}

void main()
