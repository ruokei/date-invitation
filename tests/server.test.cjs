const test = require('node:test');
const assert = require('node:assert/strict');
const { createAppServer, normalizePlan } = require('../server.js');

const now = new Date('2026-10-01T00:00:00Z');
const png = Buffer.alloc(32);
Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex').copy(png);
png.writeUInt32BE(1200, 16);
png.writeUInt32BE(675, 20);

function plan() {
  return { date: '2026-10-10', setting: 'home', route: 'slow', activity: null, food: 'delivery', startTime: '12:00', endTime: '20:00' };
}

test('server reconstructs the plan through planner validation', () => {
  assert.equal(normalizePlan(plan()).date, '2026-10-10');
  assert.throws(() => normalizePlan({ ...plan(), date: '2026-10-03' }), /unknown date/i);
  assert.throws(() => normalizePlan({ ...plan(), route: 'tufting' }), /route/i);
  assert.throws(() => normalizePlan({ ...plan(), endTime: '11:00' }), /after start/i);
  assert.throws(() => normalizePlan({ ...plan(), setting: 'out', route: 'tufting', food: 'favorite' }), /staying in/i);
  assert.throws(() => normalizePlan({ ...plan(), food: 'eatout' }), /staying in/i);
});

test('sending requires configuration and cannot change the recipient', async (t) => {
  const app = createAppServer({ now: () => now });
  await new Promise((resolve) => app.listen(0, '127.0.0.1', resolve));
  t.after(() => app.close());
  const base = `http://127.0.0.1:${app.address().port}`;
  const status = await fetch(`${base}/api/status`).then((res) => res.json());
  assert.equal(status.available, false);
  const response = await fetch(`${base}/api/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: plan(), png: png.toString('base64'), to: 'someone@example.com' }) });
  assert.equal(response.status, 503);
});

test('sample designed email can be previewed without sending', async (t) => {
  const app = createAppServer({ now: () => now });
  await new Promise((resolve) => app.listen(0, '127.0.0.1', resolve));
  t.after(() => app.close());
  const response = await fetch(`http://127.0.0.1:${app.address().port}/preview/email`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/html/);
  const html = await response.text();
  assert.match(html, /Our little universe/);
  assert.match(html, /Saturday, October 10, 2026/);
  assert.match(html, /12:00 PM–8:00 PM MYT/);
  assert.match(html, /Staying in/);
});

test('configured server sends once with HTML, PNG, and calendar to the fixed recipient', async (t) => {
  const calls = [];
  const app = createAppServer({ apiKey: 'test-key', from: 'Invitation <dates@example.com>', now: () => now, fetchImpl: async (url, init) => {
    calls.push({ url, init });
    return { ok: true, json: async () => ({ id: 'email-1' }) };
  } });
  await new Promise((resolve) => app.listen(0, '127.0.0.1', resolve));
  t.after(() => app.close());
  const base = `http://127.0.0.1:${app.address().port}`;
  const send = () => fetch(`${base}/api/send`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify({ plan: plan(), png: png.toString('base64') }) });
  assert.equal((await send()).status, 200);
  assert.equal((await send()).status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.resend.com/emails');
  const payload = JSON.parse(calls[0].init.body);
  assert.deepEqual(payload.to, ['modquack@gmail.com']);
  assert.equal(payload.attachments.length, 2);
  assert.match(payload.html, /Staying in/);
  assert.match(payload.html, /tea and a breather/);
  assert.match(Buffer.from(payload.attachments[0].content, 'base64').toString().replace(/\r\n /g, ''), /tea and a breather/);
  assert.equal(calls[0].init.headers.Authorization, 'Bearer test-key');
});

test('a retry after restart uses the same provider request for its idempotency key', async (t) => {
  const requests = [];
  for (const instant of ['2026-10-05T00:00:00Z', '2026-10-06T00:00:00Z']) {
    const app = createAppServer({ apiKey: 'test-key', from: 'Invitation <dates@example.com>', now: () => new Date(instant), fetchImpl: async (_url, init) => {
      requests.push(init);
      return { ok: true, json: async () => ({ id: 'email-1' }) };
    } });
    await new Promise((resolve) => app.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${app.address().port}`;
    const response = await fetch(`${base}/api/send`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify({ plan: plan(), png: png.toString('base64') }) });
    assert.equal(response.status, 200);
    await new Promise((resolve) => app.close(resolve));
  }
  assert.equal(requests.length, 2);
  assert.equal(requests[0].headers['Idempotency-Key'], requests[1].headers['Idempotency-Key']);
  assert.equal(requests[0].body, requests[1].body);
});

test('provider connection failures return a useful error and allow a retry', async (t) => {
  let calls = 0;
  const app = createAppServer({ apiKey: 'test-key', from: 'Invitation <dates@example.com>', now: () => now, fetchImpl: async () => {
    calls++;
    if (calls === 1) throw new Error('network unavailable');
    return { ok: true, json: async () => ({ id: 'email-2' }) };
  } });
  await new Promise((resolve) => app.listen(0, '127.0.0.1', resolve));
  t.after(() => app.close());
  const base = `http://127.0.0.1:${app.address().port}`;
  const send = () => fetch(`${base}/api/send`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify({ plan: plan(), png: png.toString('base64') }) });
  const first = await send();
  assert.equal(first.status, 502);
  assert.match((await first.json()).error, /provider/i);
  assert.equal((await send()).status, 200);
  assert.equal(calls, 2);
});
