export type Api1Response = {
  value: number
}

export async function fetchApi1(): Promise<Api1Response> {
  console.log('API1 FETCH')
  return { value: Math.random() }
}
