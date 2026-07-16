import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Settings as SettingsIcon, Download, Upload,
  Info, Shield, ChevronRight, CheckCircle, AlertCircle, Trash2,
  Braces, Key, Bot, Database,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { db } from '@/db'
import { APP_NAME, APP_VERSION } from '@/core/constants'
import { aiService } from '@/services/ai.service'
import { toast } from 'sonner'

export default function SettingsPage() {
  const navigate = useNavigate()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('https://api.deepseek.com')
  const [model, setModel] = useState('deepseek-chat')
  const [savingAi, setSavingAi] = useState(false)

  useEffect(() => {
    aiService.isConfigured().then(async (configured) => {
      if (configured) {
        const settings = await db.settings.bulkGet(['ai_api_key', 'ai_base_url', 'ai_model'])
        setApiKey(settings[0]?.value || '')
        setBaseUrl(settings[1]?.value || 'https://api.deepseek.com')
        setModel(settings[2]?.value || 'deepseek-chat')
      }
    })
  }, [])

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleSaveAiSettings = async () => {
    setSavingAi(true)
    try {
      await aiService.saveSettings({
        apiKey: apiKey.trim(),
        baseUrl: baseUrl.trim() || 'https://api.deepseek.com',
        model: model.trim() || 'deepseek-chat',
      })
      toast.success('AI配置保存成功')
    } catch (err) {
      toast.error('保存失败')
    } finally {
      setSavingAi(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const tables = [
        'projects', 'subcontractors', 'workers', 'certificates',
        'educationRecords', 'trainingRecords', 'dailyLogs', 'hazards',
        'hazardSources', 'dangerousProjects', 'workPermits', 'acceptances',
        'meetings', 'correspondences', 'templates', 'knowledgeItems',
        'aiSessions', 'aiChatMessages',
        'dictItems', 'settings',
      ]
      const data: Record<string, unknown[]> = {}
      for (const table of tables) {
        const t = (db as unknown as Record<string, { toArray: () => Promise<unknown[]> }>)[table]
        if (t) data[table] = await t.toArray()
      }
      const blob = new Blob([JSON.stringify({ version: APP_VERSION, exportDate: new Date().toISOString(), data }, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `liuge-safety-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      showMessage('success', '数据备份导出成功')
    } catch (e) {
      showMessage('error', '导出失败：' + (e instanceof Error ? e.message : '未知错误'))
    } finally {
      setExporting(false)
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!confirm('导入备份将覆盖当前所有数据，确定继续吗？')) {
      e.target.value = ''
      return
    }
    setImporting(true)
    try {
      const text = await file.text()
      const backup = JSON.parse(text)
      if (!backup.data) throw new Error('无效的备份文件格式')
      await db.transaction('rw', db.tables, async () => {
        for (const table of db.tables) {
          await table.clear()
        }
        for (const [tableName, rows] of Object.entries(backup.data) as [string, Record<string, unknown>[]][]) {
          const table = (db as unknown as Record<string, { bulkPut: (rows: Record<string, unknown>[]) => Promise<void> }>)[tableName]
          if (table && Array.isArray(rows)) {
            await table.bulkPut(rows)
          }
        }
      })
      showMessage('success', '数据恢复成功，页面将在2秒后刷新...')
      setTimeout(() => window.location.reload(), 2000)
    } catch (e) {
      showMessage('error', '导入失败：' + (e instanceof Error ? e.message : '未知错误'))
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  const handleClearData = async () => {
    if (!confirm('确定要清空所有业务数据吗？此操作不可恢复！')) return
    if (!confirm('再次确认：所有隐患、人员、分包等数据将被删除！')) return
    try {
      await db.transaction('rw', db.tables, async () => {
        const keepTables = ['dictItems']
        for (const table of db.tables) {
          if (!keepTables.includes(table.name)) {
            await table.clear()
          }
        }
      })
      showMessage('success', '数据已清空，页面将在2秒后刷新...')
      setTimeout(() => window.location.reload(), 2000)
    } catch (e) {
      showMessage('error', '清空失败：' + (e instanceof Error ? e.message : '未知错误'))
    }
  }

  return (
    <div className="pb-6">
      <div className="px-3 pt-3">
        <div className="bg-gradient-to-r from-slate-700 to-slate-600 rounded-xl p-4 text-white mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">系统设置</h2>
              <p className="text-xs opacity-80">AI配置 · 数据管理 · 版本信息</p>
            </div>
          </div>
        </div>

        {message && (
          <div className={`mb-3 p-2.5 rounded-lg flex items-center gap-2 text-sm ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {message.text}
          </div>
        )}

        <h3 className="text-xs font-medium text-gray-500 mb-2 px-1">AI配置</h3>
        <Card className="mb-4">
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center gap-2 text-violet-600">
              <Bot className="w-4 h-4" />
              <span className="text-sm font-medium">DeepSeek AI 设置</span>
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">API Key</label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="sk-xxxxxxxxxxxxxxxx"
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">API地址（可选）</label>
                <Input
                  value={baseUrl}
                  onChange={e => setBaseUrl(e.target.value)}
                  placeholder="https://api.deepseek.com"
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">模型名称</label>
                <Input
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  placeholder="deepseek-chat"
                  className="h-8 text-xs"
                />
              </div>
              <Button
                size="sm"
                className="w-full h-8 text-xs gap-1"
                onClick={handleSaveAiSettings}
                disabled={savingAi || !apiKey.trim()}
              >
                <Key className="w-3 h-3" />
                {savingAi ? '保存中...' : '保存AI配置'}
              </Button>
              <p className="text-[10px] text-gray-400">
                API Key 仅保存在本地浏览器中，不会上传。请访问 platform.deepseek.com 获取 API Key。
              </p>
            </div>
          </CardContent>
        </Card>

        <h3 className="text-xs font-medium text-gray-500 mb-2 px-1">配置管理</h3>
        <div className="space-y-2 mb-4">
          <Card>
            <CardContent className="p-0">
              <button
                onClick={() => navigate('/settings/variables')}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                  <Braces className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">变量设置</p>
                  <p className="text-xs text-gray-500">管理模板变量与项目字段映射</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <button
                onClick={() => navigate('/settings/migration')}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Database className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">数据迁移（v5.0.1）</p>
                  <p className="text-xs text-gray-500">把旧教育/培训记录迁到新表结构</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <button
                onClick={handleExport}
                disabled={exporting}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Download className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">导出备份</p>
                  <p className="text-xs text-gray-500">将所有数据导出为JSON文件</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <label className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition-colors">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">导入恢复</p>
                  <p className="text-xs text-gray-500">从备份文件恢复数据（会覆盖现有数据）</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300" />
                <input type="file" accept=".json" onChange={handleImport} disabled={importing} className="hidden" />
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <button
                onClick={handleClearData}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-red-50 active:bg-red-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-600">清空数据</p>
                  <p className="text-xs text-red-400">清空所有业务数据（保留字典和知识库）</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </button>
            </CardContent>
          </Card>
        </div>

        <h3 className="text-xs font-medium text-gray-500 mb-2 px-1">关于</h3>
        <Card className="mb-4">
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{APP_NAME}</p>
                <p className="text-xs text-gray-500">建筑施工安全管理台账</p>
              </div>
            </div>
            <div className="border-t border-gray-100 pt-2 space-y-1.5">
              <InfoRow label="版本" value={`v${APP_VERSION}`} />
              <InfoRow label="数据存储" value="本地IndexedDB（离线可用）" />
              <InfoRow label="AI能力" value="DeepSeek · RAG本地知识库增强" />
              <InfoRow label="适用场景" value="建筑施工安全管理 · WPS插件" />
            </div>
          </CardContent>
        </Card>

        <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-blue-800 mb-0.5">温馨提示</p>
              <p className="text-xs text-blue-600 leading-relaxed">
                数据保存在本地浏览器中，建议定期导出备份。AI功能需要配置DeepSeek API Key后使用，知识库内容可在AI助手页面管理。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-800">{value}</span>
    </div>
  )
}
