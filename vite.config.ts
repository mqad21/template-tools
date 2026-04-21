import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'save-json',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.method === 'POST' && req.url === '/api/save') {
            let body = ''
            req.on('data', chunk => { body += chunk })
            req.on('end', () => {
              try {
                const { template, validation } = JSON.parse(body)
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
                
                // Save to sample
                fs.writeFileSync('./sample/template.json', JSON.stringify(template, null, 2))
                fs.writeFileSync('./sample/validation.json', JSON.stringify(validation, null, 2))
                
                // Save to history
                if (!fs.existsSync('./history')) fs.mkdirSync('./history')
                fs.writeFileSync(`./history/template-${timestamp}.json`, JSON.stringify(template, null, 2))
                fs.writeFileSync(`./history/validation-${timestamp}.json`, JSON.stringify(validation, null, 2))
                
                res.statusCode = 200
                res.end(JSON.stringify({ status: 'ok' }))
              } catch (err) {
                res.statusCode = 500
                res.end(JSON.stringify({ error: err.message }))
              }
            })
          } else {
            next()
          }
        })
      }
    }
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
