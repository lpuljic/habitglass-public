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
    syncToggle(theme);
    if (persist) {
      try {
        localStorage.setItem(STORE, theme);
      } catch (e) {
        /* private browsing, whatever */
      }
    }
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

  /* ---------------------------------------------------------- month demo */

  var reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var PALETTE = ['#2973ff', '#8c5cff', '#3de0d9', '#ffad32', '#ff4f78', '#64d2ff', '#30d158'];

  function makeOrb(tag) {
    var el = document.createElement(tag);
    el.className = 'orb';
    return el;
  }

  var field = document.querySelector('[data-field]');
  if (field) {
    var TOTAL = +field.dataset.days || 35;
    var OFFSET = +field.dataset.offset || 0;
    /* A plausible month: strong start, one wobble, back on it. */
    var seed = [
      1, 1, 1, 1, 0, 1, 1,
      1, 1, 1, 0, 1, 1, 1,
      1, 0, 1, 1, 1, 1, 1,
      1, 1, 1, 1, 1, 1, 0,
      1, 1, 0, 0, 0, 0, 0
    ];
    var state = seed.slice(0, TOTAL);
    var bubbles = [];

    for (var p = 0; p < OFFSET; p++) {
      field.appendChild(document.createElement('span'));
    }
    for (var i = 0; i < TOTAL; i++) {
      var b = makeOrb('button');
      b.type = 'button';
      b.classList.add('bub');
      b.dataset.i = i;
      b.setAttribute('aria-label', 'Day ' + (i + 1));
      b.setAttribute('aria-pressed', 'false');
      field.appendChild(b);
      bubbles.push(b);
    }

    var out = {
      days: document.querySelector('[data-out="days"]'),
      best: document.querySelector('[data-out="best"]'),
      rate: document.querySelector('[data-out="rate"]')
    };

    var render = function () {
      var done = 0;
      var run = 0;
      var best = 0;
      for (var i = 0; i < TOTAL; i++) {
        var on = !!state[i];
        bubbles[i].classList.toggle('on', on);
        bubbles[i].setAttribute('aria-pressed', String(on));
        if (on) {
          done++;
          run++;
          if (run > best) best = run;
        } else {
          run = 0;
        }
      }
      if (out.days) out.days.textContent = done;
      if (out.best) out.best.textContent = best;
      if (out.rate) out.rate.textContent = Math.round((done / TOTAL) * 100) + '%';
    };

    field.addEventListener('click', function (e) {
      var b = e.target.closest('.bub');
      if (!b) return;
      var i = +b.dataset.i;
      state[i] = state[i] ? 0 : 1;
      render();
    });

    render();
  }

  /* ------------------------------------------------------------ hero sky */

  var sky = document.querySelector('[data-sky]');
  if (sky) {
    /* Seeded, so the constellation is the same shape on every visit. */
    var rand = (function (a) {
      return function () {
        a = (a + 0x6d2b79f5) | 0;
        var t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    })(23);

    var STEP = 7;
    var stars = [];
    for (var gx = STEP / 2; gx < 100; gx += STEP) {
      for (var gy = STEP / 2; gy < 100; gy += STEP) {
        var x = gx + (rand() - 0.5) * STEP * 0.8;
        var y = gy + (rand() - 0.5) * STEP * 0.8;
        var dx = (x - 50) / 50;
        var dy = (y - 50) / 50;
        var dist = Math.sqrt(dx * dx + dy * dy);
        /* Leave the phone's footprint clear and let the edge thin out. */
        if (dist > 1 || (Math.abs(x - 50) < 21 && Math.abs(y - 50) < 38)) continue;
        if (rand() < dist * 0.55) continue;
        var o = makeOrb('span');
        o.style.left = x + '%';
        o.style.top = y + '%';
        o.style.setProperty('--s', Math.round(12 + rand() * 26 * (1.15 - dist * 0.55)) + 'px');
        o.style.setProperty('--c', PALETTE[Math.floor(rand() * PALETTE.length)]);
        o.style.setProperty('--t', Math.round(dist * 900 + rand() * 250) + 'ms');
        if (rand() < 0.72) o.dataset.lit = '';
        sky.appendChild(o);
        if (o.dataset.lit !== undefined) stars.push({ x: x, y: y, t: dist * 900 });
      }
    }

    /* Join each lit bubble to its nearest lit neighbour, so it reads as a
       constellation rather than confetti. */
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    var seen = {};
    for (var si = 0; si < stars.length; si++) {
      var best = -1;
      var bestD = 15;
      for (var sj = 0; sj < stars.length; sj++) {
        if (si === sj) continue;
        var dd = Math.hypot(stars[si].x - stars[sj].x, stars[si].y - stars[sj].y);
        if (dd < bestD) {
          bestD = dd;
          best = sj;
        }
      }
      var key = Math.min(si, best) + '-' + Math.max(si, best);
      if (best < 0 || seen[key]) continue;
      seen[key] = true;
      var line = document.createElementNS(NS, 'line');
      line.setAttribute('x1', stars[si].x);
      line.setAttribute('y1', stars[si].y);
      line.setAttribute('x2', stars[best].x);
      line.setAttribute('y2', stars[best].y);
      line.setAttribute('pathLength', '1');
      line.style.setProperty('--t', Math.round(Math.max(stars[si].t, stars[best].t) + 500) + 'ms');
      svg.appendChild(line);
    }
    sky.insertBefore(svg, sky.firstChild);

    var light = function () {
      sky.classList.add('lit');
      var lit = sky.querySelectorAll('[data-lit]');
      for (var l = 0; l < lit.length; l++) lit[l].classList.add('on');
    };
    if (reduceMotion) light();
    else setTimeout(light, 250);

    if (!reduceMotion && matchMedia('(pointer: fine)').matches) {
      var hero = sky.closest('.hero');
      var skyTick = false;
      hero.addEventListener('pointermove', function (e) {
        if (skyTick) return;
        skyTick = true;
        requestAnimationFrame(function () {
          skyTick = false;
          sky.style.setProperty('--px', ((e.clientX / innerWidth) * 2 - 1).toFixed(3));
          sky.style.setProperty('--py', ((e.clientY / innerHeight) * 2 - 1).toFixed(3));
        });
      });
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

  /* -------------------------------------------------------- closer month */

  var strip = document.querySelector('[data-month-strip]');
  if (strip) {
    var dots = [];
    for (var d = 0; d < 30; d++) {
      var orb = makeOrb('span');
      orb.style.setProperty('--c', PALETTE[Math.floor(d / 10)]);
      orb.style.setProperty('--t', d * 45 + 'ms');
      strip.appendChild(orb);
      dots.push(orb);
    }
    var fill = function () {
      for (var f = 0; f < dots.length; f++) dots[f].classList.add('on');
    };
    if (reduceMotion || !('IntersectionObserver' in window)) {
      fill();
    } else {
      var stripIO = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        fill();
        stripIO.disconnect();
      }, { threshold: 0.6 });
      stripIO.observe(strip);
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
        var orb = makeOrb('span');
        orb.style.setProperty('--c', getComputedStyle(demo).getPropertyValue('--c'));
        row.appendChild(orb);
        ticks.push(orb);
      }

      var fmt = function (v) {
        return Math.round(v).toLocaleString('en-AU');
      };

      var render = function () {
        var done = amount >= goal;
        var filled = done ? n : Math.min(n - 1, Math.floor(amount / (goal / n)));
        for (var i = 0; i < n; i++) {
          ticks[i].style.setProperty('--t', Math.max(0, i - shown) * 70 + 'ms');
          ticks[i].classList.toggle('on', i < filled);
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
