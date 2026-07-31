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
        token: {
          ...antTheme.token,
          colorPrimary: colorMode === 'dark' ? '#6f95ff' : '#1769e0',
        },
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
