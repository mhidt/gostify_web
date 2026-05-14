import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import http from 'http'
import https from 'https'

function aiStreamProxy() {
  return {
    name: 'gostify-ai-stream-proxy',
    configureServer(server) {
      server.middlewares.use('/api/ai-proxy', (req, res) => {
        const requestUrl = new URL(req.url || '', 'http://localhost')
        const target = requestUrl.searchParams.get('url')

        if (!target) {
          res.statusCode = 400
          res.end('Missing url param')
          return
        }

        const parsedTarget = new URL(target)
        const client = parsedTarget.protocol === 'https:' ? https : http
        const headers = { ...req.headers }
        delete headers.host
        delete headers.origin
        delete headers.referer

        const proxyReq = client.request(
          {
            protocol: parsedTarget.protocol,
            hostname: parsedTarget.hostname,
            port: parsedTarget.port || (parsedTarget.protocol === 'https:' ? 443 : 80),
            path: parsedTarget.pathname + parsedTarget.search,
            method: req.method,
            headers,
          },
          (proxyRes) => {
            res.statusCode = proxyRes.statusCode || 500
            for (const [key, value] of Object.entries(proxyRes.headers)) {
              if (value !== undefined) res.setHeader(key, value)
            }
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.setHeader('X-Accel-Buffering', 'no')
            proxyRes.pipe(res)
          },
        )

        proxyReq.on('error', (error) => {
          if (!res.headersSent) res.statusCode = 502
          res.end(error.message)
        })

        req.pipe(proxyReq)
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), aiStreamProxy()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api/proxy': {
        target: 'https://corsproxy.io/',
        rewrite: (requestPath) => requestPath.replace(/^\/api\/proxy/, '/'),
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          docx: ['docx'],
          milkdown: ['@milkdown/core', '@milkdown/react'],
        },
      },
    },
  },
})
