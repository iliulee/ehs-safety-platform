import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  base: './',
  server: {
    port: 8080,
    open: true,
    watch: {
      ignored: ['**/backup/**', '**/dist/**', '**/.git/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'exceljs': path.resolve(__dirname, 'node_modules/exceljs/dist/exceljs.min.js'),
      'jieba-wasm/pkg/web/jieba_rs_wasm_bg.wasm': path.resolve(
        __dirname,
        'node_modules/jieba-wasm/pkg/web/jieba_rs_wasm_bg.wasm',
      ),
    },
  },
  define: {
    'process.env': {},
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      external: [/^@node-rs\/jieba/],
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          dexie: ['dexie', 'dexie-react-hooks'],
          docx: ['docxtemplater', 'pizzip'],
          charts: ['chart.js', 'react-chartjs-2'],
          excel: ['exceljs'],
        },
      },
    },
  },
})
