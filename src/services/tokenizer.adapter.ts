import type { Jieba } from '@node-rs/jieba'

// @ts-ignore - Vite 资源导入，无对应类型声明
import wasmUrl from '../../node_modules/jieba-wasm/pkg/web/jieba_rs_wasm_bg.wasm?url'

type CutFn = (text: string, hmm?: boolean | null) => string[]

let nodeJieba: Jieba | null = null
let wasmCut: CutFn | null = null
let initPromise: Promise<void> | null = null
let initError: Error | null = null

async function doInit(): Promise<void> {
  try {
    const jiebaMod = await import(/* @vite-ignore */ '@node-rs/jieba') as typeof import('@node-rs/jieba')
    const { dict } = await import(/* @vite-ignore */ '@node-rs/jieba/dict') as { dict: Uint8Array }
    nodeJieba = jiebaMod.Jieba.withDict(dict)
    return
  } catch {
    // 浏览器 / Electron 渲染进程无原生绑定，继续 fallback
  }

  try {
    const wasm = await import('jieba-wasm')
    await wasm.default(wasmUrl)
    wasmCut = wasm.cut as CutFn
  } catch (err) {
    initError = err instanceof Error ? err : new Error(String(err))
    console.warn('分词器初始化失败，将使用兜底分词规则：', initError.message)
  }
}

export function ensureTokenizer(): Promise<void> {
  if (initPromise) return initPromise
  initPromise = doInit()
  return initPromise
}

function normalizeTokens(tokens: string[]): string[] {
  return tokens
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
}

function simpleFallback(text: string): string[] {
  const cleaned = text
    .toLowerCase()
    .replace(/[^\u4e00-\u9fa5a-z0-9]/g, ' ')
  return cleaned.split(/\s+/).filter((t) => t.length > 0)
}

export function tokenize(text: string): string[] {
  if (!text) return []

  if (nodeJieba) {
    return normalizeTokens(nodeJieba.cut(text, false))
  }

  if (wasmCut) {
    return normalizeTokens(wasmCut(text, false))
  }

  return simpleFallback(text)
}

void ensureTokenizer()
