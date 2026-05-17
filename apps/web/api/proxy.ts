import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  // Extract the path and query after /api/proxy
  // Example: /api/proxy/designer/api/template?foo=bar -> /designer/api/template?foo=bar
  const rawUrl = request.url ?? '';
  const withoutPrefix = rawUrl.replace(/^\/api\/proxy/, '');
  const targetUrl = `https://fasih-survey.bps.go.id${withoutPrefix}`;

  const token = request.headers.authorization;

  try {
    console.log(`Proxying request to: ${targetUrl}`);
    const remoteRes = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Authorization': token || '',
        'Accept': '*/*',
        'User-Agent': request.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://fasih-survey.bps.go.id/',
        'Origin': 'https://fasih-survey.bps.go.id/'
      },
    });

    const contentType = remoteRes.headers.get('content-type') ?? '';
    const status = remoteRes.status;

    if (contentType.includes('application/json')) {
      const data = await remoteRes.json();
      return response.status(status).json(data);
    } else if (
      contentType.includes('application/zip') ||
      contentType.includes('application/octet-stream') ||
      contentType.includes('application/x-zip')
    ) {
      // Binary response (e.g., zip file download)
      const buffer = Buffer.from(await remoteRes.arrayBuffer());
      response.setHeader('Content-Type', contentType);
      response.setHeader('Content-Length', buffer.length);
      return response.status(status).send(buffer);
    } else {
      const text = await remoteRes.text();
      response.setHeader('Content-Type', contentType || 'text/plain');
      return response.status(status).send(text);
    }
  } catch (error: any) {
    return response.status(500).json({ error: error.message });
  }
}
