(function (root) {
  'use strict';

  const DATES = [
    { iso: '2026-10-10', label: 'Saturday, October 10, 2026', short: 'Sat, Oct 10', badge: 'Saturday' },
    { iso: '2026-10-11', label: 'Sunday, October 11, 2026', short: 'Sun, Oct 11', badge: 'Sunday' },
  ];
  const TIME_ZONE = 'Asia/Kuala_Lumpur';

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
    return { date: null, setting: null, route: null, activity: null, food: null, startTime: null, endTime: null };
  }

  function selectDate(plan, iso) {
    if (!DATES.some((item) => item.iso === iso)) throw new Error('Unknown date');
    return { ...plan, date: iso };
  }

  function validTime(value) {
    return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  }

  function timeCoversTufting(startTime, endTime) {
    return startTime <= '14:00' && endTime > '14:00';
  }

  function selectTime(plan, startTime, endTime) {
    if (startTime == null && endTime == null) return { ...plan, startTime: null, endTime: null };
    if (!validTime(startTime) || !validTime(endTime)) throw new Error('Choose a valid time for both fields');
    if (endTime <= startTime) throw new Error('End time must be after start time');
    if (plan.route === 'tufting' && !timeCoversTufting(startTime, endTime)) throw new Error('Include 2:00 PM for the tufting stop');
    return { ...plan, startTime, endTime };
  }

  function selectSetting(plan, setting) {
    if (!Object.hasOwn(FOODS, setting)) throw new Error('Unknown setting');
    if (plan.setting === setting) return plan;
    return { ...plan, setting, route: null, activity: null, food: null };
  }

  function selectRoute(plan, route) {
    if (!Object.hasOwn(ROUTES, route) || ROUTES[route].setting !== plan.setting) throw new Error('Route does not match setting');
    if (plan.route === route) return plan;
    const keepTime = route !== 'tufting' || !plan.startTime || timeCoversTufting(plan.startTime, plan.endTime);
    return { ...plan, route, activity: null, startTime: keepTime ? plan.startTime : null, endTime: keepTime ? plan.endTime : null };
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
    return ['date', ...(plan.setting === 'home' ? [] : ['setting']), 'route', ...(plan.route === 'explore' ? ['activity'] : []), ...(plan.setting === 'home' ? [] : ['food']), 'time', 'ticket'];
  }

  function isComplete(plan) {
    return Boolean(plan.date && plan.setting && plan.route && plan.food && plan.startTime && plan.endTime && (plan.route !== 'explore' || plan.activity));
  }

  function formatTime(value) {
    const [hour, minute] = value.split(':').map(Number);
    return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
  }

  function getTimeLabel(plan) {
    return plan.startTime && plan.endTime ? `${formatTime(plan.startTime)}–${formatTime(plan.endTime)} MYT` : null;
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
      case 'slow': return `${lunch} → settle in with our favourite shows → tea and a breather → rest together → family dinner`;
      case 'creative': return `${lunch} → make something together → tea and a breather → share what we made → family dinner`;
      default: return '';
    }
  }

  function isExpired(iso, now = new Date()) {
    return new Date(`${iso}T23:59:59.999+08:00`) < now;
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
    const start = new Date(`${plan.date}T${plan.startTime}:00+08:00`);
    const end = new Date(`${plan.date}T${plan.endTime}:00+08:00`);
    if (start <= now) throw new Error('The selected time has passed');
    const compactDate = plan.date.replace(/-/g, '');
    const calendarStamp = (date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const uid = `${compactDate}-our-little-universe@midnight-observatory.local`;
    const details = `${getDate(plan).label}, ${getTimeLabel(plan)}. ${ROUTES[plan.route].title}. ${getItinerary(plan)}.`;
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Midnight Observatory//Date Invitation//EN',
      'CALSCALE:GREGORIAN',
      `X-WR-TIMEZONE:${TIME_ZONE}`,
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${calendarStamp(start)}`,
      `DTEND:${calendarStamp(end)}`,
      'SUMMARY:Our little universe',
      `DESCRIPTION:${escapeCalendar(details)}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ];
    return lines.map(foldCalendarLine).join('\r\n') + '\r\n';
  }

  const api = { DATES, TIME_ZONE, ROUTES, FOODS, createPlan, selectDate, selectTime, selectSetting, selectRoute, selectActivity, selectFood, getSteps, isComplete, getDate, getFood, getTimeLabel, getItinerary, isExpired, buildCalendar };
  root.DateRailwayPlanner = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
