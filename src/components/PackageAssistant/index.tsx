import { RobotOutlined, SendOutlined } from '@ant-design/icons'
import { Alert, Button, Empty, Input, Tag } from 'antd'
import { useState } from 'react'
import { useAIStore } from '@/stores/ai.store'
import { useProjectsStore } from '@/stores/projects.store'
import './styles.css'

export function PackageAssistant() {
  const [prompt, setPrompt] = useState('')
  const selectedProjectId = useProjectsStore((state) => state.selectedProjectId)
  const response = useAIStore((state) => state.assistantResponse)
  const assisting = useAIStore((state) => state.assisting)
  const error = useAIStore((state) => state.error)
  const assist = useAIStore((state) => state.assist)
  const clearError = useAIStore((state) => state.clearError)

  function submit() {
    const value = prompt.trim()
    if (!selectedProjectId || !value) return
    void assist(selectedProjectId, value)
  }

  return (
    <section className="package-assistant">
      <header>
        <div>
          <RobotOutlined />
          <h2>Package Assistant</h2>
        </div>
        <Tag>只读 Agent</Tag>
      </header>
      {!selectedProjectId ? (
        <Empty description="选择项目后即可分析技术栈与依赖。" />
      ) : (
        <>
          <div className="assistant-prompt">
            <Input.TextArea
              value={prompt}
              autoSize={{ minRows: 2, maxRows: 5 }}
              placeholder="例如：我要实现文件上传，应该使用现有组件还是安装新依赖？"
              onChange={(event) => setPrompt(event.target.value)}
              onPressEnter={(event) => {
                if (!event.shiftKey) {
                  event.preventDefault()
                  submit()
                }
              }}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={assisting}
              disabled={!prompt.trim()}
              onClick={submit}
            >
              分析
            </Button>
          </div>
          {error && <Alert type="error" showIcon closable message={error} onClose={clearError} />}
          {response && (
            <article className="assistant-response">
              <div>
                <strong>{response.model}</strong>
                <span>{response.provider}</span>
              </div>
              <pre>{response.content}</pre>
              <p>AI 只能给出建议。请前往“包管理”页面确认后再安装。</p>
            </article>
          )}
        </>
      )}
    </section>
  )
}
