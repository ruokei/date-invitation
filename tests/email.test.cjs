const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../planner.js');
const { buildEmailDraft, buildEmailHtml } = require('../email.js');

function planForEmail() {
  let plan = P.selectSetting(P.selectDate(P.createPlan(), '2026-10-03'), 'out');
  plan = P.selectRoute(plan, 'explore');
  plan = P.selectActivity(plan, 'Tea <friends> & cakes');
  plan = P.selectFood(plan, 'new');
  return P.selectTime(plan, '12:00', '20:00');
}

function decodePart(message, type) {
  const start = message.indexOf(`Content-Type: ${type}`);
  assert.notEqual(start, -1, `${type} part exists`);
  const bodyStart = message.indexOf('\r\n\r\n', start) + 4;
  const bodyEnd = message.indexOf('\r\n--date-railway-', bodyStart);
  return Buffer.from(message.slice(bodyStart, bodyEnd).replace(/\r\n/g, ''), 'base64').toString('utf8');
}

test('the email ticket escapes visitor text and displays the chosen time', () => {
  const html = buildEmailHtml(planForEmail());
  assert.match(html, /Saturday, October 3, 2026/);
  assert.match(html, /12:00 PM–8:00 PM MYT/);
  assert.match(html, /Tea &lt;friends&gt; &amp; cakes/);
  assert.doesNotMatch(html, /Tea <friends>/);
});

test('email draft addresses the recipient and attaches a timed calendar event', () => {
  const message = buildEmailDraft(planForEmail(), new Date('2026-09-30T12:00:00Z'));
  assert.match(message, /^To: modquack@gmail\.com\r\n/m);
  assert.match(message, /^X-Unsent: 1\r\n/m);
  assert.match(message, /Content-Disposition: attachment; filename="our-date-2026-10-03\.ics"/);
  const html = decodePart(message, 'text/html');
  const calendar = decodePart(message, 'text/calendar');
  assert.match(html, /Tea &lt;friends&gt; &amp; cakes/);
  assert.match(calendar, /DTSTART:20261003T040000Z\r\n/);
  assert.match(calendar, /DTEND:20261003T120000Z\r\n/);
});
