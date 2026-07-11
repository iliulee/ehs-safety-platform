import { useState, useEffect, useRef } from 'react'
import {
  BookOpen, Upload, FileText, AlertTriangle, Shield,
  Wrench, HardHat, FileCheck, Scale, Plus, Trash2,
  ChevronRight, ChevronDown, FolderOpen, FileSpreadsheet,
  Loader2, CheckCircle2, XCircle, Database, Search,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Sheet } from '@/components/ui/sheet'
import { ragKnowledgeService } from '@/services/rag-knowledge.service'
import type { KnowledgeDocument, KnowledgeChunk, ChunkProgress } from '@/types'
import { toast } from 'sonner'

const CATEGORIES = [
  { id: 'all', name: '全部', color: 'bg-gray-50 text-gray-600', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'law', name: '法律法规', color: 'bg-red-50 text-red-600', icon: <Scale className="w-4 h-4" /> },
  { id: 'standard', name: '标准规范', color: 'bg-blue-50 text-blue-600', icon: <FileCheck className="w-4 h-4" /> },
  { id: 'pce', name: '危大工程', color: 'bg-purple-50 text-purple-600', icon: <Wrench className="w-4 h-4" /> },
  { id: 'measure', name: '安全措施', color: 'bg-emerald-50 text-emerald-600', icon: <Shield className="w-4 h-4" /> },
  { id: 'hazard', name: '隐患辨识', color: 'bg-amber-50 text-amber-600', icon: <AlertTriangle className="w-4 h-4" /> },
  { id: 'ppe', name: '劳动防护', color: 'bg-cyan-50 text-cyan-600', icon: <HardHat className="w-4 h-4" /> },
  { id: 'custom', name: '我的文档', color: 'bg-violet-50 text-violet-600', icon: <FileText className="w-4 h-4" /> },
]

