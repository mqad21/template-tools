import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  // Extract the path after /api/proxy
  // Example: /api/proxy/designer/api/template -> designer/api/template
  const path = request.url?.replace(/^\/api\/proxy/, '').split('?')[0];
  const targetUrl = `https://fasih-survey.bps.go.id${path}`;

  const token = request.headers.authorization;

  try {
    console.log(`Proxying request to: ${targetUrl}`);
    const remoteRes = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Authorization': token || '',
        'Accept': 'application/json',
      },
    });

    const contentType = remoteRes.headers.get('content-type');
    const status = remoteRes.status;

    if (contentType && contentType.includes('application/json')) {
      const data = await remoteRes.json();
      return response.status(status).json(data);
    } else {
      const text = await remoteRes.text();
      return response.status(status).send(text);
    }
  } catch (error: any) {
    return response.status(500).json({ error: error.message });
  }
}
