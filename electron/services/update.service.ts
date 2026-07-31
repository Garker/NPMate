import { app, BrowserWindow } from 'electron'
import electronUpdater from 'electron-updater'
import type { ProgressInfo, UpdateInfo } from 'electron-updater'
import type {
  UpdateOperationResult,
  UpdateState,
} from '../../src/types/update'

const updateChannel = 'update:state-changed'
const { autoUpdater } = electronUpdater

export class UpdateService {
  private initialized = false
  private state: UpdateState = {
    status: app.isPackaged ? 'idle' : 'disabled',
    currentVersion: app.getVersion(),
    availableVersion: null,
    downloadPercent: null,
    message: app.isPackaged ? null : '开发模式下不会检查更新。',
  }

  initialize(): void {
    if (this.initialized) return
    this.initialized = true

    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = true

    autoUpdater.on('checking-for-update', () => {
      this.updateState({
        status: 'checking',
        downloadPercent: null,
        message: '正在检查更新…',
      })
    })
    autoUpdater.on('update-available', (info: UpdateInfo) => {
      this.updateState({
        status: 'available',
        availableVersion: info.version,
        downloadPercent: null,
        message: `发现新版本 ${info.version}。`,
      })
    })
    autoUpdater.on('update-not-available', () => {
      this.updateState({
        status: 'not-available',
        availableVersion: null,
        downloadPercent: null,
        message: '当前已是最新版本。',
      })
    })
    autoUpdater.on('download-progress', (progress: ProgressInfo) => {
      this.updateState({
        status: 'downloading',
        downloadPercent: Math.round(progress.percent),
        message: '正在下载更新…',
      })
    })
    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      this.updateState({
        status: 'downloaded',
        availableVersion: info.version,
        downloadPercent: 100,
        message: '更新已下载，重启应用即可安装。',
      })
    })
    autoUpdater.on('error', (error: Error) => {
      this.updateState({
        status: 'error',
        downloadPercent: null,
        message: error.message,
      })
    })

    if (app.isPackaged) {
      setTimeout(() => void this.check(), 5_000)
    }
  }

  getState(): UpdateState {
    return { ...this.state }
  }

  async check(): Promise<UpdateOperationResult> {
    if (!app.isPackaged) return { ok: true, data: this.getState() }

    try {
      await autoUpdater.checkForUpdates()
      return { ok: true, data: this.getState() }
    } catch (error) {
      return this.failure(error)
    }
  }

  async download(): Promise<UpdateOperationResult> {
    if (this.state.status !== 'available') {
      return { ok: false, error: '当前没有可下载的更新。' }
    }

    try {
      await autoUpdater.downloadUpdate()
      return { ok: true, data: this.getState() }
    } catch (error) {
      return this.failure(error)
    }
  }

  install(): UpdateOperationResult {
    if (this.state.status !== 'downloaded') {
      return { ok: false, error: '更新尚未下载完成。' }
    }

    setImmediate(() => autoUpdater.quitAndInstall(false, true))
    return { ok: true, data: this.getState() }
  }

  private updateState(patch: Partial<UpdateState>): void {
    this.state = { ...this.state, ...patch }
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.webContents.isDestroyed()) {
        window.webContents.send(updateChannel, this.getState())
      }
    }
  }

  private failure(error: unknown): UpdateOperationResult {
    const message = error instanceof Error ? error.message : '更新操作失败。'
    this.updateState({ status: 'error', message })
    return { ok: false, error: message }
  }
}
