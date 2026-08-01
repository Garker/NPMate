import {
  CheckCircleFilled,
  ClockCircleOutlined,
  CloseCircleFilled,
  DeleteOutlined,
  LoadingOutlined,
  ReloadOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import { Badge, Button, Popover, Progress, Tag, Tooltip } from 'antd'
import { useMemo, useRef, useState } from 'react'
import { useAnalysisStore } from '@/stores/analysis.store'
import { usePackagesStore } from '@/stores/packages.store'
import { useProjectsStore } from '@/stores/projects.store'
import type { PackageOperationTask } from '@/types/package'
import './styles.css'

const statusLabels: Record<PackageOperationTask['status'], string> = {
  queued: '等待中',
  running: '执行中',
  success: '已完成',
  failed: '失败',
}

function TaskStatusIcon({
  status,
}: {
  status: PackageOperationTask['status']
}) {
  if (status === 'running') {
    return <LoadingOutlined className="package-task__status is-running" spin />
  }
  if (status === 'success') {
    return <CheckCircleFilled className="package-task__status is-success" />
  }
  if (status === 'failed') {
    return <CloseCircleFilled className="package-task__status is-failed" />
  }
  return <ClockCircleOutlined className="package-task__status" />
}

export function PackageTaskCenter() {
  const [hovered, setHovered] = useState(false)
  const [pinned, setPinned] = useState(false)
  const suppressHoverRef = useRef(false)
  const closeTimerRef = useRef<number | null>(null)
  const tasks = usePackagesStore((state) => state.operationTasks)
  const executingPackage = usePackagesStore((state) => state.executingPackage)
  const retryTask = usePackagesStore((state) => state.retryTask)
  const refreshProject = useProjectsStore((state) => state.refresh)
  const selectedProjectId = useProjectsStore((state) => state.selectedProjectId)
  const loadUpdates = useAnalysisStore((state) => state.loadUpdates)

  const summary = useMemo(() => {
    const completed = tasks.filter(
      (task) => task.status === 'success' || task.status === 'failed',
    ).length
    const failed = tasks.filter((task) => task.status === 'failed').length
    const active = tasks.filter(
      (task) => task.status === 'queued' || task.status === 'running',
    ).length
    return {
      active,
      completed,
      failed,
      percent: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
    }
  }, [tasks])

  function cancelClose() {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  function openFromHover() {
    cancelClose()
    if (!suppressHoverRef.current) setHovered(true)
  }

  function closeFromHover() {
    suppressHoverRef.current = false
    cancelClose()
    closeTimerRef.current = window.setTimeout(() => {
      setHovered(false)
      closeTimerRef.current = null
    }, 120)
  }

  function togglePinned() {
    if (pinned) {
      suppressHoverRef.current = true
      setPinned(false)
      setHovered(false)
      return
    }
    setPinned(true)
  }

  async function retry(task: PackageOperationTask) {
    if (!(await retryTask(task.id))) return
    await refreshProject(task.request.projectId)
    if (selectedProjectId === task.request.projectId) {
      await loadUpdates(task.request.projectId)
    }
  }

  if (tasks.length === 0) return null

  const content = (
    <section
      className="package-task-center"
      aria-label="包管理任务进度"
      onMouseEnter={openFromHover}
      onMouseLeave={closeFromHover}
    >
      <header className="package-task-center__header">
        <div>
          <strong>包管理进度</strong>
          <span>
            已完成 {summary.completed} / {tasks.length}
          </span>
        </div>
        {summary.failed > 0 && <Tag color="error">{summary.failed} 个失败</Tag>}
      </header>
      <Progress
        percent={summary.percent}
        size="small"
        status={
          summary.active > 0
            ? 'active'
            : summary.failed > 0
              ? 'exception'
              : 'success'
        }
      />
      <div className="package-task-center__list">
        {tasks.map((task) => (
          <div className="package-task" key={task.id}>
            <TaskStatusIcon status={task.status} />
            <div className="package-task__body">
              <div>
                <Tag
                  bordered={false}
                  color={task.request.action === 'upgrade' ? 'blue' : 'red'}
                  icon={
                    task.request.action === 'upgrade' ? (
                      <SyncOutlined />
                    ) : (
                      <DeleteOutlined />
                    )
                  }
                >
                  {task.request.action === 'upgrade' ? '更新' : '删除'}
                </Tag>
                <strong>{task.request.packageName}</strong>
              </div>
              <Tooltip title={task.error}>
                <span className={task.status === 'failed' ? 'is-failed' : ''}>
                  {task.error || statusLabels[task.status]}
                </span>
              </Tooltip>
            </div>
            {task.status === 'failed' && (
              <Tooltip title="重新执行">
                <Button
                  type="text"
                  size="small"
                  icon={<ReloadOutlined />}
                  aria-label={`重新执行 ${task.request.packageName}`}
                  disabled={executingPackage !== null}
                  onClick={() => void retry(task)}
                />
              </Tooltip>
            )}
          </div>
        ))}
      </div>
    </section>
  )

  return (
    <Popover
      content={content}
      open={pinned || hovered}
      placement="bottomRight"
      arrow={false}
      getPopupContainer={(triggerNode) =>
        triggerNode.closest<HTMLElement>('.app-shell') ?? document.body
      }
    >
      <span
        className="package-task-center__trigger"
        onMouseEnter={openFromHover}
        onMouseLeave={closeFromHover}
      >
        <Badge
          count={summary.failed + summary.active}
          color={
            summary.failed > 0 ? 'var(--color-error)' : 'var(--color-accent)'
          }
          size="small"
        >
          <Button
            type={pinned ? 'default' : 'text'}
            icon={<SyncOutlined spin={summary.active > 0} />}
            aria-label="查看包管理进度"
            aria-expanded={pinned || hovered}
            onFocus={openFromHover}
            onBlur={closeFromHover}
            onClick={togglePinned}
          />
        </Badge>
      </span>
    </Popover>
  )
}
