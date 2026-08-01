import {
  AppstoreOutlined,
  BranchesOutlined,
  MoonOutlined,
  RobotOutlined,
  SearchOutlined,
  SettingOutlined,
  SunOutlined,
} from '@ant-design/icons'
import { AutoComplete, Button, Input, Tooltip } from 'antd'
import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type { RefSelectProps } from 'antd'
import { DashboardPage } from '@/pages/Dashboard'
import { PackagesPage } from '@/pages/Packages'
import { DependencyGraphPage } from '@/pages/DependencyGraph'
import { AISettingsPage } from '@/pages/AISettings'
import { SettingsPage } from '@/pages/Settings'
import { PackageAssistant } from '@/components/PackageAssistant'
import { useAppStore } from '@/stores/app.store'
import type { PageKey } from '@/types/navigation'
import { useDesktopStatus } from '@/hooks/useDesktopStatus'
import { useProjectsStore } from '@/stores/projects.store'
import './styles.css'

interface NavItem {
  key: PageKey
  label: string
  icon: ComponentType
}

const navItems: NavItem[] = [
  { key: 'dashboard', label: '概览', icon: AppstoreOutlined },
  { key: 'packages', label: '包管理', icon: SearchOutlined },
  { key: 'dependency-graph', label: '依赖分析', icon: BranchesOutlined },
  { key: 'ai-settings', label: 'AI 设置', icon: RobotOutlined },
  { key: 'settings', label: '设置', icon: SettingOutlined },
]

const pages: Record<PageKey, ComponentType> = {
  dashboard: DashboardPage,
  packages: PackagesPage,
  'dependency-graph': DependencyGraphPage,
  'ai-settings': AISettingsPage,
  settings: SettingsPage,
}

const assistantMinimumWidth = 300
const workspaceChromeMinimumWidth = 956

export function AppShell() {
  const [detailWidth, setDetailWidth] = useState(() =>
    Math.min(
      384,
      Math.max(
        assistantMinimumWidth,
        window.innerWidth - workspaceChromeMinimumWidth,
      ),
    ),
  )
  const [searchText, setSearchText] = useState('')
  const searchRef = useRef<RefSelectProps>(null)
  const windowWidthRef = useRef(window.innerWidth)
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

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', focusSearch)
    return () => window.removeEventListener('keydown', focusSearch)
  }, [])

  useEffect(() => {
    const allocateResizeToAssistant = () => {
      const nextWindowWidth = window.innerWidth
      const delta = nextWindowWidth - windowWidthRef.current
      windowWidthRef.current = nextWindowWidth
      if (!delta) return
      const maximumWidth = Math.max(
        assistantMinimumWidth,
        nextWindowWidth - workspaceChromeMinimumWidth,
      )
      setDetailWidth((width) =>
        Math.min(maximumWidth, Math.max(assistantMinimumWidth, width + delta)),
      )
    }
    window.addEventListener('resize', allocateResizeToAssistant)
    return () => window.removeEventListener('resize', allocateResizeToAssistant)
  }, [])

  const searchOptions = [
    ...navItems.map((item) => ({
      value: `page:${item.key}`,
      label: `页面 · ${item.label}`,
    })),
    ...projects.map((project) => ({
      value: `project:${project.id}`,
      label: `项目 · ${project.name}`,
    })),
  ]

  function resizeDetailPanel(event: ReactPointerEvent<HTMLDivElement>) {
    const maximumWidth = Math.max(
      assistantMinimumWidth,
      window.innerWidth - workspaceChromeMinimumWidth,
    )
    setDetailWidth(
      Math.min(
        maximumWidth,
        Math.max(assistantMinimumWidth, window.innerWidth - event.clientX),
      ),
    )
  }

  return (
    <div
      className={`app-shell${window.npmate?.platform === 'darwin' ? ' is-macos' : ''}`}
      data-theme={colorMode}
      style={{ '--size-detail': `${detailWidth}px` } as CSSProperties}
    >
      <header className="titlebar">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">
            N
          </span>
          <span>NPMate</span>
        </div>

        <AutoComplete
          ref={searchRef}
          className="command-search"
          value={searchText}
          options={searchOptions}
          filterOption={(input, option) =>
            String(option?.label ?? '')
              .toLowerCase()
              .includes(input.toLowerCase())
          }
          onChange={setSearchText}
          onSelect={(value) => {
            if (value.startsWith('page:')) {
              setActivePage(value.slice(5) as PageKey)
            } else if (value.startsWith('project:')) {
              selectProject(value.slice(8))
              setActivePage('dashboard')
            }
            setSearchText('')
          }}
        >
          <Input
            prefix={<SearchOutlined />}
            suffix={<kbd>⌘ K</kbd>}
            placeholder="搜索项目、页面或命令"
            aria-label="搜索项目、页面或命令"
          />
        </AutoComplete>

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
        <div
          className="detail-resizer"
          role="separator"
          aria-label="调整 Package Assistant 宽度"
          aria-orientation="vertical"
          aria-valuemin={assistantMinimumWidth}
          aria-valuemax={Math.max(
            assistantMinimumWidth,
            window.innerWidth - workspaceChromeMinimumWidth,
          )}
          aria-valuenow={detailWidth}
          tabIndex={0}
          onDoubleClick={() =>
            setDetailWidth(
              Math.min(
                384,
                Math.max(
                  assistantMinimumWidth,
                  window.innerWidth - workspaceChromeMinimumWidth,
                ),
              ),
            )
          }
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') {
              event.preventDefault()
              setDetailWidth((width) =>
                Math.min(
                  Math.max(
                    assistantMinimumWidth,
                    window.innerWidth - workspaceChromeMinimumWidth,
                  ),
                  width + 16,
                ),
              )
            }
            if (event.key === 'ArrowRight') {
              event.preventDefault()
              setDetailWidth((width) =>
                Math.max(assistantMinimumWidth, width - 16),
              )
            }
          }}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId)
            resizeDetailPanel(event)
          }}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              resizeDetailPanel(event)
            }
          }}
          onPointerUp={(event) => {
            event.currentTarget.releasePointerCapture(event.pointerId)
          }}
        />
        <PackageAssistant />
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
        <span>v0.1.3</span>
      </footer>
    </div>
  )
}
