import { BrowserWindow, dialog, ipcMain, shell } from 'electron'
import type { OpenDialogOptions } from 'electron'
import type {
  AnalysisOperationResult,
  DependencyGraphData,
  DependencyUpdate,
  NodeModulesAnalysis,
} from '../../src/types/analysis'
import type {
  AIConfig,
  AIOperationResult,
  AITestResult,
  AssistantRequest,
  AssistantResponse,
  AssistantStreamRequest,
  AssistantStreamEvent,
  SaveAIConfigInput,
} from '../../src/types/ai'
import type {
  EnvironmentInfo,
  OperationHistoryEntry,
  SystemOperationResult,
} from '../../src/types/system'
import type { ProjectOperationResult, ProjectRecord } from '../../src/types/project'
import type {
  PackageCommandRequest,
  PackageCommandResult,
  PackageOperationResult,
  ProjectDependencies,
  RegistryPackageDetail,
  RegistryPackageSummary,
} from '../../src/types/package'
import { PackageManagerService } from '../services/package-manager.service'
import { PackageService } from '../services/package.service'
import { ProjectService } from '../services/project.service'
import { AnalysisService } from '../services/analysis.service'
import { AiService } from '../services/ai.service'
import { EnvironmentService } from '../services/environment.service'
import { HistoryService } from '../services/history.service'

const projectService = new ProjectService()
const packageManagerService = new PackageManagerService()
const packageService = new PackageService()
const analysisService = new AnalysisService()
const aiService = new AiService()
const environmentService = new EnvironmentService()
const historyService = new HistoryService()
const assistantStreams = new Map<string, AbortController>()

function success<T>(data: T): ProjectOperationResult<T> {
  return { ok: true, data }
}

function failure<T>(error: unknown): ProjectOperationResult<T> {
  return {
    ok: false,
    error: error instanceof Error ? error.message : '发生未知错误。',
  }
}

/**
 * 集中注册 IPC，避免在 main.ts 中散落业务处理器。
 * 后续阶段会按 project、package、environment、ai 拆分子模块。
 */
