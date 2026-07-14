import { useEffect, useRef, useState } from 'react'
import { Camera, Upload, Eye, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { db } from '@/db'
import { trainingService } from '@/services/training.service'
import type { AttachmentRecord } from '@/types'

interface Props {
  enrollmentId: string
  workerName: string
  /** 已签字时显示缩略图（AttachmentRecord.id） */
  currentSignatureId?: string
  /** 签字成功后回调（让父组件刷新 enrollments 列表） */
  onSigned: () => void
}

/** File 转 Base64 data URL */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const MAX_SIZE = 2 * 1024 * 1024 // 2MB

/**
 * 签字照片上传组件
 * - 未签字：拍照 / 上传 两个按钮
 * - 已签字：缩略图 + 查看大图 + 重新签字
 * - 照片以 Base64 存到 AttachmentRecord（category=signature）
 */
export function SignatureUploader({ enrollmentId, workerName, currentSignatureId, onSigned }: Props) {
  const [signature, setSignature] = useState<AttachmentRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [showLarge, setShowLarge] = useState(false)
  const cameraRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // 加载已签字的照片
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!currentSignatureId) {
        setSignature(null)
        return
      }
      try {
        const att = await db.attachmentRecords.get(currentSignatureId)
        if (!cancelled) setSignature(att ?? null)
      } catch (err) {
        console.error('加载签字照片失败', err)
      }
    }
    load()
    return () => { cancelled = true }
  }, [currentSignatureId])

  const handleFile = async (file: File) => {
    // 1. 大小限制
    if (file.size > MAX_SIZE) {
      toast.error('照片超过 2MB，请压缩后重试')
      return
    }
    // 2. 类型限制（只允许图片）
    if (!file.type.startsWith('image/')) {
      toast.error('只允许上传图片文件')
      return
    }
    setLoading(true)
    try {
      // 3. 转 Base64
      const blob = await fileToBase64(file)
      // 4. 调 service（存附件 + 更新 enrollment）
      const attachmentId = await trainingService.signWithPhoto(enrollmentId, {
        blob,
        filename: file.name,
        mimeType: file.type,
        size: file.size,
      })
      // 5. 立即查回附件记录用于展示
      const att = await db.attachmentRecords.get(attachmentId)
      setSignature(att ?? null)
      toast.success(`${workerName} 签字完成`)
      onSigned()
    } catch (err) {
      console.error('签字失败', err)
      toast.error('签字失败：' + (err instanceof Error ? err.message : '未知错误'))
    } finally {
      setLoading(false)
    }
  }

  const signed = !!signature?.blob

  return (
    <>
      <div className="border border-slate-200 rounded-lg p-3">
        {/* 顶部：姓名 + 状态 */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-800">{workerName}</span>
          {signed ? (
            <Badge className="bg-emerald-50 text-emerald-700 border-0 text-xs">✓ 已签字</Badge>
          ) : (
            <Badge className="bg-amber-50 text-amber-700 border-0 text-xs">⏳ 未签字</Badge>
          )}
        </div>

        {/* 未签字：拍照 + 上传 */}
        {!signed && (
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              disabled={loading}
              onClick={() => cameraRef.current?.click()}
            >
              <Camera className="w-3.5 h-3.5 mr-1" />
              {loading ? '处理中...' : '拍照签字'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              disabled={loading}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-3.5 h-3.5 mr-1" />
              上传照片
            </Button>
          </div>
        )}

        {/* 已签字：缩略图 + 查看大图 + 重新签字 */}
        {signed && (
          <div className="flex items-center gap-2">
            <img
              src={signature!.blob}
              alt={`${workerName}签字`}
              className="w-16 h-16 object-cover rounded border border-slate-200 cursor-pointer flex-shrink-0"
              onClick={() => setShowLarge(true)}
            />
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setShowLarge(true)}
              >
                <Eye className="w-3 h-3 mr-1" />
                查看大图
              </Button>
              <button
                className="text-xs text-red-500 hover:text-red-600 text-left flex items-center gap-1 disabled:opacity-50"
                disabled={loading}
                onClick={() => cameraRef.current?.click()}
              >
                <RefreshCw className="w-3 h-3" />
                {loading ? '处理中...' : '重新签字'}
              </button>
            </div>
          </div>
        )}

        {/* 隐藏的 file input：拍照（capture=environment 调后置摄像头） */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
            e.target.value = ''
          }}
        />
        {/* 隐藏的 file input：上传（不调摄像头） */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
            e.target.value = ''
          }}
        />
      </div>

      {/* 全屏查看大图 */}
      {showLarge && signature?.blob && (
        <div
          className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4"
          onClick={() => setShowLarge(false)}
        >
          <img
            src={signature.blob}
            alt={`${workerName}签字大图`}
            className="max-w-full max-h-full object-contain"
          />
          <button
            className="absolute top-4 right-4 text-white text-2xl w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
            onClick={() => setShowLarge(false)}
          >
            ✕
          </button>
        </div>
      )}
    </>
  )
}
