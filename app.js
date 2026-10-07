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
  const stepNames = { date: 'Day', setting: 'Together', route: 'Plans', activity: 'Activity', food: 'Lunch', time: 'Our day', details: 'Little things', ticket: 'Invitation' };
  const sceneWords = { date: 'The night is ours to choose.', setting: 'Where will our day unfold?', route: 'Every little path leads to us.', activity: 'Something new, together.', food: 'The little things make the day.', time: 'A little time, just for us.', details: 'The little things make it ours.', ticket: 'Our little universe, written in the stars.' };
  const presetActivities = ['Bead art', 'Rock climbing', 'Pottery'];
  let plan = P.selectSetting(P.createPlan(), 'home');
  document.querySelector('[data-edit="setting"]').hidden = true;
  document.querySelector('[data-edit="route"]').dataset.edit = 'time';
  document.querySelector('[data-edit="food"]').dataset.edit = 'time';
  let current = 'date';
  let opened = false;
  let sceneTimer = 0;
  let artworkUrl = '';
  let sendAvailable = false;
  const configuredApiBase = String(window.MidnightEmailApiBase || '').trim().replace(/\/+$/, '');
  const apiBase = ['localhost', '127.0.0.1'].includes(location.hostname) ? '' : configuredApiBase;
  const apiUrl = (path) => `${apiBase}${path}`;

  const params = new URLSearchParams(location.search);
  const storedMotion = (() => { try { return localStorage.getItem('observatory-motion'); } catch { return null; } })();
  const queryMotion = params.get('motion');
  let fullMotion = queryMotion === 'reduce' ? false : queryMotion === 'full' ? true : storedMotion ? storedMotion !== 'reduced' : true;
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
  const windowStars = document.querySelector('#window-stars');
  const windowStarCount = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4 ? 38 : 64;
  for (let i = 0; i < windowStarCount; i++) {
    const star = document.createElement('span');
    star.style.left = `${(random() * 96 + 2).toFixed(1)}%`;
    star.style.top = `${(random() * 92 + 4).toFixed(1)}%`;
    star.style.setProperty('--size', `${(random() * 2.3 + 1).toFixed(1)}px`);
    star.style.setProperty('--alpha', (random() * .35 + .63).toFixed(2));
    star.style.setProperty('--duration', `${(random() * 4 + 4).toFixed(1)}s`);
    star.style.setProperty('--delay', `${(random() * -7).toFixed(1)}s`);
    windowStars.append(star);
  }

  function hasAnswer(step) {
    if (step === 'date') return Boolean(plan.date && !P.isExpired(plan.date));
    if (step === 'setting') return Boolean(plan.setting);
    if (step === 'route') return Boolean(plan.route);
    if (step === 'activity') return Boolean(plan.activity);
    if (step === 'food') return Boolean(plan.food);
    if (step === 'time') return Boolean(plan.food && plan.route && (plan.setting !== 'home' || plan.homeOptions.homeActivity));
    if (step === 'details') return P.getHomeOptionRows(plan).filter((row) => row.field !== 'homeActivity').every((row) => row.value);
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
    const littleThings = P.getHomeOptionRows(plan).filter((row) => row.field !== 'homeActivity');
    const lines = [
      ['Day', P.getDate(plan)?.short],
      ['2–4 PM idea', P.getHomeOptionRows(plan).find((row) => row.field === 'homeActivity')?.value],
      ['Lunch', P.getFood(plan)?.title],
      ['Time', P.getTimeLabel(plan)],
      ['Little things', `${littleThings.filter((row) => row.value).length} of ${littleThings.length} chosen`],
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
    renderTimeline();
    renderHomeOptions();
  }

  const timeline = document.querySelector('#day-timeline');
  let afternoonActivityField = null;
  timeline.addEventListener('click', (event) => {
    const button = event.target.closest('[data-day-choice]');
    if (!button) return;
    const { value } = button.dataset;
    plan = P.selectFood(plan, value);
    render();
    timeline.querySelector(`[data-day-choice="food"][data-value="${value}"]`)?.focus({ preventScroll: true });
  });
  timeline.addEventListener('change', (event) => {
    const checkbox = event.target.closest('[data-optional-chore]');
    if (!checkbox) return;
    const period = checkbox.dataset.optionalChore;
    plan = P.selectOptionalChore(plan, period, checkbox.checked);
    render();
    timeline.querySelector(`[data-optional-chore="${period}"]`)?.focus({ preventScroll: true });
  });
  function renderTimeline() {
    timeline.replaceChildren();
    for (const slot of P.getSchedule(plan)) {
      const card = document.createElement('article');
      card.className = 'timeline-slot';
      card.classList.toggle('our-time', slot.title === 'Our time');
      const hour = document.createElement('span');
      hour.className = 'timeline-hour';
      hour.textContent = `${P.formatTime(slot.start)}–${P.formatTime(slot.end)}`;
      const body = document.createElement('div');
      body.className = 'timeline-body';
      const heading = document.createElement('h3');
      heading.className = 'timeline-title';
      heading.textContent = slot.title;
      body.append(heading);

      const includes = (start, end) => slot.start <= start && slot.end >= end;
      if (includes('11:00', '12:00')) {
        const choices = document.createElement('div');
        choices.className = 'timeline-choices';
        choices.setAttribute('role', 'group');
        choices.setAttribute('aria-label', 'Choose lunch');
        for (const [value, label] of [['delivery', 'Order in'], ['eatout', 'Eat out']]) {
          const button = document.createElement('button');
          button.type = 'button';
          button.dataset.dayChoice = 'food';
          button.dataset.value = value;
          button.textContent = label;
          const selected = plan[button.dataset.dayChoice] === value;
          button.classList.toggle('selected', selected);
          button.setAttribute('aria-pressed', String(selected));
          choices.append(button);
        }
        body.append(choices);
      }
      if (includes('14:00', '16:00') && afternoonActivityField) {
        const caption = document.createElement('p');
        caption.className = 'timeline-control-label';
        caption.textContent = 'For 2–4 PM';
        body.append(caption, afternoonActivityField);
      }

      const chorePeriods = [
        ['midday', '12:00', '14:00', '12–2 PM chores'],
        ['late', '16:00', '18:00', '4–6 PM chores'],
      ];
      const choreChoices = document.createElement('div');
      choreChoices.className = 'timeline-chore-list';
      for (const [period, start, end, labelText] of chorePeriods) {
        if (!includes(start, end)) continue;
        const label = document.createElement('label');
        label.className = 'timeline-chore';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.dataset.optionalChore = period;
        checkbox.checked = Boolean(plan.optionalChores[period]);
        const text = document.createElement('span');
        text.textContent = labelText;
        label.append(checkbox, text);
        choreChoices.append(label);
      }
      if (choreChoices.childElementCount) body.append(choreChoices);
      card.append(hour, body);
      timeline.append(card);
    }
  }

  for (const [field, config] of Object.entries(P.HOME_FIELDS)) {
    const wrapper = document.createElement('div');
    wrapper.className = 'field';
    const label = document.createElement('span');
    label.id = `${field}-label`;
    label.className = 'field-label';
    label.textContent = config.label;
    const dropdown = document.createElement('details');
    dropdown.className = 'custom-dropdown';
    dropdown.id = field;
    const summary = document.createElement('summary');
    summary.setAttribute('aria-labelledby', `${label.id} ${field}-value`);
    const value = document.createElement('span');
    value.id = `${field}-value`;
    value.className = 'dropdown-current placeholder';
    value.textContent = 'Choose one…';
    const caret = document.createElement('span');
    caret.className = 'dropdown-caret';
    caret.setAttribute('aria-hidden', 'true');
    summary.append(value, caret);
    const menu = document.createElement('div');
    menu.className = 'dropdown-menu';
    menu.setAttribute('role', 'group');
    menu.setAttribute('aria-label', config.label);
    for (const option of config.options) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.value = option.id;
      button.textContent = option.label;
      button.addEventListener('click', () => {
        plan = P.selectHomeOption(plan, field, option.id);
        dropdown.open = false;
        render();
        summary.focus();
      });
      menu.append(button);
    }
    dropdown.append(summary, menu);
    dropdown.addEventListener('toggle', () => {
      wrapper.classList.toggle('menu-open', dropdown.open);
      if (dropdown.open) document.querySelectorAll('.custom-dropdown[open]').forEach((other) => { if (other !== dropdown) other.open = false; });
    });
    dropdown.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && dropdown.open) {
        event.preventDefault();
        dropdown.open = false;
        summary.focus();
      } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        dropdown.open = true;
        const buttons = [...menu.querySelectorAll('button')];
        const index = buttons.indexOf(document.activeElement);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : event.key === 'ArrowDown' ? Math.min(index + 1, buttons.length - 1) : index < 0 ? buttons.length - 1 : Math.max(index - 1, 0);
        buttons[next]?.focus();
      }
    });
    wrapper.append(label, dropdown);
    if (field === 'homeActivity') {
      wrapper.classList.add('timeline-activity-field');
      afternoonActivityField = wrapper;
    } else {
      document.querySelector(['homeFood', 'homeOutfit', 'homeMood', 'choreStyle'].includes(field) ? '#home-option-grid' : '#together-option-grid').append(wrapper);
    }
  }
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.custom-dropdown')) document.querySelectorAll('.custom-dropdown[open]').forEach((dropdown) => { dropdown.open = false; });
  });
  document.querySelector('#home-details-form').addEventListener('submit', (event) => {
    event.preventDefault();
    if (current === 'details' && hasAnswer('details')) showStep('ticket');
  });
  const noteInput = document.querySelector('#personal-note');
  noteInput.addEventListener('input', () => {
    try {
      plan = P.selectNote(plan, noteInput.value);
      document.querySelector('#note-count').textContent = `${noteInput.value.length} / 180 characters`;
      document.querySelector('#details-message').textContent = '';
    } catch (error) { document.querySelector('#details-message').textContent = error.message; }
  });
  function renderHomeOptions() {
    for (const field of Object.keys(P.HOME_FIELDS)) {
      const dropdown = document.getElementById(field);
      const selected = P.HOME_FIELDS[field].options.find((option) => option.id === plan.homeOptions[field]);
      const value = dropdown.querySelector('.dropdown-current');
      value.textContent = selected?.label || 'Choose one…';
      value.classList.toggle('placeholder', !selected);
      dropdown.querySelectorAll('.dropdown-menu button').forEach((button) => {
        const chosen = button.dataset.value === selected?.id;
        button.classList.toggle('selected', chosen);
        button.setAttribute('aria-label', `${button.textContent}${chosen ? ', selected' : ''}`);
      });
    }
    if (document.activeElement !== noteInput) noteInput.value = plan.note || '';
    document.querySelector('#note-count').textContent = `${noteInput.value.length} / 180 characters`;
  }

  function renderInvitation() {
    const points = A.getConstellationPoints(plan).map((point) => ({ x: Math.round(point.x * 1000), y: Math.round(point.y * 600) }));
    const constellationPath = document.querySelector('#constellation-path');
    constellationPath.setAttribute('d', points.map((point, index) => `${index ? 'L' : 'M'}${point.x} ${point.y}`).join(' '));
    const constellationPoints = document.querySelector('#constellation-points');
    constellationPoints.replaceChildren(...points.map((point) => {
      const star = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      star.setAttribute('cx', point.x);
      star.setAttribute('cy', point.y);
      star.setAttribute('r', '7');
      return star;
    }));
    const data = [
      ['ticket-date', P.getDate(plan).label],
      ['ticket-time', `${P.getTimeLabel(plan)} · Malaysia Time (UTC+8)`],
      ['ticket-setting', plan.setting === 'out' ? 'Going out' : 'Staying in'],
      ['ticket-route', P.ROUTES[plan.route].title],
      ['ticket-activity', plan.activity || ''],
      ['ticket-food', P.getFood(plan).title],
    ];
    data.forEach(([id, value]) => { document.getElementById(id).textContent = value; });
    scheduleList.replaceChildren();
    for (const slot of P.getSchedule(plan)) {
      const item = document.createElement('li');
      const time = document.createElement('span');
      time.textContent = `${P.formatTime(slot.start)}–${P.formatTime(slot.end)}`;
      const title = document.createElement('strong');
      title.textContent = P.getScheduleTitle(plan, slot);
      item.append(time, title);
      scheduleList.append(item);
    }
    document.querySelector('#ticket-activity-field').hidden = true;
    for (const row of P.getHomeOptionRows(plan).filter((row) => row.field !== 'homeActivity')) document.getElementById(`ticket-${row.field}`).textContent = row.value;
    document.querySelector('#ticket-note-row').hidden = !plan.note;
    document.querySelector('#ticket-note').textContent = plan.note || '';
    if (artworkUrl) URL.revokeObjectURL(artworkUrl);
    artworkUrl = URL.createObjectURL(new Blob([A.buildInvitationSvg(plan)], { type: 'image/svg+xml' }));
    document.querySelector('#art-preview').src = artworkUrl;
    document.querySelector('#art-preview').alt = `Our little universe invitation for ${P.getDate(plan).label}, ${P.getTimeLabel(plan)}`;
  }

  for (const row of P.getHomeOptionRows(plan).filter((row) => row.field !== 'homeActivity')) {
    const container = document.createElement('div');
    const label = document.createElement('span');
    label.textContent = row.label;
    const value = document.createElement('strong');
    value.id = `ticket-${row.field}`;
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.textContent = 'Edit';
    edit.addEventListener('click', () => showStep('details'));
    container.append(label, value, edit);
    document.querySelector('.ticket-summary').append(container);
  }
  const noteRow = document.createElement('div');
  noteRow.id = 'ticket-note-row';
  noteRow.hidden = true;
  const noteLabel = document.createElement('span');
  noteLabel.textContent = '💌 Your note';
  const noteValue = document.createElement('strong');
  noteValue.id = 'ticket-note';
  const noteEdit = document.createElement('button');
  noteEdit.type = 'button';
  noteEdit.textContent = 'Edit';
  noteEdit.addEventListener('click', () => showStep('details'));
  noteRow.append(noteLabel, noteValue, noteEdit);
  document.querySelector('.ticket-summary').append(noteRow);
  const scheduleList = document.createElement('ol');
  scheduleList.id = 'ticket-itinerary';
  scheduleList.className = 'summary-schedule';
  document.getElementById('ticket-itinerary').replaceWith(scheduleList);

  function render() {
    renderSteps();
    renderRecap();
    renderChoices();
    document.querySelector('#page-controls').hidden = current === 'ticket';
    document.querySelector('#back').hidden = current === 'date';
    document.querySelector('#continue').disabled = !hasAnswer(current);
    document.querySelector('#continue').innerHTML = current === 'details' ? 'Make our invitation <span aria-hidden="true">→</span>' : 'Continue <span aria-hidden="true">→</span>';
    stage.dataset.setting = plan.setting || 'none';
    if (P.isComplete(plan)) renderInvitation();
  }

  function finishScene() {
    clearTimeout(sceneTimer);
    stage.classList.remove('cinematic', 'changing');
    stage.classList.add('skipped');
    if (current === 'ticket') stage.classList.add('settled');
    document.querySelector('#skip').hidden = true;
    document.querySelector('#replay').hidden = current !== 'ticket';
  }

  function playScene(duration = 1100) {
    clearTimeout(sceneTimer);
    stage.classList.remove('skipped', 'changing', 'finale', 'settled');
    void stage.offsetWidth;
    stage.classList.add('changing');
    if (current === 'ticket') stage.classList.add('finale');
    if (!fullMotion || document.hidden) return finishScene();
    stage.classList.add('cinematic');
    document.querySelector('#skip').hidden = false;
    document.querySelector('#replay').hidden = true;
    sceneTimer = setTimeout(() => {
      stage.classList.remove('cinematic', 'changing');
      if (current === 'ticket') stage.classList.add('settled');
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
    if (step === 'time') document.querySelector('#time-message').textContent = '';
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
  document.querySelector('#save-image').addEventListener('click', async () => { try { download(pngFile(await getPngBase64()), `our-little-universe-${plan.date}.png`); status.textContent = 'Invitation image saved.'; } catch (error) { status.textContent = error.message; } });
  document.querySelector('#dialog-save-image').addEventListener('click', async () => { try { download(pngFile(await getPngBase64()), `our-little-universe-${plan.date}.png`); emailStatus.textContent = 'Invitation image saved.'; } catch (error) { emailStatus.textContent = error.message; } });
  document.querySelector('#dialog-calendar').addEventListener('click', () => { try { download(calendarFile(), `our-date-${plan.date}.ics`); emailStatus.textContent = 'Calendar event downloaded.'; } catch (error) { emailStatus.textContent = error.message; } });

  async function checkEmailConfig() {
    const help = document.querySelector('#send-help');
    try {
      if (location.hostname.endsWith('.github.io') && !apiBase) throw new Error('unavailable');
      const response = await fetch(apiUrl('/api/status'), { cache: 'no-store' });
      if (!response.ok) throw new Error('unavailable');
      sendAvailable = Boolean((await response.json()).available);
    } catch { sendAvailable = false; }
    document.querySelector('#send-email').disabled = !sendAvailable;
    help.textContent = sendAvailable ? 'Press Send to email the designed invitation, artwork, and calendar event to both addresses.' : 'Direct sending is not set up for this page yet. You can still open a draft, download the designed email, or share the files.';
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
  const visitorEmail = document.querySelector('#visitor-email');
  const recipientError = document.querySelector('#recipient-error');
  function clearRecipientError() {
    recipientError.textContent = '';
    visitorEmail.removeAttribute('aria-invalid');
  }
  function getVisitorEmail(required) {
    if (!required && !visitorEmail.value.trim()) { clearRecipientError(); return null; }
    try {
      const email = E.normalizeRecipient(visitorEmail.value);
      clearRecipientError();
      return email;
    } catch (error) {
      recipientError.textContent = error.message;
      visitorEmail.setAttribute('aria-invalid', 'true');
      visitorEmail.focus();
      return undefined;
    }
  }
  visitorEmail.addEventListener('input', () => { clearRecipientError(); emailStatus.textContent = ''; });
  visitorEmail.addEventListener('blur', () => { if (visitorEmail.value.trim()) getVisitorEmail(false); });
  document.querySelector('#send-email').addEventListener('click', async (event) => {
    if (!sendAvailable) return;
    const email = getVisitorEmail(true);
    if (!email) return;
    const button = event.currentTarget;
    button.disabled = true;
    button.textContent = 'Sending…';
    emailStatus.textContent = '';
    try {
      const png = await getPngBase64();
      const response = await fetch(apiUrl('/api/send'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan, png, email }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The invitation could not be sent');
      const addresses = email === E.RECIPIENT ? E.RECIPIENT : `${email} and ${E.RECIPIENT}`;
      emailStatus.textContent = result.duplicate ? `This invitation was already accepted for ${addresses}.` : `The email provider accepted this invitation for ${addresses}.`;
    } catch (error) { emailStatus.textContent = error.message; }
    finally { button.disabled = false; button.textContent = 'Send to both of us'; }
  });
  document.querySelector('#open-email').addEventListener('click', () => {
    const email = getVisitorEmail(true);
    if (!email) return;
    const subject = `Our little universe | ${P.getDate(plan).label}`;
    const addresses = email && email !== E.RECIPIENT ? `${E.RECIPIENT},${email}` : E.RECIPIENT;
    location.href = `mailto:${addresses}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(E.buildEmailText(plan))}`;
    emailStatus.textContent = 'If your email app opened, review the draft before sending. Add the downloaded artwork and calendar file if you want attachments.';
  });
  document.querySelector('#download-email').addEventListener('click', async () => {
    const email = getVisitorEmail(true);
    if (!email) return;
    try {
      const png = await getPngBase64();
      download(new Blob([E.buildEmailDraft(plan, new Date(), png, email)], { type: 'message/rfc822' }), `our-little-universe-${plan.date}.eml`);
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
