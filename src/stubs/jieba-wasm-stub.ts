// Stub for @node-rs/jieba-wasm32-wasi to prevent esbuild from failing during Vite dev
// The real WASM module is not installable on x64 platforms.
export function cut(): string[] { return [] }
export function cutForSearch(): string[] { return [] }
export function tag(): Array<[string, string]> { return [] }
export function tfidf(): Array<[string, number]> { return [] }
export function extract(): Array<[string, number]> { return [] }
export function load(): void {}
