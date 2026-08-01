import { create } from 'zustand'
import { packagesService } from '@/services/packages.service'
import type {
  InstalledPackage,
  PackageAction,
  PackageCommandRequest,
  PackageCommandResult,
  PackageOperationTask,
  TrackedPackageAction,
} from '@/types/package'

let taskSequence = 0

function createTask(
  request: PackageCommandRequest & { action: TrackedPackageAction },
): PackageOperationTask {
  taskSequence += 1
  return {
    id: `package-task-${Date.now()}-${taskSequence}`,
    request,
    status: 'queued',
    error: null,
  }
}

function isTrackedRequest(
  request: PackageCommandRequest,
): request is PackageCommandRequest & { action: TrackedPackageAction } {
  return request.action !== 'install'
}

interface PackagesState {
  projectId: string | null
  dependencies: InstalledPackage[]
  loading: boolean
  executingPackage: string | null
  executingAction: PackageAction | null
  operationTasks: PackageOperationTask[]
  error: string | null
  lastResult: PackageCommandResult | null
  load: (projectId: string) => Promise<void>
  execute: (request: PackageCommandRequest) => Promise<boolean>
  executeBatch: (requests: PackageCommandRequest[]) => Promise<boolean[]>
  retryTask: (taskId: string) => Promise<boolean>
  reset: () => void
  clearError: () => void
}

export const usePackagesStore = create<PackagesState>((set, get) => {
  async function load(projectId: string) {
    set({ loading: true, error: null, projectId })
    try {
      const result = await packagesService.listInstalled(projectId)
      if (get().projectId === projectId) {
        set({ dependencies: result.dependencies })
      }
    } catch (error) {
      set({
        dependencies: [],
        error: error instanceof Error ? error.message : '依赖读取失败。',
      })
    } finally {
      if (get().projectId === projectId) set({ loading: false })
    }
  }

  async function run(
    request: PackageCommandRequest,
    taskId: string | null,
  ): Promise<boolean> {
    set({
      executingPackage: request.packageName,
      executingAction: request.action,
      error: null,
      lastResult: null,
    })
    if (taskId) {
      set((state) => ({
        operationTasks: state.operationTasks.map((task) =>
          task.id === taskId
            ? { ...task, status: 'running', error: null }
            : task,
        ),
      }))
    }
    try {
      const result = await packagesService.execute(request)
      if (request.action === 'install') set({ lastResult: result })
      if (taskId) {
        set((state) => ({
          operationTasks: state.operationTasks.map((task) =>
            task.id === taskId ? { ...task, status: 'success' } : task,
          ),
        }))
      }
      if (get().projectId === request.projectId) {
        await load(request.projectId)
      }
      return true
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '包管理命令执行失败。'
      set({
        error: errorMessage,
      })
      if (taskId) {
        set((state) => ({
          operationTasks: state.operationTasks.map((task) =>
            task.id === taskId
              ? { ...task, status: 'failed', error: errorMessage }
              : task,
          ),
        }))
      }
      return false
    } finally {
      set({ executingPackage: null, executingAction: null })
    }
  }

  return {
    projectId: null,
    dependencies: [],
    loading: false,
    executingPackage: null,
    executingAction: null,
    operationTasks: [],
    error: null,
    lastResult: null,

    load,

    execute: async (request) => {
      let taskId: string | null = null
      if (isTrackedRequest(request)) {
        const task = createTask(request)
        taskId = task.id
        set((state) => ({
          operationTasks: [task, ...state.operationTasks].slice(0, 50),
        }))
      }
      return run(request, taskId)
    },

    executeBatch: async (requests) => {
      const trackedRequests = requests.filter(isTrackedRequest)
      const tasks = trackedRequests.map(createTask)
      set({
        operationTasks: tasks,
        error: null,
        lastResult: null,
      })

      const results: boolean[] = []
      for (const task of tasks) {
        results.push(await run(task.request, task.id))
      }
      return results
    },

    retryTask: async (taskId) => {
      if (get().executingPackage !== null) return false
      const task = get().operationTasks.find((item) => item.id === taskId)
      if (!task || task.status !== 'failed') return false
      return run(task.request, task.id)
    },

    reset: () =>
      set({
        projectId: null,
        dependencies: [],
        executingPackage: null,
        executingAction: null,
        error: null,
        lastResult: null,
      }),
    clearError: () => set({ error: null }),
  }
})
