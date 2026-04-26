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
            req.on('end', async () => {
              try {
                const data = JSON.parse(body)
                const { template, validation, response, preset } = data
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
                
                const writeTasks: Promise<void>[] = []
                
                // Helper to save a file to multiple locations
                const saveJson = (name: string, content: any, includeHistory = false) => {
                  if (!content) return
                  const json = JSON.stringify(content, null, 2)
                  writeTasks.push(fs.promises.writeFile(`./sample/${name}.json`, json))
                  writeTasks.push(fs.promises.writeFile(`./public/sample/${name}.json`, json))
                  if (includeHistory) {
                    writeTasks.push(fs.promises.writeFile(`./history/${name}-${timestamp}.json`, json))
                  }
                }

                // Ensure history dir exists asynchronously
                if (!fs.existsSync('./history')) {
                  await fs.promises.mkdir('./history', { recursive: true })
                }

                saveJson('template', template, true)
                saveJson('validation', validation, true)
                saveJson('response', response)
                saveJson('preset', preset)
                
                await Promise.all(writeTasks)
                
                res.statusCode = 200
                res.end(JSON.stringify({ status: 'ok' }))
              } catch (err) {
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
