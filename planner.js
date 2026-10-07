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
    slow: { setting: 'home', title: 'Our time', short: 'Our time', description: 'A little stretch of the day just for us.' },
  };

  const FOODS = {
    out: {
      favorite: { title: 'Your favourite café', detail: 'A familiar place and your usual order.' },
      new: { title: 'A new café to try', detail: 'Find a little place together.' },
    },
    home: {
      eatout: { title: 'Eat out for lunch', detail: 'A small outing before heading home.' },
      delivery: { title: 'Order in for lunch', detail: 'Stay in and take it slow.' },
    },
  };

  const HOME_FIELDS = {
    homeFood: { label: '🍽️ What do we eat today?', options: [
      { id: 'chinese', label: '🥢 Chinese food' }, { id: 'western', label: '🍝 Western food' },
      { id: 'taiwanese', label: '🍜 Taiwanese food' }, { id: 'japanese', label: '🍣 Japanese food' },
      { id: 'thai', label: '🌶️ Thai food' }, { id: 'korean', label: '🍲 Korean food' },
      { id: 'takeout', label: '🥡 Takeout' }, { id: 'snacks', label: '🍿 Snacks and desserts' },
      { id: 'cook', label: '🍳 Cook together' }, { id: 'discuss', label: '💬 More than one? Let’s talk about it' },
    ] },
    homeActivity: { label: '🏡 What else could we do at home?', options: [
      { id: 'shows', label: '📺 Watch a series' }, { id: 'nap', label: '😴 Rest or take a nap' },
      { id: 'cuddle', label: '🥰 Cuddle and chill' }, { id: 'bake', label: '🧁 Cook or bake' },
      { id: 'music', label: '🎵 Listen to music and chat' }, { id: 'open', label: '☁️ Leave the time open' },
    ] },
    homeOutfit: { label: '🧸 What should we wear?', options: [
      { id: 'comfy', label: '🧸 Comfy clothes' }, { id: 'outdoors', label: '☀️ Outdoors special (cuz it’s hot)' },
      { id: 'pajamas', label: '🌙 Pajamas' }, { id: 'matching', label: '🎨 Let’s try to blind match colors!' },
      { id: 'wink', label: '😏 You know what I mean' },
    ] },
    homeMood: { label: '🕯️ What’s the mood at home?', options: [
      { id: 'rest', label: '😌 Rest and chill' }, { id: 'productive', label: '⚡ Efficient and productive' },
      { id: 'talk', label: '💬 Sit and talk' }, { id: 'later', label: '💭 Decide later' },
    ] },
    choreStyle: { label: '🧹 How should we tackle chores?', options: [
      { id: 'together', label: '🤝 Do all together' }, { id: 'split', label: '⚡ Split them and finish quickly' },
      { id: 'productive', label: '✅ Productivity is key' }, { id: 'slow', label: '🌿 Take our time' },
      { id: 'later', label: '💭 Decide later' },
    ] },
    firstWords: { label: '💌 First thing we’ll say?', options: [
      { id: 'missed', label: '💌 I missed you' }, { id: 'finally', label: '🥰 Finally, you’re here' },
      { id: 'kiss', label: '💋 Can I have a kiss?' }, { id: 'hug', label: '🫂 Hug first, talk later' },
      { id: 'spontaneous', label: '🎈 Let’s see in the moment' },
    ] },
    initiative: { label: '💗 Who takes the lead?', options: [
      { id: 'me', label: '🙋‍♀️ I’ll take the lead' }, { id: 'you', label: '🙋‍♂️ You take the lead' },
      { id: 'turns', label: '🔄 We’ll take turns' },
    ] },
    distance: { label: '🫶 How close shall we be?', options: [
      { id: 'closer', label: '💞 Sit a little closer' }, { id: 'cuddle', label: '🥰 Cuddle up' },
      { id: 'room', label: '🌸 A little breathing room' },
    ] },
    photos: { label: '📸 Our photo plan?', options: [
      { id: 'plenty', label: '📸 Take plenty of photos' }, { id: 'candid', label: '🌸 A few candid photos' },
      { id: 'together', label: '💕 At least one photo together' },
    ] },
  };

  function createPlan() {
    return { date: null, setting: null, route: null, activity: null, food: null, startTime: null, endTime: null, homeOptions: {}, optionalChores: { midday: false, late: false }, note: '' };
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
    if (plan.setting === 'home' && (startTime !== '11:00' || endTime !== '21:00')) throw new Error('This day runs from 11:00 AM to 9:00 PM');
    if (plan.route === 'tufting' && !timeCoversTufting(startTime, endTime)) throw new Error('Include 2:00 PM for the tufting stop');
    return { ...plan, startTime, endTime };
  }

  function selectSetting(plan, setting) {
    if (!Object.hasOwn(FOODS, setting)) throw new Error('Unknown setting');
    if (plan.setting === setting) return plan;
    return { ...plan, setting, route: setting === 'home' ? 'slow' : null, activity: null, food: null, startTime: setting === 'home' ? '11:00' : null, endTime: setting === 'home' ? '21:00' : null, homeOptions: {}, optionalChores: { midday: false, late: false }, note: '' };
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

  function selectHomeOption(plan, field, value) {
    if (plan.setting !== 'home' || !Object.hasOwn(HOME_FIELDS, field)) throw new Error('Unknown home preference');
    if (!HOME_FIELDS[field].options.some((option) => option.id === value)) throw new Error('Unknown option for this preference');
    return { ...plan, homeOptions: { ...plan.homeOptions, [field]: value } };
  }

  function selectNote(plan, value) {
    if (plan.setting !== 'home' || typeof value !== 'string') throw new Error('Choose a valid note');
    const note = value.trim().replace(/\s+/g, ' ');
    if (note.length > 180) throw new Error('Keep your note under 180 characters');
    return { ...plan, note };
  }

  function selectOptionalChore(plan, period, checked) {
    if (plan.setting !== 'home' || !['midday', 'late'].includes(period)) throw new Error('Unknown optional chore period');
    if (typeof checked !== 'boolean') throw new Error('Chore choice must be true or false');
    return { ...plan, optionalChores: { ...plan.optionalChores, [period]: checked } };
  }

  function getHomeOptionRows(plan) {
    return Object.entries(HOME_FIELDS).map(([field, config]) => ({ field, label: config.label, value: config.options.find((option) => option.id === plan.homeOptions?.[field])?.label || '' }));
  }

  function getSteps(plan) {
    if (plan.setting === 'home') return ['date', 'time', 'details', 'ticket'];
    return ['date', 'setting', 'route', ...(plan.route === 'explore' ? ['activity'] : []), 'food', 'time', 'ticket'];
  }

  function isComplete(plan) {
    return Boolean(plan.date && plan.setting && plan.route && plan.food && plan.startTime && plan.endTime && (plan.route !== 'explore' || plan.activity) && (plan.setting !== 'home' || (plan.startTime === '11:00' && plan.endTime === '21:00' && getHomeOptionRows(plan).every((row) => row.value))));
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

  function getTimelineSlots(plan) {
    if (plan.setting !== 'home') return [];
    const lunch = getFood(plan)?.title || 'Choose lunch';
    return [
      { start: '11:00', end: '12:00', title: lunch },
      { start: '12:00', end: '14:00', title: plan.optionalChores?.midday ? 'Chores' : 'Our time' },
      { start: '14:00', end: '16:00', title: 'Our time' },
      { start: '16:00', end: '18:00', title: plan.optionalChores?.late ? 'Chores' : 'Our time' },
      { start: '18:00', end: '19:00', title: 'Dinner' },
      { start: '19:00', end: '20:00', title: 'Chores' },
      { start: '20:00', end: '21:00', title: 'Wind down together' },
    ];
  }

  function getSchedule(plan) {
    const merged = [];
    for (const slot of getTimelineSlots(plan)) {
      const previous = merged[merged.length - 1];
      if (previous && previous.title === 'Our time' && slot.title === 'Our time' && previous.end === slot.start) previous.end = slot.end;
      else merged.push({ ...slot });
    }
    return merged;
  }

  function getScheduleTitle(plan, slot) {
    const choice = HOME_FIELDS.homeActivity.options.find((option) => option.id === plan.homeOptions?.homeActivity);
    if (!choice || slot.start > '14:00' || slot.end < '16:00') return slot.title;
    const activity = choice.label.replace(/^[^A-Za-z0-9]+/, '');
    return `${slot.title} · 2–4 PM: ${activity}`;
  }

  function getScheduleLines(plan) {
    return getSchedule(plan).map((slot) => `${formatTime(slot.start)}–${formatTime(slot.end)} ${getScheduleTitle(plan, slot)}`);
  }

  function getItinerary(plan) {
    if (!plan.route) return '';
    const lunch = getFood(plan)?.title || 'Lunch together';
    switch (plan.route) {
      case 'tufting': return `${lunch} → tufting at two → a mall stroll → a simple dinner`;
      case 'explore': return `${lunch} → ${plan.activity || 'an activity together'} → a mall stroll → a simple dinner`;
      case 'slow': return getScheduleLines(plan).join(' → ');
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
    const preferences = plan.setting === 'home' ? ` Preferences: ${getHomeOptionRows(plan).filter((row) => row.field !== 'homeActivity').map((row) => `${row.label} ${row.value}`).join('; ')}.` : '';
    const note = plan.setting === 'home' && plan.note ? ` Note: ${plan.note}.` : '';
    const details = `${getDate(plan).label}, ${getTimeLabel(plan)}. ${ROUTES[plan.route].title}. ${getItinerary(plan)}.${preferences}${note}`;
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

  const api = { DATES, TIME_ZONE, ROUTES, FOODS, HOME_FIELDS, createPlan, selectDate, selectTime, selectSetting, selectRoute, selectActivity, selectFood, selectHomeOption, selectNote, selectOptionalChore, getSteps, isComplete, getDate, getFood, formatTime, getTimeLabel, getHomeOptionRows, getTimelineSlots, getSchedule, getScheduleTitle, getScheduleLines, getItinerary, isExpired, buildCalendar };
  root.DateRailwayPlanner = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
