import type {
  AIConfig,
  AITestResult,
  AssistantRequest,
  AssistantResponse,
  SaveAIConfigInput,
} from '@/types/ai'

function api() {
  if (!window.npmate) throw new Error('AI 功能仅可在 Electron 中使用。')
  return window.npmate.ai
}

async function unwrap<T>(
  promise: Promise<{ ok: true; data: T } | { ok: false; error: string }>,
): Promise<T> {
  const result = await promise
  if (!result.ok) throw new Error(result.error)
  return result.data
}

export const aiService = {
  getConfig: (): Promise<AIConfig> => unwrap(api().getConfig()),
  saveConfig: (input: SaveAIConfigInput): Promise<AIConfig> =>
    unwrap(api().saveConfig(input)),
  test: (): Promise<AITestResult> => unwrap(api().test()),
  assist: (request: AssistantRequest): Promise<AssistantResponse> =>
    unwrap(api().assist(request)),
}
