import { CheckCircleOutlined, ExperimentOutlined, LockOutlined } from '@ant-design/icons'
import { Alert, Button, Form, Input, Select, Slider, Space, Tag } from 'antd'
import { useEffect } from 'react'
import { PageFrame } from '@/components/PageFrame'
import { useAIStore } from '@/stores/ai.store'
import type { AIProvider, SaveAIConfigInput } from '@/types/ai'
import './styles.css'

const providerOptions = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'bailian', label: '阿里百炼' },
  { value: 'anthropic', label: 'Claude / Anthropic' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'ollama', label: 'Ollama' },
  { value: 'custom', label: '自定义 OpenAI Compatible' },
]

const defaults: Record<AIProvider, Pick<SaveAIConfigInput, 'model' | 'baseUrl'>> = {
  openai: { model: 'gpt-4.1-mini', baseUrl: 'https://api.openai.com/v1' },
  deepseek: { model: 'deepseek-chat', baseUrl: 'https://api.deepseek.com' },
  bailian: { model: 'qwen-plus', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
  anthropic: { model: 'claude-sonnet-4-5', baseUrl: 'https://api.anthropic.com' },
  gemini: { model: 'gemini-2.5-flash', baseUrl: '' },
  ollama: { model: 'qwen3:8b', baseUrl: 'http://127.0.0.1:11434' },
  custom: { model: '', baseUrl: '' },
}

export function AISettingsPage() {
  const [form] = Form.useForm<SaveAIConfigInput>()
  const config = useAIStore((state) => state.config)
  const loading = useAIStore((state) => state.loading)
  const testing = useAIStore((state) => state.testing)
  const testResult = useAIStore((state) => state.testResult)
  const error = useAIStore((state) => state.error)
  const load = useAIStore((state) => state.load)
  const save = useAIStore((state) => state.save)
  const test = useAIStore((state) => state.test)
  const clearError = useAIStore((state) => state.clearError)

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (config) {
      form.setFieldsValue({
        provider: config.provider,
        model: config.model,
        baseUrl: config.baseUrl,
        temperature: config.temperature,
        apiKey: '',
      })
    }
  }, [config, form])

  return (
    <PageFrame
      title="AI 设置"
      description="模型凭据在主进程加密保存，不会暴露给 renderer。"
      action={
        config?.apiKeyConfigured ? (
          <Tag icon={<LockOutlined />} color="success">密钥已加密</Tag>
        ) : null
      }
    >
      <div className="ai-settings-layout">
        <Form
          form={form}
          layout="vertical"
          initialValues={{ provider: 'openai', temperature: 0.2 }}
          onFinish={(values) => void save(values)}
          onValuesChange={(changed) => {
            if (changed.provider) {
              form.setFieldsValue(defaults[changed.provider as AIProvider])
            }
          }}
        >
          <Form.Item name="provider" label="Provider" rules={[{ required: true }]}>
            <Select options={providerOptions} />
          </Form.Item>
          <Form.Item name="model" label="Model" rules={[{ required: true, message: '请输入模型名称。' }]}>
            <Input placeholder="例如 gpt-4.1-mini" />
          </Form.Item>
          <Form.Item name="apiKey" label="API Key">
            <Input.Password
              placeholder={config?.apiKeyConfigured ? '留空以保留已加密密钥' : '输入 API Key'}
              autoComplete="new-password"
            />
          </Form.Item>
          <Form.Item name="baseUrl" label="Base URL">
            <Input placeholder="OpenAI Compatible API 地址" />
          </Form.Item>
          <Form.Item name="temperature" label="Temperature">
            <Slider min={0} max={1} step={0.1} marks={{ 0: '0', 0.5: '0.5', 1: '1' }} />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>保存配置</Button>
            <Button icon={<ExperimentOutlined />} loading={testing} disabled={!config} onClick={() => void test()}>
              测试连接
            </Button>
          </Space>
        </Form>

        <aside className="ai-security-note">
          <LockOutlined />
          <h2>凭据只留在主进程</h2>
          <p>API Key 使用 Electron safeStorage 加密后写入 SQLite。界面只能知道是否已配置，无法读取明文。</p>
          <ul>
            <li>OpenAI Compatible：OpenAI、DeepSeek、阿里百炼、自定义地址</li>
            <li>原生适配：Claude、Gemini、Ollama</li>
            <li>Agent 工具全部只读，不包含安装或 shell 执行能力</li>
          </ul>
        </aside>
      </div>
      <div className="ai-feedback" aria-live="polite">
        {error && <Alert type="error" showIcon closable message={error} onClose={clearError} />}
        {testResult && (
          <Alert
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            message={`连接成功 · ${testResult.latencyMs} ms`}
            description={testResult.message}
          />
        )}
      </div>
    </PageFrame>
  )
}
