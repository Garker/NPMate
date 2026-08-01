import {
  BranchesOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import {
  Alert,
  Button,
  Empty,
  Popconfirm,
  Progress,
  Space,
  Table,
  Tabs,
  Tag,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useMemo, useState } from 'react'
import { PageFrame } from '@/components/PageFrame'
import { useAnalysisStore } from '@/stores/analysis.store'
import { usePackagesStore } from '@/stores/packages.store'
import { useProjectsStore } from '@/stores/projects.store'
import type {
  DependencyUpdate,
  ModuleSizeEntry,
} from '@/types/analysis'
import { formatBytes } from '@/utils/format'
import './styles.css'

const upgradeColors: Record<DependencyUpdate['upgradeType'], string> = {
  major: 'red',
  minor: 'gold',
  patch: 'blue',
  current: 'green',
  unknown: 'default',
}

export function DependencyGraphPage() {
  const [activeTab, setActiveTab] = useState('updates')
  const selectedProjectId = useProjectsStore((state) => state.selectedProjectId)
  const projects = useProjectsStore((state) => state.projects)
  const refreshProject = useProjectsStore((state) => state.refresh)
  const analysis = useAnalysisStore()
  const executePackage = usePackagesStore((state) => state.execute)
  const executePackageBatch = usePackagesStore((state) => state.executeBatch)
  const executingPackage = usePackagesStore((state) => state.executingPackage)
  const operationTasks = usePackagesStore((state) => state.operationTasks)
  const selectedProject = projects.find(
    (project) => project.id === selectedProjectId,
  )

  const flow = useMemo(() => {
    const levelCounts = new Map<number, number>()
    const nodes: Node[] = (analysis.graph?.nodes ?? []).map((item) => {
      const index = levelCounts.get(item.depth) ?? 0
      levelCounts.set(item.depth, index + 1)
      return {
        id: item.id,
        position: { x: item.depth * 240, y: index * 88 },
        data: { label: `${item.name}\n${item.version}` },
        className: item.depth === 0 ? 'graph-node graph-node--root' : 'graph-node',
      }
    })
    const edges: Edge[] = (analysis.graph?.edges ?? []).map((item) => ({
      ...item,
      animated: false,
    }))
    return { nodes, edges }
  }, [analysis.graph])

  async function upgrade(items: DependencyUpdate[]) {
    if (!selectedProjectId) return
    const requests = items
      .filter((item) => item.upgradeType !== 'current')
      .map((item) => ({
        projectId: selectedProjectId,
        action: 'upgrade' as const,
        packageName: item.name,
        version: item.latestVersion,
        dev: item.kind === 'devDependency',
      }))
    if (requests.length === 1) {
      await executePackage(requests[0]!)
    } else if (requests.length > 1) {
      await executePackageBatch(requests)
    }
    await refreshProject(selectedProjectId)
    await analysis.loadUpdates(selectedProjectId)
  }

  const pendingUpdates = analysis.updates.filter(
    (item) => item.upgradeType !== 'current',
  )
  const packageOperationRunning =
    executingPackage !== null ||
    operationTasks.some(
      (task) => task.status === 'queued' || task.status === 'running',
    )
  const updateColumns: ColumnsType<DependencyUpdate> = [
    { title: '包', dataIndex: 'name', render: (name) => <strong>{name}</strong> },
    { title: '当前', dataIndex: 'currentRange', width: 130 },
    { title: '最新', dataIndex: 'latestVersion', width: 110 },
    {
      title: '类型',
      dataIndex: 'upgradeType',
      width: 100,
      render: (value: DependencyUpdate['upgradeType']) => (
        <Tag color={upgradeColors[value]}>{value}</Tag>
      ),
    },
    {
      title: '操作',
      width: 100,
      render: (_, item) => (
        <Popconfirm
          title={`升级 ${item.name} 到 ${item.latestVersion}`}
          onConfirm={() => void upgrade([item])}
        >
          <Button
            type="text"
            size="small"
            loading={executingPackage === item.name}
            disabled={
              item.upgradeType === 'current' ||
              (packageOperationRunning && executingPackage !== item.name)
            }
          >
            升级
          </Button>
        </Popconfirm>
      ),
    },
  ]
  const sizeColumns: ColumnsType<ModuleSizeEntry> = [
    { title: '包', dataIndex: 'name', render: (name) => <strong>{name}</strong> },
    { title: '版本', dataIndex: 'version', width: 120 },
    {
      title: '体积',
      dataIndex: 'size',
      width: 220,
      render: (size: number) => {
        const maximum = analysis.modules?.largestPackages[0]?.size ?? 1
        return (
          <div className="size-cell">
            <span>{formatBytes(size)}</span>
            <Progress percent={Math.round((size / maximum) * 100)} showInfo={false} />
          </div>
        )
      },
    },
  ]

  if (!selectedProject) {
    return (
      <PageFrame title="依赖分析" description="升级、关系与磁盘占用统一分析。">
        <Empty description="请先从左侧选择一个项目。" />
      </PageFrame>
    )
  }

  return (
    <PageFrame
      title="依赖分析"
      description={`${selectedProject.name} · ${selectedProject.packageManager} · 数据按需读取`}
      action={
        <Button
          icon={<ReloadOutlined />}
          loading={analysis.loading !== null}
          onClick={() => {
            if (activeTab === 'updates') void analysis.loadUpdates(selectedProject.id)
            if (activeTab === 'graph') void analysis.loadGraph(selectedProject.id)
            if (activeTab === 'modules') void analysis.loadModules(selectedProject.id)
          }}
        >
          开始分析
        </Button>
      }
    >
      {analysis.error && (
        <Alert
          type="error"
          showIcon
          closable
          message={analysis.error}
          onClose={analysis.clearError}
        />
      )}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'updates',
            label: '升级检查',
            children: (
              <div className="analysis-panel">
                <div className="analysis-toolbar">
                  <span>{pendingUpdates.length} 个依赖可升级</span>
                  <Popconfirm
                    title={`批量升级 ${pendingUpdates.length} 个依赖`}
                    description="命令将依次执行，失败项可在右上角进度中重试。"
                    onConfirm={() => void upgrade(pendingUpdates)}
                  >
                    <Button
                      type="primary"
                      loading={packageOperationRunning}
                      disabled={
                        pendingUpdates.length === 0 || packageOperationRunning
                      }
                    >
                      批量升级
                    </Button>
                  </Popconfirm>
                </div>
                <Table
                  rowKey="name"
                  columns={updateColumns}
                  dataSource={analysis.updates}
                  loading={analysis.loading === 'updates'}
                  pagination={false}
                  locale={{ emptyText: '点击“开始分析”检查最新版本。' }}
                />
              </div>
            ),
          },
          {
            key: 'graph',
            label: '依赖图',
            children: (
              <div className="graph-canvas">
                {flow.nodes.length ? (
                  <ReactFlow
                    nodes={flow.nodes}
                    edges={flow.edges}
                    fitView
                    minZoom={0.15}
                    maxZoom={1.5}
                    nodesDraggable={false}
                    nodesConnectable={false}
                  >
                    <Background />
                    <MiniMap pannable zoomable />
                    <Controls />
                  </ReactFlow>
                ) : (
                  <Empty
                    image={<BranchesOutlined />}
                    description="点击“开始分析”生成依赖关系图。"
                  />
                )}
              </div>
            ),
          },
          {
            key: 'modules',
            label: 'node_modules',
            children: (
              <div className="modules-layout">
                <div className="module-summary">
                  <div>
                    <span>顶层包体积</span>
                    <strong>{formatBytes(analysis.modules?.totalSize ?? 0)}</strong>
                  </div>
                  <div>
                    <span>重复依赖</span>
                    <strong>{analysis.modules?.duplicates.length ?? 0}</strong>
                  </div>
                  <div>
                    <span>去重建议</span>
                    <code>{analysis.modules?.dedupeCommand ?? '—'}</code>
                  </div>
                </div>
                <Table
                  rowKey="name"
                  columns={sizeColumns}
                  dataSource={analysis.modules?.largestPackages ?? []}
                  loading={analysis.loading === 'modules'}
                  pagination={false}
                  locale={{ emptyText: '点击“开始分析”扫描 node_modules。' }}
                />
                {analysis.modules?.duplicates.map((item) => (
                  <div className="duplicate-row" key={item.name}>
                    <strong>{item.name}</strong>
                    <Space wrap>
                      {item.versions.map((version) => <Tag key={version}>{version}</Tag>)}
                    </Space>
                  </div>
                ))}
              </div>
            ),
          },
        ]}
      />
    </PageFrame>
  )
}
