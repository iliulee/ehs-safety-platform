import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, Plus, Trash2, RotateCcw, Shield, User, Calendar, Info } from 'lucide-react'
import { variableSettingsService, resolveVariableValue } from '@/services/variable-settings.service'
import { useAppStore } from '@/store'
import type { GlobalVariable } from '@/types'

export default function VariableSettingsPage() {
  const navigate = useNavigate()
  const currentProject = useAppStore((s) => s.currentProject)
  const [variables, setVariables] = useState<GlobalVariable[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const load = useCallback(async () => {
    const list = await variableSettingsService.list()
    setVariables(list)
  }, [])

  useEffect(() => { load() }, [load])

  // 解析变量当前值
  const getDisplayValue = (v: GlobalVariable) => {
    if (v.source === 'project') {
      return resolveVariableValue(v, currentProject) || '（未填写）'
    }
    if (v.source === 'currentDate') {
      return resolveVariableValue(v, currentProject)
    }
    return v.value || '（未填写）'
  }

  // 来源显示
  const getSourceLabel = (v: GlobalVariable) => {
    if (v.source === 'project') return '项目信息'
    if (v.source === 'currentDate') return '系统自动'
    return '手动填写'
  }
  const getSourceIcon = (v: GlobalVariable) => {
    if (v.source === 'project') return Shield
    if (v.source === 'currentDate') return Calendar
    return User
  }
  const getSourceColor = (v: GlobalVariable) => {
    if (v.source === 'project') return 'text-blue-600 bg-blue-50'
    if (v.source === 'currentDate') return 'text-green-600 bg-green-50'
    return 'text-amber-600 bg-amber-50'
  }

  // 开始编辑手动变量
  const startEdit = (v: GlobalVariable) => {
    if (v.source === 'currentDate') return
    setEditingId(v.id)
    setEditValue(v.source === 'project' ? getDisplayValue(v) : v.value)
  }

  // 保存编辑
  const saveEdit = async () => {
    if (editingId) {
      await variableSettingsService.updateValue(editingId, editValue)
      setEditingId(null)
      await load()
    }
  }

  // 添加自定义变量
  const addCustom = async () => {
    if (!newLabel.trim()) return
    await variableSettingsService.add(newLabel.trim())
    setNewLabel('')
    setShowAdd(false)
    await load()
  }

  // 删除自定义变量
  const removeCustom = async (v: GlobalVariable) => {
    if (v.isBuiltIn) return
    await variableSettingsService.remove(v.id)
    await load()
  }

  // 重置
  const handleReset = async () => {
    await variableSettingsService.reset()
    await load()
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">台账变量</h1>
          <p className="text-sm text-slate-500 mt-1">
            这些变量会在生成台账时自动填入文档。<br />
            灰色底色的变量来自项目信息，在"项目管理"中修改即可；手动变量可在此直接编辑。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            恢复默认
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            添加变量
          </button>
        </div>
      </div>

      {/* 添加变量弹窗 */}
      {showAdd && (
        <div className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 p-4">
          <Info className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustom()}
            placeholder="输入变量名称，如：合同编号"
            className="flex-1 h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            autoFocus
          />
          <button
            onClick={addCustom}
            disabled={!newLabel.trim()}
            className="px-4 h-10 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            确定
          </button>
          <button
            onClick={() => { setShowAdd(false); setNewLabel('') }}
            className="px-3 h-10 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            取消
          </button>
        </div>
      )}

      {/* 变量列表 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* 表头 */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 grid grid-cols-12 gap-4 text-xs font-medium text-slate-500">
          <div className="col-span-1">序号</div>
          <div className="col-span-3">变量名称</div>
          <div className="col-span-4">当前值</div>
          <div className="col-span-2">来源</div>
          <div className="col-span-2">操作</div>
        </div>

        {/* 表体 */}
        <div className="divide-y divide-slate-50">
          {variables.map((v, index) => {
            const SourceIcon = getSourceIcon(v)
            const isEditing = editingId === v.id
            const displayValue = getDisplayValue(v)
            const isBuiltIn = v.isBuiltIn

            return (
              <div
                key={v.id}
                className={`px-6 py-3 grid grid-cols-12 gap-4 items-center text-sm transition-colors ${
                  isBuiltIn ? 'bg-slate-50/50' : 'bg-white'
                }`}
              >
                {/* 序号 */}
                <div className="col-span-1 text-slate-400">{index + 1}</div>

                {/* 变量名称 */}
                <div className="col-span-3 flex items-center gap-2">
                  <span className={`font-medium ${isBuiltIn ? 'text-slate-700' : 'text-slate-900'}`}>
                    {v.label}
                  </span>
                  {isBuiltIn && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-500">内置</span>
                  )}
                </div>

                {/* 当前值 */}
                <div className="col-span-4">
                  {isEditing && v.source === 'manual' ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit()
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        className="flex-1 h-8 px-2.5 rounded border border-teal-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                        autoFocus
                      />
                      <button
                        onClick={() => saveEdit()}
                        className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-xs text-slate-400 hover:text-slate-600"
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <span className={displayValue === '（未填写）' ? 'text-slate-300' : 'text-slate-700'}>
                      {displayValue}
                    </span>
                  )}
                </div>

                {/* 来源 */}
                <div className="col-span-2">
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${getSourceColor(v)}`}>
                    <SourceIcon className="w-3 h-3" />
                    {getSourceLabel(v)}
                  </span>
                </div>

                {/* 操作 */}
                <div className="col-span-2 flex items-center gap-2">
                  {v.source === 'project' ? (
                    <button
                      onClick={() => navigate('/projects')}
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      在项目信息中修改
                    </button>
                  ) : v.source === 'manual' ? (
                    <button
                      onClick={() => startEdit(v)}
                      className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      编辑
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400">自动生成</span>
                  )}
                  {!isBuiltIn && (
                    <button
                      onClick={() => removeCustom(v)}
                      className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      删除
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 底部提示 */}
      <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 flex items-start gap-3">
        <Info className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-slate-500 space-y-1">
          <p><strong className="text-slate-600">怎么用？</strong> 生成台账时，系统会自动把文档里的变量替换成你填的值。</p>
          <p><strong className="text-slate-600">灰色行</strong>是内置变量，值来自项目信息，在"项目管理"里改就行。</p>
          <p><strong className="text-slate-600">白色行</strong>是自定义变量，点击"编辑"直接修改。</p>
          <p>你不用管变量名怎么写，系统会自动匹配模板里的变量。</p>
        </div>
      </div>
    </div>
  )
}