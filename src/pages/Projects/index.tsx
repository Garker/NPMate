import {
  DeleteOutlined,
  FolderOpenOutlined,
  ReloadOutlined,
  UndoOutlined,
} from '@ant-design/icons'
import { Alert, Button, Empty, Space, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PageFrame } from '@/components/PageFrame'
import { useProjectsStore } from '@/stores/projects.store'
import type { ProjectRecord } from '@/types/project'
import { formatBytes, formatScanTime } from '@/utils/format'
import './styles.css'

export function ProjectsPage() {
  const projects = useProjectsStore((state) => state.projects)
  const loading = useProjectsStore((state) => state.loading)
  const scanningProjectId = useProjectsStore((state) => state.scanningProjectId)
  const selectedProjectId = useProjectsStore((state) => state.selectedProjectId)
  const lastRemoved = useProjectsStore((state) => state.lastRemoved)
  const error = useProjectsStore((state) => state.error)
  const add = useProjectsStore((state) => state.add)
  const refresh = useProjectsStore((state) => state.refresh)
  const remove = useProjectsStore((state) => state.remove)
  const restoreLastRemoved = useProjectsStore(
    (state) => state.restoreLastRemoved,
  )
  const openFolder = useProjectsStore((state) => state.openFolder)
  const select = useProjectsStore((state) => state.select)
  const clearError = useProjectsStore((state) => state.clearError)

  const columns: ColumnsType<ProjectRecord> = [
    {
      title: '项目',
      key: 'project',
      render: (_, project) => (
        <div className="project-name-cell">
          <strong>{project.name}</strong>
          <span title={project.path}>{project.path}</span>
        </div>
      ),
    },
    {
      title: '技术栈',
      key: 'stack',
      width: 160,
      render: (_, project) => (
        <Space size={4} wrap>
          <Tag>{project.framework}</Tag>
          <Tag color="blue">{project.packageManager}</Tag>
        </Space>
      ),
    },
    {
      title: '依赖',
      key: 'dependencies',
      width: 110,
      render: (_, project) => (
        <span className="numeric-cell">
          {project.dependenciesCount} + {project.devDependenciesCount}
        </span>
      ),
    },
    {
      title: 'node_modules',
      dataIndex: 'nodeModulesSize',
      width: 130,
      render: (value: number) => (
        <span className="numeric-cell">{formatBytes(value)}</span>
      ),
    },
    {
      title: '扫描时间',
      dataIndex: 'scannedAt',
      width: 130,
      render: (value: string) => formatScanTime(value),
    },
    {
      title: '操作',
      key: 'actions',
      width: 190,
      render: (_, project) => (
        <Space size={4}>
          <Button
            type="text"
            size="small"
            icon={<FolderOpenOutlined />}
            onClick={(event) => {
              event.stopPropagation()
              void openFolder(project.id)
            }}
          >
            打开
          </Button>
          <Button
            type="text"
            size="small"
            icon={<ReloadOutlined />}
            loading={scanningProjectId === project.id}
            onClick={(event) => {
              event.stopPropagation()
              void refresh(project.id)
            }}
          >
            刷新
          </Button>
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={(event) => {
              event.stopPropagation()
              void remove(project.id)
            }}
          >
            移除
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <PageFrame
      title="项目"
      description="扫描本地 JavaScript、TypeScript 项目，并保留依赖环境快照。"
      action={
        <Button
          type="primary"
          icon={<FolderOpenOutlined />}
          loading={loading}
          onClick={() => void add()}
        >
          添加项目
        </Button>
      }
    >
      <div className="project-feedback" aria-live="polite">
        {error && (
          <Alert
            type="error"
            showIcon
            closable
            message={error}
            onClose={clearError}
          />
        )}
        {lastRemoved && (
          <Alert
            type="info"
            showIcon
            message={`已从 NPMate 移除 ${lastRemoved.name}，本地文件未删除。`}
            action={
              <Button
                size="small"
                icon={<UndoOutlined />}
                onClick={() => void restoreLastRemoved()}
              >
                撤销
              </Button>
            }
          />
        )}
      </div>

      <div className="projects-table">
        <Table<ProjectRecord>
          rowKey="id"
          columns={columns}
          dataSource={projects}
          loading={loading}
          pagination={false}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="还没有项目。选择一个包含 package.json 的目录。"
              >
                <Button type="primary" onClick={() => void add()}>
                  添加第一个项目
                </Button>
              </Empty>
            ),
          }}
          rowClassName={(project) =>
            project.id === selectedProjectId ? 'is-selected' : ''
          }
          onRow={(project) => ({
            onClick: () => select(project.id),
          })}
        />
      </div>
    </PageFrame>
  )
}
