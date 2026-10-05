(function (root) {
  'use strict';
  const P = typeof module !== 'undefined' && module.exports ? require('./planner.js') : root.DateRailwayPlanner;

  function escapeXml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]);
  }

  function wrapWords(value, width = 45) {
    const lines = [''];
    for (const word of String(value).split(/\s+/)) {
      const last = lines.length - 1;
      if (lines[last] && `${lines[last]} ${word}`.length > width) lines.push(word);
      else lines[last] += `${lines[last] ? ' ' : ''}${word}`;
    }
    return lines;
  }

  function svgLines(lines, className, spacing) {
    return lines.map((line, index) => `<tspan x="582" dy="${index ? spacing : 0}" class="${className}"${line.length > 45 ? ' textLength="500" lengthAdjust="spacingAndGlyphs"' : ''}>${escapeXml(line)}</tspan>`).join('');
  }

  function buildInvitationSvg(plan) {
    if (!P.isComplete(plan)) throw new Error('Complete the plan before making artwork');
    const date = escapeXml(P.getDate(plan).label);
    const time = escapeXml(P.getTimeLabel(plan));
    const setting = plan.setting === 'out' ? 'GOING OUT' : 'STAYING IN';
    const route = escapeXml(P.ROUTES[plan.route].title);
    const lunch = escapeXml(P.getFood(plan).title);
    const activityLines = plan.route === 'explore' ? wrapWords(plan.activity) : [];
    const itineraryLines = wrapWords(P.getItinerary(plan));
    const itineraryY = activityLines.length ? 544 : 527;
    const itineraryLabelY = activityLines.length ? 518 : 501;
    const activity = activityLines.length ? `<text x="582" y="475" class="detail">${svgLines(activityLines, 'activity-line', 19)}</text>` : '';
    const itinerary = `<text x="582" y="${itineraryY}" class="itinerary">${svgLines(itineraryLines, 'itinerary-line', 21)}</text>`;
    const stars = [[90,90,3],[190,125,2],[310,85,2],[430,160,3],[765,100,2],[1030,90,3],[1120,190,2],[90,520,2],[360,580,2],[1050,570,2],[1170,440,2]].map(([x,y,r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#edd9a9" opacity=".7"/>`).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
      <defs><radialGradient id="night"><stop stop-color="#21345c"/><stop offset="1" stop-color="#080f24"/></radialGradient><linearGradient id="brass"><stop stop-color="#e6cb93"/><stop offset=".5" stop-color="#a67d44"/><stop offset="1" stop-color="#e6cb93"/></linearGradient></defs>
      <style>.small{font:600 15px Arial,sans-serif;letter-spacing:2px;fill:#d8bc83}.title{font:normal 60px Georgia,serif;fill:#fff5e6}.heading{font:normal 30px Georgia,serif;fill:#fff5e6}.detail{font:normal 18px Arial,sans-serif;fill:#f2e8d6}.time{font:normal 17px Arial,sans-serif;fill:#f2e8d6}.itinerary{font:normal 17px Arial,sans-serif;fill:#f2e8d6}.label{font:600 13px Arial,sans-serif;letter-spacing:2px;fill:#c8ad79}.note{font:normal 17px Georgia,serif;fill:#d6dfeb}</style>
      <rect width="1200" height="675" fill="url(#night)"/><rect x="27" y="27" width="1146" height="621" rx="8" fill="none" stroke="url(#brass)" stroke-width="2"/><rect x="38" y="38" width="1124" height="599" rx="4" fill="none" stroke="#b49360" opacity=".42"/>${stars}
      <circle cx="237" cy="325" r="173" fill="none" stroke="#c6a56f" opacity=".55"/><circle cx="237" cy="325" r="137" fill="none" stroke="#c6a56f" opacity=".4"/><circle cx="237" cy="325" r="88" fill="none" stroke="#c6a56f" opacity=".5"/><path d="M65 325h344M237 154v342M115 202l245 245M359 202L115 447" stroke="#c6a56f" opacity=".22"/>
      <circle cx="237" cy="325" r="30" fill="#f6e7bb"/><circle cx="225" cy="315" r="28" fill="#d8bc83"/><path d="M136 291l66-47 82 34 51-84M110 385l92-26 78 50 85-30" fill="none" stroke="#f2d6a1" stroke-width="2"/><circle cx="136" cy="291" r="5" fill="#fff5d5"/><circle cx="202" cy="244" r="5" fill="#fff5d5"/><circle cx="284" cy="278" r="5" fill="#fff5d5"/><circle cx="335" cy="194" r="5" fill="#fff5d5"/>
      <path d="M525 90v495" stroke="#b49360" opacity=".65"/><text x="582" y="109" class="small">MIDNIGHT OBSERVATORY</text><text x="582" y="183" class="title">Our little universe</text><text x="582" y="226" class="note">A little time, just for us.</text><path d="M582 253h515" stroke="#b49360" opacity=".7"/>
      <text x="582" y="289" class="label">THE DAY</text><text x="582" y="326" class="heading">${date}</text><text x="582" y="359" class="time">${time} · Malaysia Time (UTC+8)</text>
      <text x="582" y="396" class="label">OUR PLANS · ${setting}</text><text x="582" y="425" class="detail">${route}</text><text x="582" y="450" class="detail">${lunch}</text>${activity}
      <text x="582" y="${itineraryLabelY}" class="label">THE WAY OUR DAY UNFOLDS</text>${itinerary}<path d="M582 611h515" stroke="#b49360" opacity=".7"/><text x="582" y="635" class="small">YOU &amp; ME, UNDER THE SAME SKY</text>
    </svg>`;
  }

  const api = { buildInvitationSvg };
  root.MidnightArtwork = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
