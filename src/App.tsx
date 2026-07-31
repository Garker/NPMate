import { ConfigProvider, theme as antdTheme } from 'antd'
import { AppShell } from '@/components/AppShell'
import { useAppStore } from '@/stores/app.store'
import { antTheme } from '@/styles/ant-theme'

export default function App() {
  const colorMode = useAppStore((state) => state.colorMode)

  return (
    <ConfigProvider
      theme={{
        ...antTheme,
        algorithm:
          colorMode === 'dark'
            ? antdTheme.darkAlgorithm
            : antdTheme.defaultAlgorithm,
      }}
    >
      <AppShell />
    </ConfigProvider>
  )
}
