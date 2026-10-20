/* HabitGlass site behaviour. No dependencies, no analytics, nothing phones home. */
(function () {
  'use strict';

  /* Water and reading help moved from Support to Guides, and the app's
     Settings still links to the old anchor. */
  if (location.hash === '#tracking' && /\/support(\.html)?$/.test(location.pathname)) {
    location.replace('guides.html#water');
    return;
  }

  var root = document.documentElement;
  var STORE = 'hg-theme';
  var SHOT_DIR = (root.dataset.assets || 'assets') + '/shots/';

  var reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  /* Warm the other appearance so the flip is instant. Skipped on phones and
     Save-Data, where it would roughly double the image weight. */
  var warm = function () {
    var conn = navigator.connection;
    if (!matchMedia('(min-width: 901px)').matches || (conn && conn.saveData)) return;
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

  /* The scan code behaves like a tooltip: Escape puts it away until the
     pointer or focus leaves the button. */
  var qrButtons = document.querySelectorAll('.has-qr');
  if (qrButtons.length) {
    var showQR = function (e) {
      e.currentTarget.classList.remove('qr-off');
    };
    addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      for (var q = 0; q < qrButtons.length; q++) {
        if (qrButtons[q].matches(':hover, :focus-visible')) qrButtons[q].classList.add('qr-off');
      }
    });
    for (var qb = 0; qb < qrButtons.length; qb++) {
      qrButtons[qb].addEventListener('pointerleave', showQR);
      qrButtons[qb].addEventListener('blur', showQR);
    }
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

  /* Big headings rise a word at a time. Words are wrapped in place, so
     nested spans keep their styling; an element with no space in it, like
     the italic word, moves as one piece. */
  function splitWords(el) {
    var n = 0;
    var wrap = function (node) {
      var w = document.createElement('span');
      w.className = 'w';
      var inner = document.createElement('span');
      inner.style.setProperty('--i', n++);
      w.appendChild(inner);
      return { w: w, inner: inner };
    };
    var walk = function (parent) {
      var kids = Array.prototype.slice.call(parent.childNodes);
      for (var k = 0; k < kids.length; k++) {
        var node = kids[k];
        if (node.nodeType === 3) {
          var bits = node.textContent.split(/(\s+)/);
          var frag = document.createDocumentFragment();
          for (var b = 0; b < bits.length; b++) {
            if (!bits[b]) continue;
            if (/^\s+$/.test(bits[b])) {
              frag.appendChild(document.createTextNode(bits[b]));
              continue;
            }
            var piece = wrap();
            piece.inner.textContent = bits[b];
            frag.appendChild(piece.w);
          }
          parent.replaceChild(frag, node);
        } else if (node.nodeType === 1) {
          if (node.tagName === 'BR') continue;
          if (!/\s/.test(node.textContent.trim())) {
            var whole = wrap();
            parent.replaceChild(whole.w, node);
            whole.inner.appendChild(node);
          } else {
            walk(node);
          }
        }
      }
    };
    walk(el);
    el.classList.add('split');
  }

  var heads = document.querySelectorAll('.hero h1, .guides-hero h1, .support-hero h1, .release-hero h1, .doc-head h1, .section-head h2, .wordmark');
  for (var hd = 0; hd < heads.length; hd++) splitWords(heads[hd]);

  var targets = document.querySelectorAll('.reveal, .split');
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

  /* -------------------------------------------------------------- guides */

  /* One guide at a time, picked from the sidebar. The hash names it, so a
     shared link or the back button opens the right one. */
  var guides = document.querySelectorAll('[data-guide]');
  var guideLinks = document.querySelectorAll('[data-guide-link]');
  var guideLayout = document.querySelector('.guides-layout');

  function showGuide(id) {
    var target = document.getElementById(id);
    if (!target || !target.hasAttribute('data-guide')) target = guides[0];
    for (var g = 0; g < guides.length; g++) guides[g].hidden = guides[g] !== target;
    for (var l = 0; l < guideLinks.length; l++) {
      if (guideLinks[l].getAttribute('href') === '#' + target.id) {
        guideLinks[l].setAttribute('aria-current', 'true');
      } else {
        guideLinks[l].removeAttribute('aria-current');
      }
    }
  }

  if (guides.length) {
    for (var gl = 0; gl < guideLinks.length; gl++) {
      guideLinks[gl].addEventListener('click', function (event) {
        event.preventDefault();
        var id = this.getAttribute('href').slice(1);
        history.pushState(null, '', '#' + id);
        showGuide(id);
        if (guideLayout.getBoundingClientRect().top < 0) {
          guideLayout.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
        }
      });
    }
    addEventListener('popstate', function () { showGuide(location.hash.slice(1)); });
    showGuide(location.hash.slice(1));
  }

  /* ------------------------------------------------------------ day bars */

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

  /* Returns a redraw for a month whose days follow the scroll. The walk starts
     as the month comes up from the bottom of the screen and reaches today at
     `stop` of the way down, or wherever the month sits when the page runs
     out. Days the walk hasn't reached are still to come. */
  function walkDays(month, bars, seed, today, stop) {
    var last = seed.replace(/0+$/, '').length;
    var shown = -1;
    return function () {
      var top = month.getBoundingClientRect().top;
      var left = document.documentElement.scrollHeight - innerHeight - scrollY;
      var end = Math.max(innerHeight * stop, top - left);
      var p = (innerHeight - top) / Math.max(1, innerHeight - end);
      var k = Math.round(Math.min(1, Math.max(0, p)) * last);
      if (k === shown) return;
      shown = k;
      var walked = seed.slice(0, k) + seed.slice(k).replace(/./g, '0');
      drawDays(bars, parseDays(walked, Math.min(k, today)));
    };
  }

  /* Editorial illustrations share the day renderer, not screenshot geometry.
     Each month fills once, unless it has data-scrub: then today's ring walks
     the month with the scroll, leaving each day as the seed has it, and walks
     back on the way up like the header month. data-scrub is how far up the
     screen the month is when the walk reaches today. A new app capture never
     changes this choreography. */
  var scrubs = [];
  var editorialMonths = document.querySelectorAll('[data-editorial-days]');
  for (var em = 0; em < editorialMonths.length; em++) {
    (function (month, index) {
      var seed = month.dataset.editorialDays;
      var today = +month.dataset.today;
      var scrub = 'scrub' in month.dataset && !reduceMotion;
      var days = parseDays(seed, today);
      var bars = [];
      for (var day = 0; day < days.length; day++) {
        var bar = makeBar('span');
        if (!scrub) bar.style.setProperty('--t', (index < 3 ? index * 140 : 0) + day * 24 + 'ms');
        month.appendChild(bar);
        bars.push(bar);
      }
      if (month.parentElement.classList.contains('ribbon')) month.parentElement.classList.add('has-days');
      if (scrub) {
        scrubs.push(walkDays(month, bars, seed, today, +month.dataset.scrub || 0.5));
      } else {
        drawDays(bars, days, !reduceMotion);
        var fill = function () { drawDays(bars, days); };
        if (reduceMotion || !('IntersectionObserver' in window)) {
          fill();
        } else {
          var observer = new IntersectionObserver(function (entries) {
            if (!entries[0].isIntersecting) return;
            observer.disconnect();
            requestAnimationFrame(function () { requestAnimationFrame(fill); });
          }, { threshold: 0.15 });
          observer.observe(month);
        }
      }
      /* A passing pointer makes the interlude respond like a row of keys. */
      if (month.closest('.month-interlude')) {
        month.addEventListener('pointerover', function (event) {
          if (event.pointerType !== 'mouse' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
          var at = bars.indexOf(event.target);
          if (at < 0) return;
          bars.slice(Math.max(0, at - 1), at + 2).forEach(function (bar) {
            bar.getAnimations().forEach(function (animation) { animation.cancel(); });
            bar.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(1.18)', offset: .35 }, { transform: 'scaleY(1)' }], { duration: 650, easing: 'ease-out' });
          });
        });
      }
    })(editorialMonths[em], em);
  }

  if (scrubs.length) {
    var walking = false;
    var walk = function () {
      walking = false;
      for (var s = 0; s < scrubs.length; s++) scrubs[s]();
    };
    var queueWalk = function () {
      if (walking) return;
      walking = true;
      requestAnimationFrame(walk);
    };
    walk();
    addEventListener('scroll', queueWalk, { passive: true });
    addEventListener('resize', queueWalk);
  }

  /* The tour: the point crossing the middle of the screen is the one being
     read. Its screen shows on the phone, its caption under it, and the phone
     turns a little towards it. Pointing at a point reads it too. */
  var story = document.querySelector('.product-story');
  var points = story ? story.querySelectorAll('.story-point') : [];
  if (points.length && 'IntersectionObserver' in window) {
    var stepped = story.querySelectorAll('.story-screen [data-step]');
    var readPoint = function (n) {
      if (story.dataset.step === String(n)) return;
      for (var p = 0; p < points.length; p++) points[p].classList.toggle('is-active', p === n);
      for (var q = 0; q < stepped.length; q++) {
        var on = stepped[q].dataset.step === String(n);
        stepped[q].classList.toggle('is-active', on);
        stepped[q].setAttribute('aria-hidden', String(!on));
      }
      story.dataset.step = n;
    };
    readPoint(0);
    story.classList.add('is-reading');
    var pointIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) readPoint(Array.prototype.indexOf.call(points, entry.target));
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    for (var sp = 0; sp < points.length; sp++) {
      pointIO.observe(points[sp]);
      (function (n) {
        points[n].addEventListener('pointerenter', function (e) {
          if (e.pointerType === 'mouse') readPoint(n);
        });
      })(sp);
    }
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
    unlimited: function (box) {
      var colors = ['var(--day-lilac)', 'var(--day-blue)', 'var(--day-amber)', 'var(--day-green)', 'var(--day-pink)'];
      var r = seeded(11);
      var runs = [];
      for (var i = 0; i < colors.length; i++) {
        var seed = '';
        for (var j = 0; j < 20; j++) seed += r() < 0.8 ? '1' : '0';
        runs.push(miniMonth(box, seed, colors[i]));
      }
      return runs;
    },
    goals: function (box) {
      var run = miniMonth(box, '11111000');
      var b = document.createElement('b');
      b.textContent = '5/8';
      box.appendChild(b);
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
    pause: function (box) {
      /* A week away, then straight back on: the run carries through. */
      return [miniMonth(box, '11111-----1111')];
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

  /* Apple Health, as the guide tells it: 7,400 steps by lunch, 2,600 more
     after work, and today's bar ticks itself off at the goal. Plays once. */
  var health = document.querySelector('[data-health-demo]');
  if (health) {
    var GOAL = 10000;
    var BEFORE = '1101111111111';
    var stepsOut = health.querySelector('[data-steps]');
    var healthRow = health.querySelector('[data-health-days]');
    var healthBars = [];
    for (var hb = 0; hb <= BEFORE.length; hb++) {
      var hBar = makeBar('span');
      hBar.style.setProperty('--t', hb * 22 + 'ms');
      healthRow.appendChild(hBar);
      healthBars.push(hBar);
    }
    var drawSteps = function (steps, hold) {
      var days = parseDays(BEFORE + (steps >= GOAL ? '1' : 'p'), BEFORE.length);
      days[BEFORE.length].r = Math.min(1, steps / GOAL);
      drawDays(healthBars, days, hold);
      stepsOut.textContent = Math.round(steps).toLocaleString('en-US');
      health.classList.toggle('is-done', steps >= GOAL);
    };
    var countSteps = function (from, to, ms, done) {
      var start = performance.now();
      var tick = function (now) {
        var t = Math.min(1, (now - start) / ms);
        drawSteps(from + (to - from) * (1 - Math.pow(1 - t, 3)));
        if (t < 1) requestAnimationFrame(tick);
        else if (done) done();
      };
      requestAnimationFrame(tick);
    };
    if (reduceMotion || !('IntersectionObserver' in window)) {
      drawSteps(GOAL);
    } else {
      drawSteps(0, true);
      var healthIO = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        healthIO.disconnect();
        drawSteps(0);
        setTimeout(function () {
          healthBars[BEFORE.length].style.setProperty('--t', '0ms');
          countSteps(0, 7400, 1500, function () {
            setTimeout(function () { countSteps(7400, GOAL, 1100); }, 700);
          });
        }, 650);
      }, { threshold: 0.5 });
      healthIO.observe(health);
    }
  }

  /* ---------------------------------------------------------------- perks */

  /* The perk's top hairline lights up under the pointer. */
  var perkList = document.querySelector('.perks');
  if (perkList && matchMedia('(hover: hover)').matches) {
    perkList.addEventListener('pointermove', function (e) {
      var li = e.target.closest('li');
      if (!li) return;
      li.style.setProperty('--hx', (e.clientX - li.getBoundingClientRect().left).toFixed(0) + 'px');
    });
  }

  /* ------------------------------------------------------------ currency */

  /* A price changes the way the app's numbers do: only the characters that
     differ move, rolling up when the price rises and down when it drops.
     Digits line up from the right, and the currency mark moves as one. */
  var SOFT = getComputedStyle(root).getPropertyValue('--spring-soft').trim();
  if (!SOFT || !CSS.supports('transition-timing-function', SOFT)) SOFT = 'cubic-bezier(0.2, 0.7, 0.2, 1)';

  function rollPrice(el, next) {
    var prev = el.dataset.shown || el.textContent;
    el.dataset.shown = next;
    if (prev === next) return;
    if (reduceMotion || !el.animate) {
      el.textContent = next;
      return;
    }
    var parts = function (s) {
      var m = /^(\D*)(.*)$/.exec(s);
      return [m[1]].concat(m[2].split(''));
    };
    var amount = function (s) {
      return parseFloat(s.replace(/[^0-9.]/g, '')) || 0;
    };
    var from = parts(prev);
    var to = parts(next);
    var dir = amount(next) < amount(prev) ? -1 : 1;
    var frag = document.createDocumentFragment();
    var moved = 0;
    var longest = 0;
    for (var i = 0; i < to.length; i++) {
      var j = i === 0 ? 0 : from.length - (to.length - i);
      var was = j >= 0 && (i === 0 || j > 0) ? from[j] : '';
      if (was === to[i]) {
        frag.appendChild(document.createTextNode(to[i]));
        continue;
      }
      var cell = document.createElement('span');
      cell.className = 'roll';
      var gone = document.createElement('span');
      gone.className = 'roll-out';
      gone.setAttribute('aria-hidden', 'true');
      gone.textContent = was;
      var come = document.createElement('span');
      come.textContent = to[i];
      cell.appendChild(come);
      cell.appendChild(gone);
      frag.appendChild(cell);
      var delay = moved++ * 45;
      longest = Math.max(longest, delay + 700);
      var timing = { duration: 700, delay: delay, easing: SOFT, fill: 'both' };
      gone.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(' + -dir * 100 + '%)', opacity: 0 }], timing);
      come.animate([{ transform: 'translateY(' + dir * 100 + '%)', opacity: 0 }, { transform: 'none', opacity: 1 }], timing);
    }
    el.textContent = '';
    el.appendChild(frag);
    clearTimeout(el._settle);
    el._settle = setTimeout(function () {
      el.textContent = next;
    }, longest + 40);
  }

  var CUR_STORE = 'hg-currency';
  var curBtns = document.querySelectorAll('[data-currency]');
  if (curBtns.length) {
    var setCurrency = function (cur, persist) {
      var prices = document.querySelectorAll('[data-price]');
      for (var i = 0; i < prices.length; i++) {
        if (persist) rollPrice(prices[i], prices[i].dataset[cur]);
        else prices[i].textContent = prices[i].dataset.shown = prices[i].dataset[cur];
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

  var releaseVideo = document.querySelector('[data-release-video]');
  if (releaseVideo) {
    releaseVideo.muted = true;
    releaseVideo.addEventListener('play', function () {
      releaseVideo.controls = false;
    });
    releaseVideo.addEventListener('pause', function () {
      releaseVideo.controls = true;
    });
    releaseVideo.addEventListener('ended', function () {
      releaseVideo.controls = true;
    });
    releaseVideo.addEventListener('click', function () {
      if (!releaseVideo.controls && !releaseVideo.paused) releaseVideo.pause();
    });
    releaseVideo.addEventListener('keydown', function (event) {
      if (releaseVideo.controls || (event.key !== ' ' && event.key !== 'Enter')) return;
      event.preventDefault();
      releaseVideo.pause();
    });
    if (!reduceMotion) releaseVideo.play().catch(function () {});
  }

  /* Current year in footers, so nobody has to remember to bump it. */
  var years = document.querySelectorAll('[data-year]');
  for (var y = 0; y < years.length; y++) {
    years[y].textContent = new Date().getFullYear();
  }
})();
