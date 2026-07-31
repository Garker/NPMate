import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { ChatAnthropic } from '@langchain/anthropic'
import { ChatGoogle } from '@langchain/google'
import { ChatOllama } from '@langchain/ollama'
import { ChatOpenAI } from '@langchain/openai'
import { toBaseMessages, toUIMessageStream } from '@ai-sdk/langchain'
import type { UIMessage, UIMessageChunk } from 'ai'
import { eq } from 'drizzle-orm'
import { safeStorage } from 'electron'
import { createAgent, tool } from 'langchain'
import { z } from 'zod'
import { getDatabase } from '../../database/client'
import { aiSettings } from '../../database/schema'
import type {
  AIConfig,
  AIProvider,
  AITestResult,
  AssistantRequest,
  AssistantResponse,
  SaveAIConfigInput,
} from '../../src/types/ai'
import { AnalysisService } from './analysis.service'
import { PackageManagerService } from './package-manager.service'
import { PackageService } from './package.service'
import { ProjectService } from './project.service'

const configId = 'default'
const providerDefaults: Record<AIProvider, { model: string; baseUrl: string }> = {
  openai: { model: 'gpt-4.1-mini', baseUrl: 'https://api.openai.com/v1' },
  deepseek: { model: 'deepseek-chat', baseUrl: 'https://api.deepseek.com' },
  bailian: {
    model: 'qwen-plus',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  },
  anthropic: {
    model: 'claude-sonnet-4-5',
    baseUrl: 'https://api.anthropic.com',
  },
  gemini: { model: 'gemini-2.5-flash', baseUrl: '' },
  ollama: { model: 'qwen3:8b', baseUrl: 'http://127.0.0.1:11434' },
  custom: { model: '', baseUrl: '' },
}

interface StoredConfig extends AIConfig {
  apiKey: string
}

function encryptApiKey(value: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('当前系统无法使用安全密钥存储，API Key 未保存。')
  }
  return safeStorage.encryptString(value).toString('base64')
}

function decryptApiKey(value: string | null): string {
  if (!value) return ''
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('当前系统无法解密已保存的 API Key。')
  }
  return safeStorage.decryptString(Buffer.from(value, 'base64'))
}

function contentText(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((part) =>
        typeof part === 'object' &&
        part !== null &&
        'text' in part &&
        typeof part.text === 'string'
          ? part.text
          : '',
      )
      .join('')
  }
  return String(content ?? '')
}

/**
 * AI 模型和工具只在主进程创建，API Key 永不暴露给 renderer。
 */
export class AiService {
  private readonly projects = new ProjectService()
  private readonly registry = new PackageService()
  private readonly analysis = new AnalysisService()
  private readonly packages = new PackageManagerService()

  getConfig(): AIConfig {
    const row = getDatabase()
      .select()
      .from(aiSettings)
      .where(eq(aiSettings.id, configId))
      .get()
    if (!row) {
      const defaults = providerDefaults.openai
      return {
        provider: 'openai',
        ...defaults,
        temperature: 0.2,
        apiKeyConfigured: false,
      }
    }
    return {
      provider: row.provider as AIProvider,
      model: row.model,
      baseUrl: row.baseUrl,
      temperature: row.temperature / 100,
      apiKeyConfigured: Boolean(row.encryptedApiKey),
    }
  }

  saveConfig(input: SaveAIConfigInput): AIConfig {
    const database = getDatabase()
    const existing = database
      .select()
      .from(aiSettings)
      .where(eq(aiSettings.id, configId))
      .get()
    const encryptedApiKey = input.apiKey?.trim()
      ? encryptApiKey(input.apiKey.trim())
      : (existing?.encryptedApiKey ?? null)
    const values = {
      provider: input.provider,
      model: input.model.trim(),
      baseUrl: input.baseUrl.trim(),
      temperature: Math.round(Math.min(1, Math.max(0, input.temperature)) * 100),
      encryptedApiKey,
      updatedAt: new Date().toISOString(),
    }
    if (!values.model) throw new Error('模型名称不能为空。')
    if (input.provider !== 'ollama' && !encryptedApiKey) {
      throw new Error('请配置 API Key。')
    }
    if (existing) {
      database.update(aiSettings).set(values).where(eq(aiSettings.id, configId)).run()
    } else {
      database.insert(aiSettings).values({ id: configId, ...values }).run()
    }
    return this.getConfig()
  }

  private storedConfig(): StoredConfig {
    const visible = this.getConfig()
    const row = getDatabase()
      .select({ encryptedApiKey: aiSettings.encryptedApiKey })
      .from(aiSettings)
      .where(eq(aiSettings.id, configId))
      .get()
    return { ...visible, apiKey: decryptApiKey(row?.encryptedApiKey ?? null) }
  }

