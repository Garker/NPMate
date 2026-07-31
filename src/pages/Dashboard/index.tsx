import {
  BranchesOutlined,
  FolderOpenOutlined,
  RobotOutlined,
} from '@ant-design/icons'
import { Button } from 'antd'
import { PageFrame } from '@/components/PageFrame'
import { PackageAssistant } from '@/components/PackageAssistant'
import { useProjectsStore } from '@/stores/projects.store'
import './styles.css'

export function DashboardPage() {
  const projects = useProjectsStore((state) => state.projects)
  const addProject = useProjectsStore((state) => state.add)
  const dependencyCount = projects.reduce(
    (total, project) =>
      total + project.dependenciesCount + project.devDependenciesCount,
    0,
  )
  const overviewItems = [
    {
      title: '本地项目',
      value: String(projects.length),
      note: projects.length ? '扫描记录已持久化' : '选择目录开始',
      icon: <FolderOpenOutlined />,
    },
    {
      title: '已索引依赖',
      value: String(dependencyCount),
      note: '生产依赖 + 开发依赖',
      icon: <BranchesOutlined />,
    },
    {
      title: 'AI 建议',
      value: 'Agent',
      note: '只读工具 · 用户确认安装',
      icon: <RobotOutlined />,
    },
  ]

  return (
    <PageFrame
      title="项目工作台"
      description="集中查看项目状态、依赖风险和 Package Assistant 建议。"
      action={
        <Button type="primary" onClick={() => void addProject()}>
          添加项目
        </Button>
      }
    >
      <div className="overview-grid">
        {overviewItems.map((item) => (
          <article className="overview-item" key={item.title}>
            <div className="overview-item__icon">{item.icon}</div>
            <div>
              <span>{item.title}</span>
              <strong>{item.value}</strong>
              <small>{item.note}</small>
            </div>
          </article>
        ))}
      </div>

      <section className="getting-started">
        <div>
          <span className="section-label">当前阶段</span>
          <h2>依赖健康状态现在可以直接查看。</h2>
        </div>
        <p>
          AI 配置中心、加密密钥和只读 Package Assistant Agent 已经接入。
          AI 只生成建议，所有依赖变更仍需要用户明确确认。
        </p>
      </section>
      <PackageAssistant />
    </PageFrame>
  )
}
