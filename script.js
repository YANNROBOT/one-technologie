// Site de One Technologie : langue, thème, animations au défilement et liens de téléchargement.
(function () {
  var root = document.documentElement;
  var config = window.ONE_SITE || {};
  var store = {
    get: function (key) {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        return null;
      }
    },
    set: function (key, value) {
      try {
        localStorage.setItem(key, value);
      } catch (e) {}
    },
  };

  // ---------- Langue : le français est dans la page, l'anglais dans les attributs data-en ----------
  var ATTRS = ['alt', 'aria-label'];
  var lang = store.get('one-site.lang') || (/^en\b/i.test(navigator.language || '') ? 'en' : 'fr');
  var french = new Map();
  var TITLES = { fr: document.title, en: root.dataset.titleEn || document.title };

  function applyLanguage() {
    document.querySelectorAll('[data-en]').forEach(function (el) {
      if (!french.has(el)) french.set(el, el.textContent);
      el.textContent = lang === 'en' ? el.dataset.en : french.get(el);
    });
    ATTRS.forEach(function (name) {
      var key = 'data-en-' + name;
      document.querySelectorAll('[' + key + ']').forEach(function (el) {
        var keep = 'data-fr-' + name;
        if (!el.hasAttribute(keep)) el.setAttribute(keep, el.getAttribute(name) || '');
        el.setAttribute(name, lang === 'en' ? el.getAttribute(key) : el.getAttribute(keep));
      });
    });
    root.lang = lang;
    document.title = TITLES[lang];
    var button = document.getElementById('lang');
    // Le bouton montre la langue vers laquelle on bascule.
    button.firstElementChild.textContent = lang === 'en' ? 'FR' : 'EN';
    button.setAttribute('aria-label', lang === 'en' ? 'Passer en français' : 'Switch to English');
    updateDownloads();
  }

  document.getElementById('lang').addEventListener('click', function () {
    lang = lang === 'en' ? 'fr' : 'en';
    store.set('one-site.lang', lang);
    applyLanguage();
  });

  // ---------- Thème clair ou sombre ----------
  document.getElementById('theme').addEventListener('click', function () {
    var dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    store.set('one-site.theme', root.dataset.theme);
  });

  // ---------- Téléchargements : les boutons s'activent quand config.js donne une adresse ----------
  function updateDownloads() {
    [
      ['dl-logiciel', config.installer, true],
      ['dl-application', config.appUrl, false],
    ].forEach(function (item) {
      var link = document.getElementById(item[0]);
      if (!link) return;
      var label = link.querySelector('span');
      var ready = Boolean(item[1]);
      var key = (ready ? 'stateReady' : 'stateSoon') + (lang === 'en' ? 'En' : '');
      label.textContent = label.dataset[key];
      if (ready) {
        link.href = item[1];
        link.removeAttribute('aria-disabled');
        link.removeAttribute('tabindex');
        if (item[2]) link.setAttribute('download', '');
      } else {
        link.setAttribute('aria-disabled', 'true');
        link.setAttribute('tabindex', '-1');
      }
    });
  }

  applyLanguage();

  // ---------- Animations ----------
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Couverture : le titre monte, puis le surligneur passe.
  requestAnimationFrame(function () {
    var hero = document.querySelector('.cover, .page-hero');
    if (hero) hero.classList.add('ready');
  });

  // Apparition au défilement, avec un léger décalage entre voisins.
  var reveals = document.querySelectorAll('.reveal');
  if (still || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) {
      el.classList.add('in');
    });
  } else {
    var seen = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('in');
          seen.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.12 },
    );
    reveals.forEach(function (el) {
      var siblings = Array.prototype.filter.call(el.parentElement.children, function (c) {
        return c.classList.contains('reveal');
      });
      el.style.setProperty('--d', Math.min(siblings.indexOf(el), 4) * 90 + 'ms');
      seen.observe(el);
    });
  }

  // Menu sur petit écran : le bouton ouvre le panneau, Échap ou un clic ailleurs le referme.
  var menu = document.getElementById('menu');
  var burger = document.getElementById('burger');
  function setMenu(open) {
    menu.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
  }
  burger.addEventListener('click', function (event) {
    event.stopPropagation();
    setMenu(!menu.classList.contains('open'));
  });
  document.addEventListener('click', function (event) {
    if (!menu.contains(event.target)) setMenu(false);
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') setMenu(false);
  });

  // Demande de démonstration : le message est préparé, puis ouvert dans WhatsApp ou dans la messagerie.
  var form = document.getElementById('demande');
  if (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var data = new FormData(form);
      var value = function (name) {
        return String(data.get(name) || '').trim();
      };
      var error = document.getElementById('form-error');
      error.hidden = Boolean(value('nom') && value('ecole'));
      if (!error.hidden) return;
      var en = lang === 'en';
      var lines = [en ? 'Hello One Technologie,' : 'Bonjour One Technologie,', '', (en ? 'Name: ' : 'Nom : ') + value('nom'), (en ? 'School: ' : 'Établissement : ') + value('ecole')];
      if (value('telephone')) lines.push((en ? 'Phone: ' : 'Téléphone : ') + value('telephone'));
      lines.push((en ? 'Interested in: ' : 'Intérêt : ') + value('sujet'));
      if (value('message')) lines.push('', value('message'));
      var text = encodeURIComponent(lines.join('\n'));
      var subject = encodeURIComponent((en ? 'Demo request — ' : 'Demande de démonstration — ') + value('ecole'));
      var byMail = event.submitter && event.submitter.value === 'email';
      if (byMail) window.location.href = 'mailto:' + config.email + '?subject=' + subject + '&body=' + text;
      else window.open('https://wa.me/' + config.whatsapp + '?text=' + text, '_blank', 'noopener');
    });
  }

  var bar = document.querySelector('.bar');
  var stage = document.querySelector('[data-parallax]');
  var steps = document.querySelector('[data-progress]');
  var queued = false;

  function onScroll() {
    queued = false;
    var y = window.scrollY;
    var h = window.innerHeight;
    bar.classList.toggle('stuck', y > 12);

    if (still) return;
    // Couverture : l'écran et le téléphone glissent l'un sur l'autre.
    if (stage) {
      var box = stage.getBoundingClientRect();
      var shift = Math.max(-1, Math.min(1, (h * 0.5 - box.top) / h));
      stage.style.setProperty('--shift', shift.toFixed(3));
    }
    // Étapes : le trait bleu descend avec la lecture.
    if (steps) {
      var r = steps.getBoundingClientRect();
      var fill = Math.max(0, Math.min(1, (h * 0.62 - r.top) / r.height));
      steps.style.setProperty('--fill', fill.toFixed(3));
    }
  }

  window.addEventListener(
    'scroll',
    function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(onScroll);
    },
    { passive: true },
  );
  window.addEventListener('resize', onScroll);
  onScroll();
})();
