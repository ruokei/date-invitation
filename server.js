'use strict';
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const P = require('./planner.js');
const E = require('./email.js');

const publicFiles = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/planner.js', ['planner.js', 'application/javascript; charset=utf-8']],
  ['/email.js', ['email.js', 'application/javascript; charset=utf-8']],
  ['/artwork.js', ['artwork.js', 'application/javascript; charset=utf-8']],
  ['/app.js', ['app.js', 'application/javascript; charset=utf-8']],
]);

function normalizePlan(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Choose a complete plan');
  let plan = P.selectDate(P.createPlan(), input.date);
  if (input.setting !== 'home' || input.food !== 'delivery') throw new Error('This invitation is for staying in this week');
  plan = P.selectSetting(plan, input.setting);
  plan = P.selectRoute(plan, input.route);
  if (plan.route === 'explore') plan = P.selectActivity(plan, input.activity);
  plan = P.selectFood(plan, input.food);
  plan = P.selectTime(plan, input.startTime, input.endTime);
  if (!P.isComplete(plan)) throw new Error('Choose a complete plan');
  return plan;
}

function validPng(value) {
  if (typeof value !== 'string' || value.length > 1_000_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return false;
  const bytes = Buffer.from(value, 'base64');
  return bytes.length >= 24 && bytes.length <= 750_000 && bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) && bytes.readUInt32BE(16) === 1200 && bytes.readUInt32BE(20) === 675;
}

function samplePlan() {
  let plan = P.selectDate(P.createPlan(), '2026-10-10');
  plan = P.selectSetting(plan, 'home');
  plan = P.selectRoute(plan, 'slow');
  plan = P.selectFood(plan, 'delivery');
  return P.selectTime(plan, '12:00', '20:00');
}

function sendJson(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
}

async function readJson(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 1_050_000) throw new Error('Invitation image is too large');
  }
  return JSON.parse(body);
}

function createAppServer(options = {}) {
  const apiKey = options.apiKey ?? process.env.RESEND_API_KEY;
  const from = options.from ?? process.env.MAIL_FROM;
  const now = options.now ?? (() => new Date());
  const fetchImpl = options.fetchImpl ?? fetch;
  const sent = new Map();
  const attempts = new Map();

  return http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (req.method === 'GET' && url.pathname === '/api/status') return sendJson(res, 200, { available: Boolean(apiKey && from) });
    if (req.method === 'GET' && url.pathname === '/preview/email') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(E.buildEmailHtml(samplePlan()));
    }

    if (req.method === 'POST' && url.pathname === '/api/send') {
      if (!apiKey || !from) return sendJson(res, 503, { error: 'Email sending is not configured here. Use the email app or downloads below.' });
      const origin = req.headers.origin;
      if (origin) {
        try {
          if (new URL(origin).host !== req.headers.host) return sendJson(res, 403, { error: 'Open this page directly to send the invitation.' });
        } catch { return sendJson(res, 403, { error: 'Open this page directly to send the invitation.' }); }
      }
      if (req.headers['sec-fetch-site'] === 'cross-site') return sendJson(res, 403, { error: 'Open this page directly to send the invitation.' });
      if (!String(req.headers['content-type'] || '').startsWith('application/json')) return sendJson(res, 415, { error: 'Expected invitation details in JSON.' });
      try {
        const input = await readJson(req);
        const plan = normalizePlan(input.plan);
        if (!validPng(input.png)) throw new Error('Save a fresh invitation image before sending');
        P.buildCalendar(plan, now());
        const key = crypto.createHash('sha256').update(JSON.stringify(plan)).digest('hex');
        if (sent.has(key)) {
          const result = await sent.get(key);
          return sendJson(res, 200, { sent: true, duplicate: true, id: result.id });
        }
        const address = req.socket.remoteAddress || 'unknown';
        const recent = (attempts.get(address) || []).filter((stamp) => Date.now() - stamp < 3_600_000);
        if (recent.length >= 5) return sendJson(res, 429, { error: 'Too many invitations were sent recently. Please try again later.' });
        attempts.set(address, [...recent, Date.now()]);
        const request = (async () => {
          // A retry must reproduce the exact request body for Resend's idempotency key.
          // The current clock was already used above to reject expired invitations.
          const payload = E.buildProviderPayload(plan, input.png, new Date('2026-10-01T00:00:00Z'));
          let response;
          try {
            response = await fetchImpl('https://api.resend.com/emails', {
              method: 'POST',
              headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `invitation-${key}` },
              body: JSON.stringify({ from, ...payload }),
              signal: AbortSignal.timeout(12_000),
            });
          } catch { throw new Error('The email provider is unavailable. Try again or use an email draft.'); }
          if (!response.ok) throw new Error('The email provider did not accept the invitation');
          let result;
          try { result = await response.json(); }
          catch { throw new Error('The email provider returned an invalid response'); }
          if (!result.id) throw new Error('The email provider did not return a message ID');
          return result;
        })();
        sent.set(key, request);
        try {
          const result = await request;
          return sendJson(res, 200, { sent: true, id: result.id });
        } catch (error) {
          sent.delete(key);
          throw error;
        }
      } catch (error) {
        const message = error instanceof SyntaxError ? 'Invalid invitation details' : error.message;
        const providerFailure = /provider/.test(message);
        return sendJson(res, providerFailure ? 502 : 400, { error: message });
      }
    }

    if (req.method === 'GET' && publicFiles.has(url.pathname)) {
      const [filename, contentType] = publicFiles.get(url.pathname);
      try {
        const content = await fs.readFile(path.join(__dirname, filename));
        res.writeHead(200, { 'Content-Type': contentType });
        return res.end(content);
      } catch { return sendJson(res, 500, { error: 'Page could not be loaded' }); }
    }
    return sendJson(res, 404, { error: 'Not found' });
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 8767);
  const host = process.env.HOST || '127.0.0.1';
  createAppServer().listen(port, host, () => process.stdout.write(`Midnight Observatory: http://${host}:${port}\n`));
}

module.exports = { createAppServer, normalizePlan };
