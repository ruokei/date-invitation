const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DATES,
  createPlan,
  selectDate,
  selectTime,
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
    ['2026-10-10', 'Saturday, October 10, 2026'],
    ['2026-10-11', 'Sunday, October 11, 2026'],
  ]);
  assert.equal(isExpired('2026-09-27', new Date('2026-09-30T12:00:00Z')), true);
  assert.equal(isExpired('2026-10-10', new Date('2026-09-30T12:00:00Z')), false);
});

test('a day expires at midnight in Malaysia regardless of the visitor timezone', () => {
  const originalZone = process.env.TZ;
  try {
    process.env.TZ = 'America/Los_Angeles';
    assert.equal(isExpired('2026-10-10', new Date('2026-10-10T15:59:59Z')), false);
    assert.equal(isExpired('2026-10-10', new Date('2026-10-10T16:00:00Z')), true);
  } finally {
    if (originalZone === undefined) delete process.env.TZ;
    else process.env.TZ = originalZone;
  }
});

test('the optional activity changes the visible stop list', () => {
  let plan = selectDate(createPlan(), '2026-10-10');
  plan = selectSetting(plan, 'out');
  plan = selectRoute(plan, 'explore');
  assert.deepEqual(getSteps(plan), ['date', 'setting', 'route', 'activity', 'food', 'time', 'ticket']);
  plan = selectRoute(plan, 'tufting');
  assert.deepEqual(getSteps(plan), ['date', 'setting', 'route', 'food', 'time', 'ticket']);
});

test('a staying-in invitation goes from the day to the timeline and preferences', () => {
  const plan = selectSetting(createPlan(), 'home');
  assert.deepEqual(getSteps(plan), ['date', 'time', 'details', 'ticket']);
});

test('selected time is required, ordered, and kept when the day changes', () => {
  let plan = selectDate(createPlan(), '2026-10-10');
  assert.throws(() => selectTime(plan, '20:00', '12:00'), /end.*after.*start/i);
  assert.throws(() => selectTime(plan, '25:00', '26:00'), /valid time/i);
  plan = selectTime(plan, '12:00', '20:00');
  plan = selectDate(plan, '2026-10-11');
  assert.equal(plan.startTime, '12:00');
  assert.equal(plan.endTime, '20:00');
});

test('tufting time must include two in the afternoon', () => {
  let plan = selectSetting(selectDate(createPlan(), '2026-10-10'), 'out');
  plan = selectRoute(plan, 'tufting');
  assert.throws(() => selectTime(plan, '09:00', '13:00'), /2:00 PM/);
  plan = selectTime(plan, '12:00', '20:00');
  assert.equal(plan.startTime, '12:00');
  plan = selectRoute(plan, 'explore');
  assert.equal(plan.startTime, '12:00');
});

test('editing a parent choice only clears incompatible answers', () => {
  let plan = selectDate(createPlan(), '2026-10-10');
  plan = selectSetting(plan, 'out');
  plan = selectRoute(plan, 'explore');
  plan = selectActivity(plan, 'Pottery');
  plan = selectFood(plan, 'new');
  plan = selectDate(plan, '2026-10-11');
  assert.equal(plan.activity, 'Pottery');
  assert.equal(plan.food, 'new');
  plan = selectRoute(plan, 'tufting');
  assert.equal(plan.activity, null);
  assert.equal(plan.food, 'new');
  plan = selectSetting(plan, 'home');
  assert.equal(plan.date, '2026-10-11');
  assert.equal(plan.route, 'slow');
  assert.equal(plan.food, null);
});

test('a custom activity becomes part of the itinerary without markup', () => {
  let plan = selectSetting(selectDate(createPlan(), '2026-10-10'), 'out');
  plan = selectRoute(plan, 'explore');
  plan = selectActivity(plan, '  Tea, pottery & <friends>  ');
  plan = selectFood(plan, 'favorite');
  assert.match(getItinerary(plan), /Tea, pottery & <friends>/);
  assert.equal(plan.activity, 'Tea, pottery & <friends>');
});

test('the home itinerary follows the fixed day', () => {
  let plan = selectSetting(selectDate(createPlan(), '2026-10-10'), 'home');
  plan = selectRoute(plan, 'slow');
  plan = selectFood(plan, 'delivery');
  const itinerary = getItinerary(plan);
  assert.match(itinerary, /Order in for lunch/);
  assert.match(itinerary, /12:00 PM–6:00 PM Our time/);
  assert.match(itinerary, /6:00 PM–7:00 PM Dinner/);
  assert.match(itinerary, /7:00 PM–8:00 PM Chores/);
});

test('calendar matches the selected date and safely encodes custom text', () => {
  let plan = selectSetting(selectDate(createPlan(), '2026-10-11'), 'out');
  plan = selectRoute(plan, 'explore');
  plan = selectActivity(plan, 'Pottery; tea, crafts');
  plan = selectFood(plan, 'new');
  plan = selectTime(plan, '12:00', '20:00');
  const ics = buildCalendar(plan, new Date('2026-09-30T12:00:00Z'));
  const unfolded = ics.replace(/\r\n /g, '');
  assert.match(ics, /DTSTART:20261011T040000Z\r\n/);
  assert.match(ics, /DTEND:20261011T120000Z\r\n/);
  assert.match(ics, /PRODID:/);
  assert.match(ics, /X-WR-TIMEZONE:Asia\/Kuala_Lumpur/);
  assert.match(ics, /UID:/);
  assert.match(ics, /DTSTAMP:20260930T120000Z/);
  assert.match(unfolded, /Pottery\\; tea\\, crafts/);
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
});

test('calendar rejects an incomplete or expired plan', () => {
  assert.throws(() => buildCalendar(createPlan()), /complete/i);
  let plan = selectSetting(selectDate(createPlan(), '2026-10-10'), 'home');
  plan = selectRoute(plan, 'slow');
  plan = selectFood(plan, 'delivery');
  assert.throws(() => buildCalendar(plan, new Date('2026-09-30T12:00:00Z')), /complete/i);
  for (const [field, config] of Object.entries(require('../planner.js').HOME_FIELDS)) plan = require('../planner.js').selectHomeOption(plan, field, config.options[0].id);
  assert.throws(() => buildCalendar(plan, new Date('2026-10-12T12:00:00Z')), /passed/i);
});

test('the same plan keeps one calendar event identity across exports', () => {
  let plan = selectSetting(selectDate(createPlan(), '2026-10-10'), 'home');
  plan = selectRoute(plan, 'slow');
  plan = selectFood(plan, 'delivery');
  for (const [field, config] of Object.entries(require('../planner.js').HOME_FIELDS)) plan = require('../planner.js').selectHomeOption(plan, field, config.options[0].id);
  const first = buildCalendar(plan, new Date('2026-10-05T00:00:00Z'));
  const second = buildCalendar(plan, new Date('2026-10-06T00:00:00Z'));
  assert.equal(first.match(/^UID:(.*)$/m)[1], second.match(/^UID:(.*)$/m)[1]);
});
