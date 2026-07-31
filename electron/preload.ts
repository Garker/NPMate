import { contextBridge, ipcRenderer } from 'electron'
import type {
  AnalysisOperationResult,
  DependencyGraphData,
  DependencyUpdate,
  NodeModulesAnalysis,
} from '../src/types/analysis'
import type {
  AIConfig,
  AIOperationResult,
  AITestResult,
  AssistantRequest,
  AssistantResponse,
  AssistantStreamRequest,
  AssistantStreamEvent,
  SaveAIConfigInput,
} from '../src/types/ai'
import type {
  EnvironmentInfo,
  OperationHistoryEntry,
  SystemOperationResult,
} from '../src/types/system'
import type {
  ProjectOperationResult,
  ProjectRecord,
} from '../src/types/project'
import type {
  PackageCommandRequest,
  PackageCommandResult,
  PackageOperationResult,
  ProjectDependencies,
  RegistryPackageDetail,
  RegistryPackageSummary,
} from '../src/types/package'

const desktopApi = {
  /**
   * 验证 renderer → preload → main 的安全 IPC 通道是否正常。
   */
  ping: (): Promise<string> => ipcRenderer.invoke('app:ping'),
  platform: process.platform,
  projects: {
    list: (): Promise<ProjectOperationResult<ProjectRecord[]>> =>
      ipcRenderer.invoke('project:list'),
    add: (): Promise<ProjectOperationResult<ProjectRecord | null>> =>
      ipcRenderer.invoke('project:add'),
    refresh: (id: string): Promise<ProjectOperationResult<ProjectRecord>> =>
      ipcRenderer.invoke('project:refresh', id),
    remove: (id: string): Promise<ProjectOperationResult<null>> =>
      ipcRenderer.invoke('project:remove', id),
    restore: (id: string): Promise<ProjectOperationResult<ProjectRecord>> =>
      ipcRenderer.invoke('project:restore', id),
    openFolder: (id: string): Promise<ProjectOperationResult<null>> =>
      ipcRenderer.invoke('project:open-folder', id),
  },
  packages: {
    listInstalled: (
      projectId: string,
    ): Promise<PackageOperationResult<ProjectDependencies>> =>
      ipcRenderer.invoke('package:list-installed', projectId),
    execute: (
      request: PackageCommandRequest,
    ): Promise<PackageOperationResult<PackageCommandResult>> =>
      ipcRenderer.invoke('package:execute', request),
  },
  registry: {
    search: (
      query: string,
    ): Promise<PackageOperationResult<RegistryPackageSummary[]>> =>
      ipcRenderer.invoke('registry:search', query),
    detail: (
      name: string,
    ): Promise<PackageOperationResult<RegistryPackageDetail>> =>
      ipcRenderer.invoke('registry:detail', name),
  },
  analysis: {
    updates: (
      projectId: string,
    ): Promise<AnalysisOperationResult<DependencyUpdate[]>> =>
      ipcRenderer.invoke('analysis:updates', projectId),
    graph: (
      projectId: string,
    ): Promise<AnalysisOperationResult<DependencyGraphData>> =>
      ipcRenderer.invoke('analysis:graph', projectId),
    nodeModules: (
      projectId: string,
    ): Promise<AnalysisOperationResult<NodeModulesAnalysis>> =>
      ipcRenderer.invoke('analysis:node-modules', projectId),
  },
  ai: {
    getConfig: (): Promise<AIOperationResult<AIConfig>> =>
      ipcRenderer.invoke('ai:get-config'),
    saveConfig: (
      input: SaveAIConfigInput,
    ): Promise<AIOperationResult<AIConfig>> =>
      ipcRenderer.invoke('ai:save-config', input),
    deleteApiKey: (): Promise<AIOperationResult<AIConfig>> =>
      ipcRenderer.invoke('ai:delete-api-key'),
    test: (
      input: SaveAIConfigInput,
    ): Promise<AIOperationResult<AITestResult>> =>
      ipcRenderer.invoke('ai:test', input),
    assist: (
      request: AssistantRequest,
    ): Promise<AIOperationResult<AssistantResponse>> =>
      ipcRenderer.invoke('ai:assist', request),
    startAssistStream: (request: AssistantStreamRequest): void =>
      ipcRenderer.send('ai:assist-stream', request),
    cancelAssistStream: (requestId: string): void =>
      ipcRenderer.send('ai:assist-stream-cancel', requestId),
    onAssistStreamEvent: (
      listener: (event: AssistantStreamEvent) => void,
    ): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, payload: AssistantStreamEvent) =>
        listener(payload)
      ipcRenderer.on('ai:assist-stream-event', handler)
      return () => ipcRenderer.removeListener('ai:assist-stream-event', handler)
    },
  },
  system: {
    environment: (): Promise<SystemOperationResult<EnvironmentInfo>> =>
      ipcRenderer.invoke('system:environment'),
    setRegistry: (
      url: string,
    ): Promise<SystemOperationResult<EnvironmentInfo>> =>
      ipcRenderer.invoke('system:set-registry', url),
  },
  history: {
    list: (): Promise<SystemOperationResult<OperationHistoryEntry[]>> =>
      ipcRenderer.invoke('history:list'),
  },
}

contextBridge.exposeInMainWorld('npmate', desktopApi)

export type NPMateDesktopApi = typeof desktopApi
