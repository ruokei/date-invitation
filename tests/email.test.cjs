const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../planner.js');
const { buildEmailDraft, buildEmailHtml, buildProviderPayload } = require('../email.js');

function planForEmail() {
  let plan = P.selectSetting(P.selectDate(P.createPlan(), '2026-10-10'), 'out');
  plan = P.selectRoute(plan, 'explore');
  plan = P.selectActivity(plan, 'Tea <friends> & cakes');
  plan = P.selectFood(plan, 'new');
  return P.selectTime(plan, '12:00', '20:00');
}

function decodePart(message, type) {
  const start = message.indexOf(`Content-Type: ${type}`);
  assert.notEqual(start, -1, `${type} part exists`);
  const bodyStart = message.indexOf('\r\n\r\n', start) + 4;
  const bodyEnd = message.indexOf('\r\n--observatory-', bodyStart);
  return Buffer.from(message.slice(bodyStart, bodyEnd).replace(/\r\n/g, ''), 'base64').toString('utf8');
}

test('the email ticket escapes visitor text and displays the chosen time', () => {
  const html = buildEmailHtml(planForEmail());
  assert.match(html, /Saturday, October 10, 2026/);
  assert.match(html, /12:00 PM–8:00 PM MYT/);
  assert.match(html, /Tea &lt;friends&gt; &amp; cakes/);
  assert.doesNotMatch(html, /Tea <friends>/);
  assert.match(html, /Our little universe/);
  assert.match(html, /max-width:600px/);
});

test('email draft addresses the recipient and attaches a timed calendar event', () => {
  const message = buildEmailDraft(planForEmail(), new Date('2026-09-30T12:00:00Z'));
  assert.match(message, /^To: modquack@gmail\.com\r\n/m);
  assert.match(message, /^X-Unsent: 1\r\n/m);
  assert.match(message, /Content-Disposition: attachment; filename="our-date-2026-10-10\.ics"/);
  const html = decodePart(message, 'text/html');
  const calendar = decodePart(message, 'text/calendar');
  assert.match(html, /Tea &lt;friends&gt; &amp; cakes/);
  assert.match(calendar, /DTSTART:20261010T040000Z\r\n/);
  assert.match(calendar, /DTEND:20261010T120000Z\r\n/);
});

test('provider email has a fixed recipient, matching calendar, and PNG artwork', () => {
  const payload = buildProviderPayload(planForEmail(), 'aGVsbG8=', new Date('2026-09-30T12:00:00Z'));
  assert.deepEqual(payload.to, ['modquack@gmail.com']);
  assert.match(payload.subject, /October 10, 2026/);
  assert.match(payload.html, /Saturday, October 10, 2026/);
  assert.match(payload.text, /12:00 PM–8:00 PM MYT/);
  assert.doesNotMatch(payload.text, /attach(?:ed|ment)/i, 'plain text also appears in mailto drafts that cannot add attachments');
  assert.deepEqual(payload.attachments.map(({ filename }) => filename), ['our-date-2026-10-10.ics', 'our-little-universe-2026-10-10.png']);
  assert.match(Buffer.from(payload.attachments[0].content, 'base64').toString(), /DTSTART:20261010T040000Z/);
});
