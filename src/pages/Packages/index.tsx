import {
  DeleteOutlined,
  DownloadOutlined,
  GithubOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import {
  Alert,
  Button,
  Drawer,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Popconfirm,
  Radio,
  Segmented,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useMemo, useState } from 'react'
import { PageFrame } from '@/components/PageFrame'
import { usePackagesStore } from '@/stores/packages.store'
import { useProjectsStore } from '@/stores/projects.store'
import { useRegistryStore } from '@/stores/registry.store'
import type {
  InstalledPackage,
  RegistryPackageSummary,
} from '@/types/package'
import './styles.css'

interface InstallFormValues {
  packageName: string
  version?: string
  kind: 'dependency' | 'devDependency'
}

function formatDownloads(value: number | null): string {
  if (value === null) return '—'
  return new Intl.NumberFormat('zh-CN', { notation: 'compact' }).format(value)
}

export function PackagesPage() {
  const [mode, setMode] = useState<'installed' | 'registry'>('installed')
  const [installOpen, setInstallOpen] = useState(false)
  const [installedSearchText, setInstalledSearchText] = useState('')
  const [searchText, setSearchText] = useState('')
  const [form] = Form.useForm<InstallFormValues>()
  const projects = useProjectsStore((state) => state.projects)
  const selectedProjectId = useProjectsStore((state) => state.selectedProjectId)
  const refreshProject = useProjectsStore((state) => state.refresh)
  const packageState = usePackagesStore()
  const loadPackages = usePackagesStore((state) => state.load)
  const resetPackages = usePackagesStore((state) => state.reset)
  const registryState = useRegistryStore()
  const searchRegistry = useRegistryStore((state) => state.search)
  const clearRegistrySearch = useRegistryStore((state) => state.clearSearch)
  const selectedProject = projects.find(
    (project) => project.id === selectedProjectId,
  )

  useEffect(() => {
    if (selectedProjectId) void loadPackages(selectedProjectId)
    else resetPackages()
  }, [loadPackages, resetPackages, selectedProjectId])

  useEffect(() => {
    if (mode !== 'registry') return
    const query = searchText.trim()
    if (!query) {
      clearRegistrySearch()
      return
    }
    const timer = window.setTimeout(() => {
      void searchRegistry(query)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [clearRegistrySearch, mode, searchRegistry, searchText])

  const counts = useMemo(
    () => ({
      production: packageState.dependencies.filter(
        (item) => item.kind === 'dependency',
      ).length,
      development: packageState.dependencies.filter(
        (item) => item.kind === 'devDependency',
      ).length,
    }),
    [packageState.dependencies],
  )
  const filteredDependencies = useMemo(() => {
    const query = installedSearchText.trim().toLowerCase()
    if (!query) return packageState.dependencies
    return packageState.dependencies.filter((item) =>
      item.name.toLowerCase().includes(query),
    )
  }, [installedSearchText, packageState.dependencies])

  async function runAction(
    item: InstalledPackage,
    action: 'uninstall' | 'upgrade',
  ) {
    if (!selectedProjectId) return
    if (
      await packageState.execute({
        projectId: selectedProjectId,
        action,
        packageName: item.name,
        dev: item.kind === 'devDependency',
      })
    ) {
      await refreshProject(selectedProjectId)
    }
  }

  async function install(values: InstallFormValues) {
    if (!selectedProjectId) return
    if (
      await packageState.execute({
        projectId: selectedProjectId,
        action: 'install',
        packageName: values.packageName.trim(),
        version: values.version?.trim() || undefined,
        dev: values.kind === 'devDependency',
      })
    ) {
      setInstallOpen(false)
      form.resetFields()
      await refreshProject(selectedProjectId)
    }
  }

  function prepareInstall(item?: RegistryPackageSummary) {
    form.setFieldsValue({
      packageName: item?.name ?? '',
      version: item?.version ?? undefined,
      kind: 'dependency',
    })
    setInstallOpen(true)
  }

  const installedColumns: ColumnsType<InstalledPackage> = [
    {
      title: '包',
      dataIndex: 'name',
      render: (name: string) => <strong className="package-name">{name}</strong>,
    },
    {
      title: '当前版本',
      dataIndex: 'versionRange',
      width: 170,
      render: (version: string) => <code>{version}</code>,
    },
    {
      title: '类型',
      dataIndex: 'kind',
      width: 130,
      render: (kind: InstalledPackage['kind']) => (
        <Tag color={kind === 'dependency' ? 'blue' : 'default'}>
          {kind === 'dependency' ? '生产依赖' : '开发依赖'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (_, item) => (
        <Space size={4}>
          <Popconfirm
            title={`升级 ${item.name}`}
            description="将使用当前项目的包管理器更新此依赖。"
            onConfirm={() => void runAction(item, 'upgrade')}
          >
            <Button
              size="small"
              icon={<ReloadOutlined />}
              loading={packageState.executingPackage === item.name}
              disabled={
                packageState.executingPackage !== null &&
                packageState.executingPackage !== item.name
              }
            >
              升级
            </Button>
          </Popconfirm>
          <Popconfirm
            title={`卸载 ${item.name}`}
            description="该操作会修改 package.json 与锁文件。"
            okButtonProps={{ danger: true }}
            onConfirm={() => void runAction(item, 'uninstall')}
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              disabled={packageState.executingPackage !== null}
            >
              卸载
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const registryColumns: ColumnsType<RegistryPackageSummary> = [
    {
      title: '包',
      key: 'package',
      render: (_, item) => (
        <button
          type="button"
          className="registry-package"
          onClick={() => void registryState.loadDetail(item.name)}
        >
          <strong>{item.name}</strong>
          <span>{item.description}</span>
        </button>
      ),
    },
    { title: '版本', dataIndex: 'version', width: 110 },
    { title: '作者', dataIndex: 'author', width: 130, ellipsis: true },
    {
      title: '周下载',
      dataIndex: 'weeklyDownloads',
      width: 110,
      render: formatDownloads,
    },
    {
      title: '操作',
      key: 'actions',
      width: 160,
      render: (_, item) => (
        <Space size={4}>
          {item.repositoryUrl && (
            <Button
              type="link"
              size="small"
              icon={<GithubOutlined />}
              href={item.repositoryUrl}
              target="_blank"
            >
              GitHub
            </Button>
          )}
          <Button
            size="small"
            icon={<DownloadOutlined />}
            disabled={!selectedProject}
            onClick={() => prepareInstall(item)}
          >
            安装
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <PageFrame
      title="包管理"
      description="管理已安装依赖，或从 npm Registry 查找适合项目的包。"
      action={
        <Space size={8} wrap>
          {mode === 'installed' && (
            <Input
              className="package-list-search"
              allowClear
              prefix={<SearchOutlined />}
              placeholder="按包名筛选已安装依赖"
              value={installedSearchText}
              onChange={(event) => setInstalledSearchText(event.target.value)}
            />
          )}
          <Segmented
            value={mode}
            options={[
              { label: '已安装', value: 'installed' },
              { label: 'Registry 搜索', value: 'registry' },
            ]}
            onChange={(value) => setMode(value as typeof mode)}
          />
        </Space>
      }
    >
      {mode === 'installed' ? (
        !selectedProject ? (
          <Empty description="请先从左侧选择一个项目。" />
        ) : (
          <div className="package-workbench">
            <div className="package-summary">
              <div><span>项目</span><strong>{selectedProject.name}</strong></div>
              <div><span>包管理器</span><strong>{selectedProject.packageManager}</strong></div>
              <div><span>生产 / 开发</span><strong>{counts.production} / {counts.development}</strong></div>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                disabled={selectedProject.packageManager === 'unknown'}
                onClick={() => prepareInstall()}
              >
                安装包
              </Button>
            </div>
            {selectedProject.packageManager === 'unknown' && (
              <Alert type="warning" showIcon message="未检测到锁文件" />
            )}
            {packageState.error && (
              <Alert
                type="error"
                showIcon
                closable
                message={packageState.error}
                onClose={packageState.clearError}
              />
            )}
            {packageState.lastResult && (
              <Alert
                type="success"
                showIcon
                message={packageState.lastResult.command}
                description={
                  <pre className="command-output">
                    {packageState.lastResult.stdout.trim() || '命令执行成功。'}
                  </pre>
                }
              />
            )}
            <div className="packages-table">
              <Table
                rowKey={(item) => `${item.kind}:${item.name}`}
                columns={installedColumns}
                dataSource={filteredDependencies}
                loading={packageState.loading}
                pagination={false}
              />
            </div>
          </div>
        )
      ) : (
        <div className="registry-workbench">
          <Input
            size="large"
            prefix={<SearchOutlined />}
            placeholder="搜索 npm 包，例如 react-query"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
          {registryState.error && (
            <Alert
              type="error"
              closable
              showIcon
              message={registryState.error}
              onClose={registryState.clearError}
            />
          )}
          <div className="packages-table">
            <Table
              rowKey="name"
              columns={registryColumns}
              dataSource={registryState.results}
              loading={registryState.searching}
              pagination={false}
              locale={{ emptyText: '输入关键词开始搜索 npm Registry。' }}
            />
          </div>
        </div>
      )}

      <Modal
        title={`安装到 ${selectedProject?.name ?? '项目'}`}
        open={installOpen}
        okText="确认安装"
        cancelText="取消"
        confirmLoading={packageState.executingPackage !== null}
        onCancel={() => setInstallOpen(false)}
        onOk={() => form.submit()}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ kind: 'dependency' }}
          onFinish={(values) => void install(values)}
        >
          <Form.Item name="packageName" label="包名" rules={[{ required: true }]}>
            <Input autoFocus />
          </Form.Item>
          <Form.Item name="version" label="版本（可选）"><Input /></Form.Item>
          <Form.Item name="kind" label="依赖类型">
            <Radio.Group>
              <Radio.Button value="dependency">生产依赖</Radio.Button>
              <Radio.Button value="devDependency">开发依赖</Radio.Button>
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={registryState.detail?.name ?? '包详情'}
        width={640}
        open={registryState.loadingDetail || Boolean(registryState.detail)}
        onClose={registryState.closeDetail}
      >
        {registryState.loadingDetail ? (
          <Spin />
        ) : registryState.detail ? (
          <div className="registry-detail">
            <div className="registry-detail__meta">
              <Tag color="blue">{registryState.detail.version}</Tag>
              <span>{registryState.detail.author}</span>
              <span>{formatDownloads(registryState.detail.weeklyDownloads)} 次/周</span>
              {registryState.detail.license && <Tag>{registryState.detail.license}</Tag>}
            </div>
            <Typography.Paragraph>{registryState.detail.description}</Typography.Paragraph>
            <Tabs
              items={[
                {
                  key: 'readme',
                  label: 'README',
                  children: <pre className="readme-content">{registryState.detail.readme}</pre>,
                },
                {
                  key: 'versions',
                  label: `版本 (${registryState.detail.versions.length})`,
                  children: (
                    <List
                      size="small"
                      dataSource={registryState.detail.versions}
                      renderItem={(item) => (
                        <List.Item>
                          <code>{item.version}</code>
                          <span>{item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('zh-CN') : '—'}</span>
                          {item.deprecated && <Tag color="warning">已弃用</Tag>}
                        </List.Item>
                      )}
                    />
                  ),
                },
              ]}
            />
          </div>
        ) : null}
      </Drawer>
    </PageFrame>
  )
}
