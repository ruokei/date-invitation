const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../planner.js');
const A = require('../artwork.js');

test('invitation artwork contains the selected plan and escapes visitor text', () => {
  let plan = P.selectSetting(P.selectDate(P.createPlan(), '2026-10-10'), 'out');
  plan = P.selectRoute(plan, 'explore');
  plan = P.selectActivity(plan, 'Tea <friends> & cakes');
  plan = P.selectFood(plan, 'new');
  plan = P.selectTime(plan, '12:00', '20:00');
  const svg = A.buildInvitationSvg(plan);
  assert.match(svg, /Saturday, October 10, 2026/);
  assert.match(svg, /12:00 PM–8:00 PM MYT/);
  assert.match(svg, /Tea &lt;friends&gt; &amp; cakes/);
  assert.doesNotMatch(svg, /Tea <friends>/);
  assert.match(svg, /Our little universe/);
});

test('long activity and itinerary fit in the artwork without losing words', () => {
  let plan = P.selectSetting(P.selectDate(P.createPlan(), '2026-10-11'), 'out');
  plan = P.selectRoute(plan, 'explore');
  plan = P.selectActivity(plan, 'A long afternoon of making tiny ceramic keepsakes together');
  plan = P.selectFood(plan, 'favorite');
  plan = P.selectTime(plan, '12:00', '20:00');
  const svg = A.buildInvitationSvg(plan);
  const itineraryLines = [...svg.matchAll(/<tspan[^>]*class="itinerary-line"[^>]*>([^<]+)<\/tspan>/g)].map((match) => match[1]);
  assert.equal(itineraryLines.join(' '), P.getItinerary(plan));
  assert.ok(itineraryLines.length <= 3);
  assert.ok(itineraryLines.every((line) => line.length <= 45));
  const activityLines = [...svg.matchAll(/<tspan[^>]*class="activity-line"[^>]*>([^<]+)<\/tspan>/g)].map((match) => match[1]);
  assert.equal(activityLines.join(' '), plan.activity);
  assert.ok(activityLines.every((line) => line.length <= 45));
});

test('the staying-in schedule fits the invitation artwork', () => {
  let plan = P.selectSetting(P.selectDate(P.createPlan(), '2026-10-10'), 'home');
  plan = P.selectRoute(plan, 'slow');
  plan = P.selectFood(plan, 'delivery');
  for (const [field, config] of Object.entries(P.HOME_FIELDS)) plan = P.selectHomeOption(plan, field, config.options[0].id);
  const svg = A.buildInvitationSvg(plan);
  assert.match(svg, /11:00 AM–12:00 PM  Order in for lunch/);
  assert.match(svg, /12:00 PM–6:00 PM  Our time/);
  assert.match(svg, /8:00 PM–9:00 PM  Wind down together/);
});
