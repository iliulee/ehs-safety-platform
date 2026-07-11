const TARGET_CHUNK_SIZE = 400
const MAX_CHUNK_SIZE = 600
const MIN_CHUNK_SIZE = 80
const CHUNK_OVERLAP = 80

function splitByClauses(text: string): string[] {
  const parts: string[] = []
  const clausePattern = /(?:^|\n)\s*(第[一二三四五六七八九十百千万0-9]+[条章节部分])/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = clausePattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index).trim())
    }
    lastIndex = match.index
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex).trim())
  }

  const numPattern = /(?:^|\n)\s*(?:[0-9]+[.、)）]|\([0-9]+\)|（[0-9一二三四五六七八九十]+）)/g
  const fineParts: string[] = []
  for (const part of parts) {
    if (part.length <= MAX_CHUNK_SIZE) {
      fineParts.push(part)
      continue
    }
    let li = 0
    let m: RegExpExecArray | null
    while ((m = numPattern.exec(part)) !== null) {
      if (m.index > li) {
        fineParts.push(part.slice(li, m.index).trim())
      }
      li = m.index
    }
    if (li < part.length) {
      fineParts.push(part.slice(li).trim())
    }
  }

  return fineParts.filter((p) => p.length > MIN_CHUNK_SIZE / 2)
}

function splitLongSection(section: string): string[] {
  if (section.length <= MAX_CHUNK_SIZE) return [section]

  const sentences = section.split(/(?<=[。！？；;\n])/g)
  const chunks: string[] = []
  let current = ''

  for (const s of sentences) {
    if (current.length + s.length > TARGET_CHUNK_SIZE && current.length >= MIN_CHUNK_SIZE) {
      chunks.push(current.trim())
      current = ''
    }
    current += s
  }
  if (current.trim().length >= MIN_CHUNK_SIZE) {
    chunks.push(current.trim())
  } else if (current.trim().length > 0 && chunks.length > 0) {
    chunks[chunks.length - 1] += current.trim()
  }

  return chunks
}

function addOverlap(chunks: string[]): string[] {
  if (chunks.length <= 1) return chunks
  const result: string[] = []
  for (let i = 0; i < chunks.length; i++) {
    let chunk = chunks[i]
    if (i > 0) {
      const prev = chunks[i - 1]
      const overlap = prev.slice(-CHUNK_OVERLAP)
      if (!chunk.startsWith(overlap)) {
        chunk = overlap + '...' + chunk
      }
    }
    result.push(chunk)
  }
  return result
}

export function chunkText(text: string, docTitle?: string): string[] {
  const cleaned = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  if (!cleaned) return []

  const sections = splitByClauses(cleaned)
  let allChunks: string[] = []
  for (const section of sections) {
    const chunks = splitLongSection(section)
    allChunks.push(...chunks)
  }

  allChunks = addOverlap(allChunks)

  if (docTitle) {
    allChunks = allChunks.map((c, i) => {
      const prefix = i === 0 ? `《${docTitle}》：` : `《${docTitle}》（续）：`
      return prefix + c
    })
  }

  return allChunks.filter((c) => c.length > 0)
}
