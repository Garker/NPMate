import type { ProjectOperationResult } from './project'

export type AIProvider =
  | 'openai'
  | 'deepseek'
  | 'bailian'
  | 'anthropic'
  | 'gemini'
  | 'ollama'
  | 'custom'

export interface AIConfig {
  provider: AIProvider
  model: string
  baseUrl: string
  temperature: number
  apiKeyConfigured: boolean
}

export interface SaveAIConfigInput {
  provider: AIProvider
  model: string
  baseUrl: string
  temperature: number
  apiKey?: string
}

export interface AITestResult {
  message: string
  latencyMs: number
}

export interface AssistantRequest {
  projectId: string
  prompt: string
}

export interface AssistantResponse {
  content: string
  provider: AIProvider
  model: string
}

export type AIOperationResult<T> = ProjectOperationResult<T>
