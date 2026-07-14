import { useEffect, useState } from 'react'
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Copy,
  RotateCcw as Retry,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Camera,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  HIGH_CONFIDENCE_THRESHOLD,
  type Suggestion,
} from '@/services/ocr-suggestions'

interface OcrPreviewPanelProps {
  /** 原图 URL（object URL 或 data URL） */
  imageUrl: string | null
  /** OCR 识别的原始文本（可编辑） */
  rawText: string
  /** OCR 整体置信度 */
  confidence: number
  /** 候选字段列表 */
  suggestions: Suggestion[]
  /** 已填入的字段 key 集合（用于标记） */
  appliedKeys: Set<string>
  /** 填入单个字段回调 */
  onApplyField: (key: Suggestion['key'], value: string) => void
  /** 一键填入高置信度字段 */
  onApplyAllHigh: () => void
  /** 文本变化回调（用户编辑 textarea） */
  onTextChange: (text: string) => void
  /** 重新识别（用同一张图重跑 OCR） */
  onRetry: () => void
  /** 重拍新照片 */
  onRetake: () => void
  /** 顶部标题（如：身份证识别 / 铭牌识别） */
  title?: string
}

/**
 * OCR 左图右文面板（inline 内嵌版本）
 * - 不再以全屏 modal 形式弹出，直接嵌入页面
 * - 左侧原图（缩放/旋转/重拍）
 * - 右侧 OCR 文本 textarea（≥300px 高，可选中复制）+ 建议填入列表
 */
