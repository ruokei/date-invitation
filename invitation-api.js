(function (root) {
  'use strict';
  const P = typeof module !== 'undefined' && module.exports ? require('./planner.js') : root.DateRailwayPlanner;

  function normalizePlan(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Choose a complete plan');
    let plan = P.selectDate(P.createPlan(), input.date);
    if (input.setting !== 'home') throw new Error('This invitation is for a day at home this week');
    plan = P.selectSetting(plan, input.setting);
    plan = P.selectRoute(plan, input.route);
    plan = P.selectFood(plan, input.food);
    plan = P.selectTime(plan, input.startTime, input.endTime);
    for (const period of ['midday', 'late']) {
      const checked = input.optionalChores?.[period];
      plan = P.selectOptionalChore(plan, period, checked === undefined ? false : checked);
    }
    for (const field of Object.keys(P.HOME_FIELDS)) plan = P.selectHomeOption(plan, field, input.homeOptions?.[field]);
    plan = P.selectNote(plan, input.note ?? '');
    if (!P.isComplete(plan)) throw new Error('Choose a complete plan');
    return plan;
  }

  function validPng(value) {
    if (typeof value !== 'string' || value.length > 1_000_000 || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return false;
    const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0;
    const byteLength = value.length * 3 / 4 - padding;
    if (byteLength < 24 || byteLength > 750_000) return false;
    try {
      const head = atob(value.slice(0, 32));
      const signature = [137, 80, 78, 71, 13, 10, 26, 10];
      if (signature.some((byte, index) => head.charCodeAt(index) !== byte)) return false;
      if (head.slice(12, 16) !== 'IHDR') return false;
      const uint32 = (offset) => (head.charCodeAt(offset) * 0x1000000 + (head.charCodeAt(offset + 1) << 16) + (head.charCodeAt(offset + 2) << 8) + head.charCodeAt(offset + 3)) >>> 0;
      return uint32(16) === 1200 && uint32(20) === 675;
    } catch { return false; }
  }

  const api = { normalizePlan, validPng };
  root.MidnightInvitationApi = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
