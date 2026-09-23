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
      /* Above the first section (hero) nothing has won yet — first link owns it. */
      setActive(winner || (spy.length ? spy[0].link : null));
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
        /* Toggle both ways: scrolling back up fades sections out again, so
           returning to the hero never leaves stale content on screen. */
        entry.target.classList.toggle('in', entry.isIntersecting);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    for (var t = 0; t < targets.length; t++) io.observe(targets[t]);
  }

  /* -------------------------------------------------- constellation demo */

  var field = document.querySelector('[data-field]');
  if (field) {
    var COLS = 10;
    var ROWS = 4;
    var TOTAL = COLS * ROWS;
    /* A plausible month: strong start, one wobble, back on it. */
    var seed = [
      1, 1, 1, 1, 0, 1, 1, 1, 1, 1,
      1, 1, 0, 1, 1, 1, 1, 0, 1, 1,
      1, 1, 1, 1, 1, 1, 1, 1, 1, 0,
      1, 1, 1, 1, 1, 0, 0, 0, 0, 0
    ];
    var state = seed.slice(0, TOTAL);
    var bubbles = [];

    for (var i = 0; i < TOTAL; i++) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'bub';
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

    function render() {
      var done = 0;
      var run = 0;
      var best = 0;
      for (var i = 0; i < TOTAL; i++) {
        var on = !!state[i];
        var b = bubbles[i];
        if (on !== b.classList.contains('on')) {
          b.classList.toggle('on', on);
          b.setAttribute('aria-pressed', String(on));
        }
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
    }

    field.addEventListener('click', function (e) {
      var b = e.target.closest('.bub');
      if (!b) return;
      var i = +b.dataset.i;
      state[i] = state[i] ? 0 : 1;
      render();
    });

    render();
  }

  /* Current year in footers, so nobody has to remember to bump it. */
  var years = document.querySelectorAll('[data-year]');
  for (var y = 0; y < years.length; y++) {
    years[y].textContent = new Date().getFullYear();
  }
})();
