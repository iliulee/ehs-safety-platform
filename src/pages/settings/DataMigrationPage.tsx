import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Database, Loader2, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react'
import { migrateAll, backfillWorkerNames, type MigrationResult } from '@/services/db-migrate.service'
import { toast } from 'sonner'

/**
 * 数据迁移页面（v5.0.1）
 *
 * 把旧 EducationRecord / TrainingRecord / 散落 attachments[]
 * 迁到新 TrainingSession + TrainingEnrollment + AttachmentRecord 三张表。
 *
 * 迁移幂等：重复执行不会产生重复数据。
 */
export default function DataMigrationPage() {
  const navigate = useNavigate()
  const [running, setRunning] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'migrating' | 'backfilling' | 'done'>('idle')
  const [result, setResult] = useState<MigrationResult | null>(null)
  const [backfillCount, setBackfillCount] = useState(0)

  const handleMigrate = async () => {
    setRunning(true)
    setResult(null)
    setBackfillCount(0)
    try {
      setPhase('migrating')
      const r = await migrateAll()
      setResult(r)

      setPhase('backfilling')
      const count = await backfillWorkerNames()
      setBackfillCount(count)

      setPhase('done')
      if (r.errors.length > 0) {
        toast.warning(`迁移完成，但有 ${r.errors.length} 个错误`)
      } else {
        toast.success('迁移完成')
      }
    } catch (err) {
      toast.error('迁移失败：' + (err instanceof Error ? err.message : '未知错误'))
      setPhase('idle')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 pt-6 flex flex-col gap-6">
        {/* 顶部 header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/settings')}
            className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            返回系统设置
          </button>
          <div className="flex-1" />
          <h1 className="text-lg font-semibold text-slate-900">数据迁移（v5.0.1）</h1>
        </div>

        {/* 说明卡片 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center flex-shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">EHS "人-事-证" 表结构重构</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                把旧表数据迁到 v5.0.1 新表：
                <br />
                · EducationRecord → TrainingSession + TrainingEnrollment
                <br />
                · TrainingRecord → TrainingSession + TrainingEnrollment
                <br />
                · 散落 attachments[] → AttachmentRecord
              </p>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700 leading-relaxed">
            <strong>迁移幂等：</strong>
            重复执行不会产生重复数据。已迁移的记录会自动跳过（settings 表中标记 __v501_migrated__）。
            <br />
            <strong>不删旧表：</strong>
            旧 EducationRecord / TrainingRecord 数据保留，兼容现有页面，仅作只读。
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col items-center gap-3">
          {phase === 'idle' && (
            <>
              <p className="text-sm text-slate-600">点击下方按钮开始迁移</p>
              <button
                onClick={handleMigrate}
                disabled={running}
                className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center gap-2"
              >
                <Database className="w-4 h-4" />
                开始迁移
              </button>
            </>
          )}

          {running && (
            <>
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
              <p className="text-sm text-slate-700 font-medium">
                {phase === 'migrating' && '正在迁移教育/培训记录...'}
                {phase === 'backfilling' && '正在回填工人姓名...'}
              </p>
              <p className="text-xs text-slate-400">请勿关闭页面</p>
            </>
          )}

          {phase === 'done' && result && (
            <>
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              <p className="text-sm font-medium text-slate-800">迁移完成</p>
            </>
          )}
        </div>

        {/* 结果卡片 */}
        {result && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">迁移结果</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <ResultItem label="EducationRecord 迁移" value={result.educationCount} color="blue" />
              <ResultItem label="TrainingRecord 迁移" value={result.trainingCount} color="cyan" />
              <ResultItem label="附件迁移" value={result.attachmentCount} color="violet" />
              <ResultItem label="回填工人姓名" value={backfillCount} color="emerald" />
              <ResultItem label="跳过（已迁移）" value={result.skipped} color="amber" />
            </div>

            {result.errors.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2 text-red-700">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">错误列表（{result.errors.length}）</span>
                </div>
                <div className="bg-red-50 border border-red-100 rounded-lg p-3 max-h-60 overflow-y-auto">
                  {result.errors.map((err, i) => (
                    <div key={i} className="text-xs text-red-700 py-1 border-b border-red-100 last:border-0">
                      {err}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={handleMigrate}
                disabled={running}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 disabled:opacity-40 transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                重新迁移（幂等）
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ResultItem({ label, value, color }: { label: string; value: number; color: 'blue' | 'cyan' | 'violet' | 'emerald' | 'amber' }) {
  const colorMap = {
    blue: 'text-blue-600 bg-blue-50',
    cyan: 'text-cyan-600 bg-cyan-50',
    violet: 'text-violet-600 bg-violet-50',
    emerald: 'text-emerald-600 bg-emerald-50',
    amber: 'text-amber-600 bg-amber-50',
  }
  return (
    <div className={`rounded-lg p-3 ${colorMap[color]}`}>
      <div className="text-xs opacity-80">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}<span className="text-xs font-normal opacity-70 ml-1">条</span></div>
    </div>
  )
}
