(() => {
  'use strict';
  const P = window.DateRailwayPlanner;
  const E = window.DateRailwayEmail;
  const book = document.querySelector('#book');
  const cover = document.querySelector('#book-cover');
  const spread = document.querySelector('#spread');
  const pageBody = document.querySelector('#page-body');
  const controls = document.querySelector('#page-controls');
  const continueButton = document.querySelector('#continue');
  const backButton = document.querySelector('#back');
  const stops = document.querySelector('#stops');
  const finalStep = document.querySelector('[data-step="ticket"]');
  const trainScene = document.querySelector('#train-scene');
  const train = document.querySelector('#train');
  const wheels = [...train.querySelectorAll('[data-wheel]')];
  const rod = document.querySelector('#drive-rod');
  const ticket = document.querySelector('#ticket');
  const status = document.querySelector('#status');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const forceMotion = new URLSearchParams(window.location.search).get('motion') === 'full';
  if (forceMotion) document.documentElement.classList.add('motion-full');
  const motionReduced = () => reducedMotion.matches && !forceMotion;
  document.querySelector('#motion-link').hidden = !motionReduced();
  const stopNames = { date: 'Day', setting: 'Mood', route: 'Route', activity: 'Activity', food: 'Lunch', time: 'Time', ticket: 'Ticket' };
  const presetActivities = ['Bead art', 'Rock climbing', 'Pottery'];
  let plan = P.createPlan();
  let current = 'date';
  let opened = false;
  let turnTimer = 0;
  let finaleFrame = 0;
  let deliveryTimer = 0;
  let lastSteam = 0;

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

  function renderStops() {
    const route = P.getSteps(plan);
    stops.replaceChildren();
    route.forEach((step, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'stop';
      button.textContent = stopNames[step];
      button.disabled = !canReach(step);
      if (step === current) {
        button.classList.add('current');
        button.setAttribute('aria-current', 'step');
      } else if (hasAnswer(step)) {
        button.classList.add('complete');
      }
      button.setAttribute('aria-label', `Stop ${index + 1}: ${stopNames[step]}`);
      button.addEventListener('click', () => showStep(step));
      stops.append(button);
    });
    document.querySelector('#page-number').textContent = `${String(Math.max(1, route.indexOf(current) + 1)).padStart(2, '0')} / ${String(route.length).padStart(2, '0')}`;
  }

  function renderRouteList() {
    const lines = [
      ['Departure', P.getDate(plan)?.short],
      ['Time', P.getTimeLabel(plan)],
      ['Mood', plan.setting === 'out' ? 'Out together' : plan.setting === 'home' ? 'At home together' : null],
      ['Route', plan.route ? P.ROUTES[plan.route].short : null],
      ...(plan.route === 'explore' ? [['Activity', plan.activity]] : []),
      ['Lunch', P.getFood(plan)?.title],
    ];
    for (const list of [document.querySelector('#route-list'), document.querySelector('#mobile-route-list')]) {
      list.replaceChildren();
      lines.forEach(([label, answer]) => {
        const item = document.createElement('li');
        const name = document.createElement('span');
        const value = document.createElement('span');
        name.className = 'label';
        name.textContent = label;
        value.className = `answer${answer ? '' : ' unfilled'}`;
        value.textContent = answer || 'To be chosen';
        item.append(name, value);
        list.append(item);
      });
    }
    const compact = [
      P.getDate(plan)?.short,
      P.getTimeLabel(plan),
      plan.route ? P.ROUTES[plan.route].short : plan.setting === 'out' ? 'Out together' : plan.setting === 'home' ? 'Stay in together' : null,
    ].filter(Boolean);
    document.querySelector('#mobile-summary-text').textContent = compact.join(' · ') || 'Choose a day to begin';
  }

  function renderChoices() {
    document.querySelectorAll('[data-choice]').forEach((button) => {
      const field = button.dataset.choice;
      const selected = plan[field] === button.dataset.value;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
      if (field === 'date') button.disabled = P.isExpired(button.dataset.value);
    });
    document.querySelectorAll('[data-for]').forEach((button) => {
      button.hidden = button.dataset.for !== plan.setting;
    });
    const customSelected = Boolean(plan.activity && !presetActivities.includes(plan.activity));
    const customButton = document.querySelector('#custom-choice');
    customButton.classList.toggle('selected', customSelected);
    customButton.setAttribute('aria-pressed', String(customSelected));
    const activityInput = document.querySelector('#custom-activity');
    if (customSelected && document.activeElement !== activityInput) activityInput.value = plan.activity;
    const allExpired = P.DATES.every((date) => P.isExpired(date.iso));
    document.querySelector('#date-message').textContent = allExpired ? 'These dates have passed. Ask for an updated invitation.' : '';
    document.querySelector('#food-heading').textContent = plan.setting === 'home' ? 'How should we do lunch?' : 'Which café should we try?';
    document.querySelector('#food-lead').textContent = plan.setting === 'home' ? 'A little outing, or lunch delivered to our door?' : 'A familiar favourite, or somewhere new?';
    document.querySelector('#tufting-note').hidden = plan.route !== 'tufting';
  }

  function renderTicket() {
    document.querySelector('#ticket-date').textContent = P.getDate(plan)?.label || '';
    document.querySelector('#ticket-time').textContent = P.getTimeLabel(plan) || '';
    document.querySelector('#ticket-setting').textContent = plan.setting === 'out' ? 'Out together' : 'Stay in together';
    document.querySelector('#ticket-route').textContent = P.ROUTES[plan.route]?.title || '';
    document.querySelector('#ticket-activity').textContent = plan.activity || '';
    document.querySelector('#ticket-activity-field').hidden = plan.route !== 'explore';
    document.querySelector('#ticket-food').textContent = P.getFood(plan)?.title || '';
    document.querySelector('#ticket-itinerary').textContent = P.getItinerary(plan);
  }

  function renderControls() {
    controls.hidden = current === 'ticket';
    backButton.hidden = current === 'date';
    continueButton.disabled = !hasAnswer(current);
    continueButton.innerHTML = current === 'time' ? 'Make our ticket <span aria-hidden="true">→</span>' : 'Continue <span aria-hidden="true">→</span>';
  }

  function render() {
    renderStops();
    renderRouteList();
    renderChoices();
    renderControls();
    if (P.isComplete(plan)) renderTicket();
  }

  function removeTurningLeaf() {
    window.clearTimeout(turnTimer);
    pageBody.querySelector('.turning-leaf')?.remove();
  }

  function showStep(step, options = {}) {
    if (!canReach(step)) return;
    const previous = current;
    if (previous === step && !options.initial) return;
    if (previous === 'ticket') stopFinale();
    const oldElement = document.querySelector(`.step[data-step="${previous}"]`);
    const newElement = document.querySelector(`.step[data-step="${step}"]`);
    const oldIndex = P.getSteps(plan).indexOf(previous);
    const newIndex = P.getSteps(plan).indexOf(step);
    removeTurningLeaf();
    if (!options.initial && !motionReduced() && window.innerWidth > 700 && oldIndex >= 0) {
      const leaf = document.createElement('div');
      const direction = newIndex < oldIndex ? 'backward' : 'forward';
      leaf.className = `turning-leaf ${direction}`;
      leaf.setAttribute('aria-hidden', 'true');
      leaf.inert = true;
      const content = (direction === 'forward' ? oldElement : newElement).cloneNode(true);
      content.hidden = false;
      content.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
      leaf.append(content);
      pageBody.append(leaf);
      turnTimer = window.setTimeout(removeTurningLeaf, 700);
    }
    oldElement.hidden = true;
    newElement.hidden = false;
    current = step;
    status.textContent = '';
    if (step === 'time') {
      document.querySelector('#start-time').value = plan.startTime || '';
      document.querySelector('#end-time').value = plan.endTime || '';
      document.querySelector('#time-message').textContent = '';
    }
    render();
    if (step === 'ticket') playFinale();
    window.scrollTo({ top: 0, behavior: 'instant' });
    const delay = motionReduced() ? 0 : window.innerWidth <= 700 ? 100 : 520;
    window.setTimeout(() => newElement.querySelector('h2')?.focus({ preventScroll: false }), delay);
  }

  function selectChoice(button) {
    const field = button.dataset.choice;
    const value = button.dataset.value;
    try {
      if (field === 'date') {
        if (P.isExpired(value)) return;
        plan = P.selectDate(plan, value);
      } else if (field === 'setting') plan = P.selectSetting(plan, value);
      else if (field === 'route') plan = P.selectRoute(plan, value);
      else if (field === 'activity') plan = P.selectActivity(plan, value);
      else if (field === 'food') plan = P.selectFood(plan, value);
      document.querySelector('#custom-form').hidden = true;
      render();
    } catch (error) {
      status.textContent = error.message;
    }
  }

  function resetSteam() {
    trainScene.querySelectorAll('.steam-puff').forEach((puff) => puff.remove());
  }

  function placeTrain(x, distance) {
    train.style.transform = `translateX(${x}px)`;
    const angle = distance / (15 * 260 / 300);
    const degrees = angle * 180 / Math.PI;
    wheels.forEach((wheel) => wheel.setAttribute('transform', `rotate(${degrees} ${wheel.dataset.wheel} 96)`));
    const crankX = 6 * Math.cos(angle);
    const crankY = 6 * Math.sin(angle);
    rod.setAttribute('x1', String(130 + crankX));
    rod.setAttribute('y1', String(96 + crankY));
    rod.setAttribute('x2', String(208 + crankX));
    rod.setAttribute('y2', String(96 + crankY));
  }

  function releaseSteam(x) {
    if (trainScene.querySelectorAll('.steam-puff').length >= 5) return;
    const puff = document.createElement('span');
    puff.className = 'steam-puff';
    puff.style.left = `${x + 152}px`;
    puff.style.top = `${trainScene.clientHeight - 113}px`;
    trainScene.append(puff);
    const animation = puff.animate([
      { opacity: 0, transform: 'translate(0, 0) scale(.55)' },
      { opacity: .74, offset: .25 },
      { opacity: 0, transform: 'translate(-22px, -37px) scale(1.8)' },
    ], { duration: 700, easing: 'ease-out' });
    animation.finished.then(() => puff.remove()).catch(() => puff.remove());
  }

  function stopFinale() {
    window.cancelAnimationFrame(finaleFrame);
    window.clearTimeout(deliveryTimer);
    finaleFrame = 0;
    ticket.getAnimations().forEach((animation) => animation.cancel());
    resetSteam();
  }

  function showDelivered() {
    finalStep.classList.add('delivered');
    trainScene.classList.add('delivered');
    document.querySelector('#skip').hidden = true;
    document.querySelector('#replay').hidden = false;
    status.textContent = 'Your ticket is ready.';
  }

  function finishFinale(immediate = false) {
    window.cancelAnimationFrame(finaleFrame);
    window.clearTimeout(deliveryTimer);
    finaleFrame = 0;
    resetSteam();
    const endX = Math.max(6, (trainScene.clientWidth - 260) / 2);
    placeTrain(endX, endX + 260);
    if (immediate || motionReduced()) {
      showDelivered();
      return;
    }
    deliveryTimer = window.setTimeout(() => {
      showDelivered();
      const animation = ticket.animate([
        { opacity: 1, transform: 'translateY(-18px) rotate(-.3deg)', clipPath: 'inset(0 0 100% 0)' },
        { opacity: 1, transform: 'translateY(5px) rotate(.15deg)', clipPath: 'inset(0 0 0 0)', offset: .84 },
        { opacity: 1, transform: 'none', clipPath: 'inset(0 0 0 0)' },
      ], { duration: 490, easing: 'cubic-bezier(.17,.8,.28,1)', fill: 'both' });
      animation.finished.then(() => animation.cancel()).catch(() => {});
    }, 120);
  }

  function playFinale() {
    stopFinale();
    finalStep.classList.remove('delivered');
    trainScene.classList.remove('delivered');
    document.querySelector('#skip').hidden = motionReduced();
    document.querySelector('#replay').hidden = !motionReduced();
    status.textContent = '';
    const startX = -260;
    placeTrain(startX, 0);
    if (motionReduced()) return finishFinale(true);
    const endX = Math.max(6, (trainScene.clientWidth - 260) / 2);
    const travel = endX - startX;
    const duration = 1130;
    let start = null;
    lastSteam = 0;
    const frame = (time) => {
      if (start === null) start = time;
      const progress = Math.min(1, (time - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const x = startX + travel * eased;
      placeTrain(x, x - startX);
      if (progress > .12 && progress < .83 && time - lastSteam > 160) {
        releaseSteam(x);
        lastSteam = time;
      }
      if (progress < 1) finaleFrame = window.requestAnimationFrame(frame);
      else finishFinale();
    };
    finaleFrame = window.requestAnimationFrame(frame);
  }

  document.querySelector('#open-book').addEventListener('click', () => {
    if (opened) return;
    opened = true;
    book.classList.add('is-open');
    cover.inert = true;
    spread.inert = false;
    const delay = motionReduced() ? 0 : 780;
    window.setTimeout(() => book.classList.add('opened'), delay);
    window.setTimeout(() => document.querySelector('#date-heading').focus({ preventScroll: false }), delay);
  });

  document.querySelectorAll('[data-choice]').forEach((button) => button.addEventListener('click', () => selectChoice(button)));
  document.querySelector('#custom-choice').addEventListener('click', () => {
    const form = document.querySelector('#custom-form');
    form.hidden = false;
    document.querySelector('#custom-activity').focus();
  });
  document.querySelector('#custom-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const input = document.querySelector('#custom-activity');
    try {
      plan = P.selectActivity(plan, input.value);
      document.querySelector('#custom-form').hidden = true;
      render();
    } catch (error) {
      input.setCustomValidity(error.message);
      input.reportValidity();
      input.setCustomValidity('');
    }
  });
  function updateTime() {
    const startTime = document.querySelector('#start-time').value;
    const endTime = document.querySelector('#end-time').value;
    const message = document.querySelector('#time-message');
    try {
      if (!startTime || !endTime) {
        plan = P.selectTime(plan, null, null);
        message.textContent = 'Choose both times to continue.';
      } else {
        plan = P.selectTime(plan, startTime, endTime);
        message.textContent = '';
      }
    } catch (error) {
      plan = P.selectTime(plan, null, null);
      message.textContent = error.message;
    }
    render();
  }
  document.querySelector('#start-time').addEventListener('input', updateTime);
  document.querySelector('#end-time').addEventListener('input', updateTime);
  continueButton.addEventListener('click', () => {
    if (!hasAnswer(current)) return;
    const route = P.getSteps(plan);
    showStep(route[route.indexOf(current) + 1]);
  });
  backButton.addEventListener('click', () => {
    const route = P.getSteps(plan);
    showStep(route[route.indexOf(current) - 1]);
  });
  document.querySelectorAll('[data-edit]').forEach((button) => button.addEventListener('click', () => showStep(button.dataset.edit)));
  document.querySelector('#skip').addEventListener('click', () => finishFinale(true));
  document.querySelector('#replay').addEventListener('click', playFinale);
  function downloadContent(content, type, filename) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  document.querySelector('#email').addEventListener('click', () => {
    try {
      const draft = E.buildEmailDraft(plan);
      downloadContent(draft, 'message/rfc822;charset=utf-8', `our-date-${plan.date}.eml`);
      status.textContent = 'Email draft downloaded for modquack@gmail.com. Open it in your email app, review it, and press Send.';
    } catch (error) {
      status.textContent = error.message;
    }
  });
  document.querySelector('#calendar').addEventListener('click', () => {
    try {
      const calendar = P.buildCalendar(plan);
      downloadContent(calendar, 'text/calendar;charset=utf-8', `our-date-${plan.date}.ics`);
      status.textContent = 'Calendar file downloaded for the date shown above.';
    } catch (error) {
      status.textContent = error.message;
    }
  });

  window.addEventListener('resize', () => {
    if (current === 'ticket' && finalStep.classList.contains('delivered')) {
      const x = Math.max(6, (trainScene.clientWidth - 260) / 2);
      placeTrain(x, x + 260);
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && current === 'ticket' && !finalStep.classList.contains('delivered')) finishFinale(true);
  });
  reducedMotion.addEventListener('change', () => {
    document.querySelector('#motion-link').hidden = !motionReduced();
    if (motionReduced() && current === 'ticket' && !finalStep.classList.contains('delivered')) finishFinale(true);
  });

  render();
})();
