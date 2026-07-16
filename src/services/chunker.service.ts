import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 400,
  chunkOverlap: 80,
  separators: [
    '\n\n',
    '\n',
    '。',
    '！',
    '？',
    '；',
    ' ',
    '',
  ],
})

export async function chunkText(text: string, docTitle?: string): Promise<string[]> {
  const cleaned = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  if (!cleaned) return []

  const chunks = await splitter.splitText(cleaned)

  if (docTitle) {
    return chunks.map((c, i) => {
      const prefix = i === 0 ? `《${docTitle}》：` : `《${docTitle}》（续）：`
      return prefix + c
    })
  }

  return chunks.filter((c) => c.length > 0)
}
