// 占位模块：jieba-wasm 未安装时的回退
const stub: any = {
  default: async () => {},
  cut: (text: string) => text.split(/\s+/),
}
export default stub.default
export const cut = stub.cut