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
                const { template, validation, response, preset } = JSON.parse(body)
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
                
                // Save to sample and public/sample
                if (template) {
                  fs.writeFileSync('./sample/template.json', JSON.stringify(template, null, 2))
                  fs.writeFileSync('./public/sample/template.json', JSON.stringify(template, null, 2))
                  if (!fs.existsSync('./history')) fs.mkdirSync('./history')
                  fs.writeFileSync(`./history/template-${timestamp}.json`, JSON.stringify(template, null, 2))
                }
                if (validation) {
                  fs.writeFileSync('./sample/validation.json', JSON.stringify(validation, null, 2))
                  fs.writeFileSync('./public/sample/validation.json', JSON.stringify(validation, null, 2))
                  if (!fs.existsSync('./history')) fs.mkdirSync('./history')
                  fs.writeFileSync(`./history/validation-${timestamp}.json`, JSON.stringify(validation, null, 2))
                }
                if (response) {
                  fs.writeFileSync('./sample/response.json', JSON.stringify(response, null, 2))
                  fs.writeFileSync('./public/sample/response.json', JSON.stringify(response, null, 2))
                }
                if (preset) {
                  fs.writeFileSync('./sample/preset.json', JSON.stringify(preset, null, 2))
                  fs.writeFileSync('./public/sample/preset.json', JSON.stringify(preset, null, 2))
                }
                
                res.statusCode = 200
                res.end(JSON.stringify({ status: 'ok' }))
              } catch (err) {
                res.statusCode = 500
                res.end(JSON.stringify({ error: err.message }))
              }
            })
          } else if (req.method === 'GET' && req.url.startsWith('/api/proxy')) {
            const url = new URL(req.url, `http://${req.headers.host}`).searchParams.get('url')
            if (!url) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Missing url parameter' }))
              return
            }

            const token = req.headers['authorization']
            
            fetch(url, {
              method: 'GET',
              headers: {
                'Authorization': token || '',
                'Accept': '*/*'
              }
            })
            .then(remoteRes => {
              res.statusCode = remoteRes.status
              return remoteRes.text()
            })
            .then(text => {
              try {
                // Try to parse as JSON to send a clean object
                const data = JSON.parse(text)
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify(data))
              } catch (e) {
                // If not JSON, just send the raw text (which might be the "blob" content)
                res.end(text)
              }
            })
            .catch(err => {
              res.statusCode = 500
              res.end(JSON.stringify({ error: err.message }))
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
