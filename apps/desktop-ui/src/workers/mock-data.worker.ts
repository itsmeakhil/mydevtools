import { generateMockData, type GenerateOptions } from '@/lib/mock-data-generator'

export type MockDataWorkerRequest = {
  id: number
  options: GenerateOptions
}

export type MockDataWorkerResponse =
  | { id: number; result: string }
  | { id: number; error: string }

self.onmessage = (event: MessageEvent<MockDataWorkerRequest>) => {
  const { id, options } = event.data
  let response: MockDataWorkerResponse
  try {
    response = { id, result: generateMockData(options) }
  } catch (error) {
    response = { id, error: error instanceof Error ? error.message : String(error) }
  }
  self.postMessage(response)
}