export function registerIpcHandlers(): void {
  ipcMain.handle('app:ping', () => 'pong')

  ipcMain.handle(
    'project:list',
    (): ProjectOperationResult<ProjectRecord[]> => {
      try {
        return success(projectService.list())
      } catch (error) {
        return failure(error)
      }
    },
  )

  ipcMain.on('ai:assist-stream', (event, request: AssistantStreamRequest) => {
    const controller = new AbortController()
    assistantStreams.set(request.requestId, controller)
    void (async () => {
      const send = (payload: Omit<AssistantStreamEvent, 'requestId'>) => {
        if (!event.sender.isDestroyed()) {
          event.sender.send('ai:assist-stream-event', {
            requestId: request.requestId,
            ...payload,
          } satisfies AssistantStreamEvent)
        }
      }
      try {
        const stream = await aiService.assistStream(
          request.projectId,
          request.messages,
          controller.signal,
        )
        for await (const chunk of stream) send({ chunk })
        send({ done: true })
      } catch (error) {
        send({
          error: error instanceof Error ? error.message : 'Assistant 请求失败。',
        })
      } finally {
        assistantStreams.delete(request.requestId)
      }
    })()
  })

  ipcMain.on('ai:assist-stream-cancel', (_event, requestId: string) => {
    assistantStreams.get(requestId)?.abort()
  })

  ipcMain.handle(
    'project:add',
    async (event): Promise<ProjectOperationResult<ProjectRecord | null>> => {
      try {
        const owner = BrowserWindow.fromWebContents(event.sender)
        const options: OpenDialogOptions = {
          title: '选择 JavaScript 项目目录',
          properties: ['openDirectory'],
        }
        const selection = owner
          ? await dialog.showOpenDialog(owner, options)
          : await dialog.showOpenDialog(options)

        if (selection.canceled || !selection.filePaths[0]) {
          return success(null)
        }

        return success(await projectService.add(selection.filePaths[0]))
      } catch (error) {
        return failure(error)
      }
    },
  )

  ipcMain.handle(
    'project:refresh',
    async (
      _event,
      id: string,
    ): Promise<ProjectOperationResult<ProjectRecord>> => {
      try {
        return success(await projectService.refresh(id))
      } catch (error) {
        return failure(error)
      }
    },
  )

  ipcMain.handle(
    'project:remove',
    (_event, id: string): ProjectOperationResult<null> => {
      try {
        projectService.remove(id)
        return success(null)
      } catch (error) {
        return failure(error)
      }
    },
  )

  ipcMain.handle(
    'project:restore',
    (_event, id: string): ProjectOperationResult<ProjectRecord> => {
      try {
        return success(projectService.restore(id))
      } catch (error) {
        return failure(error)
      }
    },
  )

  ipcMain.handle(
    'project:open-folder',
    async (_event, id: string): Promise<ProjectOperationResult<null>> => {
      try {
        const error = await shell.openPath(projectService.getPath(id))
        if (error) throw new Error(error)
        return success(null)
      } catch (error) {
        return failure(error)
      }
    },
  )

  ipcMain.handle(
    'package:list-installed',
    async (
      _event,
      projectId: string,
    ): Promise<PackageOperationResult<ProjectDependencies>> => {
      try {
        return success(await packageManagerService.list(projectId))
      } catch (error) {
        return failure(error)
      }
    },
  )

  ipcMain.handle(
    'package:execute',
    async (
      _event,
      request: PackageCommandRequest,
    ): Promise<PackageOperationResult<PackageCommandResult>> => {
      try {
        return success(await packageManagerService.execute(request))
      } catch (error) {
        return failure(error)
      }
    },
  )

  ipcMain.handle(
    'registry:search',
    async (
      _event,
      query: string,
    ): Promise<PackageOperationResult<RegistryPackageSummary[]>> => {
      try {
        return success(await packageService.search(query))
      } catch (error) {
        return failure(error)
      }
    },
  )

  ipcMain.handle(
    'registry:detail',
    async (
      _event,
      name: string,
    ): Promise<PackageOperationResult<RegistryPackageDetail>> => {
      try {
        return success(await packageService.detail(name))
      } catch (error) {
        return failure(error)
      }
    },
  )

  ipcMain.handle(
    'analysis:updates',
    async (
      _event,
      projectId: string,
    ): Promise<AnalysisOperationResult<DependencyUpdate[]>> => {
      try {
        return success(await analysisService.updates(projectId))
      } catch (error) {
        return failure(error)
      }
    },
  )

  ipcMain.handle(
    'analysis:graph',
    async (
      _event,
      projectId: string,
    ): Promise<AnalysisOperationResult<DependencyGraphData>> => {
      try {
        return success(await analysisService.graph(projectId))
      } catch (error) {
        return failure(error)
      }
    },
  )

  ipcMain.handle(
    'analysis:node-modules',
    async (
      _event,
      projectId: string,
    ): Promise<AnalysisOperationResult<NodeModulesAnalysis>> => {
      try {
        return success(await analysisService.nodeModules(projectId))
      } catch (error) {
        return failure(error)
      }
    },
  )

  ipcMain.handle('ai:get-config', (): AIOperationResult<AIConfig> => {
    try {
      return success(aiService.getConfig())
    } catch (error) {
      return failure(error)
    }
  })

  ipcMain.handle(
    'ai:save-config',
    (_event, input: SaveAIConfigInput): AIOperationResult<AIConfig> => {
      try {
        return success(aiService.saveConfig(input))
      } catch (error) {
        return failure(error)
      }
    },
  )

  ipcMain.handle(
    'ai:test',
    async (): Promise<AIOperationResult<AITestResult>> => {
      try {
        return success(await aiService.test())
      } catch (error) {
        return failure(error)
      }
    },
  )

  ipcMain.handle(
    'ai:assist',
    async (
      _event,
      request: AssistantRequest,
    ): Promise<AIOperationResult<AssistantResponse>> => {
      try {
        return success(await aiService.assist(request))
      } catch (error) {
        return failure(error)
      }
    },
  )

  ipcMain.handle(
    'system:environment',
    async (): Promise<SystemOperationResult<EnvironmentInfo>> => {
      try {
        return success(await environmentService.inspect())
      } catch (error) {
        return failure(error)
      }
    },
  )

  ipcMain.handle(
    'system:set-registry',
    async (
      _event,
      url: string,
    ): Promise<SystemOperationResult<EnvironmentInfo>> => {
      try {
        return success(await environmentService.setRegistry(url))
      } catch (error) {
        return failure(error)
      }
    },
  )

  ipcMain.handle(
    'history:list',
    (): SystemOperationResult<OperationHistoryEntry[]> => {
      try {
        return success(historyService.list())
      } catch (error) {
        return failure(error)
      }
    },
  )
}
