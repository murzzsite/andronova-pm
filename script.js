const LEAD_ENDPOINT = 'https://lead-relay.leestygpt.workers.dev/lead/XS3CHUYDMR';

(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = n => Math.round(n).toLocaleString('ru-RU');

  // ===== UTILS =====
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const header = document.getElementById('header');
  const onScrollHeader = () => header?.classList.toggle('scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScrollHeader, { passive: true });
  onScrollHeader();

  const burger = document.getElementById('burger');
  const nav = document.getElementById('nav');
  burger?.addEventListener('click', () => {
    burger.classList.toggle('is-open');
    nav.classList.toggle('is-open');
  });
  nav?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    burger.classList.remove('is-open');
    nav.classList.remove('is-open');
  }));

  // Phone mask
  document.querySelectorAll('input[type="tel"]').forEach(input => {
    input.addEventListener('input', e => {
      let v = e.target.value.replace(/\D/g, '');
      if (v.startsWith('8')) v = '7' + v.slice(1);
      if (!v.startsWith('7')) v = '7' + v;
      v = v.slice(0, 11);
      let out = '+7';
      if (v.length > 1) out += ' (' + v.slice(1, 4);
      if (v.length >= 4) out += ') ' + v.slice(4, 7);
      if (v.length >= 7) out += '-' + v.slice(7, 9);
      if (v.length >= 9) out += '-' + v.slice(9, 11);
      e.target.value = out;
    });
  });

  // ===== FORM SUBMIT → CLOUDFLARE WORKER → TELEGRAM =====
  const form = document.getElementById('leadForm');
  form?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const orig = btn.textContent;

    const fd = new FormData(form);
    const payload = {};
    fd.forEach((v, k) => { payload[k] = v; });

    if (payload._gotcha) return;

    if (!payload.consent) { alert('Отметьте согласие с политикой конфиденциальности'); return; }
    if (!payload.name || !payload.phone || payload.phone.replace(/\D/g, '').length < 11) {
      alert('Заполните имя и телефон');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Отправляем...';

    try {
      const resp = await fetch(LEAD_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      btn.textContent = 'Заявка отправлена. Перезвоню в ближайшее время';
      form.reset();
    } catch (err) {
      console.error(err);
      btn.textContent = 'Ошибка, попробуйте ещё раз';
    } finally {
      setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 3500);
    }
  });

  // Smooth anchor scroll (eased, own tween)
  const ease = t => 1 - Math.pow(1 - t, 4);
  const scrollToY = y => {
    if (reduce) { window.scrollTo(0, y); return; }
    const from = window.scrollY, d = y - from, dur = Math.min(1100, 350 + Math.abs(d) * 0.25), t0 = performance.now();
    const step = t => {
      const p = Math.min(1, (t - t0) / dur);
      window.scrollTo(0, from + d * ease(p));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const href = a.getAttribute('href');
      if (href.length <= 1) return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      scrollToY(target.getBoundingClientRect().top + window.scrollY - 68);
    });
  });

  // ===== WORD SPLIT (headings) =====
  document.querySelectorAll('[data-split]').forEach(el => {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = words.map((w, i) =>
      `<span class="w" aria-hidden="true"><span class="wi" style="--i:${i}">${w}</span></span>`).join(' ');
  });
  const hero = document.querySelector('.hero__title');
  if (hero) {
    hero.style.setProperty('--base', '700ms');
    requestAnimationFrame(() => requestAnimationFrame(() => hero.classList.add('is-in')));
  }

  // ===== REVEAL (scroll check, надёжнее IntersectionObserver при быстрых прыжках) =====
  const revealSel = '.hero__lead, .hero__act, .hero__proof, .why__item, .zone, .zone__list li, .chip, .calc__text, .calc__result, .calc__range, ' +
    '.prices__sub, .prices__list li, .prices__big, .prices__text, .process__lead, .slip__h, .slip__row, .slip__total, ' +
    '.worth__photo, .worth__text, .worth__list li, .letter__meta, .letter__body p, .letter__sign, .faq__facts li, .faq__item, .faq__act, ' +
    '.faq__tall, .faq__sq, .contact__lead, .field, .form__note, .contact__list li, .contact__card';
  const items = [...document.querySelectorAll(revealSel)];
  // stagger inside the same parent
  const seen = new Map();
  items.forEach(el => {
    el.classList.add('reveal');
    const p = el.parentElement;
    const n = seen.get(p) || 0;
    seen.set(p, n + 1);
    el.style.setProperty('--d', Math.min(n, 8) * 70 + 'ms');
  });
  const splits = [...document.querySelectorAll('[data-split]:not(.hero__title)')];
  const nums = [...document.querySelectorAll('[data-target]')];

  const runNumber = el => {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    const target = parseFloat(el.dataset.target);
    if (Number.isNaN(target)) return;
    const money = el.hasAttribute('data-money');
    if (reduce) { el.textContent = money ? fmt(target) : String(target); return; }
    const dur = 1300, t0 = performance.now();
    const tick = t => {
      const p = Math.min(1, (t - t0) / dur);
      const v = target * (1 - Math.pow(1 - p, 3));
      el.textContent = money ? fmt(v) : String(Math.round(v));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  let ticking = false;
  const check = () => {
    ticking = false;
    const vh = window.innerHeight;
    const lim = vh * 0.92;
    items.forEach(el => {
      if (el.classList.contains('is-visible')) return;
      if (el.getBoundingClientRect().top < lim) el.classList.add('is-visible');
    });
    splits.forEach(el => {
      if (el.classList.contains('is-in')) return;
      if (el.getBoundingClientRect().top < lim) el.classList.add('is-in');
    });
    nums.forEach(el => {
      if (el.dataset.done) return;
      const r = el.getBoundingClientRect();
      if (r.top < lim && r.bottom > 0) runNumber(el);
    });
  };
  const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(check); } };
  window.addEventListener('scroll', req, { passive: true });
  window.addEventListener('resize', req);
  window.addEventListener('load', req);
  check();
  // страховка: если что-то не открылось (например скрытая вкладка), открыть всё через 6 с после загрузки
  setTimeout(() => { items.forEach(el => el.classList.add('is-visible')); splits.forEach(el => el.classList.add('is-in')); }, 6000);

  // ===== STICKY STAGE: смена фото по секциям =====
  const stageImgs = [...document.querySelectorAll('.stage__img')];
  const blocks = [...document.querySelectorAll('[data-photo]')];
  let activeIdx = 0;
  const setActive = i => {
    if (i === activeIdx) return;
    activeIdx = i;
    stageImgs.forEach(img => img.classList.toggle('is-active', Number(img.dataset.i) === i));
  };
  const pickPhoto = () => {
    const mid = window.innerHeight * 0.5;
    let best = 0, bestD = Infinity;
    blocks.forEach(b => {
      const r = b.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      const d = mid >= r.top && mid <= r.bottom ? 0 : Math.min(Math.abs(r.top - mid), Math.abs(r.bottom - mid));
      if (d < bestD) { bestD = d; best = Number(b.dataset.photo); }
    });
    setActive(best);
  };
  window.addEventListener('scroll', pickPhoto, { passive: true });
  window.addEventListener('resize', pickPhoto);
  pickPhoto();

  // ===== PARALLAX: высокое фото в FAQ, дрейф квадратного =====
  const tall = document.querySelector('.faq__tall');
  const sq = document.querySelector('.faq__sq');
  const faqEl = document.getElementById('faq');
  const par = () => {
    if (reduce || !tall || !faqEl) return;
    const r = faqEl.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) return;
    const p = (window.innerHeight - r.top) / (window.innerHeight + r.height) - 0.5;
    tall.style.translate = `0 ${(-p * 50).toFixed(1)}px`;
    if (sq) sq.style.translate = `0 ${(p * 40).toFixed(1)}px`;
  };
  window.addEventListener('scroll', par, { passive: true });
  par();

  // ===== ЗУБЧАТЫЙ КРАЙ ЧЕКА =====
  const slip = document.getElementById('slip');
  const zig = () => {
    if (!slip) return;
    const w = slip.offsetWidth, tooth = 14, n = Math.round(w / 18);
    const pts = ['0 0', '100% 0'];
    for (let i = 0; i <= n; i++) {
      const x = (100 - (100 / n) * i).toFixed(2) + '%';
      pts.push(`${x} calc(100% - ${i % 2 === 0 ? tooth : 0}px)`);
    }
    slip.style.clipPath = `polygon(${pts.join(',')})`;
  };
  zig();
  window.addEventListener('resize', zig);

  // ===== LIVE THING: калькулятор визита и утренних минут =====
  const calc = document.getElementById('calcForm');
  if (calc) {
    const rFirst = document.getElementById('rFirst');
    const rCorr = document.getElementById('rCorr');
    const rHours = document.getElementById('rHours');
    const minsOut = document.getElementById('minsOut');
    const mins = document.getElementById('mins');
    const comment = document.getElementById('comment');
    const cur = { first: 0, corr: 0, hours: 0 };
    const rolling = new Map();

    const roll = (el, key, to, render) => {
      cancelAnimationFrame(rolling.get(key));
      if (reduce) { cur[key] = to; el.textContent = render(to); return; }
      const from = cur[key], t0 = performance.now(), dur = 520;
      const tick = t => {
        const p = Math.min(1, (t - t0) / dur);
        const v = from + (to - from) * (1 - Math.pow(1 - p, 3));
        el.textContent = render(v);
        if (p < 1) rolling.set(key, requestAnimationFrame(tick)); else cur[key] = to;
      };
      rolling.set(key, requestAnimationFrame(tick));
    };
    const plural = (n, a, b, c) => {
      const m = n % 100, d = n % 10;
      if (m > 10 && m < 20) return c;
      if (d === 1) return a;
      if (d >= 2 && d <= 4) return b;
      return c;
    };

    const update = () => {
      let first = 0, zones = 0;
      const picked = [];
      calc.querySelectorAll('input[type=checkbox]:checked').forEach(i => {
        first += Number(i.dataset.price); zones++;
        picked.push(i.name === 'brows' ? 'Брови' : 'Губы');
      });
      const eye = calc.querySelector('input[name=eyes]:checked');
      if (eye && Number(eye.dataset.price) > 0) { first += Number(eye.dataset.price); zones++; picked.push(eye.value); }
      const m = Number(mins.value);
      const hours = Math.round(m * 365 / 60);

      roll(rFirst, 'first', first, v => fmt(v) + ' ₽');
      roll(rCorr, 'corr', zones * 5000, v => fmt(v) + ' ₽');
      roll(rHours, 'hours', hours, v => { const h = Math.round(v); return h + ' ' + plural(h, 'час', 'часа', 'часов'); });
      minsOut.textContent = m + ' ' + plural(m, 'минута', 'минуты', 'минут');
      mins.style.setProperty('--v', (m / 40 * 100) + '%');
      calc.dataset.pick = picked.join(', ');
    };
    calc.addEventListener('input', update);
    calc.addEventListener('change', update);
    update();

    document.getElementById('calcGo')?.addEventListener('click', () => {
      const pick = calc.dataset.pick;
      if (pick && comment && !comment.value) comment.value = pick;
    });
  }
  // cookie notice
  const cookie = document.getElementById('cookie');
  try { if (cookie && !localStorage.getItem('cookieOk')) cookie.hidden = false; } catch (e) { if (cookie) cookie.hidden = false; }
  document.getElementById('cookieOk')?.addEventListener('click', () => { cookie.hidden = true; try { localStorage.setItem('cookieOk', '1'); } catch (e) {} });
})();
