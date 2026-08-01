import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CloudDownloadOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import {
  Alert,
  Button,
  Descriptions,
  Input,
  Popconfirm,
  Progress,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useState } from 'react'
import { PageFrame } from '@/components/PageFrame'
import { useSystemStore } from '@/stores/system.store'
import type { OperationHistoryEntry } from '@/types/system'
import type { UpdateOperationResult, UpdateState } from '@/types/update'
import './styles.css'

const registryPresets = [
  { label: 'npm 官方源', value: 'https://registry.npmjs.org/' },
  { label: 'npmmirror', value: 'https://registry.npmmirror.com/' },
  { label: '自定义', value: 'custom' },
]

export function SettingsPage() {
  const environment = useSystemStore((state) => state.environment)
  const history = useSystemStore((state) => state.history)
  const loading = useSystemStore((state) => state.loading)
  const changingRegistry = useSystemStore((state) => state.changingRegistry)
  const error = useSystemStore((state) => state.error)
  const load = useSystemStore((state) => state.load)
  const setRegistry = useSystemStore((state) => state.setRegistry)
  const clearError = useSystemStore((state) => state.clearError)
  const [registryChoice, setRegistryChoice] = useState('')
  const [customRegistry, setCustomRegistry] = useState('')
  const [updateState, setUpdateState] = useState<UpdateState | null>(null)
  const [updateLoading, setUpdateLoading] = useState(false)

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    void window.npmate.update.getState().then(setUpdateState)
    return window.npmate.update.onStateChanged(setUpdateState)
  }, [])

  const runUpdateOperation = async (
    operation: () => Promise<UpdateOperationResult>,
  ) => {
    setUpdateLoading(true)
    try {
      const result = await operation()
      if (result.data) setUpdateState(result.data)
      if (!result.ok) {
        setUpdateState((current) =>
          current
            ? {
                ...current,
                status: 'error',
                message: result.error ?? '更新操作失败。',
              }
            : current,
        )
      }
    } catch (error) {
      setUpdateState((current) =>
        current
          ? {
              ...current,
              status: 'error',
              message:
                error instanceof Error ? error.message : '更新操作失败。',
            }
          : current,
      )
    } finally {
      setUpdateLoading(false)
    }
  }

  const historyColumns: ColumnsType<OperationHistoryEntry> = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      width: 170,
      render: (value: string) => new Date(value).toLocaleString('zh-CN'),
    },
    { title: '项目', dataIndex: 'projectName', width: 150 },
    {
      title: '操作',
      dataIndex: 'action',
      width: 100,
      render: (value: string) => <Tag>{value}</Tag>,
    },
    {
      title: '命令',
      dataIndex: 'command',
      render: (value: string) => <code>{value}</code>,
    },
    {
      title: '结果',
      dataIndex: 'success',
      width: 90,
      render: (success: boolean) => (
        <Tag color={success ? 'success' : 'error'}>
          {success ? '成功' : '失败'}
        </Tag>
      ),
    },
  ]

  const effectiveChoice = registryChoice || environment?.registry || ''
  const selectedRegistry =
    effectiveChoice === 'custom' ? customRegistry : effectiveChoice

  return (
    <PageFrame
      title="设置"
      description="检查本机工具链、管理 Registry 并审阅所有依赖变更。"
      action={
        <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>
          重新检测
        </Button>
      }
    >
      {error && (
        <Alert type="error" showIcon closable message={error} onClose={clearError} />
      )}
      <Tabs
        items={[
          {
            key: 'environment',
            label: 'Node 环境',
            children: (
              <div className="settings-panel">
                <div className="tool-version-grid">
                  {environment?.tools.map((tool) => (
                    <div key={tool.name}>
                      {tool.version ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                      <span>{tool.name}</span>
                      <strong>{tool.version ?? '未检测到'}</strong>
                    </div>
                  ))}
                </div>
                <Descriptions
                  bordered
                  column={1}
                  items={[
                    { key: 'nvm', label: 'nvm', children: environment?.managers.nvm ? '已检测' : '未检测' },
                    { key: 'fnm', label: 'fnm', children: environment?.managers.fnm ? '已检测' : '未检测' },
                    { key: 'volta', label: 'Volta', children: environment?.managers.volta ? '已检测' : '未检测' },
                  ]}
                />
              </div>
            ),
          },
          {
            key: 'registry',
            label: 'Registry',
            children: (
              <div className="registry-settings">
                <span>当前 Registry</span>
                <code>{environment?.registry ?? '检测中…'}</code>
                <Space.Compact block>
                  <Select
                    value={effectiveChoice}
                    options={registryPresets}
                    onChange={setRegistryChoice}
                  />
                  {effectiveChoice === 'custom' && (
                    <Input
                      value={customRegistry}
                      placeholder="https://registry.example.com/"
                      onChange={(event) => setCustomRegistry(event.target.value)}
                    />
                  )}
                  <Popconfirm
                    title="切换全局 Registry"
                    description="将更新本机 npm、pnpm 和 yarn 的用户配置；Bun 会沿用 npm Registry 配置。"
                    onConfirm={() => void setRegistry(selectedRegistry)}
                  >
                    <Button
                      type="primary"
                      loading={changingRegistry}
                      disabled={!selectedRegistry}
                    >
                      应用
                    </Button>
                  </Popconfirm>
                </Space.Compact>
              </div>
            ),
          },
          {
            key: 'updates',
            label: '应用更新',
            children: (
              <div className="update-settings">
                <Descriptions
                  bordered
                  column={1}
                  items={[
                    {
                      key: 'current',
                      label: '当前版本',
                      children: updateState?.currentVersion ?? '读取中…',
                    },
                    {
                      key: 'available',
                      label: '可用版本',
                      children: updateState?.availableVersion ?? '—',
                    },
                  ]}
                />
                {updateState?.message && (
                  <Alert
                    showIcon
                    type={updateState.status === 'error' ? 'error' : 'info'}
                    message={updateState.message}
                  />
                )}
                {updateState?.status === 'downloading' && (
                  <Progress percent={updateState.downloadPercent ?? 0} />
                )}
                <Space>
                  <Button
                    icon={<ReloadOutlined />}
                    loading={updateLoading || updateState?.status === 'checking'}
                    disabled={updateState?.status === 'disabled'}
                    onClick={() =>
                      void runUpdateOperation(window.npmate.update.check)
                    }
                  >
                    检查更新
                  </Button>
                  {updateState?.status === 'available' && (
                    <Button
                      type="primary"
                      icon={<CloudDownloadOutlined />}
                      loading={updateLoading}
                      onClick={() =>
                        void runUpdateOperation(window.npmate.update.download)
                      }
                    >
                      下载更新
                    </Button>
                  )}
                  {updateState?.status === 'downloaded' && (
                    <Button
                      type="primary"
                      onClick={() =>
                        void runUpdateOperation(window.npmate.update.install)
                      }
                    >
                      重启并安装
                    </Button>
                  )}
                </Space>
              </div>
            ),
          },
          {
            key: 'history',
            label: `操作历史 (${history.length})`,
            children: (
              <div className="history-table">
                <Table
                  rowKey="id"
                  columns={historyColumns}
                  dataSource={history}
                  loading={loading}
                  pagination={{ pageSize: 20, hideOnSinglePage: true }}
                  expandable={{
                    expandedRowRender: (record) => (
                      <pre className="history-output">{record.output || '无输出'}</pre>
                    ),
                  }}
                  locale={{ emptyText: '尚无安装、卸载或升级记录。' }}
                />
              </div>
            ),
          },
        ]}
      />
    </PageFrame>
  )
}
