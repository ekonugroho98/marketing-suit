// Shared CORS configuration for Edge Functions
// Reads allowed origins from ALLOWED_ORIGINS env var (comma-separated)
// Falls back to '*' in development

const allowedOriginsRaw = Deno.env.get('ALLOWED_ORIGINS') || '*';
const allowedOrigins = allowedOriginsRaw === '*'
  ? ['*']
  : allowedOriginsRaw.split(',').map(o => o.trim());

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '';

  // If wildcard is allowed (dev mode), allow all
  if (allowedOrigins.includes('*')) {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    };
  }

  // Check if origin is in allowed list
  const isAllowed = allowedOrigins.some(allowed => origin === allowed || origin.endsWith(allowed));

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Vary': 'Origin',
  };
}

export function handleCorsPreflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) });
  }
  return null;
}
