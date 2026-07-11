import PizZip from 'pizzip'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

function stripXmlTags(xml: string): string {
  return xml
    .replace(/<w:p[^>]*>/g, '\n')
    .replace(/<w:tab[^>]*\/>/g, '\t')
    .replace(/<w:br[^>]*\/>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

async function extractDocxText(file: File): Promise<string> {
  const buf = await file.arrayBuffer()
  const zip = new PizZip(buf)
  const documentXml = zip.files['word/document.xml']
  if (!documentXml) throw new Error('无效的docx文件：缺少document.xml')
  const xml = documentXml.asText()

  let text = stripXmlTags(xml)

  const headerFiles = Object.keys(zip.files).filter((k) =>
    k.startsWith('word/header') && k.endsWith('.xml'),
  )
  for (const hf of headerFiles) {
    const hXml = zip.files[hf].asText()
    text += '\n' + stripXmlTags(hXml)
  }

  text = text
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join('\n')

  return text
}

async function extractPdfText(file: File): Promise<string> {
  const buf = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise
  let text = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item: any) => item.str)
      .join(' ')
      .replace(/\s+/g, ' ')
    text += pageText + '\n\n'
  }
  return text.trim()
}

async function extractPlainText(file: File): Promise<string> {
  const text = await file.text()
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
}

export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.docx')) {
    return extractDocxText(file)
  }
  if (name.endsWith('.pdf')) {
    return extractPdfText(file)
  }
  if (name.endsWith('.txt') || name.endsWith('.md')) {
    return extractPlainText(file)
  }
  throw new Error(`不支持的文件格式：${file.name}，仅支持 .docx/.pdf/.txt/.md`)
}
