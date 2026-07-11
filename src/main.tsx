import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import App from './App'
import { initDatabase } from '@/db/seed'
import { useAppStore } from '@/store'
import './index.css'

let initPromise: Promise<void> | null = null

function Root() {
  const [booted, setBooted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!initPromise) {
      initPromise = (async () => {
        await initDatabase()
        await useAppStore.getState().init()
      })()
    }
    initPromise
      .then(() => setBooted(true))
      .catch((e: unknown) => {
        console.error('初始化失败:', e)
        const msg = e instanceof Error ? e.message : String(e)
        setError(msg)
        setBooted(true)
      })
  }, [])

  if (!booted) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-[3px] border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">溜哥的安全管理平台加载中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <p className="text-sm text-danger mb-2">数据库初始化失败</p>
          <p className="text-xs text-gray-500 break-all">{error}</p>
          <button
            className="mt-3 px-4 py-1.5 bg-primary text-white text-xs rounded"
            onClick={() => { initPromise = null; location.reload() }}
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  return <App />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <Root />
      <Toaster position="top-center" richColors closeButton />
    </HashRouter>
  </React.StrictMode>,
)
