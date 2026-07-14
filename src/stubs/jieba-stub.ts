// Stub for @node-rs/jieba to prevent Vite dev from resolving its browser entry
// which depends on @node-rs/jieba-wasm32-wasi (wasm32-only, not installable on x64)
// The real @node-rs/jieba is loaded in Electron main process via dynamic import.

export function cut(_text: string, _hmm?: boolean): string[] {
  return []
}

export function cutForSearch(_text: string, _hmm?: boolean): string[] {
  return []
}

export function tag(_text: string, _hmm?: boolean): Array<[string, string]> {
  return []
}

export function tfidf(_text: string, _topN?: number): Array<[string, number]> {
  return []
}

export function extract(_text: string, _topN?: number): Array<[string, number]> {
  return []
}

export function load(): void {}
