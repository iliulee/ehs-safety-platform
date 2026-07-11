import { useState, useEffect, useRef } from 'react'
import {
  Bot, Send, Plus, Trash2, FileText, Sparkles,
  Loader2, BookOpen, Copy, Check, Settings, Quote,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { aiService } from '@/services/ai.service'
import { ragKnowledgeService } from '@/services/rag-knowledge.service'
import type { AiSession, AiChatMessage, RetrievalHit } from '@/types'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

const QUICK_PROMPTS = [
  { icon: '📋', label: '深基坑专项方案', prompt: '请帮我编写一份深基坑工程安全专项施工方案，包含工程概况、编制依据、施工计划、施工工艺技术、安全保证措施、人员配备、验收要求、应急处置等内容。' },
  { icon: '🔧', label: '脚手架搭设交底', prompt: '请编写扣件式钢管脚手架搭设安全技术交底，包含材料要求、搭设流程、安全措施、验收标准、注意事项等。' },
  { icon: '⚡', label: '临时用电方案', prompt: '请编写施工现场临时用电安全专项方案，包含三级配电、TN-S系统、漏电保护、接地装置、配电箱设置、安全用电措施等内容。' },
  { icon: '🏗️', label: '模板支撑体系', prompt: '请编写高大模板支撑体系安全专项施工方案，包含设计参数、搭设要求、检查验收、混凝土浇筑顺序、拆模要求等。' },
  { icon: '🦺', label: '高处作业安全', prompt: '请列出建筑施工高处作业的主要安全防护措施和注意事项，包含临边防护、洞口防护、攀登作业、悬空作业、交叉作业、安全带使用等。' },
  { icon: '🔥', label: '消防安全方案', prompt: '请编写施工现场消防安全专项方案，包含消防组织、消防器材配置、动火作业管理、易燃材料存放、应急疏散等内容。' },
]

export default function AiChatPage() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<AiSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<AiChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [configured, setConfigured] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [streamingHits, setStreamingHits] = useState<RetrievalHit[]>([])
  const [copied, setCopied] = useState(false)
  const [kbStats, setKbStats] = useState({ docs: 0, chunks: 0 })
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadSessions()
    checkConfig()
    ragKnowledgeService.ensureInitialized().then(() => {
      ragKnowledgeService.getStats().then(s => setKbStats({ docs: s.docs, chunks: s.chunks }))
    })
  }, [])

  useEffect(() => {
    if (currentSessionId) {
      loadMessages(currentSessionId)
    } else {
      setMessages([])
    }
  }, [currentSessionId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  const checkConfig = async () => {
    const isConfig = await aiService.isConfigured()
    setConfigured(isConfig)
  }

  const loadSessions = async () => {
    const list = await aiService.listSessions()
    setSessions(list)
    if (list.length > 0 && !currentSessionId) {
      setCurrentSessionId(list[0].id || null)
    }
  }

  const loadMessages = async (sessionId: string | null) => {
    if (!sessionId) {
      setMessages([])
      return
    }
    const msgs = await aiService.getSessionMessages(sessionId)
    setMessages(msgs)
  }

  const createNewSession = async (): Promise<string> => {
    const session = await aiService.createSession()
    setSessions(prev => [session, ...prev])
    setCurrentSessionId(session.id || null)
    setMessages([])
    return session.id || ''
  }

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await aiService.deleteSession(id)
    setSessions(prev => prev.filter(s => s.id !== id))
    if (currentSessionId === id) {
      const remaining = sessions.filter(s => s.id !== id)
      setCurrentSessionId(remaining.length > 0 ? (remaining[0].id || null) : null)
    }
  }

  const handleSend = async (customPrompt?: string) => {
    const content = customPrompt || input.trim()
    if (!content || sending) return

    let sessionId = currentSessionId
    if (!sessionId) {
      sessionId = await createNewSession()
    }

    if (!sessionId) return

    const userMsg: Omit<AiChatMessage, 'id' | 'createdAt' | 'updatedAt'> = {
      sessionId,
      role: 'user',
      content,
      timestamp: Date.now(),
    }
    const savedUserMsg = await aiService.saveMessage(userMsg)
    setMessages(prev => [...prev, savedUserMsg])
    setInput('')
    setSending(true)
    setStreamingContent('')
    setStreamingHits([])

    try {
      let fullResponse = ''
      let hitsResult: RetrievalHit[] = []
      const result = await ragKnowledgeService.generateWithRAG(
        content,
        undefined,
        true,
        (chunk) => {
          fullResponse += chunk
          setStreamingContent(fullResponse)
        }
      )
      fullResponse = result.content
      hitsResult = result.hits
      setStreamingHits(hitsResult)

      const refDocsHits = hitsResult.length > 0
        ? `\n\n[参考资料：${hitsResult.map((_, i) => `[${i + 1}]`).join('')}]`
        : ''

      const aiMsg: Omit<AiChatMessage, 'id' | 'createdAt' | 'updatedAt'> = {
        sessionId,
        role: 'assistant',
        content: fullResponse + refDocsHits,
        referencedDocs: hitsResult.map(h => h.docTitle),
        timestamp: Date.now(),
      }
      const savedAiMsg = await aiService.saveMessage(aiMsg)
      setMessages(prev => [...prev, savedAiMsg])
      setStreamingHits([])
      loadSessions()
    } catch (err: any) {
      toast.error(err.message || 'AI响应失败，请检查API Key配置')
    } finally {
      setSending(false)
      setStreamingContent('')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('已复制到剪贴板')
  }

  const handleQuickPrompt = (prompt: string) => {
    handleSend(prompt)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-3 py-3 text-white flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            <div>
              <h2 className="text-sm font-semibold">AI安全写作助手</h2>
              <p className="text-[10px] opacity-80">BM25知识库检索 · 减少幻觉</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-white/80 hover:text-white hover:bg-white/10"
              onClick={() => navigate('/knowledge')}
              title="知识库管理"
            >
              <BookOpen className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-white/80 hover:text-white hover:bg-white/10"
              onClick={() => navigate('/settings')}
              title="AI设置"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-white/80 hover:text-white hover:bg-white/10"
              onClick={createNewSession}
              title="新对话"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {!configured && (
        <div className="bg-amber-50 border-b border-amber-100 px-3 py-2">
          <p className="text-[11px] text-amber-700 flex items-center gap-2">
            <Sparkles className="w-3 h-3" />
            请先在
            <button onClick={() => navigate('/settings')} className="underline font-medium">
              设置页面
            </button>
            配置DeepSeek API Key
          </p>
        </div>
      )}

      {sessions.length > 0 && (
        <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 flex-shrink-0">
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {sessions.slice(0, 10).map(s => (
              <button
                key={s.id}
                onClick={() => setCurrentSessionId(s.id || null)}
                className={`flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded text-[10px] max-w-[100px] group ${
                  currentSessionId === s.id
                    ? 'bg-primary text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                <span className="truncate">{s.title || '新对话'}</span>
                {s.id && (
                  <Trash2
                    className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 flex-shrink-0"
                    onClick={(e) => deleteSession(s.id!, e)}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {messages.length === 0 && !streamingContent ? (
          <div className="space-y-3">
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center mx-auto mb-3">
                <Bot className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-medium text-gray-800 mb-1">AI安全写作助手</h3>
              <p className="text-[11px] text-gray-500">基于本地安全知识库，帮您编写专项方案、技术交底、安全制度</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {QUICK_PROMPTS.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickPrompt(item.prompt)}
                  disabled={sending || !configured}
                  className="p-2.5 bg-white border border-gray-100 rounded-lg text-left hover:border-violet-200 hover:bg-violet-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="text-lg mb-1">{item.icon}</div>
                  <p className="text-[11px] font-medium text-gray-700 leading-tight">{item.label}</p>
                </button>
              ))}
            </div>

            <Card className="bg-slate-50 border-slate-100">
              <CardContent className="p-2.5">
                <div className="flex items-center gap-1.5 text-slate-600 mb-1.5">
                  <BookOpen className="w-3 h-3" />
                  <span className="text-[10px] font-medium">知识库状态</span>
                  <span className="ml-auto text-[10px] text-slate-500">{kbStats.docs}个文档 · {kbStats.chunks}个切片</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  内置10篇核心法规（安全生产法、建设工程安全管理条例、危大工程31号文、JGJ59/JGJ46/JGJ80/JGJ130等），支持导入您的专项方案、企业标准、地方规定。AI写作时会自动BM25检索最相关的条款作为参考，生成内容会标注[参考资料X]来源。
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2.5 ${
                    msg.role === 'user'
                      ? 'bg-primary text-white rounded-br-md'
                      : 'bg-white border border-gray-100 rounded-bl-md shadow-sm'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-1 mb-1.5 text-violet-600">
                      <FileText className="w-3 h-3" />
                      <span className="text-[10px] font-medium">AI生成</span>
                      {msg.referencedDocs && msg.referencedDocs.length > 0 && (
                        <span className="ml-1 flex items-center gap-0.5 text-[9px] text-violet-400">
                          <Quote className="w-2.5 h-2.5" />
                          {msg.referencedDocs.length}份资料
                        </span>
                      )}
                    </div>
                  )}
                  <div className={`text-xs whitespace-pre-wrap leading-relaxed ${
                    msg.role === 'user' ? 'text-white' : 'text-gray-700'
                  }`}>
                    {msg.content}
                  </div>
                  {msg.role === 'assistant' && msg.referencedDocs && msg.referencedDocs.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-[9px] text-gray-400 mb-1">📚 参考资料：</p>
                      <div className="space-y-0.5">
                        {msg.referencedDocs.map((doc, i) => (
                          <p key={i} className="text-[9px] text-violet-500 truncate">[{i + 1}] {doc}</p>
                        ))}
                      </div>
                    </div>
                  )}
                  {msg.role === 'assistant' && (
                    <button
                      onClick={() => copyToClipboard(msg.content)}
                      className="mt-2 flex items-center gap-1 text-[10px] text-gray-400 hover:text-violet-600 transition-colors"
                    >
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copied ? '已复制' : '复制内容'}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {streamingContent && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl px-3 py-2.5 bg-white border border-gray-100 rounded-bl-md shadow-sm">
                  <div className="flex items-center gap-1 mb-1.5 text-violet-600">
                    <Sparkles className="w-3 h-3 animate-pulse" />
                    <span className="text-[10px] font-medium">AI正在生成（基于知识库检索）...</span>
                  </div>
                  {streamingHits.length > 0 && (
                    <div className="mb-2 bg-violet-50 rounded p-1.5">
                      <p className="text-[9px] text-violet-500 mb-0.5">🔍 已检索到相关资料：</p>
                      {streamingHits.map((h, i) => (
                        <p key={i} className="text-[9px] text-violet-600 truncate">
                          [{i + 1}] {h.docTitle}
                        </p>
                      ))}
                    </div>
                  )}
                  <div className="text-xs whitespace-pre-wrap leading-relaxed text-gray-700">
                    {streamingContent}
                    <span className="inline-block w-1.5 h-3 bg-violet-400 animate-pulse ml-0.5" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="px-3 py-3 border-t border-gray-100 bg-white flex-shrink-0">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder={configured ? '输入您的问题或需求，如"帮我写临边防护安全交底"' : '请先配置API Key...'}
            disabled={sending || !configured}
            className="flex-1 h-9 text-xs"
          />
          <Button
            size="sm"
            className="h-9 px-3 gap-1"
            onClick={() => handleSend()}
            disabled={!input.trim() || sending || !configured}
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
