import { fetchApi1, type Api1Response } from '../api/api1.js'
import type { QueryDefinition } from '../core/types.js'

export const API1_QUERY: QueryDefinition<Api1Response> = {
  key: ['api1'],
  fetcher: fetchApi1,
  policy: 'normal'
}
