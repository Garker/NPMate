import { RobotOutlined, SendOutlined, StopOutlined } from '@ant-design/icons'
import { useChat } from '@ai-sdk/react'
import { Alert, Button, Empty, Input, Tag } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { Streamdown } from 'streamdown'
import type { UIMessage } from 'ai'
import { ElectronChatTransport } from '@/services/electron-chat.transport'
import { useAIStore } from '@/stores/ai.store'
import { useProjectsStore } from '@/stores/projects.store'
import './styles.css'

export function PackageAssistant() {
  const [prompt, setPrompt] = useState('')
  const selectedProjectId = useProjectsStore((state) => state.selectedProjectId)
  const config = useAIStore((state) => state.config)
  const configError = useAIStore((state) => state.error)
  const clearConfigError = useAIStore((state) => state.clearError)
  const transport = useMemo(
    () => new ElectronChatTransport(selectedProjectId ?? ''),
    [selectedProjectId],
  )
  const { messages, sendMessage, status, stop, error, clearError, setMessages } =
    useChat({ transport, throttle: 40 })
  const assisting = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    setMessages([])
  }, [selectedProjectId, setMessages])

  function submit() {
    const value = prompt.trim()
    if (!selectedProjectId || !value || assisting) return
    setPrompt('')
    void sendMessage({ text: value })
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
          {(error || configError) && (
            <Alert
              type="error"
              showIcon
              closable
              message={error?.message ?? configError}
              onClose={() => {
                clearError()
                clearConfigError()
              }}
            />
          )}
          {messages.length > 0 && (
            <div className="assistant-conversation" aria-live="polite">
              {messages.map((message) => (
                <AssistantMessage
                  key={message.id}
                  message={message}
                  streaming={assisting && message === messages.at(-1)}
                  model={config?.model}
                  provider={config?.provider}
                />
              ))}
            </div>
          )}
          {assisting && (
            <Button icon={<StopOutlined />} onClick={stop}>
              停止生成
            </Button>
          )}
        </>
      )}
    </section>
  )
}

function AssistantMessage({
  message,
  streaming,
  model,
  provider,
}: {
  message: UIMessage
  streaming: boolean
  model?: string
  provider?: string
}) {
  const content = message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('')

  if (!content) return null

  return (
    <article className={`assistant-message assistant-message--${message.role}`}>
      <div className="assistant-message-meta">
        <strong>{message.role === 'user' ? '你' : model || 'Package Assistant'}</strong>
        {message.role === 'assistant' && provider && <span>{provider}</span>}
      </div>
      {message.role === 'assistant' ? (
        <Streamdown isAnimating={streaming}>{content}</Streamdown>
      ) : (
        <p>{content}</p>
      )}
      {message.role === 'assistant' && !streaming && (
        <small>AI 只能给出建议。请前往“包管理”页面确认后再安装。</small>
      )}
    </article>
  )
}