  private model(config: StoredConfig) {
    if (config.provider === 'anthropic') {
      return new ChatAnthropic({
        model: config.model,
        apiKey: config.apiKey,
        temperature: config.temperature,
        anthropicApiUrl: config.baseUrl || undefined,
      })
    }
    if (config.provider === 'gemini') {
      return new ChatGoogle({
        model: config.model,
        apiKey: config.apiKey,
        temperature: config.temperature,
      })
    }
    if (config.provider === 'ollama') {
      return new ChatOllama({
        model: config.model,
        baseUrl: config.baseUrl || undefined,
        temperature: config.temperature,
      })
    }
    return new ChatOpenAI({
      model: config.model,
      apiKey: config.apiKey,
      temperature: config.temperature,
      streamUsage: false,
      configuration: { baseURL: config.baseUrl || undefined },
    })
  }

  async test(): Promise<AITestResult> {
    const config = this.storedConfig()
    try {
      const started = Date.now()
      const response = await this.model(config).invoke(
        '只回复“NPMate connection ready”。',
      )
      return {
        message: contentText(response.content),
        latencyMs: Date.now() - started,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '模型连接失败。'
      throw new Error(
        config.apiKey ? message.replaceAll(config.apiKey, '[REDACTED]') : message,
        { cause: error },
      )
    }
  }

  private assistantAgent(projectId: string, config: StoredConfig) {
    const project = this.projects.get(projectId)
    const projectAnalysis = tool(
      async () => {
        const packageJson = JSON.parse(
          await readFile(join(project.path, 'package.json'), 'utf8'),
        ) as Record<string, unknown>
        const entries = await readdir(project.path, { withFileTypes: true })
        return JSON.stringify({
          project,
          packageJson,
          structure: entries.slice(0, 80).map((item) => ({
            name: item.name,
            type: item.isDirectory() ? 'directory' : 'file',
          })),
        })
      },
      {
        name: 'project_analysis',
        description: '读取当前项目的 package.json、锁文件信息和顶层结构。',
        schema: z.object({}),
      },
    )
    const npmSearch = tool(
      async ({ query }: { query: string }) =>
        JSON.stringify((await this.registry.search(query)).slice(0, 5)),
      {
        name: 'npm_search',
        description: '根据功能需求搜索 npm Registry，返回候选包和下载量。',
        schema: z.object({ query: z.string().min(2) }),
      },
    )
    const dependencyAnalysis = tool(
      async () =>
        JSON.stringify({
          installed: await this.packages.list(project.id),
          updates: await this.analysis.updates(project.id),
        }),
      {
        name: 'dependency_analysis',
        description: '检查已有依赖、重复能力和可升级版本。',
        schema: z.object({}),
      },
    )
    const installationAdvice = tool(
      ({ packageName, version }: { packageName: string; version?: string }) => {
        const target = version ? `${packageName}@${version}` : packageName
        const command =
          project.packageManager === 'pnpm'
            ? `pnpm add ${target}`
            : project.packageManager === 'yarn'
              ? `yarn add ${target}`
              : `npm install ${target}`
        return JSON.stringify({
          packageName,
          command,
          executable: false,
          notice: '仅生成建议；必须由用户在 NPMate 界面确认后执行。',
        })
      },
      {
        name: 'installation_advice',
        description: '生成与当前包管理器匹配的安装建议，不执行命令。',
        schema: z.object({
          packageName: z.string(),
          version: z.string().optional(),
        }),
      },
    )
    return createAgent({
      model: this.model(config),
      tools: [projectAnalysis, npmSearch, dependencyAnalysis, installationAdvice],
      systemPrompt:
        '你是 NPMate Package Assistant。用中文简洁回答。先使用工具了解项目，再给出贴合现有技术栈的建议。不要声称已经安装任何包；你没有安装工具。若推荐新依赖，必须明确说明理由、权衡和建议命令，并提醒用户确认后才能执行。',
    })
  }

  async assist(request: AssistantRequest): Promise<AssistantResponse> {
    const config = this.storedConfig()
    const agent = this.assistantAgent(request.projectId, config)
    try {
      const result = await agent.invoke({
        messages: [{ role: 'user', content: request.prompt }],
      })
      const lastMessage = result.messages.at(-1)
      return {
        content: contentText(lastMessage?.content),
        provider: config.provider,
        model: config.model,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Assistant 请求失败。'
      throw new Error(
        config.apiKey ? message.replaceAll(config.apiKey, '[REDACTED]') : message,
        { cause: error },
      )
    }
  }

  async assistStream(
    projectId: string,
    messages: UIMessage[],
    signal?: AbortSignal,
  ): Promise<ReadableStream<UIMessageChunk>> {
    const config = this.storedConfig()
    const agent = this.assistantAgent(projectId, config)
    try {
      const events = agent.streamEvents(
        { messages: await toBaseMessages(messages) },
        { version: 'v2', signal },
      )
      return toUIMessageStream(events)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Assistant 请求失败。'
      throw new Error(
        config.apiKey ? message.replaceAll(config.apiKey, '[REDACTED]') : message,
        { cause: error },
      )
    }
  }

  defaults(provider: AIProvider) {
    return providerDefaults[provider]
  }
}
