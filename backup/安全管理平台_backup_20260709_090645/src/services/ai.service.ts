import { db, generateId, now } from '@/db'
import type { AiChatMessage, AiSession } from '@/types'

const DEEPSEEK_API_BASE = 'https://api.deepseek.com'
const DEFAULT_MODEL = 'deepseek-chat'

export interface AiSettings {
  apiKey: string
  baseUrl: string
  model: string
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ExtractedProjectInfo {
  name?: string
  code?: string
  location?: string
  startDate?: string
  endDate?: string
  contractor?: string
  supervisor?: string
  owner?: string
  managerName?: string
  techDirector?: string
  safetyOfficer?: string
  safetyOfficerPhone?: string
  description?: string
}

class AiService {
  private async getSettings(): Promise<AiSettings> {
    const apiKey = await db.settings.get('ai_api_key')
    const baseUrl = await db.settings.get('ai_base_url')
    const model = await db.settings.get('ai_model')
    return {
      apiKey: apiKey?.value || '',
      baseUrl: baseUrl?.value || DEEPSEEK_API_BASE,
      model: model?.value || DEFAULT_MODEL,
    }
  }

  async saveSettings(settings: Partial<AiSettings>): Promise<void> {
    if (settings.apiKey !== undefined) {
      await db.settings.put({ key: 'ai_api_key', value: settings.apiKey, updatedAt: now() })
    }
    if (settings.baseUrl !== undefined) {
      await db.settings.put({ key: 'ai_base_url', value: settings.baseUrl, updatedAt: now() })
    }
    if (settings.model !== undefined) {
      await db.settings.put({ key: 'ai_model', value: settings.model, updatedAt: now() })
    }
  }

  async isConfigured(): Promise<boolean> {
    const settings = await this.getSettings()
    return !!settings.apiKey
  }

  async chat(messages: ChatMessage[], stream = false, onChunk?: (chunk: string) => void): Promise<string> {
    const settings = await this.getSettings()
    if (!settings.apiKey) {
      throw new Error('请先在设置中配置DeepSeek API Key')
    }

    const response = await fetch(`${settings.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model,
        messages,
        stream,
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API请求失败: ${response.status} ${errorText}`)
    }

    if (stream && response.body) {
      return this.handleStreamResponse(response.body, onChunk)
    } else {
      const data = await response.json()
      return data.choices[0]?.message?.content || ''
    }
  }

  private async handleStreamResponse(
    body: ReadableStream<Uint8Array>,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    const reader = body.getReader()
    const decoder = new TextDecoder()
    let fullContent = ''
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue
        const data = trimmed.slice(6)
        if (data === '[DONE]') continue

        try {
          const parsed = JSON.parse(data)
          const chunk = parsed.choices[0]?.delta?.content || ''
          if (chunk) {
            fullContent += chunk
            onChunk?.(chunk)
          }
        } catch {
          // ignore parse errors
        }
      }
    }

    return fullContent
  }

  async extractProjectInfo(text: string): Promise<ExtractedProjectInfo> {
    const systemPrompt = `你是一个建筑工程信息提取专家。请从用户提供的文本（可能是施工组织设计、项目立项文件、合同等）中提取项目关键信息。
请严格按照以下JSON格式返回，只返回JSON，不要有其他文字：
{
  "name": "项目名称",
  "code": "项目编号（如有）",
  "location": "项目地点",
  "startDate": "开工日期（YYYY-MM-DD格式，如不确定则留空）",
  "endDate": "竣工日期（YYYY-MM-DD格式，如不确定则留空）",
  "contractor": "施工单位",
  "supervisor": "监理单位",
  "owner": "建设单位/业主",
  "managerName": "项目经理姓名",
  "techDirector": "技术负责人姓名",
  "safetyOfficer": "安全员姓名",
  "safetyOfficerPhone": "安全员电话",
  "description": "项目简介（100字以内）"
}
如果某个字段在文本中找不到，对应值设为空字符串，不要编造信息。`

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text },
    ]

    const response = await this.chat(messages)
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      const jsonStr = jsonMatch ? jsonMatch[0] : response
      return JSON.parse(jsonStr)
    } catch {
      return {}
    }
  }

  async extractProjectInfoFromFile(file: File): Promise<ExtractedProjectInfo> {
    let text = ''

    if (file.name.endsWith('.docx')) {
      const arrayBuffer = await file.arrayBuffer()
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ arrayBuffer })
      text = result.value
    } else if (file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      text = await file.text()
    } else if (file.name.endsWith('.pdf')) {
      const arrayBuffer = await file.arrayBuffer()
      const pdfjs = await import('pdfjs-dist')
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise
      const pages: string[] = []
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        pages.push(content.items.map((item: any) => item.str).join(' '))
      }
      text = pages.join('\n')
    } else {
      text = await file.text()
    }

    if (!text.trim()) {
      throw new Error('未能从文件中提取到文本内容')
    }

    return this.extractProjectInfo(text.slice(0, 8000))
  }

  async createSession(title: string = '新对话'): Promise<AiSession> {
    const session: AiSession = {
      id: generateId(),
      title,
      createdAt: now(),
      updatedAt: now(),
    }
    await db.aiSessions.put(session)
    return session
  }

  async listSessions(): Promise<AiSession[]> {
    return db.aiSessions.orderBy('lastMessageAt').reverse().toArray()
  }

  async getSessionMessages(sessionId: string): Promise<AiChatMessage[]> {
    return db.aiChatMessages.where('sessionId').equals(sessionId).sortBy('timestamp')
  }

  async saveMessage(message: Omit<AiChatMessage, 'id' | 'createdAt' | 'updatedAt'>): Promise<AiChatMessage> {
    const msg: AiChatMessage = {
      ...message,
      id: generateId(),
      timestamp: message.timestamp || now(),
      createdAt: now(),
      updatedAt: now(),
    }
    await db.aiChatMessages.put(msg)

    if (message.role === 'assistant' || message.role === 'user') {
      await db.aiSessions.update(message.sessionId, {
        lastMessage: message.content.slice(0, 100),
        lastMessageAt: now(),
        updatedAt: now(),
      })
    }

    return msg
  }

  async deleteSession(sessionId: string): Promise<void> {
    await db.aiSessions.delete(sessionId)
    await db.aiChatMessages.where('sessionId').equals(sessionId).delete()
  }
}

export const aiService = new AiService()
