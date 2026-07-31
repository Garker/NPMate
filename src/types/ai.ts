import type { ProjectOperationResult } from './project'
import type { UIMessage, UIMessageChunk } from 'ai'

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
  apiKeyConfigured: boolean
}

export interface SaveAIConfigInput {
  provider: AIProvider
  model: string
  baseUrl: string
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

export interface AssistantStreamRequest {
  requestId: string
  projectId: string
  messages: UIMessage[]
}

export interface AssistantStreamEvent {
  requestId: string
  chunk?: UIMessageChunk
  error?: string
  done?: boolean
}

export type AIOperationResult<T> = ProjectOperationResult<T>
