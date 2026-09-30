const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DATES,
  createPlan,
  selectDate,
  selectSetting,
  selectRoute,
  selectActivity,
  selectFood,
  getSteps,
  getItinerary,
  isExpired,
  buildCalendar,
} = require('../planner.js');

test('the offered weekend uses the approved dates in visible labels', () => {
  assert.deepEqual(DATES.map(({ iso, label }) => [iso, label]), [
    ['2026-10-03', 'Saturday, October 3, 2026'],
    ['2026-10-04', 'Sunday, October 4, 2026'],
  ]);
  assert.equal(isExpired('2026-09-27', new Date('2026-09-30T12:00:00Z')), true);
  assert.equal(isExpired('2026-10-03', new Date('2026-09-30T12:00:00Z')), false);
});

test('the optional activity changes the visible stop list', () => {
  let plan = selectDate(createPlan(), '2026-10-03');
  plan = selectSetting(plan, 'out');
  plan = selectRoute(plan, 'explore');
  assert.deepEqual(getSteps(plan), ['date', 'setting', 'route', 'activity', 'food', 'ticket']);
  plan = selectRoute(plan, 'tufting');
  assert.deepEqual(getSteps(plan), ['date', 'setting', 'route', 'food', 'ticket']);
});

test('editing a parent choice only clears incompatible answers', () => {
  let plan = selectDate(createPlan(), '2026-10-03');
  plan = selectSetting(plan, 'out');
  plan = selectRoute(plan, 'explore');
  plan = selectActivity(plan, 'Pottery');
  plan = selectFood(plan, 'new');
  plan = selectDate(plan, '2026-10-04');
  assert.equal(plan.activity, 'Pottery');
  assert.equal(plan.food, 'new');
  plan = selectRoute(plan, 'tufting');
  assert.equal(plan.activity, null);
  assert.equal(plan.food, 'new');
  plan = selectSetting(plan, 'home');
  assert.equal(plan.date, '2026-10-04');
  assert.equal(plan.route, null);
  assert.equal(plan.food, null);
});

test('a custom activity becomes part of the itinerary without markup', () => {
  let plan = selectSetting(selectDate(createPlan(), '2026-10-03'), 'out');
  plan = selectRoute(plan, 'explore');
  plan = selectActivity(plan, '  Tea, pottery & <friends>  ');
  plan = selectFood(plan, 'favorite');
  assert.match(getItinerary(plan), /Tea, pottery & <friends>/);
  assert.equal(plan.activity, 'Tea, pottery & <friends>');
});

test('calendar matches the selected date and safely encodes custom text', () => {
  let plan = selectSetting(selectDate(createPlan(), '2026-10-04'), 'out');
  plan = selectRoute(plan, 'explore');
  plan = selectActivity(plan, 'Pottery; tea, crafts');
  plan = selectFood(plan, 'new');
  const ics = buildCalendar(plan, new Date('2026-09-30T12:00:00Z'));
  const unfolded = ics.replace(/\r\n /g, '');
  assert.match(ics, /DTSTART;VALUE=DATE:20261004\r\n/);
  assert.match(ics, /DTEND;VALUE=DATE:20261005\r\n/);
  assert.match(ics, /PRODID:/);
  assert.match(ics, /UID:/);
  assert.match(ics, /DTSTAMP:20260930T120000Z/);
  assert.match(unfolded, /Pottery\\; tea\\, crafts/);
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
});

test('calendar rejects an incomplete or expired plan', () => {
  assert.throws(() => buildCalendar(createPlan()), /complete/i);
  let plan = selectSetting(selectDate(createPlan(), '2026-10-03'), 'home');
  plan = selectRoute(plan, 'slow');
  plan = selectFood(plan, 'delivery');
  assert.throws(() => buildCalendar(plan, new Date('2026-10-05T12:00:00Z')), /passed/i);
});
