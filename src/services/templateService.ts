import { db, generateId, now } from '@/db'
import type { Template } from '@/types'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'

function addCleanVar(raw: string, vars: Set<string>): void {
  const name = raw.trim().replace(/^[#/%]/, '').split('|')[0].trim()
  if (!name) return
  if (name.includes(' ') || name.includes('/')) return
  if (/^\d+$/.test(name)) return
  if (/^[a-z]+:/i.test(name)) return
  vars.add(name)
}

export const templateService = {
  async list(): Promise<Template[]> {
    return db.templates.orderBy('createdAt').reverse().toArray()
  },

  async get(id: string): Promise<Template | undefined> {
    return db.templates.get(id)
  },

  async save(template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<string> {
    const id = template.id ?? generateId()
    const ts = now()
    const record: Template = {
      ...template,
      id,
      createdAt: ts,
      updatedAt: ts,
    } as Template
    await db.templates.put(record)
    return id
  },

  async remove(id: string): Promise<void> {
    await db.templates.delete(id)
  },

  /**
   * 从 .docx 文件中提取变量名（形如 {project_name}）
   */
  async extractVariables(file: File | ArrayBuffer): Promise<string[]> {
    const buf = file instanceof File ? await file.arrayBuffer() : file
    const zip = new PizZip(buf)
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    } as Record<string, unknown>)

    // docxtemplater 内部 compiled 对象包含所有标签
    const compiled = (doc as unknown as { compiled: Record<string, { tag?: string }> }).compiled
    const vars = new Set<string>()
    const walk = (obj: unknown) => {
      if (!obj || typeof obj !== 'object') return
      if (Array.isArray(obj)) {
        obj.forEach(walk)
        return
      }
      const record = obj as Record<string, unknown>
      if (record.tag && typeof record.tag === 'string') {
        addCleanVar(record.tag, vars)
      }
      Object.values(record).forEach(walk)
    }
    walk(compiled)

    // 兜底：用正则从 document.xml 中提取
    const xml = zip.files['word/document.xml']?.asText() ?? ''
    const regex = /\{([^}]+)\}/g
    let match: RegExpExecArray | null
    while ((match = regex.exec(xml)) !== null) {
      addCleanVar(match[1], vars)
    }

    return Array.from(vars)
  },

  /**
   * 读取文件为 base64
   */
  async fileToBase64(file: File): Promise<string> {
    const buf = await file.arrayBuffer()
    const bytes = new Uint8Array(buf)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  },

  /**
   * base64 转 ArrayBuffer
   */
  base64ToBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
  },

  /**
   * 使用模板和变量生成新的 docx 文件（浏览器下载）
   */
  async generateDocx(templateId: string, variables: Record<string, string>): Promise<Blob> {
    const template = await this.get(templateId)
    if (!template || !template.content) {
      throw new Error('模板不存在或没有文件内容')
    }

    const buf = this.base64ToBuffer(template.content)
    const zip = new PizZip(buf)
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    } as Record<string, unknown>)

    doc.setData(variables)
    doc.render()

    const out = doc.getZip().generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    } as Record<string, unknown>)

    return out as unknown as Blob
  },
}
