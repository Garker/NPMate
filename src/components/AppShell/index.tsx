import {
  AppstoreOutlined,
  BranchesOutlined,
  FolderOpenOutlined,
  MoonOutlined,
  RobotOutlined,
  SearchOutlined,
  SettingOutlined,
  SunOutlined,
} from '@ant-design/icons'
import { Button, Input, Tag, Tooltip } from 'antd'
import { useEffect, type ComponentType } from 'react'
import { DashboardPage } from '@/pages/Dashboard'
import { ProjectsPage } from '@/pages/Projects'
import { PackagesPage } from '@/pages/Packages'
import { DependencyGraphPage } from '@/pages/DependencyGraph'
import { AISettingsPage } from '@/pages/AISettings'
import { SettingsPage } from '@/pages/Settings'
import { useAppStore } from '@/stores/app.store'
import type { PageKey } from '@/types/navigation'
import { useDesktopStatus } from '@/hooks/useDesktopStatus'
import { useProjectsStore } from '@/stores/projects.store'
import { formatBytes } from '@/utils/format'
import './styles.css'

interface NavItem {
  key: PageKey
  label: string
  icon: ComponentType
}

const navItems: NavItem[] = [
  { key: 'dashboard', label: '概览', icon: AppstoreOutlined },
  { key: 'projects', label: '项目', icon: FolderOpenOutlined },
  { key: 'packages', label: '包管理', icon: SearchOutlined },
  { key: 'dependency-graph', label: '依赖分析', icon: BranchesOutlined },
  { key: 'ai-settings', label: 'AI 设置', icon: RobotOutlined },
  { key: 'settings', label: '设置', icon: SettingOutlined },
]

const pages: Record<PageKey, ComponentType> = {
  dashboard: DashboardPage,
  projects: ProjectsPage,
  packages: PackagesPage,
  'dependency-graph': DependencyGraphPage,
  'ai-settings': AISettingsPage,
  settings: SettingsPage,
}

export function AppShell() {
  const activePage = useAppStore((state) => state.activePage)
  const colorMode = useAppStore((state) => state.colorMode)
  const setActivePage = useAppStore((state) => state.setActivePage)
  const toggleColorMode = useAppStore((state) => state.toggleColorMode)
  const desktopStatus = useDesktopStatus()
  const projects = useProjectsStore((state) => state.projects)
  const selectedProjectId = useProjectsStore((state) => state.selectedProjectId)
  const loadProjects = useProjectsStore((state) => state.load)
  const addProject = useProjectsStore((state) => state.add)
  const selectProject = useProjectsStore((state) => state.select)
  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) ?? null
  const ActivePage = pages[activePage]

  useEffect(() => {
    if (window.npmate) {
      void loadProjects()
    }
  }, [loadProjects])

  return (
    <div className="app-shell" data-theme={colorMode}>
      <header className="titlebar">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">
            N
          </span>
          <span>NPMate</span>
          <Tag bordered={false}>Phase 7</Tag>
        </div>

        <Input
          className="command-search"
          prefix={<SearchOutlined />}
          suffix={<kbd>⌘ K</kbd>}
          placeholder="搜索项目、包或命令"
          aria-label="搜索项目、包或命令"
          disabled
        />

        <Tooltip title={colorMode === 'dark' ? '切换浅色模式' : '切换暗色模式'}>
          <Button
            type="text"
            icon={colorMode === 'dark' ? <SunOutlined /> : <MoonOutlined />}
            aria-label={colorMode === 'dark' ? '切换浅色模式' : '切换暗色模式'}
            onClick={toggleColorMode}
          />
        </Tooltip>
      </header>

      <aside className="project-rail">
        {projects.map((project) => (
          <Tooltip title={project.name} placement="right" key={project.id}>
            <button
              className={
                selectedProjectId === project.id
                  ? 'project-chip is-active'
                  : 'project-chip'
              }
              type="button"
              aria-label={`选择项目 ${project.name}`}
              onClick={() => selectProject(project.id)}
            >
              {project.name.slice(0, 2).toUpperCase()}
            </button>
          </Tooltip>
        ))}
        <button
          className="project-chip project-chip--add"
          type="button"
          aria-label="添加项目"
          onClick={() => void addProject()}
        >
          +
        </button>
      </aside>

      <aside className="sidebar">
        <nav aria-label="应用导航">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                className={activePage === item.key ? 'nav-item is-active' : 'nav-item'}
                key={item.key}
                type="button"
                onClick={() => setActivePage(item.key)}
              >
                <Icon />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="sidebar__project">
          <span className="section-label">当前项目</span>
          <strong>{selectedProject?.name ?? '尚未添加项目'}</strong>
          <p>
            {selectedProject
              ? `${selectedProject.framework} · ${selectedProject.packageManager}`
              : '从项目页面选择本地目录。'}
          </p>
        </div>
      </aside>

      <main className="content">
        <ActivePage />
      </main>

      <aside className="detail-panel">
        <span className="section-label">详情</span>
        {selectedProject ? (
          <dl className="project-detail">
            <div>
              <dt>框架</dt>
              <dd>{selectedProject.framework}</dd>
            </div>
            <div>
              <dt>包管理器</dt>
              <dd>{selectedProject.packageManager}</dd>
            </div>
            <div>
              <dt>Node</dt>
              <dd>{selectedProject.nodeVersion}</dd>
            </div>
            <div>
              <dt>生产依赖</dt>
              <dd>{selectedProject.dependenciesCount}</dd>
            </div>
            <div>
              <dt>开发依赖</dt>
              <dd>{selectedProject.devDependenciesCount}</dd>
            </div>
            <div>
              <dt>node_modules</dt>
              <dd>{formatBytes(selectedProject.nodeModulesSize)}</dd>
            </div>
          </dl>
        ) : (
          <div className="empty-detail">
            <BranchesOutlined />
            <strong>选择一个项目</strong>
            <p>项目元数据、依赖和操作将在这里显示。</p>
          </div>
        )}
      </aside>

      <footer className="statusbar">
        <span className={`status-dot status-dot--${desktopStatus}`} aria-hidden="true" />
        <span>
          {desktopStatus === 'ready'
            ? 'Electron IPC 已连接'
            : desktopStatus === 'checking'
              ? '正在检查桌面连接'
              : '浏览器预览模式'}
        </span>
        <span className="statusbar__spacer" />
        <span>{window.npmate?.platform ?? 'web'}</span>
        <span>v0.1.0</span>
      </footer>
    </div>
  )
}
