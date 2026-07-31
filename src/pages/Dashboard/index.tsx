import {
  BranchesOutlined,
  ClockCircleOutlined,
  CodeOutlined,
  DeleteOutlined,
  FolderOpenOutlined,
  HddOutlined,
  PieChartOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { Button, Popconfirm, Space } from 'antd'
import { PageFrame } from '@/components/PageFrame'
import { useProjectsStore } from '@/stores/projects.store'
import { formatBytes, formatScanTime } from '@/utils/format'
import './styles.css'

export function DashboardPage() {
  const projects = useProjectsStore((state) => state.projects)
  const selectedProjectId = useProjectsStore((state) => state.selectedProjectId)
  const scanningProjectId = useProjectsStore((state) => state.scanningProjectId)
  const openFolder = useProjectsStore((state) => state.openFolder)
  const refresh = useProjectsStore((state) => state.refresh)
  const remove = useProjectsStore((state) => state.remove)
  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) ?? null
  const dependencyCount = projects.reduce(
    (total, project) =>
      total + project.dependenciesCount + project.devDependenciesCount,
    0,
  )
  const selectedDependencyCount = selectedProject
    ? selectedProject.dependenciesCount + selectedProject.devDependenciesCount
    : 0
  const overviewItems = [
    {
      title: '项目名称',
      value: selectedProject?.name ?? '未选择项目',
      note: selectedProject ? '当前选中的本地项目' : '从左侧选择或添加项目',
      icon: <FolderOpenOutlined />,
    },
    {
      title: '项目详情',
      value: selectedProject ? `Node ${selectedProject.nodeVersion}` : '—',
      note: selectedProject
        ? `包管理器 ${selectedProject.packageManager} · 总包数 ${selectedDependencyCount}`
        : 'Node 版本 · 包管理器 · 总包数',
      icon: <CodeOutlined />,
    },
    {
      title: '依赖分布',
      value: selectedProject
        ? `${selectedProject.devDependenciesCount} / ${selectedProject.dependenciesCount}`
        : '0 / 0',
      note: '开发依赖 / 生产依赖',
      icon: <PieChartOutlined />,
    },
    {
      title: '总索引数',
      value: String(dependencyCount),
      note: '全部项目累计依赖',
      icon: <BranchesOutlined />,
    },
    {
      title: 'node_modules 大小',
      value: selectedProject ? formatBytes(selectedProject.nodeModulesSize) : '—',
      note: '当前项目依赖占用空间',
      icon: <HddOutlined />,
    },
    {
      title: '扫描时间',
      value: selectedProject ? formatScanTime(selectedProject.scannedAt) : '—',
      note: '当前项目最近一次扫描',
      icon: <ClockCircleOutlined />,
    },
  ]

  return (
    <PageFrame
      title="项目工作台"
      description="集中查看项目状态、依赖风险和 Package Assistant 建议。"
      action={
        <Space size={8}>
          <Button
            icon={<FolderOpenOutlined />}
            disabled={!selectedProject}
            onClick={() => selectedProject && void openFolder(selectedProject.id)}
          >
            打开
          </Button>
          <Button
            icon={<ReloadOutlined />}
            disabled={!selectedProject}
            loading={scanningProjectId === selectedProject?.id}
            onClick={() => selectedProject && void refresh(selectedProject.id)}
          >
            刷新
          </Button>
          <Popconfirm
            title="删除当前项目？"
            description="只从 NPMate 中移除记录，不会删除本地项目文件。"
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            disabled={!selectedProject}
            onConfirm={() => selectedProject && remove(selectedProject.id)}
          >
            <Button danger icon={<DeleteOutlined />} disabled={!selectedProject}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      }
    >
      <div className="overview-grid">
        {overviewItems.map((item) => (
          <article className="overview-item" key={item.title}>
            <div className="overview-item__heading">
              <span className="overview-item__icon">{item.icon}</span>
              <span>{item.title}</span>
            </div>
            <strong>{item.value}</strong>
            <small>{item.note}</small>
          </article>
        ))}
      </div>

    </PageFrame>
  )
}
