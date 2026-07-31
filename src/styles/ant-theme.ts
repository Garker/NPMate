import type { ThemeConfig } from 'antd'

/**
 * Ant Design 组件统一映射到 NPMate 的紧凑开发者工具视觉语言。
 */
export const antTheme: ThemeConfig = {
  token: {
    borderRadius: 6,
    controlHeight: 36,
    fontFamily: 'var(--font-body)',
  },
  components: {
    Button: {
      primaryShadow: 'none',
      primaryColor: '#ffffff',
      defaultShadow: 'none',
    },
    Input: {
      activeShadow: '0 0 0 2px var(--color-accent-soft)',
    },
  },
}
