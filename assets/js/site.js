/* HabitGlass site behaviour. No dependencies, no analytics, nothing phones home. */
(function () {
  'use strict';

  var root = document.documentElement;
  var STORE = 'hg-theme';
  var SHOT_DIR = (root.dataset.assets || 'assets') + '/shots/';

  /* ---------------------------------------------------------------- theme */

  function currentTheme() {
    return root.dataset.theme === 'light' ? 'light' : 'dark';
  }

  /* Swap every screenshot for its captured counterpart in the other appearance.
     Overriding source.media pins our choice over the OS preference. */
  function applyShots(theme) {
    var pics = document.querySelectorAll('picture[data-shot]');
    for (var i = 0; i < pics.length; i++) {
      var src = pics[i].querySelector('source');
      if (!src) continue;
      src.media = 'all';
      src.srcset = SHOT_DIR + pics[i].dataset.shot + '-' + theme + '.webp';
    }
  }

  function syncToggle(theme) {
    var btns = document.querySelectorAll('[data-set-theme]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute('aria-pressed', String(btns[i].dataset.setTheme === theme));
    }
  }

  function setTheme(theme, persist) {
    root.dataset.theme = theme;
    applyShots(theme);
    applyFilm(theme);
    syncToggle(theme);
    if (persist) {
      try {
        localStorage.setItem(STORE, theme);
      } catch (e) {
        /* private browsing, whatever */
      }
    }
  }

  /* --------------------------------------------------------------- film */

  /* The hero film autoplays muted on load, once, with no player chrome.
     Sound and replay are explicit buttons. Reduced motion stays on the
     poster. Each appearance has its own cut; a theme flip keeps the place. */

  var film = document.querySelector('[data-intro-film]');
  var filmReplay = document.querySelector('[data-film-replay]');
  var filmSound = document.querySelector('[data-film-sound]');
  var FILM_DIR = (root.dataset.assets || 'assets') + '/video/';

  function applyFilm(theme) {
    if (!film) return;
    var src = FILM_DIR + film.dataset.film + '-' + theme + '.mp4';
    film.poster = FILM_DIR + film.dataset.film + '-poster-' + theme + '.jpg';
    var source = film.querySelector('source');
    if (source.getAttribute('src') === src) return;
    var at = film.currentTime;
    var playing = !film.paused && !film.ended;
    var ended = film.ended;
    source.setAttribute('src', src);
    film.load();
    if (!at && !ended) return;
    film.addEventListener('loadedmetadata', function () {
      film.currentTime = ended ? film.duration : at;
      if (playing) film.play().catch(function () {});
    }, { once: true });
  }

  if (film && filmReplay && filmSound) {
    film.controls = false;
    film.removeAttribute('controls');
    film.loop = false;
    film.muted = true;
    var syncFilm = function () {
      filmReplay.textContent = film.ended ? 'Replay' : film.paused ? 'Play' : 'Pause';
      filmSound.textContent = film.muted ? 'Sound on' : 'Mute';
    };
    ['play', 'pause', 'ended', 'seeking', 'emptied', 'volumechange'].forEach(function (type) {
      film.addEventListener(type, syncFilm);
    });
    filmReplay.addEventListener('click', function () {
      if (film.ended) film.currentTime = 0;
      if (film.paused) film.play().catch(function () {});
      else film.pause();
    });
    filmSound.addEventListener('click', function () {
      if (film.ended) film.currentTime = 0;
      film.muted = !film.muted;
      if (!film.muted && film.paused) film.play().catch(function () {});
    });
    applyFilm(currentTheme());
    syncFilm();
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) film.play().catch(function () {});
  }

  syncToggle(currentTheme());
  applyShots(currentTheme());

  document.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('[data-set-theme]') : null;
    if (btn) setTheme(btn.dataset.setTheme, true);
  });

  /* Warm the other appearance so the flip is instant. */
  var warm = function () {
    var other = currentTheme() === 'dark' ? 'light' : 'dark';
    var pics = document.querySelectorAll('picture[data-shot]');
    for (var i = 0; i < pics.length; i++) {
      new Image().src = SHOT_DIR + pics[i].dataset.shot + '-' + other + '.webp';
    }
  };
  if ('requestIdleCallback' in window) requestIdleCallback(warm, { timeout: 3000 });
  else setTimeout(warm, 2500);

  /* --------------------------------------------------------------- header */

  var head = document.querySelector('.site-head');
  if (head) {
    var onScroll = function () {
      head.classList.toggle('is-stuck', window.scrollY > 12);
    };
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
    /* The hero fills the screen under the header, so it needs its height. */
    var measureHead = function () {
      document.documentElement.style.setProperty('--head-h', head.offsetHeight + 'px');
    };
    measureHead();
    addEventListener('resize', measureHead);
  }

  var menuBtn = document.querySelector('[data-menu-toggle]');
  var menu = document.getElementById('mobile-menu');
  if (menuBtn && menu) {
    var setMenu = function (open) {
      menuBtn.setAttribute('aria-expanded', String(open));
      menu.hidden = !open;
    };
    menuBtn.addEventListener('click', function () {
      setMenu(menuBtn.getAttribute('aria-expanded') !== 'true');
    });
    menu.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') setMenu(false);
    });
    addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setMenu(false);
    });
  }

  /* --------------------------------------------------------- nav underline */

  var nav = document.querySelector('.nav');
  if (nav) {
    var navLinks = nav.querySelectorAll('a');
    var bar = document.createElement('span');
    bar.className = 'nav-indicator';
    bar.setAttribute('aria-hidden', 'true');
    nav.appendChild(bar);

    var activeLink = null;

    var place = function (link) {
      if (!link) {
        bar.classList.remove('on');
        return;
      }
      bar.style.setProperty('--nav-x', link.offsetLeft + 'px');
      bar.style.setProperty('--nav-w', link.offsetWidth + 'px');
      bar.classList.add('on');
    };

    var setActive = function (link) {
      if (activeLink === link) return;
      if (activeLink) activeLink.classList.remove('is-active');
      activeLink = link;
      if (activeLink) activeLink.classList.add('is-active');
      place(activeLink);
    };

    for (var n = 0; n < navLinks.length; n++) {
      navLinks[n].addEventListener('pointerenter', function (e) {
        place(e.currentTarget);
      });
      navLinks[n].addEventListener('focus', function (e) {
        place(e.currentTarget);
      });
    }
    nav.addEventListener('pointerleave', function () {
      place(activeLink);
    });
    nav.addEventListener('focusout', function (e) {
      if (!nav.contains(e.relatedTarget)) place(activeLink);
    });

    /* Scrollspy: link wins when its section passes 35% down the viewport.
       Cross-page links (Releases) never activate from scrolling. */
    var spy = [];
    for (var s = 0; s < navLinks.length; s++) {
      var hash = navLinks[s].getAttribute('href') || '';
      if (hash.charAt(0) !== '#') continue;
      var sec = document.querySelector(hash);
      if (sec) spy.push({ link: navLinks[s], section: sec });
    }

    var syncSpy = function () {
      var mark = window.scrollY + window.innerHeight * 0.35;
      var winner = null;
      for (var i = 0; i < spy.length; i++) {
        if (spy[i].section.offsetTop <= mark) winner = spy[i].link;
      }
      /* Above the first section (hero) nothing has won yet — first link owns it.
         On other pages the link for the page itself stays lit. */
      setActive(winner || nav.querySelector('[aria-current="page"]') || (spy.length ? spy[0].link : null));
    };

    syncSpy();
    var spyTick = false;
    addEventListener('scroll', function () {
      if (spyTick) return;
      spyTick = true;
      requestAnimationFrame(function () {
        spyTick = false;
        syncSpy();
      });
    }, { passive: true });
    addEventListener('resize', function () {
      place(activeLink);
    });
  }

  /* --------------------------------------------------------------- reveal */

  var targets = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) ||
      matchMedia('(prefers-reduced-motion: reduce)').matches) {
    for (var r = 0; r < targets.length; r++) targets[r].classList.add('in');
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    for (var t = 0; t < targets.length; t++) io.observe(targets[t]);
  }

  var releaseEntries = document.querySelectorAll('.release-stream .release-entry');
  for (var re = 0; re < releaseEntries.length; re++) {
    (function (entry, index) {
      var meta = entry.querySelector('.release-meta');
      var card = entry.querySelector('.release-card');
      var title = entry.querySelector('h2');
      if (!meta || !card || !title) return;
      var titleID = title.id;

      var panel = document.createElement('div');
      panel.className = 'release-panel';
      panel.id = 'release-panel-' + titleID;
      entry.insertBefore(panel, card);
      while (panel.nextElementSibling) panel.appendChild(panel.nextElementSibling);

      var button = document.createElement('button');
      button.className = 'release-toggle';
      button.type = 'button';
      button.setAttribute('aria-expanded', String(index === 0));
      button.setAttribute('aria-controls', panel.id);
      var version = meta.querySelector('.release-version');
      var status = meta.querySelector('.release-status');
      var releaseDate = meta.querySelector('time');
      button.setAttribute('aria-label', [version && version.textContent.trim(), title.textContent.trim(), status && status.textContent.trim()].filter(Boolean).join(', '));
      button.innerHTML = '<span class="release-toggle-copy"><span class="release-toggle-line"><span class="release-version"></span><span class="release-toggle-title"></span></span><span class="release-toggle-details"></span><span class="release-toggle-teaser" aria-hidden="true"></span></span><svg class="chev" aria-hidden="true"><use href="#i-chev"/></svg>';
      var line = button.querySelector('.release-toggle-line');
      if (version) line.replaceChild(version, line.querySelector('.release-version'));
      button.querySelector('.release-toggle-title').textContent = title.textContent.trim();
      if (status) line.appendChild(status);
      button.querySelector('.release-toggle-teaser').textContent = (entry.querySelector('.release-copy > .lede') || entry.querySelector('.release-card .lede') || title).textContent.trim();
      var details = button.querySelector('.release-toggle-details');
      if (releaseDate) details.appendChild(releaseDate);
      var heading = document.createElement('h2');
      heading.id = titleID;
      heading.appendChild(button);
      meta.after(heading);
      meta.remove();
      entry.classList.add('release-enhanced');
      var panelTitle = panel.querySelector('h2');
      if (panelTitle) {
        panelTitle.hidden = true;
        panelTitle.removeAttribute('id');
        panelTitle.setAttribute('aria-hidden', 'true');
      }
      panel.hidden = index !== 0;
      button.addEventListener('click', function () {
        var expanded = button.getAttribute('aria-expanded') === 'true';
        button.setAttribute('aria-expanded', String(!expanded));
        panel.hidden = expanded;
        if (!expanded) {
          entry.classList.add('in');
          if (io) io.unobserve(entry);
        }
      });
    })(releaseEntries[re], re);
  }

  function openLinkedRelease() {
    var target = document.getElementById(location.hash.slice(1));
    if (!target) return;
    var entry = target.closest('.release-entry');
    var button = entry && entry.querySelector('.release-toggle');
    var panel = entry && entry.querySelector('.release-panel');
    if (!button || !panel) return;
    button.setAttribute('aria-expanded', 'true');
    panel.hidden = false;
    entry.classList.add('in');
    requestAnimationFrame(function () { target.scrollIntoView(); });
  }
  addEventListener('hashchange', openLinkedRelease);
  openLinkedRelease();

  /* ------------------------------------------------------------ day bars */

  var reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* The app draws a month as one bar per day, and every motif on the site is
     a run of them. A seed spells the days out: 1 done, p partial, - rest,
     0 nothing logged, which reads as missed before today and open from today
     on. States and the live streak follow the app's MonthDay. */
  function parseDays(seed, today) {
    var days = [];
    for (var i = 0; i < seed.length; i++) {
      var ch = seed.charAt(i);
      var s = ch === '1' ? 'done' : ch === 'p' ? 'partial' : ch === '-' ? 'rest' : i < today ? 'missed' : 'open';
      days.push({ s: s, r: ch === 'p' ? 0.4 : 0, today: i === today, future: i > today });
    }
    return days;
  }

  /* The streak that's still alive: done days join, rest days and today while
     it's open don't break it, a miss (or a partial day that's over) does.
     Returns its span and how many done days it holds. */
  function liveRun(days) {
    var from = -1;
    var to = -1;
    var count = 0;
    for (var i = 0; i < days.length; i++) {
      var d = days[i];
      if (d.s === 'done') {
        if (from < 0) from = i;
        to = i;
        count++;
      } else if (d.s === 'missed' || (d.s === 'partial' && !d.today)) {
        from = to = -1;
        count = 0;
      }
    }
    return { from: from, to: to, count: count };
  }

  function bestRun(days) {
    var run = 0;
    var best = 0;
    for (var i = 0; i < days.length; i++) {
      if (days[i].s === 'done') best = Math.max(best, ++run);
      else if (days[i].s !== 'rest' && !days[i].today) run = 0;
    }
    return best;
  }

  /* "18/20 days": due days so far, counting today only once it's done. */
  function tally(days) {
    var done = 0;
    var due = 0;
    for (var i = 0; i < days.length; i++) {
      var d = days[i];
      if (d.s === 'done') done++;
      if (d.s === 'done' || (!d.today && !d.future && d.s !== 'rest')) due++;
    }
    return { done: done, due: due };
  }

  function makeBar(tag, color) {
    var el = document.createElement(tag);
    el.className = 'bar';
    if (color) el.style.setProperty('--c', color);
    return el;
  }

  /* `hold` draws the state but leaves the fill empty, for runs that fill in
     when they come into view. */
  function drawDays(bars, days, hold) {
    var link = liveRun(days);
    for (var i = 0; i < days.length; i++) {
      var d = days[i];
      var el = bars[i];
      el.dataset.s = d.s;
      el.classList.toggle('today', d.today);
      el.classList.toggle('future', d.future);
      /* Days outside the live streak step back, as they do on the card. */
      el.classList.toggle('lit', d.today || (link.to - link.from >= 1 && i >= link.from && i <= link.to));
      el.style.setProperty('--fill', hold ? 0 : d.s === 'done' ? 1 : d.s === 'partial' ? d.r : 0);
      if (el.tagName === 'BUTTON') el.setAttribute('aria-pressed', String(d.s === 'done'));
    }
    return link;
  }

  function plural(n, unit) {
    return n + ' ' + unit + (n === 1 ? '' : 's');
  }

  /* ---------------------------------------------------------- month demo */

  var field = document.querySelector('[data-field]');
  if (field) {
    var TODAY = (+field.dataset.today || field.dataset.seed.length) - 1;
    var DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    /* Weekday of the first day, Monday 0. 1 September 2026 is a Tuesday. */
    var FIRST = field.dataset.first ? +field.dataset.first : -1;
    var monthDays = parseDays(field.dataset.seed, TODAY);
    var bars = [];
    var taps = [];

    for (var i = 0; i < monthDays.length; i++) {
      var d = monthDays[i];
      var tappable = !d.future && d.s !== 'rest';
      var b = makeBar(tappable ? 'button' : 'span');
      if (tappable) {
        b.type = 'button';
        b.tabIndex = d.today ? 0 : -1;
        b.dataset.i = i;
        b.setAttribute(
          'aria-label',
          (FIRST >= 0 ? DAY_NAMES[(FIRST + i) % 7] + ' ' + (i + 1) + ' September' : 'Day ' + (i + 1)) +
            (d.today ? ', today' : '')
        );
        taps.push(b);
      }
      field.appendChild(b);
      bars.push(b);
    }

    var out = {};
    var outs = document.querySelectorAll('[data-out]');
    for (var o = 0; o < outs.length; o++) out[outs[o].dataset.out] = outs[o];
    var put = function (key, value) {
      if (out[key]) out[key].textContent = value;
    };

    var render = function () {
      var link = drawDays(bars, monthDays);
      var t = tally(monthDays);
      put('done', t.done);
      put('due', t.due);
      put('streak', plural(link.count, 'day'));
      put('days', t.done);
      put('best', bestRun(monthDays));
      put('rate', (t.due ? Math.round((t.done / t.due) * 100) : 0) + '%');
    };

    var setDay = function (i, on) {
      var day = monthDays[i];
      var next = on ? 'done' : day.today ? 'open' : 'missed';
      if (day.s === next) return;
      day.s = next;
      render();
    };

    /* A press lands on the nearest tappable day, so the gaps between bars
       count too, and a drag paints that day's new state across the rest. */
    var nearest = function (x) {
      var best = null;
      var bestD = Infinity;
      for (var n = 0; n < taps.length; n++) {
        var r = taps[n].getBoundingClientRect();
        var dist = Math.abs(x - (r.left + r.width / 2));
        if (dist < bestD) {
          bestD = dist;
          best = taps[n];
        }
      }
      return best ? +best.dataset.i : -1;
    };

    var painting = null;
    field.addEventListener('pointerdown', function (e) {
      if (e.button) return;
      var i = nearest(e.clientX);
      if (i < 0) return;
      painting = monthDays[i].s !== 'done';
      setDay(i, painting);
      field.setPointerCapture(e.pointerId);
    });
    field.addEventListener('pointermove', function (e) {
      if (painting === null) return;
      setDay(nearest(e.clientX), painting);
    });
    var stopPaint = function () {
      painting = null;
    };
    field.addEventListener('pointerup', stopPaint);
    field.addEventListener('pointercancel', stopPaint);

    /* Keyboard: Enter or Space toggles (a click with no pointer behind it),
       arrows move between days. Pointer clicks are handled above. */
    field.addEventListener('click', function (e) {
      var btn = e.target.closest('button.bar');
      if (!btn || e.detail !== 0) return;
      var i = +btn.dataset.i;
      setDay(i, monthDays[i].s !== 'done');
    });
    field.addEventListener('keydown', function (e) {
      var step = { ArrowRight: 1, ArrowLeft: -1, Home: -taps.length, End: taps.length }[e.key];
      if (!step) return;
      var at = taps.indexOf(document.activeElement);
      if (at < 0) return;
      e.preventDefault();
      var next = taps[Math.max(0, Math.min(taps.length - 1, at + step))];
      taps[at].tabIndex = -1;
      next.tabIndex = 0;
      next.focus();
    });

    render();
  }

  /* ------------------------------------------------------- small months */

  /* Seeded, so the made-up months look the same on every visit. */
  function seeded(n) {
    return function () {
      n = (n * 16807) % 2147483647;
      return n / 2147483647;
    };
  }

  /* Draws a seed into `box` as a row of bars, held empty until filled. */
  function miniMonth(box, seed, color, today) {
    var row = document.createElement('div');
    row.className = 'month';
    var days = parseDays(seed, today === undefined ? seed.length : today);
    var bars = [];
    for (var i = 0; i < days.length; i++) {
      var b = makeBar('span', color);
      b.style.setProperty('--t', i * 22 + 'ms');
      row.appendChild(b);
      bars.push(b);
    }
    drawDays(bars, days, true);
    box.appendChild(row);
    return { bars: bars, days: days, row: row };
  }

  function fillOnView(el, runs) {
    var fill = function () {
      for (var i = 0; i < runs.length; i++) drawDays(runs[i].bars, runs[i].days);
    };
    if (reduceMotion || !('IntersectionObserver' in window)) return fill();
    var io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      fill();
      io.disconnect();
    }, { threshold: 0.5 });
    io.observe(el);
  }

  /* A heatmap: weeks as columns of seven squares, filled more often as the
     habit takes hold. */
  function heat(box, weeks, color, rand) {
    var seed = '';
    for (var i = 0; i < weeks * 7; i++) {
      var p = 0.2 + 0.75 * Math.pow(Math.floor(i / 7) / (weeks - 1), 0.7);
      seed += rand() < p ? '1' : '0';
    }
    var days = parseDays(seed, seed.length);
    var bars = [];
    for (var j = 0; j < days.length; j++) {
      var b = makeBar('span', color);
      b.style.setProperty('--t', Math.floor(j / 7) * 30 + 'ms');
      box.appendChild(b);
      bars.push(b);
    }
    drawDays(bars, days, true);
    return { bars: bars, days: days };
  }

  /* Pro perks: each one shown as the bars it adds, not a stock icon. */
  var MINIS = {
    widget: function (box) {
      var t = document.createElement('b');
      box.appendChild(t);
      var run = miniMonth(box, '11110111111110111110', null, 19);
      var n = tally(run.days);
      t.innerHTML = n.done + '<span>/' + n.due + '</span>';
      return [run];
    },
    insights: function (box) {
      return [heat(box, 16, null, seeded(7))];
    },
    sync: function (box) {
      return [miniMonth(box, '111011111111'), miniMonth(box, '111011111111')];
    },
    reminders: function (box) {
      /* Goal of three: the 3pm and 5pm nudges never go out. */
      var times = ['9am', '11am', '1pm', '3pm', '5pm'];
      box.style.setProperty('--n', times.length);
      var run = miniMonth(box, '111--');
      box.removeChild(run.row);
      for (var i = 0; i < run.bars.length; i++) box.appendChild(run.bars[i]);
      for (var j = 0; j < times.length; j++) {
        var small = document.createElement('small');
        small.textContent = times[j];
        box.appendChild(small);
      }
      return [run];
    },
    goals: function (box) {
      var run = miniMonth(box, '11111000');
      var b = document.createElement('b');
      b.textContent = '5/8';
      box.appendChild(b);
      return [run];
    },
    export: function (box) {
      var seed = '1101111011';
      var run = miniMonth(box, seed);
      box.removeChild(run.row);
      for (var i = 0; i < run.bars.length; i++) box.appendChild(run.bars[i]);
      for (var j = 0; j < seed.length; j++) {
        var small = document.createElement('small');
        small.textContent = seed.charAt(j);
        box.appendChild(small);
      }
      return [run];
    },
    notes: function (box) {
      var run = miniMonth(box, '11111111011111');
      run.bars[8].classList.add('noted');
      var note = document.createElement('span');
      note.className = 'mini-note';
      note.textContent = 'Rained';
      note.style.setProperty('--at', ((8.5 / 14) * 100).toFixed(1) + '%');
      box.appendChild(note);
      return [run];
    },
    unlimited: function (box) {
      var colors = ['#bf5af2', '#2973ff', '#ff9f0a', '#30d158', '#ff375f'];
      var r = seeded(11);
      var runs = [];
      for (var i = 0; i < colors.length; i++) {
        var seed = '';
        for (var j = 0; j < 20; j++) seed += r() < 0.8 ? '1' : '0';
        runs.push(miniMonth(box, seed, colors[i]));
      }
      return runs;
    }
  };
  var minis = document.querySelectorAll('[data-mini]');
  for (var mi = 0; mi < minis.length; mi++) {
    var kind = minis[mi].dataset.mini;
    var make = MINIS[kind];
    if (!make) continue;
    minis[mi].classList.add('mini-' + ({ insights: 'heat', reminders: 'ticks', unlimited: 'many' }[kind] || kind));
    fillOnView(minis[mi], make(minis[mi]));
  }

  /* Pro yearly, spread over the days it pays for. Runs before the currency
     block so the toggle rewrites it with the other prices. */
  var perDay = document.querySelector('[data-per-day]');
  var yearly = document.querySelector('.plan-featured [data-price]');
  if (perDay && yearly) {
    var cents = function (price, mark) {
      return Math.round((parseFloat(price.replace(/[^0-9.]/g, '')) * 100) / 365) + mark;
    };
    var pd = perDay.querySelector('[data-per-day-price]');
    pd.setAttribute('data-price', '');
    pd.dataset.aud = cents(yearly.dataset.aud, 'c');
    pd.dataset.usd = cents(yearly.dataset.usd, '¢');
    pd.textContent = pd.dataset.aud;
    var pdRow = perDay.querySelector('.month');
    var pdRun = miniMonth(pdRow, new Array(31).join('1'));
    pdRow.parentNode.replaceChild(pdRun.row, pdRow);
    pdRun.row.setAttribute('aria-hidden', 'true');
    perDay.hidden = false;
    fillOnView(perDay, [pdRun]);
  }

  /* Privacy: the months stay on the phone. */
  var vault = document.querySelector('[data-vault]');
  if (vault) {
    fillOnView(vault, [
      miniMonth(vault, '11110111111011', '#2973ff'),
      miniMonth(vault, '11--11111--110', '#e5894a'),
      miniMonth(vault, '11111111111111', '#9b5fd6')
    ]);
  }

  /* The page as a month in the header: a day for each thirtieth of the way
     down, following the scroll both ways. */
  var siteHead = document.querySelector('.site-head');
  if (siteHead && document.querySelector('[data-month-wall]')) {
    var sm = miniMonth(siteHead, new Array(31).join('0'), null, 0);
    sm.row.className = 'month scroll-month';
    sm.row.setAttribute('aria-hidden', 'true');
    for (var sb = 0; sb < sm.bars.length; sb++) {
      sm.bars[sb].style.removeProperty('--t');
      sm.bars[sb].classList.remove('today', 'future', 'lit');
      sm.bars[sb].dataset.s = 'open';
    }
    var ticking = false;
    var paintRead = function () {
      ticking = false;
      var max = document.documentElement.scrollHeight - innerHeight;
      var n = max > 0 ? Math.round((scrollY / max) * sm.bars.length) : 0;
      for (var i = 0; i < sm.bars.length; i++) {
        var on = i < n;
        sm.bars[i].dataset.s = on ? 'done' : 'open';
        sm.bars[i].classList.toggle('lit', on);
        sm.bars[i].style.setProperty('--fill', on ? 1 : 0);
      }
    };
    addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(paintRead);
      }
    }, { passive: true });
    paintRead();
  }

  var heatBox = document.querySelector('[data-tour-heat]');
  var fillHeat = null;
  if (heatBox) {
    var heatRun = heat(heatBox, 26, '#9b5fd6', seeded(31));
    heatBox.setAttribute('aria-hidden', 'true');
    fillHeat = function () {
      drawDays(heatRun.bars, heatRun.days);
    };
    if (reduceMotion) {
      fillHeat();
      fillHeat = null;
    }
  }

  /* ---------------------------------------------------------------- tour */

  var steps = document.querySelectorAll('.tour-step');
  var stage = document.querySelector('[data-tour-stage]');
  if (steps.length && stage && 'IntersectionObserver' in window) {
    var frames = stage.querySelectorAll('picture');
    var GLOWS = ['#2973ff', '#2973ff', '#ffad32', '#8c5cff', '#8c5cff', '#3de0d9'];
    var show = function (n) {
      for (var i = 0; i < steps.length; i++) {
        steps[i].classList.toggle('is-active', i === n);
        if (frames[i]) frames[i].classList.toggle('is-active', i === n);
      }
      stage.parentNode.style.setProperty('--glow', GLOWS[n] || GLOWS[0]);
      /* Step 04, the detail screen, spreads its heatmap out behind the phone. */
      stage.parentNode.classList.toggle('heat-on', n === 3);
      if (n === 3 && fillHeat) {
        fillHeat();
        fillHeat = null;
      }
    };
    /* A step wins when it crosses the middle band of the viewport. */
    var tourIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) show(+entry.target.dataset.step);
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    for (var st = 0; st < steps.length; st++) tourIO.observe(steps[st]);
  }

  /* ------------------------------------------------------------- compare */

  var compare = document.querySelector('[data-compare]');
  if (compare) {
    var range = compare.querySelector('input');
    range.addEventListener('input', function () {
      compare.style.setProperty('--split', range.value + '%');
    });
  }

  /* ------------------------------------------------------------ currency */

  var CUR_STORE = 'hg-currency';
  var curBtns = document.querySelectorAll('[data-currency]');
  if (curBtns.length) {
    var setCurrency = function (cur, persist) {
      var prices = document.querySelectorAll('[data-price]');
      for (var i = 0; i < prices.length; i++) {
        prices[i].textContent = prices[i].dataset[cur];
      }
      for (var j = 0; j < curBtns.length; j++) {
        curBtns[j].setAttribute('aria-pressed', String(curBtns[j].dataset.currency === cur));
      }
      if (persist) {
        try {
          localStorage.setItem(CUR_STORE, cur);
        } catch (e) {}
      }
    };
    var savedCur = null;
    try {
      savedCur = localStorage.getItem(CUR_STORE);
    } catch (e) {}
    setCurrency(savedCur === 'usd' ? 'usd' : 'aud', false);
    for (var cb = 0; cb < curBtns.length; cb++) {
      curBtns[cb].addEventListener('click', function (e) {
        setCurrency(e.currentTarget.dataset.currency, true);
      });
    }
  }

  /* --------------------------------------------------------- closer wall */

  /* Three habits on 29 September, each where its month actually stands:
     water part way through today, reading on weekdays with a slip, and a
     meditation run that hasn't missed. */
  var wall = document.querySelector('[data-month-wall]');
  if (wall) {
    var HABITS = [
      { name: 'Drink water', c: '#2973ff', seed: '1111111011111111110111111111p0' },
      { name: 'Read a Book', c: '#e5894a', seed: '1111--11111--11011--11111--100' },
      { name: 'Meditate', c: '#9b5fd6', seed: '111111111111111111111111111110' }
    ];
    var rows = [];
    for (var h = 0; h < HABITS.length; h++) {
      var habit = HABITS[h];
      var line = document.createElement('div');
      line.className = 'wall-row';
      var name = document.createElement('span');
      name.textContent = habit.name;
      var month = document.createElement('div');
      month.className = 'month';
      var count = document.createElement('span');
      count.className = 'wall-tally';
      line.appendChild(name);
      line.appendChild(month);
      line.appendChild(count);
      wall.appendChild(line);

      var days = parseDays(habit.seed, 28);
      var rowBars = [];
      for (var wd = 0; wd < days.length; wd++) {
        var wb = makeBar('span', habit.c);
        wb.style.setProperty('--t', h * 140 + wd * 24 + 'ms');
        month.appendChild(wb);
        rowBars.push(wb);
      }
      drawDays(rowBars, days, true);
      var ct = tally(days);
      count.innerHTML = '<b>' + ct.done + '</b>/' + ct.due;
      rows.push({ bars: rowBars, days: days });
    }

    var fillWall = function () {
      for (var w = 0; w < rows.length; w++) drawDays(rows[w].bars, rows[w].days);
    };
    if (reduceMotion || !('IntersectionObserver' in window)) {
      fillWall();
    } else {
      var wallIO = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        fillWall();
        wallIO.disconnect();
      }, { threshold: 0.6 });
      wallIO.observe(wall);
    }
  }

  /* ----------------------------------------------------------- tick demo */

  /* Mirrors the app: ticks = floor(amount / share), but the last tick waits
     until the goal itself is reached. */
  var tickDemos = document.querySelectorAll('[data-tick-demo]');
  for (var td = 0; td < tickDemos.length; td++) {
    (function (demo) {
      var goal = +demo.dataset.goal;
      var n = +demo.dataset.n;
      var unit = demo.dataset.unit;
      var row = demo.querySelector('[data-tick-row]');
      var countOut = demo.querySelector('[data-tick-count]');
      var amountOut = demo.querySelector('[data-tick-amount]');
      var adds = demo.querySelectorAll('[data-add]');
      var amount = 0;
      var shown = 0;
      var ticks = [];

      for (var i = 0; i < n; i++) {
        var tick = makeBar('span', getComputedStyle(demo).getPropertyValue('--c'));
        tick.classList.add('lit');
        row.appendChild(tick);
        ticks.push(tick);
      }

      var fmt = function (v) {
        return Math.round(v).toLocaleString('en-AU');
      };

      var render = function () {
        var done = amount >= goal;
        var filled = done ? n : Math.min(n - 1, Math.floor(amount / (goal / n)));
        for (var i = 0; i < n; i++) {
          ticks[i].style.setProperty('--t', Math.max(0, i - shown) * 70 + 'ms');
          ticks[i].dataset.s = i < filled ? 'done' : 'open';
          ticks[i].style.setProperty('--fill', i < filled ? 1 : 0);
        }
        shown = filled;
        countOut.textContent = filled + '/' + n;
        amountOut.textContent = done
          ? fmt(amount) + ' ' + unit + '. Done for today.'
          : fmt(amount) + ' of ' + fmt(goal) + ' ' + unit;
        for (var a = 0; a < adds.length; a++) adds[a].disabled = done;
      };

      demo.addEventListener('click', function (e) {
        var btn = e.target.closest('button');
        if (!btn) return;
        if (btn.hasAttribute('data-reset')) amount = 0;
        else if (btn.dataset.add) amount += +btn.dataset.add;
        render();
      });

      render();
    })(tickDemos[td]);
  }

  /* ----------------------------------------------------- release slideshow */

  var shows = document.querySelectorAll('[data-slideshow]');
  for (var sh = 0; sh < shows.length; sh++) {
    (function (show) {
      var slides = show.querySelectorAll('.release-slide');
      var caption = show.querySelector('[data-slide-caption]');
      var dotsWrap = show.querySelector('[data-slide-dots]');
      var current = 0;
      var dots = [];

      var go = function (n) {
        var next = (n + slides.length) % slides.length;
        var dir = n > current ? 1 : -1;
        for (var i = 0; i < slides.length; i++) {
          slides[i].style.setProperty('--from', dir * 16 + 'px');
          slides[i].classList.toggle('is-active', i === next);
          dots[i].setAttribute('aria-current', String(i === next));
        }
        current = next;
        caption.textContent = slides[current].dataset.label;
      };

      for (var d = 0; d < slides.length; d++) {
        var dot = document.createElement('button');
        dot.type = 'button';
        dot.setAttribute('aria-label', slides[d].dataset.label);
        dot.dataset.to = d;
        dotsWrap.appendChild(dot);
        dots.push(dot);
      }

      dotsWrap.addEventListener('click', function (e) {
        var dot = e.target.closest('button');
        if (dot) go(+dot.dataset.to);
      });
      show.querySelector('[data-slide-prev]').addEventListener('click', function () {
        go(current - 1);
      });
      show.querySelector('[data-slide-next]').addEventListener('click', function () {
        go(current + 1);
      });
      show.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowLeft') go(current - 1);
        if (e.key === 'ArrowRight') go(current + 1);
      });

      var startX = null;
      var stage = show.querySelector('.release-slides');
      stage.addEventListener('pointerdown', function (e) {
        startX = e.clientX;
      });
      stage.addEventListener('pointerup', function (e) {
        if (startX === null) return;
        var dx = e.clientX - startX;
        startX = null;
        if (Math.abs(dx) > 40) go(current + (dx < 0 ? 1 : -1));
      });
      stage.addEventListener('pointercancel', function () {
        startX = null;
      });

      go(0);
    })(shows[sh]);
  }

  /* Current year in footers, so nobody has to remember to bump it. */
  var years = document.querySelectorAll('[data-year]');
  for (var y = 0; y < years.length; y++) {
    years[y].textContent = new Date().getFullYear();
  }
})();
