import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

function supabaseProxyPlugin() {
  return {
    name: 'supabase-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/api/supabase')) {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', '*')
          res.setHeader('Access-Control-Expose-Headers', '*')

          if (req.method === 'OPTIONS') {
            res.statusCode = 204
            res.end()
            return
          }

          const targetUrl = 'https://jtshtmhjplhapdwnulbk.supabase.co' + req.url.replace('/api/supabase', '')
          try {
            const headers = {}
            for (const [k, v] of Object.entries(req.headers)) {
              if (k.toLowerCase() === 'host') continue
              headers[k] = v
            }

            let body = undefined
            if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
              body = await new Promise((resolve) => {
                const chunks = []
                req.on('data', chunk => chunks.push(chunk))
                req.on('end', () => resolve(Buffer.concat(chunks)))
              })
              if (body.length === 0) body = undefined
            }

            const response = await fetch(targetUrl, {
              method: req.method,
              headers,
              body
            })

            res.statusCode = response.status
            response.headers.forEach((val, key) => {
              const lk = key.toLowerCase()
              // Node fetch already decompresses gzipped body, so omit content-encoding and content-length
              if (lk !== 'transfer-encoding' && lk !== 'content-encoding' && lk !== 'content-length' && !lk.startsWith('access-control-')) {
                res.setHeader(key, val)
              }
            })
            const buffer = Buffer.from(await response.arrayBuffer())
            res.end(buffer)
          } catch (err) {
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: err.message }))
          }
        } else {
          next()
        }
      })
    }
  }
}

export default defineConfig({
  // GitHub Pages 项目站：https://tkobe129-create.github.io/quandun-reagent123/
  base: '/quandun-reagent123/',
  plugins: [vue(), supabaseProxyPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173
  }
})
