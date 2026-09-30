(function (root) {
  'use strict';

  const DATES = [
    { iso: '2026-10-03', label: 'Saturday, October 3, 2026', short: 'Sat, Oct 3', badge: 'Saturday Express' },
    { iso: '2026-10-04', label: 'Sunday, October 4, 2026', short: 'Sun, Oct 4', badge: 'Sunday Line' },
  ];

  const ROUTES = {
    tufting: { setting: 'out', title: 'Finish our tufting', short: 'Finish tufting', description: 'Lunch, tufting at two, a mall stroll, and dinner.' },
    explore: { setting: 'out', title: 'Explore something new', short: 'Try something new', description: 'Pick an activity, wander together, and have dinner.' },
    slow: { setting: 'home', title: 'A slow day in', short: 'A slow day in', description: 'Shows, rest, family dinner, and nowhere else to be.' },
    creative: { setting: 'home', title: 'A creative home day', short: 'Make something', description: 'Make, rest, family dinner, and a cozy night in.' },
  };

  const FOODS = {
    out: {
      favorite: { title: 'Your favourite café', detail: 'A familiar place and your usual order.' },
      new: { title: 'A new café to try', detail: 'Find a little place together.' },
    },
    home: {
      eatout: { title: 'Eat out for lunch', detail: 'A small outing before heading home.' },
      delivery: { title: 'Get lunch delivered', detail: 'Stay in and take it slow.' },
    },
  };

  function createPlan() {
    return { date: null, setting: null, route: null, activity: null, food: null };
  }

  function selectDate(plan, iso) {
    if (!DATES.some((item) => item.iso === iso)) throw new Error('Unknown date');
    return { ...plan, date: iso };
  }

  function selectSetting(plan, setting) {
    if (!Object.hasOwn(FOODS, setting)) throw new Error('Unknown setting');
    if (plan.setting === setting) return plan;
    return { ...plan, setting, route: null, activity: null, food: null };
  }

  function selectRoute(plan, route) {
    if (!Object.hasOwn(ROUTES, route) || ROUTES[route].setting !== plan.setting) throw new Error('Route does not match setting');
    if (plan.route === route) return plan;
    return { ...plan, route, activity: null };
  }

  function selectActivity(plan, activity) {
    if (plan.route !== 'explore') throw new Error('This route has no activity choice');
    const cleaned = String(activity).trim().replace(/\s+/g, ' ');
    if (!cleaned || cleaned.length > 60) throw new Error('Choose an activity of up to 60 characters');
    return { ...plan, activity: cleaned };
  }

  function selectFood(plan, food) {
    if (!plan.setting || !Object.hasOwn(FOODS[plan.setting], food)) throw new Error('Food choice does not match setting');
    return { ...plan, food };
  }

  function getSteps(plan) {
    return ['date', 'setting', 'route', ...(plan.route === 'explore' ? ['activity'] : []), 'food', 'ticket'];
  }

  function isComplete(plan) {
    return Boolean(plan.date && plan.setting && plan.route && plan.food && (plan.route !== 'explore' || plan.activity));
  }

  function getDate(plan) {
    return DATES.find((item) => item.iso === plan.date) || null;
  }

  function getFood(plan) {
    return plan.setting && plan.food ? FOODS[plan.setting][plan.food] || null : null;
  }

  function getItinerary(plan) {
    if (!plan.route) return '';
    const lunch = getFood(plan)?.title || 'Lunch together';
    switch (plan.route) {
      case 'tufting': return `${lunch} → tufting at two → a mall stroll → a simple dinner`;
      case 'explore': return `${lunch} → ${plan.activity || 'an activity together'} → a mall stroll → a simple dinner`;
      case 'slow': return `${lunch} → our favourite shows → rest together → family dinner`;
      case 'creative': return `${lunch} → make something together → rest together → family dinner`;
      default: return '';
    }
  }

  function isExpired(iso, now = new Date()) {
    const localToday = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
    return iso < localToday;
  }

  function escapeCalendar(value) {
    return String(value).replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
  }

  function foldCalendarLine(line) {
    const encoder = new TextEncoder();
    let result = '';
    let column = 0;
    for (const character of line) {
      const length = encoder.encode(character).length;
      if (column + length > 75) {
        result += '\r\n ';
        column = 1;
      }
      result += character;
      column += length;
    }
    return result;
  }

  function buildCalendar(plan, now = new Date()) {
    if (!isComplete(plan)) throw new Error('Complete the plan before adding it to a calendar');
    if (isExpired(plan.date, now)) throw new Error('The selected date has passed');
    const compactDate = plan.date.replace(/-/g, '');
    const next = new Date(`${plan.date}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    const compactNext = next.toISOString().slice(0, 10).replace(/-/g, '');
    const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const uid = `${compactDate}-${plan.setting}-${plan.route}-${stamp}@date-railway.local`;
    const details = `${getDate(plan).label}. ${ROUTES[plan.route].title}. ${getItinerary(plan)}.`;
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//The Date Railway//Date Invitation//EN',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compactDate}`,
      `DTEND;VALUE=DATE:${compactNext}`,
      'SUMMARY:Our next little adventure',
      `DESCRIPTION:${escapeCalendar(details)}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ];
    return lines.map(foldCalendarLine).join('\r\n') + '\r\n';
  }

  const api = { DATES, ROUTES, FOODS, createPlan, selectDate, selectSetting, selectRoute, selectActivity, selectFood, getSteps, isComplete, getDate, getFood, getItinerary, isExpired, buildCalendar };
  root.DateRailwayPlanner = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
