import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  const rawUrl = request.url ?? '';
  const withoutPrefix = rawUrl.replace(/^\/api\/proxy-sm/, '');
  const targetUrl = `https://fasih-sm.bps.go.id${withoutPrefix}`;

  const token = request.headers.authorization;

  try {
    const remoteRes = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Authorization': token || '',
        'Accept': '*/*',
        'User-Agent': request.headers['user-agent'] || 'Mozilla/5.0',
        'Referer': 'https://fasih-sm.bps.go.id/',
        'Origin': 'https://fasih-sm.bps.go.id/'
      },
    });

    const contentType = remoteRes.headers.get('content-type') ?? '';
    const status = remoteRes.status;

    if (contentType.includes('application/json')) {
      const data = await remoteRes.json();
      return response.status(status).json(data);
    } else {
      const text = await remoteRes.text();
      response.setHeader('Content-Type', contentType || 'text/plain');
      return response.status(status).send(text);
    }
  } catch (error: any) {
    return response.status(500).json({ error: error.message });
  }
}