function getFileIcon(fileType: string) {
  switch (fileType) {
    case 'pdf': return <FileSpreadsheet className="w-4 h-4 text-red-500" />
    case 'docx': return <FileText className="w-4 h-4 text-blue-500" />
    default: return <FileText className="w-4 h-4 text-gray-500" />
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

export default function KnowledgePage() {
  const [keyword, setKeyword] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([])
  const [stats, setStats] = useState({ docs: 0, chunks: 0, builtIn: 0, custom: 0 })
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState<ChunkProgress | null>(null)
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null)
  const [docChunks, setDocChunks] = useState<KnowledgeChunk[]>([])
  const [loadingChunks, setLoadingChunks] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [addMode, setAddMode] = useState<'file' | 'text'>('file')
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState('custom')
  const [newContent, setNewContent] = useState('')

  const loadData = async () => {
    setLoading(true)
    const cat = activeCategory === 'all' ? undefined : activeCategory
    const [docs, stat] = await Promise.all([
      ragKnowledgeService.listDocuments(cat),
      ragKnowledgeService.getStats(),
    ])
    setDocuments(docs)
    setStats(stat)
    setLoading(false)
  }

  useEffect(() => {
    ragKnowledgeService.ensureInitialized().then(loadData)
  }, [])

  useEffect(() => { loadData() }, [activeCategory])

  const filteredDocs = documents.filter((doc) => {
    if (!keyword.trim()) return true
    return doc.title.includes(keyword) || (doc.source && doc.source.includes(keyword))
  })

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setImporting(true)
    setProgress({ phase: 'reading', processed: 0, total: files.length * 100 })
    try {
      const result = await ragKnowledgeService.importFiles(
        Array.from(files),
        activeCategory === 'all' ? 'custom' : activeCategory,
        (p) => setProgress(p),
      )
      if (result.success > 0) {
        toast.success(`成功导入 ${result.success} 个文档`)
      }
      if (result.failed > 0) {
        toast.error(`${result.failed} 个文档导入失败：${result.errors.join('；')}`)
      }
    } catch (err: any) {
      toast.error(err.message || '导入失败')
    } finally {
      setImporting(false)
      setProgress(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setAddOpen(false)
      loadData()
    }
  }

  const handleDeleteDoc = async (doc: KnowledgeDocument) => {
    if (doc.isBuiltIn) {
      toast.error('内置法规文档不能删除')
      return
    }
    if (!confirm(`确定删除文档"${doc.title}"及其所有切片？此操作不可撤销。`)) return
    try {
      await ragKnowledgeService.deleteDocument(doc.id!)
      if (expandedDoc === doc.id) {
        setExpandedDoc(null)
        setDocChunks([])
      }
      toast.success('文档已删除')
      loadData()
    } catch (err: any) {
      toast.error(err.message || '删除失败')
    }
  }

  const handleToggleExpand = async (docId: string) => {
    if (expandedDoc === docId) {
      setExpandedDoc(null)
      setDocChunks([])
      return
    }
    setExpandedDoc(docId)
    setLoadingChunks(true)
    const chunks = await ragKnowledgeService.listChunks(docId)
    setDocChunks(chunks)
    setLoadingChunks(false)
  }

  const handleAddText = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      toast.error('请填写标题和内容')
      return
    }
    setImporting(true)
    try {
      const ts = Date.now()
      const docId = 'doc_' + ts
      const chunks: KnowledgeChunk[] = []
      const { chunkText } = await import('@/services/chunker.service')
      const { tokenize } = await import('@/services/bm25.service')
      const chunkTexts = chunkText(newContent.trim(), newTitle.trim())
      for (let i = 0; i < chunkTexts.length; i++) {
        chunks.push({
          id: 'chunk_' + ts + '_' + i,
          docId,
          docTitle: newTitle.trim(),
          chunkIndex: i,
          content: chunkTexts[i],
          tokens: tokenize(chunkTexts[i]),
          category: newCategory,
          isBuiltIn: false,
          createdAt: ts,
          updatedAt: ts,
        })
      }
      const { db } = await import('@/db')
      await db.transaction('rw', [db.knowledgeDocuments, db.knowledgeChunks], async () => {
        await db.knowledgeDocuments.put({
          id: docId,
          title: newTitle.trim(),
          fileName: newTitle.trim(),
          fileType: 'txt',
          fileSize: newContent.length,
          fullText: newContent.trim(),
          chunkCount: chunks.length,
          category: newCategory,
          source: '手动添加',
          isBuiltIn: false,
          importStatus: 'done',
          createdAt: ts,
          updatedAt: ts,
        })
        await db.knowledgeChunks.bulkPut(chunks)
      })
      toast.success('知识文档添加成功')
      setAddOpen(false)
      setNewTitle('')
      setNewContent('')
      loadData()
    } catch (err: any) {
      toast.error(err.message || '添加失败')
    } finally {
      setImporting(false)
    }
  }

  const currentCat = CATEGORIES.find((c) => c.id === activeCategory)

  return (
    <div className="pb-20 relative">
      <div className="px-3 pt-3">
        <div className="bg-gradient-to-r from-teal-600 to-emerald-600 rounded-xl p-4 text-white mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold">安全知识库</h2>
                <p className="text-xs opacity-80">BM25检索 · 文件切片 · 精准检索</p>
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-3">
            <div className="bg-white/15 rounded-lg px-2.5 py-1.5">
              <p className="text-[10px] opacity-80">文档总数</p>
              <p className="text-sm font-semibold">{stats.docs}</p>
            </div>
            <div className="bg-white/15 rounded-lg px-2.5 py-1.5">
              <p className="text-[10px] opacity-80">知识切片</p>
              <p className="text-sm font-semibold">{stats.chunks}</p>
            </div>
            <div className="bg-white/15 rounded-lg px-2.5 py-1.5">
              <p className="text-[10px] opacity-80">内置法规</p>
              <p className="text-sm font-semibold">{stats.builtIn}</p>
            </div>
            <div className="bg-white/15 rounded-lg px-2.5 py-1.5">
              <p className="text-[10px] opacity-80">我的文档</p>
              <p className="text-sm font-semibold">{stats.custom}</p>
            </div>
          </div>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索文档标题..."
            className="pl-8 h-8 text-xs bg-white"
          />
        </div>

        <div className="grid grid-cols-4 gap-1.5 mb-3">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`flex flex-col items-center gap-1 py-2 rounded-lg transition-all ${
                activeCategory === c.id
                  ? `${c.color} ring-2 ring-current ring-opacity-20`
                  : 'bg-white border border-gray-100'
              }`}
            >
              <div className={`w-7 h-7 rounded-lg ${c.color} flex items-center justify-center`}>
                {c.icon}
              </div>
              <span className={`text-[10px] ${activeCategory === c.id ? 'font-medium' : 'text-gray-600'}`}>{c.name}</span>
            </button>
          ))}
        </div>

        {importing && progress && (
          <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <Loader2 className="w-4 h-4 text-violet-600 animate-spin" />
              <span className="text-xs font-medium text-violet-700">
                {progress.phase === 'reading' && '读取文件...'}
                {progress.phase === 'parsing' && '解析文本...'}
                {progress.phase === 'chunking' && '切片处理...'}
                {progress.phase === 'tokenizing' && '分词索引...'}
                {progress.phase === 'saving' && '保存入库...'}
              </span>
            </div>
            <div className="w-full bg-violet-100 rounded-full h-2">
              <div
                className="bg-violet-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (progress.processed / progress.total) * 100)}%` }}
              />
            </div>
            {progress.currentFile && (
              <p className="text-[10px] text-violet-500 mt-1 truncate">{progress.currentFile}</p>
            )}
          </div>
        )}

        {currentCat && currentCat.id !== 'all' && (
          <div className={`flex items-center gap-2 px-2 mb-2 text-xs ${currentCat.color} py-1.5 rounded-lg`}>
            {currentCat.icon}
            <span className="font-medium">{currentCat.name}</span>
            <span className="text-[10px] opacity-70 ml-auto">共{filteredDocs.length}个文档</span>
          </div>
        )}

        <div className="space-y-2">
          {loading ? (
            <div className="py-12 text-center text-sm text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              加载知识库...
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="py-8 text-center">
              <FolderOpen className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-400">
                {activeCategory === 'custom' ? '还没有导入文档，点击右下角+添加' : '没有找到相关文档'}
              </p>
            </div>
          ) : (
            filteredDocs.map((doc) => (
              <div key={doc.id}>
                <Card className="group">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <button
                        onClick={() => handleToggleExpand(doc.id!)}
                        className="w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5 hover:bg-gray-100 rounded text-gray-400"
                      >
                        {expandedDoc === doc.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                        {getFileIcon(doc.fileType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{doc.title}</p>
                            {doc.isBuiltIn && (
                              <span className="text-[9px] bg-teal-100 text-teal-700 px-1 py-0.5 rounded flex-shrink-0">内置</span>
                            )}
                            {doc.importStatus === 'error' && (
                              <span className="text-[9px] bg-red-100 text-red-700 px-1 py-0.5 rounded flex-shrink-0 flex items-center gap-0.5">
                                <XCircle className="w-2.5 h-2.5" />错误
                              </span>
                            )}
                            {doc.importStatus === 'done' && !doc.isBuiltIn && (
                              <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1 py-0.5 rounded flex-shrink-0 flex items-center gap-0.5">
                                <CheckCircle2 className="w-2.5 h-2.5" />已切片
                              </span>
                            )}
                          </div>
                          {!doc.isBuiltIn && doc.id && (
                            <button
                              onClick={() => handleDeleteDoc(doc)}
                              className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded flex-shrink-0 transition-all"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-gray-400">{doc.chunkCount}个切片</span>
                          <span className="text-[10px] text-gray-400">{formatSize(doc.fileSize)}</span>
                          {doc.source && <span className="text-[10px] text-gray-400">{doc.source}</span>}
                        </div>
                        {doc.errorMsg && (
                          <p className="mt-1 text-[10px] text-red-500">{doc.errorMsg}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                {expandedDoc === doc.id && (
                  <div className="mt-1 ml-6 space-y-1">
                    {loadingChunks ? (
                      <div className="py-4 text-center text-xs text-gray-400">
                        <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                      </div>
                    ) : docChunks.length === 0 ? (
                      <div className="py-2 text-center text-[10px] text-gray-400">无切片内容</div>
                    ) : (
                      docChunks.map((chunk) => (
                        <Card key={chunk.id} className="bg-gray-50/50">
                          <CardContent className="p-2">
                            <div className="flex items-start gap-1.5">
                              <span className="text-[9px] bg-gray-200 text-gray-600 px-1 rounded flex-shrink-0 mt-0.5">#{chunk.chunkIndex + 1}</span>
                              <p className="text-[11px] text-gray-600 leading-relaxed line-clamp-3">{chunk.content}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="mt-4 bg-teal-50 border border-teal-100 rounded-lg p-2.5">
          <p className="text-[11px] text-teal-700 leading-relaxed">
            📚 <b>使用说明：</b>导入docx/pdf/txt/md文件后，系统会自动切片并建立BM25检索索引。AI写方案时会自动检索相关条款作为参考，大幅减少幻觉。内置法规不可删除，自定义文档可随时删除和替换。
          </p>
        </div>
      </div>

      <button
        onClick={() => setAddOpen(true)}
        className="absolute bottom-4 right-4 w-12 h-12 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors z-50"
      >
        <Plus className="w-5 h-5" />
      </button>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".docx,.pdf,.txt,.md"
        className="hidden"
        onChange={handleFileSelect}
      />

      <Sheet
        open={addOpen}
        onClose={() => { setAddOpen(false); setAddMode('file'); setNewTitle(''); setNewContent('') }}
        title="添加知识文档"
        footer={
          <>
            <Button variant="outline" className="flex-1" onClick={() => { setAddOpen(false); setAddMode('file') }}>取消</Button>
            {addMode === 'text' && <Button className="flex-1" disabled={importing} onClick={handleAddText}>{importing ? '处理中...' : '保存'}</Button>}
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => setAddMode('file')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                addMode === 'file' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              <Upload className="w-4 h-4 inline mr-1" />导入文件
            </button>
            <button
              onClick={() => setAddMode('text')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                addMode === 'text' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-1" />手动输入
            </button>
          </div>

          {addMode === 'file' ? (
            <div
              onClick={() => !importing && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                importing ? 'border-gray-200 bg-gray-50 cursor-wait' : 'border-teal-200 bg-teal-50 hover:bg-teal-100'
              }`}
            >
              <Upload className={`w-8 h-8 mx-auto mb-2 ${importing ? 'text-gray-400' : 'text-teal-500'}`} />
              {importing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1 text-teal-600" />
                  <p className="text-xs text-teal-700 font-medium">正在导入文件...</p>
                  {progress && (
                    <div className="w-full bg-teal-100 rounded-full h-1.5 mt-2 max-w-[200px] mx-auto">
                      <div
                        className="bg-teal-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (progress.processed / progress.total) * 100)}%` }}
                      />
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="text-xs text-teal-700 font-medium">点击选择文件导入</p>
                  <p className="text-[10px] text-teal-500 mt-1">支持 .docx / .pdf / .txt / .md 格式</p>
                  <p className="text-[10px] text-teal-400 mt-0.5">可多选，自动切片并建立索引</p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700">标题</label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="如：XX项目深基坑施工规定"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700">分类</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full h-8 text-xs px-2 border border-gray-200 rounded-md"
                >
                  {CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700">内容</label>
                <Textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="粘贴法规条文、规范要点、方案要求等内容..."
                  rows={8}
                  className="text-xs"
                />
              </div>
            </div>
          )}
        </div>
      </Sheet>
    </div>
  )
}
