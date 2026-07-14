/// <reference types="vite/client" />

// 让 TypeScript 识别 .docx 文件的 ?url import
declare module '*.docx?url' {
  const src: string
  export default src
}
