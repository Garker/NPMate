import { useEffect, useState } from 'react'

type DesktopStatus = 'checking' | 'ready' | 'unavailable'

/**
 * 检查 Electron 安全桥是否可用，帮助开发时快速识别纯浏览器预览。
 */
export function useDesktopStatus(): DesktopStatus {
  const [status, setStatus] = useState<DesktopStatus>(() =>
    window.npmate ? 'checking' : 'unavailable',
  )

  useEffect(() => {
    if (!window.npmate) {
      return
    }

    void window.npmate
      .ping()
      .then((result) => setStatus(result === 'pong' ? 'ready' : 'unavailable'))
      .catch(() => setStatus('unavailable'))
  }, [])

  return status
}
