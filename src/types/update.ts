export type UpdateStatus =
  | 'idle'
  | 'disabled'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error'

export interface UpdateState {
  status: UpdateStatus
  currentVersion: string
  availableVersion: string | null
  downloadPercent: number | null
  message: string | null
}

export interface UpdateOperationResult {
  ok: boolean
  data?: UpdateState
  error?: string
}
