const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../planner.js');
const E = require('../email.js');
const { normalizePlan } = require('../server.js');

function completeHomePlan(date = '2026-10-10', lunch = 'delivery') {
  let plan = P.selectSetting(P.selectDate(P.createPlan(), date), 'home');
  plan = P.selectFood(plan, lunch);
  for (const [field, config] of Object.entries(P.HOME_FIELDS)) {
    plan = P.selectHomeOption(plan, field, config.options[0].id);
  }
  return plan;
}

test('home plan follows date, fixed day, preferences, and invitation', () => {
  const plan = completeHomePlan();
  assert.deepEqual(P.getSteps(plan), ['date', 'time', 'details', 'ticket']);
  assert.equal(plan.startTime, '11:00');
  assert.equal(plan.endTime, '21:00');
  assert.equal(P.isComplete(plan), true);
  assert.throws(() => P.selectTime(plan, '12:00', '20:00'), /11:00 AM.*9:00 PM/i);
});

test('lunch choice and Our time appear in the seven schedule blocks', () => {
  const ordered = completeHomePlan('2026-10-11', 'delivery');
  const out = completeHomePlan('2026-10-11', 'eatout');
  const schedule = P.getTimelineSlots(out);
  assert.deepEqual(schedule.map((slot) => [slot.start, slot.end]), [
    ['11:00', '12:00'], ['12:00', '14:00'], ['14:00', '16:00'],
    ['16:00', '18:00'], ['18:00', '19:00'], ['19:00', '20:00'], ['20:00', '21:00'],
  ]);
  assert.match(P.getItinerary(ordered), /Order in for lunch/);
  assert.match(P.getItinerary(out), /Eat out for lunch/);
  assert.equal(schedule[2].title, 'Our time');
  assert.match(P.getItinerary(out), /Chores/);
  assert.match(P.getItinerary(out), /Wind down together/);
});

test('optional chore ticks turn open hours into chores and otherwise join Our time', () => {
  let plan = completeHomePlan();
  assert.deepEqual(P.getSchedule(plan).map(({ start, end, title }) => [start, end, title]), [
    ['11:00', '12:00', 'Order in for lunch'],
    ['12:00', '18:00', 'Our time'],
    ['18:00', '19:00', 'Dinner'],
    ['19:00', '20:00', 'Chores'],
    ['20:00', '21:00', 'Wind down together'],
  ]);
  plan = P.selectOptionalChore(plan, 'midday', true);
  assert.deepEqual(P.getSchedule(plan).slice(1, 3).map(({ start, end, title }) => [start, end, title]), [
    ['12:00', '14:00', 'Chores'], ['14:00', '18:00', 'Our time'],
  ]);
  plan = P.selectOptionalChore(plan, 'late', true);
  assert.deepEqual(P.getSchedule(plan).slice(1, 4).map(({ start, end, title }) => [start, end, title]), [
    ['12:00', '14:00', 'Chores'], ['14:00', '16:00', 'Our time'], ['16:00', '18:00', 'Chores'],
  ]);
  plan = P.selectOptionalChore(plan, 'midday', false);
  assert.match(E.buildEmailText(plan), /12:00 PM–4:00 PM Our time/);
  assert.match(E.buildEmailText(plan), /4:00 PM–6:00 PM Chores/);
  assert.match(P.buildCalendar(plan, new Date('2026-10-06T00:00:00Z')).replace(/\r\n /g, ''), /4:00 PM–6:00 PM Chores/);
  assert.throws(() => P.selectOptionalChore(plan, 'dinner', true), /unknown/i);
  assert.throws(() => P.selectOptionalChore(plan, 'late', 'yes'), /true or false/i);
  assert.equal(normalizePlan(plan).optionalChores.late, true);
  assert.throws(() => normalizePlan({ ...plan, optionalChores: { late: 'yes' } }), /true or false/i);
});

test('all translated home preferences are validated and carried into exports', () => {
  let plan = completeHomePlan();
  assert.equal(P.getHomeOptionRows(plan).length, 9);
  assert.throws(() => P.selectHomeOption(plan, 'homeFood', '<script>'), /unknown/i);
  assert.throws(() => P.selectHomeOption(plan, 'whoseHome', 'mine'), /unknown/i);
  plan = P.selectHomeOption(plan, 'photos', 'together');
  assert.match(E.buildEmailText(plan), /At least one photo together/);
  assert.match(E.buildEmailHtml(plan), /At least one photo together/);
  const ics = P.buildCalendar(plan, new Date('2026-10-06T00:00:00Z')).replace(/\r\n /g, '');
  assert.match(ics, /DTSTART:20261010T030000Z/);
  assert.match(ics, /DTEND:20261010T130000Z/);
  assert.match(ics, /At least one photo together/);
  assert.match(ics, /11:00 AM–12:00 PM/);
  assert.equal(normalizePlan(plan).homeOptions.photos, 'together');
  assert.throws(() => normalizePlan({ ...plan, homeOptions: { ...plan.homeOptions, photos: 'fake' } }), /unknown/i);
  assert.equal(normalizePlan(completeHomePlan('2026-10-11', 'eatout')).food, 'eatout');
});
