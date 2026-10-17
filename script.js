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
  var ATTRS = ['alt', 'aria-label', 'placeholder'];
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
    syncPicks();
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

  // ---------- Listes de choix : un bouton et un panneau au dessin du site, à la place de la liste du navigateur ----------
  var picks = [].slice.call(document.querySelectorAll('[data-pick]'));
  function syncPicks() {
    (picks || []).forEach(function (pick) {
      var chosen = pick.querySelector('[aria-selected="true"] span');
      if (chosen) pick.querySelector('.pick-value').textContent = chosen.textContent;
    });
  }
  picks.forEach(function (pick) {
    var button = pick.querySelector('.pick-btn');
    var list = pick.querySelector('.pick-list');
    var input = pick.querySelector('input');
    var options = [].slice.call(list.querySelectorAll('[role="option"]'));
    var active = 0;
    function mark(index) {
      active = (index + options.length) % options.length;
      options.forEach(function (option, i) {
        option.classList.toggle('is-active', i === active);
      });
    }
    function setOpen(open) {
      list.hidden = !open;
      pick.classList.toggle('open', open);
      button.setAttribute('aria-expanded', String(open));
      if (open) {
        mark(
          Math.max(
            0,
            options.findIndex(function (o) {
              return o.getAttribute('aria-selected') === 'true';
            }),
          ),
        );
        list.focus();
      }
    }
    function choose(option) {
      options.forEach(function (o) {
        o.setAttribute('aria-selected', String(o === option));
      });
      input.value = option.dataset.value;
      syncPicks();
      setOpen(false);
      button.focus();
    }
    button.addEventListener('click', function () {
      setOpen(list.hidden);
    });
    button.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        setOpen(true);
      }
    });
    options.forEach(function (option, i) {
      option.addEventListener('click', function () {
        choose(option);
      });
      option.addEventListener('mousemove', function () {
        mark(i);
      });
    });
    list.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowDown') mark(active + 1);
      else if (event.key === 'ArrowUp') mark(active - 1);
      else if (event.key === 'Home') mark(0);
      else if (event.key === 'End') mark(options.length - 1);
      else if (event.key === 'Enter' || event.key === ' ') choose(options[active]);
      else if (event.key === 'Escape') {
        setOpen(false);
        button.focus();
      } else if (event.key === 'Tab') {
        setOpen(false);
        return;
      } else return;
      event.preventDefault();
    });
    document.addEventListener('click', function (event) {
      if (!pick.contains(event.target)) setOpen(false);
    });
  });
  syncPicks();

  // « Haut de page » : la barre du haut reste collée à l'écran, un simple lien vers elle ne remonterait donc pas la page.
  [].forEach.call(document.querySelectorAll('.top-link'), function (link) {
    link.addEventListener('click', function (event) {
      event.preventDefault();
      var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' });
    });
  });

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

  // ---------- Réalisations : les filtres n'affichent que la catégorie choisie ----------
  var filters = document.querySelector('[data-filters]');
  if (filters) {
    var works = [].slice.call(document.querySelectorAll('[data-works] > *'));
    var empty = document.querySelector('[data-works-empty]');
    filters.addEventListener('click', function (event) {
      var button = event.target.closest('[data-filter]');
      if (!button) return;
      var wanted = button.dataset.filter;
      [].forEach.call(filters.querySelectorAll('[data-filter]'), function (b) {
        b.setAttribute('aria-pressed', String(b === button));
      });
      var shown = 0;
      works.forEach(function (work) {
        var match = wanted === 'tout' || (' ' + work.dataset.cats + ' ').indexOf(' ' + wanted + ' ') >= 0;
        work.hidden = !match;
        if (match) {
          shown++;
          work.classList.add('in');
        }
      });
      if (empty) {
        empty.hidden = shown > 0;
        if (!empty.hidden) empty.classList.add('in');
      }
    });
  }

  // ---------- Demande de devis : envoyée au serveur, qui la transmet par e-mail à One Technologie ----------
  var form = document.getElementById('devis');
  if (form) {
    // Arrivée depuis un service (« Demander un devis pour un site web ») : le service est déjà choisi.
    var wantedService = new URLSearchParams(location.search).get('service');
    if (wantedService) {
      var option = form.querySelector('[data-pick] [data-value="' + wantedService.replace(/[^a-z-]/g, '') + '"]');
      if (option) {
        [].forEach.call(option.parentElement.children, function (o) {
          o.setAttribute('aria-selected', String(o === option));
        });
        option.closest('[data-pick]').querySelector('input').value = option.dataset.value;
        syncPicks();
      }
    }

    var error = document.getElementById('form-error');
    var fallback = document.getElementById('form-fallback');
    var sendButton = document.getElementById('devis-envoyer');
    var t = function (fr, english) {
      return lang === 'en' ? english : fr;
    };
    var values = function () {
      var data = new FormData(form);
      var out = {};
      ['name', 'phone', 'email', 'service', 'budget', 'deadline', 'message', 'website'].forEach(function (key) {
        out[key] = String(data.get(key) || '').trim();
      });
      return out;
    };
    var labelOf = function (name, value) {
      var item = form.querySelector('input[name="' + name + '"] ~ .pick-list [data-value="' + value + '"] span');
      return item ? item.textContent : value;
    };
    var showError = function (text) {
      error.textContent = text;
      error.hidden = !text;
    };
    // Le même message, prêt à partir par WhatsApp ou par e-mail, si l'envoi direct échoue.
    var messageText = function (v) {
      var lines = [t('Bonjour One Technologie,', 'Hello One Technologie,'), '', t('Demande de devis : ', 'Quote request: ') + labelOf('service', v.service), t('Nom : ', 'Name: ') + v.name];
      if (v.phone) lines.push(t('Téléphone : ', 'Phone: ') + v.phone);
      if (v.email) lines.push('E-mail : ' + v.email);
      lines.push(t('Budget : ', 'Budget: ') + labelOf('budget', v.budget), t('Délai : ', 'Deadline: ') + labelOf('deadline', v.deadline), '', v.message);
      return lines.join('\n');
    };
    [].forEach.call(form.querySelectorAll('[data-send]'), function (button) {
      button.addEventListener('click', function () {
        var v = values();
        var text = encodeURIComponent(messageText(v));
        if (button.dataset.send === 'email') {
          window.location.href = 'mailto:' + config.email + '?subject=' + encodeURIComponent(t('Demande de devis — ', 'Quote request — ') + v.name) + '&body=' + text;
        } else {
          window.open('https://wa.me/' + config.whatsapp + '?text=' + text, '_blank', 'noopener');
        }
      });
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var v = values();
      if (!v.name) return showError(t('Indiquez votre nom ou celui de votre entreprise.', 'Please enter your name or your company’s name.'));
      if (!v.phone && !v.email) return showError(t('Laissez-nous un téléphone ou une adresse e-mail pour vous répondre.', 'Leave us a phone number or an e-mail address so we can answer you.'));
      if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) return showError(t('Cette adresse e-mail ne semble pas complète.', 'This e-mail address does not look complete.'));
      if (v.message.length < 10) return showError(t('Décrivez votre projet en quelques mots.', 'Describe your project in a few words.'));
      showError('');
      fallback.hidden = true;
      sendButton.disabled = true;
      sendButton.classList.add('busy');
      v.lang = lang;
      fetch(config.quoteUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v) })
        .then(function (response) {
          if (response.ok) return null;
          return response
            .json()
            .catch(function () {
              return {};
            })
            .then(function (body) {
              throw new Error((lang === 'fr' && body && body.error) || t('Votre demande n’a pas pu partir.', 'Your request could not be sent.'));
            });
        })
        .then(function () {
          form.querySelector('.form-body').hidden = true;
          var done = document.getElementById('form-done');
          done.hidden = false;
          done.focus();
        })
        .catch(function (problem) {
          var offline = problem instanceof TypeError;
          showError(offline ? t('Votre demande n’a pas pu partir : vérifiez votre connexion internet, puis réessayez.', 'Your request could not be sent: check your internet connection, then try again.') : problem.message);
          fallback.hidden = false;
        })
        .then(function () {
          sendButton.disabled = false;
          sendButton.classList.remove('busy');
        });
    });
  }

  // ---------- Onglets des services (accueil) : un clic ou les flèches du clavier changent de service ----------
  [].forEach.call(document.querySelectorAll('[data-tabs]'), function (box) {
    var tabs = [].slice.call(box.querySelectorAll('[role="tab"]'));
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        panel.hidden = !on;
        panel.classList.toggle('show', on);
      });
      if (focus) tab.focus();
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () {
        select(tab);
      });
      tab.addEventListener('keydown', function (event) {
        var next = { ArrowDown: i + 1, ArrowRight: i + 1, ArrowUp: i - 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[event.key];
        if (next === undefined) return;
        event.preventDefault();
        select(tabs[(next + tabs.length) % tabs.length], true);
      });
    });
  });

  // ---------- Les quatre étapes : elles défilent seules, les traits du bas permettent de choisir ----------
  [].forEach.call(document.querySelectorAll('[data-steps]'), function (box) {
    var cards = [].slice.call(box.querySelectorAll('.step-card'));
    var dots = [].slice.call(box.querySelectorAll('.step-dots button'));
    var current = 0;
    var timer = null;
    function show(index) {
      current = (index + cards.length) % cards.length;
      cards.forEach(function (card, i) {
        card.hidden = i !== current;
        card.classList.toggle('show', i === current);
      });
      dots.forEach(function (dot, i) {
        dot.setAttribute('aria-current', String(i === current));
      });
    }
    function start() {
      if (still || timer) return;
      timer = setInterval(function () {
        show(current + 1);
      }, 4500);
    }
    function stop() {
      clearInterval(timer);
      timer = null;
    }
    dots.forEach(function (dot, i) {
      dot.addEventListener('click', function () {
        stop();
        show(i);
      });
    });
    box.addEventListener('mouseenter', stop);
    box.addEventListener('mouseleave', start);
    start();
  });

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
