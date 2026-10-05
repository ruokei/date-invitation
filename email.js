(function (root) {
  'use strict';
  const P = typeof module !== 'undefined' && module.exports ? require('./planner.js') : root.DateRailwayPlanner;
  const RECIPIENT = 'modquack@gmail.com';

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  }

  function row(label, value) {
    return `<tr><td style="padding:12px 20px;border-bottom:1px solid #d2c2a7;color:#665638;font:700 12px Arial,sans-serif;letter-spacing:1px;vertical-align:top;width:35%">${label}</td><td style="padding:12px 20px;border-bottom:1px solid #d2c2a7;color:#13213e;font:17px/1.45 Georgia,serif;vertical-align:top">${escapeHtml(value)}</td></tr>`;
  }

  function buildEmailHtml(plan) {
    if (!P.isComplete(plan)) throw new Error('Complete the plan before preparing an email');
    const details = [
      row('Day', P.getDate(plan).label),
      row('Time', `${P.getTimeLabel(plan)} · Malaysia Time (UTC+8)`),
      row('Together', plan.setting === 'out' ? 'Going out' : 'Staying in'),
      row('The plan', P.ROUTES[plan.route].title),
      ...(plan.route === 'explore' ? [row('Activity', plan.activity)] : []),
      row('Lunch', P.getFood(plan).title),
      row('Our day', P.getItinerary(plan)),
    ].join('');
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Our little universe</title><style>@media(max-width:440px){.shell{padding:12px!important}.main{padding:24px 18px!important}.title{font-size:36px!important}.details td{display:block!important;width:auto!important;padding:8px 16px!important}.details td:first-child{border-bottom:0!important;padding-bottom:0!important}.details td:last-child{padding-top:3px!important}}</style></head><body style="margin:0;padding:0;background:#e8e3dc;color:#13213e;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#e8e3dc"><tr><td class="shell" align="center" style="padding:28px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;border-collapse:collapse;background:#f8f3e9"><tr><td align="center" style="padding:44px 24px 42px;background:#101c38;color:#f9f2e4;border-bottom:5px solid #b7965c"><p style="margin:0;color:#d9bc84;font:700 13px Arial,sans-serif;letter-spacing:2px">✦ &nbsp; MIDNIGHT OBSERVATORY &nbsp; ✦</p><p style="margin:22px 0 4px;color:#d9bc84;font:normal 28px Georgia,serif">☽</p><h1 class="title" style="margin:4px 0 12px;color:#f9f2e4;font:normal 46px/1.1 Georgia,serif">Our little universe</h1><p style="margin:0;color:#e5ddcf;font:17px/1.5 Georgia,serif">A little time, just for us.</p></td></tr><tr><td class="main" style="padding:32px 32px 36px"><p style="margin:0 0 16px;color:#13213e;font:19px/1.6 Georgia,serif">I would love to spend this day with you, wherever we decide to go.</p><p style="margin:0 0 25px;color:#4d5564;font:16px/1.55 Arial,sans-serif">Here is the little plan we made beneath the same sky.</p><table class="details" role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;border:1px solid #baa474;background:#fffaf0">${details}</table><p style="margin:24px 0 0;color:#4d5564;font:15px/1.6 Arial,sans-serif">The matching invitation artwork and calendar event are attached. I cannot wait to see you.</p></td></tr><tr><td align="center" style="padding:20px;background:#101c38;color:#e5ddcf;font:14px/1.5 Georgia,serif">You &amp; me, under the same sky &nbsp; ✦</td></tr></table></td></tr></table></body></html>`;
  }

  function buildEmailText(plan) {
    if (!P.isComplete(plan)) throw new Error('Complete the plan before preparing an email');
    return `Our little universe\n\nA little time, just for us.\n\n${P.getDate(plan).label}\n${P.getTimeLabel(plan)} · Malaysia Time (UTC+8)\n${plan.setting === 'out' ? 'Going out' : 'Staying in'}\n${P.ROUTES[plan.route].title}\n${plan.route === 'explore' ? `Activity: ${plan.activity}\n` : ''}Lunch: ${P.getFood(plan).title}\n\n${P.getItinerary(plan)}\n\nYou & me, under the same sky.`;
  }

  function base64(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  }

  function mimePart(type, content, disposition) {
    const encoded = content.match(/.{1,76}/g).join('\r\n');
    return `Content-Type: ${type}\r\n${disposition ? `Content-Disposition: attachment; filename="${disposition}"\r\n` : ''}Content-Transfer-Encoding: base64\r\n\r\n${encoded}`;
  }

  function buildEmailDraft(plan, now = new Date(), pngBase64 = null) {
    const calendar = P.buildCalendar(plan, now);
    const suffix = now.toISOString().replace(/[^0-9A-Za-z]/g, '');
    const mixed = `observatory-mixed-${suffix}`;
    const alternative = `observatory-alt-${suffix}`;
    const filename = `our-date-${plan.date}.ics`;
    const parts = [
      `To: ${RECIPIENT}`,
      `Subject: Our little universe | ${P.getDate(plan).label}`,
      'X-Unsent: 1',
      'MIME-Version: 1.0',
      `Content-Type: multipart/mixed; boundary="${mixed}"`,
      '',
      `--${mixed}`,
      `Content-Type: multipart/alternative; boundary="${alternative}"`,
      '',
      `--${alternative}`,
      mimePart('text/plain; charset=UTF-8', base64(buildEmailText(plan))),
      `--${alternative}`,
      mimePart('text/html; charset=UTF-8', base64(buildEmailHtml(plan))),
      `--${alternative}--`,
      `--${mixed}`,
      mimePart(`text/calendar; charset=UTF-8; name="${filename}"`, base64(calendar), filename),
    ];
    if (pngBase64) {
      const imageName = `our-little-universe-${plan.date}.png`;
      parts.push(`--${mixed}`, mimePart(`image/png; name="${imageName}"`, pngBase64, imageName));
    }
    parts.push(`--${mixed}--`, '');
    return parts.join('\r\n');
  }

  function buildProviderPayload(plan, pngBase64, now = new Date()) {
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(pngBase64 || '')) throw new Error('Invitation image is required');
    const calendar = P.buildCalendar(plan, now);
    return {
      to: [RECIPIENT],
      subject: `Our little universe | ${P.getDate(plan).label}`,
      html: buildEmailHtml(plan),
      text: buildEmailText(plan),
      attachments: [
        { filename: `our-date-${plan.date}.ics`, content: base64(calendar) },
        { filename: `our-little-universe-${plan.date}.png`, content: pngBase64 },
      ],
    };
  }

  const api = { RECIPIENT, buildEmailHtml, buildEmailText, buildEmailDraft, buildProviderPayload };
  root.MidnightEmail = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