export function OcrPreviewPanel({
  imageUrl,
  rawText,
  confidence,
  suggestions,
  appliedKeys,
  onApplyField,
  onApplyAllHigh,
  onTextChange,
  onRetry,
  onRetake,
  title = 'OCR 识别结果',
}: OcrPreviewPanelProps) {
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [copied, setCopied] = useState(false)

  // 有图片时重置缩放和旋转
  useEffect(() => {
    if (imageUrl) {
      setZoom(1)
      setRotation(0)
      setCopied(false)
    }
  }, [imageUrl])

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(rawText)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // 旧浏览器降级
      const ta = document.createElement('textarea')
      ta.value = rawText
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  const highConfidenceCount = suggestions.filter(
    (s) => s.confidence >= HIGH_CONFIDENCE_THRESHOLD && s.validation.status !== 'invalid',
  ).length

  const overallColor =
    confidence >= HIGH_CONFIDENCE_THRESHOLD
      ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
      : confidence >= 40
        ? 'text-amber-600 bg-amber-50 border-amber-200'
        : 'text-red-600 bg-red-50 border-red-200'

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Camera className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-900">{title}</span>
          {confidence > 0 && (
            <span className={`text-xs px-2 py-0.5 rounded-full border ${overallColor}`}>
              整体置信度 {confidence}%
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleCopyAll}
            disabled={!rawText}
            className="text-xs text-slate-600 hover:text-slate-900 disabled:opacity-40 flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100"
            title="复制全部 OCR 文本"
          >
            <Copy className="w-3.5 h-3.5" />
            {copied ? '已复制' : '复制全部'}
          </button>
          <button
            type="button"
            onClick={onRetry}
            disabled={!imageUrl}
            className="text-xs text-slate-600 hover:text-slate-900 disabled:opacity-40 flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100"
            title="用同一张图重新识别"
          >
            <Retry className="w-3.5 h-3.5" />
            重新识别
          </button>
        </div>
      </div>

      {/* 主体：左图右文 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3">
        {/* 左侧：原图 */}
        <div className="flex flex-col bg-slate-50 rounded-lg border border-slate-200 overflow-hidden min-h-[420px]">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-white">
            <span className="text-xs text-slate-500 font-medium">原图预览</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                className="p-1 rounded hover:bg-slate-100 text-slate-600"
                title="缩小"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                className="p-1 rounded hover:bg-slate-100 text-slate-600"
                title="放大"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-slate-200 mx-1" />
              <button
                type="button"
                onClick={() => setRotation((r) => r - 90)}
                className="p-1 rounded hover:bg-slate-100 text-slate-600"
                title="左旋 90°"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setRotation((r) => r + 90)}
                className="p-1 rounded hover:bg-slate-100 text-slate-600"
                title="右旋 90°"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto flex items-center justify-center p-3">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="OCR 原图"
                className="max-w-full max-h-full object-contain transition-transform"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                }}
              />
            ) : (
              <div className="text-center py-8">
                <Camera className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400">尚未拍照，点击下方按钮重新拍照</p>
              </div>
            )}
          </div>
          <div className="px-3 py-2 border-t border-slate-200 bg-white">
            <button
              type="button"
              onClick={onRetake}
              className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
            >
              <Retry className="w-3.5 h-3.5" />
              重新拍照
            </button>
          </div>
        </div>

        {/* 右侧：OCR 文本 + 建议列表 */}
        <div className="flex flex-col gap-3 min-h-[420px]">
          {/* OCR 原文 textarea */}
          <div className="flex flex-col bg-slate-50 rounded-lg border border-slate-200 overflow-hidden flex-1 min-h-0">
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-white">
              <span className="text-xs text-slate-500 font-medium">OCR 识别文本（可编辑/选中复制）</span>
              <span className="text-xs text-slate-400">{rawText.length} 字</span>
            </div>
            <Textarea
              value={rawText}
              onChange={(e) => onTextChange(e.target.value)}
              className="flex-1 min-h-[300px] rounded-none border-0 resize-none font-mono text-xs leading-relaxed"
              placeholder="OCR 识别的原始文本会显示在这里，可手动修正错字..."
            />
          </div>

          {/* 建议填入列表 */}
          <div className="flex flex-col bg-white rounded-lg border border-slate-200 overflow-hidden max-h-[280px]">
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-slate-50">
              <span className="text-xs text-slate-600 font-medium">
                建议填入（{suggestions.length}）
              </span>
              <Button
                type="button"
                size="sm"
                variant="default"
                onClick={onApplyAllHigh}
                disabled={highConfidenceCount === 0}
                className="h-6 text-xs px-2"
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                一键填入高置信度（{highConfidenceCount}）
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {suggestions.length === 0 && (
                <p className="text-xs text-slate-400 py-4 text-center">
                  未识别到可填入字段，可从上方文本中手动选中复制
                </p>
              )}
              {suggestions.map((s, idx) => {
                const isApplied = appliedKeys.has(s.key)
                const isHigh = s.confidence >= HIGH_CONFIDENCE_THRESHOLD
                const isValid = s.validation.status === 'valid'
                const isInvalid = s.validation.status === 'invalid'
                const isPending = s.validation.status === 'pending'

                return (
                  <div
                    key={`${s.key}-${idx}`}
                    className={`rounded-lg border px-2 py-1.5 ${
                      isInvalid
                        ? 'border-red-200 bg-red-50'
                        : isHigh && isValid
                          ? 'border-emerald-200 bg-emerald-50'
                          : 'border-amber-200 bg-amber-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 w-16 shrink-0">{s.label}</span>
                      <span className="text-sm text-slate-800 flex-1 truncate font-medium">
                        {s.value}
                      </span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          isHigh
                            ? 'text-emerald-600 bg-emerald-100'
                            : 'text-amber-600 bg-amber-100'
                        }`}
                      >
                        {s.confidence}%
                      </span>
                      {isValid && (
                        <span title="已校验" className="text-emerald-600">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </span>
                      )}
                      {isInvalid && (
                        <span title="校验未通过" className="text-red-600">
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </span>
                      )}
                      {isPending && (
                        <span title="待校验" className="text-slate-400">
                          <Clock className="w-3.5 h-3.5" />
                        </span>
                      )}
                      {isApplied ? (
                        <span className="text-xs text-emerald-600 flex items-center gap-0.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          已填入
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onApplyField(s.key, s.value)}
                          className="text-xs text-primary hover:text-primary/80 flex items-center gap-0.5 px-2 py-0.5 rounded hover:bg-primary/5"
                        >
                          填入
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    {isInvalid && s.validation.reason && (
                      <p className="text-xs text-red-600 mt-1 ml-[72px] flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {s.validation.reason}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 底部说明 */}
      <div className="px-4 py-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            已校验
          </span>
          <span className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-red-500" />
            校验未通过
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            待校验
          </span>
        </div>
        <span>≥{HIGH_CONFIDENCE_THRESHOLD}% 可一键填入 · 可从右侧文本手动选中复制</span>
      </div>
    </div>
  )
}
