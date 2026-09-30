(function (root) {
  'use strict';

  const P = typeof module !== 'undefined' && module.exports ? require('./planner.js') : root.DateRailwayPlanner;
  const RECIPIENT = 'modquack@gmail.com';

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[character]);
  }

  function field(label, value) {
    return `<td style="width:50%;padding:11px 12px;border-top:1px solid #b98963;vertical-align:top"><span style="display:block;margin-bottom:5px;color:#79442e;font:700 10px Arial,sans-serif;letter-spacing:1px">${label}</span><strong style="color:#452d22;font:700 15px Georgia,serif">${escapeHtml(value)}</strong></td>`;
  }

  function buildEmailHtml(plan) {
    if (!P.isComplete(plan)) throw new Error('Complete the plan before preparing an email');
    const activity = plan.route === 'explore' ? `<tr>${field('ACTIVITY', plan.activity)}${field('LUNCH', P.getFood(plan).title)}</tr>` : `<tr>${field('LUNCH', P.getFood(plan).title)}<td style="width:50%;border-top:1px solid #b98963"></td></tr>`;
    return `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:28px 12px;background:#e9d7b4;font-family:Arial,sans-serif;color:#273d32"><table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;margin:auto;border-collapse:collapse;background:#fff6e2"><tr><td style="padding:26px 30px;background:#173f33;color:#f8efd9;text-align:center"><div style="font:700 11px Arial,sans-serif;letter-spacing:3px;color:#ddbd80">A STORY FOR TWO</div><h1 style="margin:12px 0 4px;font:700 38px Georgia,serif">The Date Railway</h1><p style="margin:0;font:italic 16px Georgia,serif;color:#f2dcb6">I saved you a seat beside me.</p></td></tr><tr><td style="padding:28px 25px"><p style="margin:0 0 16px;font:700 11px Arial,sans-serif;letter-spacing:2px;color:#8d5139">YOUR DATE NIGHT TICKET</p><table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;border:1px solid #b87950;background:#f2bc85"><tr><td colspan="2" style="padding:19px 15px 13px"><div style="font:700 11px Arial,sans-serif;letter-spacing:2px;color:#79442e">THE DATE RAILWAY</div><h2 style="margin:5px 0 0;font:700 26px Georgia,serif;color:#452d22">Our next little adventure</h2></td></tr><tr>${field('DEPARTURE', P.getDate(plan).label)}${field('TIME', P.getTimeLabel(plan))}</tr><tr>${field('SETTING', plan.setting === 'out' ? 'Out together' : 'Stay in together')}${field('ROUTE', P.ROUTES[plan.route].title)}</tr>${activity}<tr><td colspan="2" style="padding:12px;border-top:1px dashed #9b664b;color:#452d22"><span style="display:block;margin-bottom:5px;font:700 10px Arial,sans-serif;letter-spacing:1px;color:#79442e">THE PLAN</span><span style="font:14px/1.5 Georgia,serif">${escapeHtml(P.getItinerary(plan))}</span></td></tr><tr><td colspan="2" style="padding:9px 12px;border-top:1px dashed #9b664b;font:700 10px Arial,sans-serif;letter-spacing:1px;color:#79442e">YOU + ME &nbsp;&nbsp;&nbsp; SEAT NEXT TO ME</td></tr></table><p style="margin:18px 2px 0;color:#5f584a;font:13px/1.5 Arial,sans-serif">The calendar invitation is attached. Times are in Malaysia Time (UTC+8).</p></td></tr></table></body></html>`;
  }

  function base64Utf8(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).match(/.{1,76}/g).join('\r\n');
  }

  function buildEmailDraft(plan, now = new Date()) {
    const calendar = P.buildCalendar(plan, now);
    const html = buildEmailHtml(plan);
    const date = P.getDate(plan).label;
    const plain = `The Date Railway\n\nI saved you a seat beside me.\n\n${date}\n${P.getTimeLabel(plan)}\n${P.ROUTES[plan.route].title}\n${P.getItinerary(plan)}\n\nThe calendar invitation is attached. Times are in Malaysia Time (UTC+8).`;
    const suffix = now.toISOString().replace(/[^0-9A-Za-z]/g, '');
    const mixed = `date-railway-mixed-${suffix}`;
    const alternative = `date-railway-alt-${suffix}`;
    const filename = `our-date-${plan.date}.ics`;
    return [
      `To: ${RECIPIENT}`,
      `Subject: The Date Railway | ${date}`,
      'X-Unsent: 1',
      'MIME-Version: 1.0',
      `Content-Type: multipart/mixed; boundary="${mixed}"`,
      '',
      `--${mixed}`,
      `Content-Type: multipart/alternative; boundary="${alternative}"`,
      '',
      `--${alternative}`,
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      base64Utf8(plain),
      `--${alternative}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      base64Utf8(html),
      `--${alternative}--`,
      `--${mixed}`,
      `Content-Type: text/calendar; charset=UTF-8; name="${filename}"`,
      `Content-Disposition: attachment; filename="${filename}"`,
      'Content-Transfer-Encoding: base64',
      '',
      base64Utf8(calendar),
      `--${mixed}--`,
      '',
    ].join('\r\n');
  }

  const api = { RECIPIENT, buildEmailHtml, buildEmailDraft };
  root.DateRailwayEmail = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
