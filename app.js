(() => {
  'use strict';
  const P = window.DateRailwayPlanner;
  const E = window.MidnightEmail;
  const A = window.MidnightArtwork;
  const stage = document.querySelector('#stage');
  const planner = document.querySelector('#planner');
  const steps = document.querySelector('#steps');
  const status = document.querySelector('#status');
  const dialog = document.querySelector('#email-dialog');
  const motionButton = document.querySelector('#motion-toggle');
  const stepNames = { date: 'Day', setting: 'Together', route: 'Plans', activity: 'Activity', food: 'Lunch', time: 'Time', ticket: 'Invitation' };
  const sceneWords = { date: 'The night is ours to choose.', setting: 'Where will our day unfold?', route: 'Every little path leads to us.', activity: 'Something new, together.', food: 'The little things make the day.', time: 'A little time, just for us.', ticket: 'Our little universe, written in the stars.' };
  const presetActivities = ['Bead art', 'Rock climbing', 'Pottery'];
  let plan = P.selectFood(P.selectSetting(P.createPlan(), 'home'), 'delivery');
  document.querySelectorAll('[data-edit="setting"], [data-edit="food"]').forEach((button) => { button.hidden = true; });
  let current = 'date';
  let opened = false;
  let sceneTimer = 0;
  let artworkUrl = '';
  let sendAvailable = false;

  const params = new URLSearchParams(location.search);
  const storedMotion = (() => { try { return localStorage.getItem('observatory-motion'); } catch { return null; } })();
  const queryMotion = params.get('motion');
  let fullMotion = queryMotion === 'reduce' ? false : queryMotion === 'full' ? true : storedMotion ? storedMotion !== 'reduced' : !matchMedia('(prefers-reduced-motion: reduce)').matches;
  function setMotion(value) {
    fullMotion = value;
    document.documentElement.dataset.motion = value ? 'full' : 'reduced';
    motionButton.textContent = value ? 'Motion on' : 'Motion off';
    motionButton.setAttribute('aria-pressed', String(value));
    try { localStorage.setItem('observatory-motion', value ? 'full' : 'reduced'); } catch {}
    if (!value) finishScene();
  }
  setMotion(fullMotion);
  motionButton.addEventListener('click', () => setMotion(!fullMotion));

  let seed = 8924;
  function random() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  const stars = document.querySelector('#stars');
  const starCount = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4 ? 52 : 78;
  for (let i = 0; i < starCount; i++) {
    const star = document.createElement('span');
    star.style.left = `${Math.round(random() * 98)}%`;
    star.style.top = `${Math.round(random() * 68)}%`;
    star.style.setProperty('--size', `${(random() * 2.3 + 1).toFixed(1)}px`);
    star.style.setProperty('--alpha', (random() * .55 + .3).toFixed(2));
    star.style.setProperty('--delay', `${(random() * 3).toFixed(1)}s`);
    stars.append(star);
  }

  function hasAnswer(step) {
    if (step === 'date') return Boolean(plan.date && !P.isExpired(plan.date));
    if (step === 'setting') return Boolean(plan.setting);
    if (step === 'route') return Boolean(plan.route);
    if (step === 'activity') return Boolean(plan.activity);
    if (step === 'food') return Boolean(plan.food);
    if (step === 'time') return Boolean(plan.startTime && plan.endTime);
    return P.isComplete(plan);
  }

  function canReach(step) {
    const route = P.getSteps(plan);
    const index = route.indexOf(step);
    return index >= 0 && route.slice(0, index).every(hasAnswer);
  }

  function renderSteps() {
    const route = P.getSteps(plan);
    steps.replaceChildren();
    route.forEach((step) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'step-pill';
      button.textContent = stepNames[step];
      button.disabled = !canReach(step);
      if (step === current) {
        button.classList.add('current');
        button.setAttribute('aria-current', 'step');
      } else if (hasAnswer(step)) button.classList.add('complete');
      button.addEventListener('click', () => showStep(step));
      steps.append(button);
    });
    const index = Math.max(0, route.indexOf(current));
    const count = `${String(index + 1).padStart(2, '0')} / ${String(route.length).padStart(2, '0')}`;
    document.querySelector('#step-count').textContent = count;
    document.querySelector('#page-number').textContent = count;
  }

  function renderRecap() {
    const lines = [
      ['Day', P.getDate(plan)?.short],
      ['Together', plan.setting === 'out' ? 'Going out' : plan.setting === 'home' ? 'Staying in' : null],
      ['Plans', plan.route ? P.ROUTES[plan.route].short : null],
      ...(plan.route === 'explore' ? [['Activity', plan.activity]] : []),
      ['Lunch', P.getFood(plan)?.title],
      ['Time', P.getTimeLabel(plan)],
    ];
    const list = document.querySelector('#route-list');
    list.replaceChildren();
    for (const [label, answer] of lines) {
      const item = document.createElement('li');
      const name = document.createElement('span');
      const value = document.createElement('span');
      name.textContent = label;
      value.textContent = answer || 'To be chosen';
      if (!answer) value.className = 'empty';
      item.append(name, value);
      list.append(item);
    }
  }

  function renderChoices() {
    document.querySelectorAll('[data-choice]').forEach((button) => {
      const field = button.dataset.choice;
      const selected = plan[field] === button.dataset.value;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
      if (field === 'date') button.disabled = P.isExpired(button.dataset.value);
    });
    document.querySelectorAll('[data-for]').forEach((button) => { button.hidden = button.dataset.for !== plan.setting; });
    const custom = Boolean(plan.activity && !presetActivities.includes(plan.activity));
    document.querySelector('#custom-choice').classList.toggle('selected', custom);
    document.querySelector('#custom-choice').setAttribute('aria-pressed', String(custom));
    if (custom && document.activeElement !== document.querySelector('#custom-activity')) document.querySelector('#custom-activity').value = plan.activity;
    document.querySelector('#date-message').textContent = P.DATES.every(({ iso }) => P.isExpired(iso)) ? 'These dates have passed. Please choose a new invitation.' : '';
    document.querySelector('#food-lead').textContent = plan.setting === 'home' ? 'A small outing, or lunch delivered to our door?' : 'A familiar favourite, or somewhere new?';
    document.querySelector('#tufting-note').hidden = plan.route !== 'tufting';
  }

  function renderInvitation() {
    const data = [
      ['ticket-date', P.getDate(plan).label],
      ['ticket-time', `${P.getTimeLabel(plan)} · Malaysia Time (UTC+8)`],
      ['ticket-setting', plan.setting === 'out' ? 'Going out' : 'Staying in'],
      ['ticket-route', P.ROUTES[plan.route].title],
      ['ticket-activity', plan.activity || ''],
      ['ticket-food', P.getFood(plan).title],
      ['ticket-itinerary', P.getItinerary(plan)],
    ];
    data.forEach(([id, value]) => { document.getElementById(id).textContent = value; });
    document.querySelector('#ticket-activity-field').hidden = plan.route !== 'explore';
    if (artworkUrl) URL.revokeObjectURL(artworkUrl);
    artworkUrl = URL.createObjectURL(new Blob([A.buildInvitationSvg(plan)], { type: 'image/svg+xml' }));
    document.querySelector('#art-preview').src = artworkUrl;
    document.querySelector('#art-preview').alt = `Our little universe invitation for ${P.getDate(plan).label}, ${P.getTimeLabel(plan)}`;
  }

  function render() {
    renderSteps();
    renderRecap();
    renderChoices();
    document.querySelector('#page-controls').hidden = current === 'ticket';
    document.querySelector('#back').hidden = current === 'date';
    document.querySelector('#continue').disabled = !hasAnswer(current);
    document.querySelector('#continue').innerHTML = current === 'time' ? 'Make our invitation <span aria-hidden="true">→</span>' : 'Continue <span aria-hidden="true">→</span>';
    stage.dataset.setting = plan.setting || 'none';
    if (P.isComplete(plan)) renderInvitation();
  }

  function finishScene() {
    clearTimeout(sceneTimer);
    stage.classList.remove('cinematic', 'changing');
    stage.classList.add('skipped');
    document.querySelector('#skip').hidden = true;
    document.querySelector('#replay').hidden = current !== 'ticket';
  }

  function playScene(duration = 1100) {
    clearTimeout(sceneTimer);
    stage.classList.remove('skipped', 'changing', 'finale');
    void stage.offsetWidth;
    stage.classList.add('changing');
    if (current === 'ticket') stage.classList.add('finale');
    if (!fullMotion || document.hidden) return finishScene();
    stage.classList.add('cinematic');
    document.querySelector('#skip').hidden = false;
    document.querySelector('#replay').hidden = true;
    sceneTimer = setTimeout(() => {
      stage.classList.remove('cinematic', 'changing');
      document.querySelector('#skip').hidden = true;
      document.querySelector('#replay').hidden = current !== 'ticket';
      planner.scrollIntoView({ behavior: 'smooth', block: 'start' });
      document.querySelector(`.step[data-step="${current}"] h2`)?.focus({ preventScroll: true });
    }, duration);
  }

  function showStep(step) {
    if (!canReach(step) || step === current) return;
    document.querySelector(`.step[data-step="${current}"]`).hidden = true;
    document.querySelector(`.step[data-step="${step}"]`).hidden = false;
    current = step;
    stage.dataset.step = step;
    document.querySelector('#scene-title').textContent = sceneWords[step];
    status.textContent = '';
    if (step === 'time') {
      document.querySelector('#start-time').value = plan.startTime || '';
      document.querySelector('#end-time').value = plan.endTime || '';
      document.querySelector('#time-message').textContent = '';
    }
    render();
    playScene(step === 'ticket' ? 2400 : 1150);
    if (!fullMotion) {
      planner.scrollIntoView({ behavior: 'instant', block: 'start' });
      document.querySelector(`.step[data-step="${step}"] h2`)?.focus({ preventScroll: true });
    }
  }

  document.querySelector('#open-observatory').addEventListener('click', () => {
    if (opened) return;
    opened = true;
    stage.classList.add('open');
    planner.hidden = false;
    stage.dataset.step = 'date';
    document.querySelector('#scene-title').textContent = sceneWords.date;
    if (!fullMotion) stage.classList.add('skipped');
    setTimeout(() => {
      planner.scrollIntoView({ behavior: fullMotion ? 'smooth' : 'instant', block: 'start' });
      document.querySelector('#date-heading').focus({ preventScroll: true });
    }, fullMotion ? 1900 : 20);
  });

  document.querySelectorAll('[data-choice]').forEach((button) => button.addEventListener('click', () => {
    const { choice, value } = button.dataset;
    try {
      if (choice === 'date') plan = P.selectDate(plan, value);
      if (choice === 'setting') plan = P.selectSetting(plan, value);
      if (choice === 'route') plan = P.selectRoute(plan, value);
      if (choice === 'activity') plan = P.selectActivity(plan, value);
      if (choice === 'food') plan = P.selectFood(plan, value);
      document.querySelector('#custom-form').hidden = true;
      render();
      if (choice === 'setting') playScene(1350);
      if (choice === 'date' || choice === 'setting') stage.dataset.setting = plan.setting || 'none';
    } catch (error) { status.textContent = error.message; }
  }));
  document.querySelector('#custom-choice').addEventListener('click', () => { document.querySelector('#custom-form').hidden = false; document.querySelector('#custom-activity').focus(); });
  document.querySelector('#custom-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const input = document.querySelector('#custom-activity');
    try { plan = P.selectActivity(plan, input.value); document.querySelector('#custom-form').hidden = true; render(); }
    catch (error) { input.setCustomValidity(error.message); input.reportValidity(); input.setCustomValidity(''); }
  });
  function updateTime() {
    const start = document.querySelector('#start-time').value;
    const end = document.querySelector('#end-time').value;
    const message = document.querySelector('#time-message');
    try {
      if (!start || !end) { plan = P.selectTime(plan, null, null); message.textContent = 'Choose both times to continue.'; }
      else { plan = P.selectTime(plan, start, end); message.textContent = ''; }
    } catch (error) { plan = P.selectTime(plan, null, null); message.textContent = error.message; }
    render();
  }
  document.querySelector('#start-time').addEventListener('input', updateTime);
  document.querySelector('#end-time').addEventListener('input', updateTime);
  document.querySelector('#continue').addEventListener('click', () => { if (hasAnswer(current)) { const route = P.getSteps(plan); showStep(route[route.indexOf(current) + 1]); } });
  document.querySelector('#back').addEventListener('click', () => { const route = P.getSteps(plan); showStep(route[route.indexOf(current) - 1]); });
  document.querySelectorAll('[data-edit]').forEach((button) => button.addEventListener('click', () => showStep(button.dataset.edit)));
  document.querySelector('#skip').addEventListener('click', () => { finishScene(); planner.scrollIntoView({ behavior: 'instant', block: 'start' }); document.querySelector(`.step[data-step="${current}"] h2`)?.focus({ preventScroll: true }); });
  document.querySelector('#replay').addEventListener('click', () => playScene(2400));
  document.querySelector('#replay-final').addEventListener('click', () => playScene(2400));
  function updateVisibility() {
    document.documentElement.dataset.hidden = String(document.hidden);
    if (document.hidden && stage.classList.contains('cinematic')) finishScene();
  }
  document.addEventListener('visibilitychange', updateVisibility);
  updateVisibility();

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  function getPngBase64() {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const url = URL.createObjectURL(new Blob([A.buildInvitationSvg(plan)], { type: 'image/svg+xml' }));
      image.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 1200;
          canvas.height = 675;
          canvas.getContext('2d').drawImage(image, 0, 0, 1200, 675);
          resolve(canvas.toDataURL('image/png').split(',')[1]);
        } catch (error) { reject(error); }
        finally { URL.revokeObjectURL(url); }
      };
      image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('The invitation image could not be created')); };
      image.src = url;
    });
  }

  function pngFile(value) {
    const bytes = Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
    return new File([bytes], `our-little-universe-${plan.date}.png`, { type: 'image/png' });
  }
  function calendarFile() { return new File([P.buildCalendar(plan)], `our-date-${plan.date}.ics`, { type: 'text/calendar' }); }
  document.querySelector('#calendar').addEventListener('click', () => { try { download(calendarFile(), `our-date-${plan.date}.ics`); status.textContent = 'Calendar event downloaded.'; } catch (error) { status.textContent = error.message; } });
  document.querySelector('#save-image').addEventListener('click', async () => { try { download(pngFile(await getPngBase64()), `our-little-universe-${plan.date}.png`); status.textContent = 'Invitation image saved.'; } catch (error) { status.textContent = error.message; } });
  document.querySelector('#dialog-save-image').addEventListener('click', async () => { try { download(pngFile(await getPngBase64()), `our-little-universe-${plan.date}.png`); emailStatus.textContent = 'Invitation image saved.'; } catch (error) { emailStatus.textContent = error.message; } });
  document.querySelector('#dialog-calendar').addEventListener('click', () => { try { download(calendarFile(), `our-date-${plan.date}.ics`); emailStatus.textContent = 'Calendar event downloaded.'; } catch (error) { emailStatus.textContent = error.message; } });

  async function checkEmailConfig() {
    const help = document.querySelector('#send-help');
    try {
      const response = await fetch('/api/status', { cache: 'no-store' });
      if (!response.ok) throw new Error('unavailable');
      sendAvailable = Boolean((await response.json()).available);
    } catch { sendAvailable = false; }
    document.querySelector('#send-email').hidden = !sendAvailable;
    help.textContent = sendAvailable ? 'Send invitation will email the designed message and attachments after you press it.' : 'Direct sending needs server email configuration. You can still use your email app, download the designed draft, or share the files.';
  }
  document.querySelector('#email').addEventListener('click', () => {
    try {
      document.querySelector('#email-preview').srcdoc = E.buildEmailHtml(plan);
      document.querySelector('#email-status').textContent = '';
      dialog.showModal();
      checkEmailConfig();
    } catch (error) { status.textContent = error.message; }
  });
  document.querySelector('#close-email').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  const emailStatus = document.querySelector('#email-status');
  document.querySelector('#send-email').addEventListener('click', async (event) => {
    if (!sendAvailable) return;
    const button = event.currentTarget;
    button.disabled = true;
    button.textContent = 'Sending…';
    emailStatus.textContent = '';
    try {
      const png = await getPngBase64();
      const response = await fetch('/api/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan, png }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The invitation could not be sent');
      emailStatus.textContent = result.duplicate ? 'This invitation was already accepted for sending to modquack@gmail.com.' : 'The email provider accepted this invitation for modquack@gmail.com.';
    } catch (error) { emailStatus.textContent = error.message; }
    finally { button.disabled = false; button.textContent = 'Send invitation'; }
  });
  document.querySelector('#open-email').addEventListener('click', () => {
    const subject = `Our little universe | ${P.getDate(plan).label}`;
    location.href = `mailto:${E.RECIPIENT}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(E.buildEmailText(plan))}`;
    emailStatus.textContent = 'If your email app opened, review the draft before sending. Add the downloaded artwork and calendar file if you want attachments.';
  });
  document.querySelector('#download-email').addEventListener('click', async () => {
    try {
      const png = await getPngBase64();
      download(new Blob([E.buildEmailDraft(plan, new Date(), png)], { type: 'message/rfc822' }), `our-little-universe-${plan.date}.eml`);
      emailStatus.textContent = 'Designed email draft downloaded. Open it in a compatible email app, review, then send.';
    } catch (error) { emailStatus.textContent = error.message; }
  });
  document.querySelector('#share-invitation').addEventListener('click', async () => {
    try {
      const image = pngFile(await getPngBase64());
      const calendar = calendarFile();
      if (!navigator.canShare || !navigator.share) throw new Error('Sharing files is unavailable in this browser. Save the image and calendar instead.');
      if (navigator.canShare({ files: [image, calendar] })) {
        await navigator.share({ files: [image, calendar], title: 'Our little universe', text: E.buildEmailText(plan) });
        emailStatus.textContent = 'Files passed to the chosen app. Review there before sending.';
      } else if (navigator.canShare({ files: [image] })) {
        await navigator.share({ files: [image], title: 'Our little universe', text: E.buildEmailText(plan) });
        emailStatus.textContent = 'Artwork passed to the chosen app. Download the calendar separately if you want to attach it.';
      } else throw new Error('This device cannot share the invitation files. Save them instead.');
    } catch (error) { if (error.name !== 'AbortError') emailStatus.textContent = error.message; }
  });
  document.querySelector('#copy-details').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(E.buildEmailText(plan)); emailStatus.textContent = 'Invitation details copied.'; }
    catch { emailStatus.textContent = 'Copying is unavailable here. Use the email app option instead.'; }
  });

  render();
})();
