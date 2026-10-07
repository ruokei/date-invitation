import '../planner.js';
import '../email.js';
import '../invitation-api.js';

const P = globalThis.DateRailwayPlanner;
const E = globalThis.MidnightEmail;
const { normalizePlan, validPng } = globalThis.MidnightInvitationApi;
const MAX_BODY_BYTES = 1_050_000;
const FIXED_CALENDAR_STAMP = new Date('2026-10-01T00:00:00Z');

function response(origin, value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Access-Control-Allow-Origin': origin,
      'Vary': 'Origin',
    },
  });
}

async function requestJson(request) {
  const claimedLength = Number(request.headers.get('Content-Length') || 0);
  if (claimedLength > MAX_BODY_BYTES) throw new Error('Invitation image is too large');
  const body = await request.text();
  if (new TextEncoder().encode(body).length > MAX_BODY_BYTES) throw new Error('Invitation image is too large');
  return JSON.parse(body);
}

async function requestKey(plan, email) {
  const data = new TextEncoder().encode(JSON.stringify({ plan, email }));
  const digest = await crypto.subtle.digest('SHA-256', data);
  return `invitation-${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    if (!env.SITE_ORIGIN || origin !== env.SITE_ORIGIN) return new Response('Forbidden', { status: 403 });
    const pathname = new URL(request.url).pathname;

    if (request.method === 'OPTIONS' && ['/api/status', '/api/send'].includes(pathname)) {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '600',
          'Vary': 'Origin',
        },
      });
    }

    const configured = Boolean(env.RESEND_API_KEY && env.MAIL_FROM && env.SEND_RATE && env.GLOBAL_RATE);
    if (request.method === 'GET' && pathname === '/api/status') return response(origin, { available: configured });
    if (request.method !== 'POST' || pathname !== '/api/send') return response(origin, { error: 'Not found' }, 404);
    if (!configured) return response(origin, { error: 'Email sending is not configured here. Use the email app or downloads below.' }, 503);
    if (!String(request.headers.get('Content-Type') || '').startsWith('application/json')) return response(origin, { error: 'Expected invitation details in JSON.' }, 415);

    const clientAddress = request.headers.get('CF-Connecting-IP') || 'unknown';
    const [perVisitor, overall] = await Promise.all([
      env.SEND_RATE.limit({ key: clientAddress }),
      env.GLOBAL_RATE.limit({ key: 'all-invitations' }),
    ]);
    if (!perVisitor.success || !overall.success) return response(origin, { error: 'Too many invitations were requested recently. Please try again later.' }, 429);

    try {
      const input = await requestJson(request);
      if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid invitation details');
      const plan = normalizePlan(input.plan);
      const email = E.normalizeRecipient(input.email);
      if (!validPng(input.png)) throw new Error('Save a fresh invitation image before sending');
      P.buildCalendar(plan, new Date());

      const key = await requestKey(plan, email);
      const payload = E.buildProviderPayload(plan, input.png, FIXED_CALENDAR_STAMP, email);
      let sent;
      try {
        sent = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': key,
          },
          body: JSON.stringify({ from: env.MAIL_FROM, ...payload }),
          signal: AbortSignal.timeout(12_000),
        });
      } catch { return response(origin, { error: 'The email provider is unavailable. Try again or use an email draft.' }, 502); }
      if (!sent.ok) return response(origin, { error: 'Resend did not accept the invitation. Check the API key and verified sender address.' }, 502);
      let result;
      try { result = await sent.json(); }
      catch { return response(origin, { error: 'Resend returned an invalid response.' }, 502); }
      if (!result.id) return response(origin, { error: 'Resend did not return a message ID.' }, 502);
      return response(origin, { sent: true, id: result.id });
    } catch (error) {
      const message = error instanceof SyntaxError ? 'Invalid invitation details' : error.message;
      return response(origin, { error: message }, 400);
    }
  },
};
