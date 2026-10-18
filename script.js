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
    // Le bouton montre la langue vers laquelle on bascule. Les pages de l'Éducation en ont un second
    // dans le pied de page, pour les téléphones.
    document.querySelectorAll('#lang, [data-lang-btn]').forEach(function (button) {
      button.firstElementChild.textContent = lang === 'en' ? 'FR' : 'EN';
      button.setAttribute('aria-label', lang === 'en' ? 'Passer en français' : 'Switch to English');
    });
    updateDownloads();
    // Pour les textes construits par le script (le formulaire de devis).
    document.dispatchEvent(new Event('one-lang'));
  }

  document.querySelectorAll('#lang, [data-lang-btn]').forEach(function (button) {
    button.addEventListener('click', function () {
      lang = lang === 'en' ? 'fr' : 'en';
      store.set('one-site.lang', lang);
      applyLanguage();
    });
  });

  // ---------- Thème clair ou sombre ----------
  document.querySelectorAll('#theme, [data-theme-btn]').forEach(function (button) {
    button.addEventListener('click', function () {
      var dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
      root.dataset.theme = dark ? 'light' : 'dark';
      store.set('one-site.theme', root.dataset.theme);
    });
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

  // ---------- Textes de l'entreprise : animés la première fois qu'ils apparaissent ----------
  // Les titres sont découpés en mots (.w), qui arrivent l'un après l'autre ; les pastilles et les sous-titres
  // arrivent en fondu. Un changement de langue remet le texte d'un bloc : il s'affiche alors simplement.
  (function () {
    if (still || !('IntersectionObserver' in window) || !document.body.classList.contains('company')) return;
    var split = function (el) {
      var i = 0;
      var walk = function (node) {
        [].slice.call(node.childNodes).forEach(function (child) {
          if (child.nodeType === 3) {
            // On ne coupe qu'aux espaces ordinaires : « projet ? » (espace insécable) reste d'un seul tenant.
            var parts = child.textContent.split(/([ \t\n\r]+)/);
            var frag = document.createDocumentFragment();
            parts.forEach(function (part) {
              if (!part) return;
              if (/^[ \t\n\r]+$/.test(part)) return frag.appendChild(document.createTextNode(part));
              var word = document.createElement('span');
              word.className = 'w';
              word.style.setProperty('--i', i++);
              word.textContent = part;
              frag.appendChild(word);
            });
            node.replaceChild(frag, child);
          } else if (child.nodeType === 1 && child.tagName !== 'BR') {
            // Un dessin glissé dans le titre (la pastille de l'accueil) arrive comme un mot.
            if (child.getAttribute('aria-hidden') === 'true') {
              child.classList.add('w-el');
              child.style.setProperty('--i', i++);
            } else {
              walk(child);
            }
          }
        });
      };
      walk(el);
      el.classList.add('split');
    };
    var watch = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('in-text');
          watch.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.15 },
    );
    [].forEach.call(document.querySelectorAll('main h1, main h2, .end h2, .quote-art-title'), function (el) {
      if (el.closest('.quote-form')) return;
      split(el);
      watch.observe(el);
    });
    [].forEach.call(document.querySelectorAll('main .hero-sub, main .tag'), function (el) {
      el.classList.add('fade-text');
      watch.observe(el);
    });
  })();

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

  // Menu de l'entreprise : le bouton ouvre le panneau, Échap ou un clic ailleurs le referme.
  // Les pages de One Technologie Éducation n'ont pas de menu.
  var menu = document.getElementById('menu');
  var burger = document.getElementById('burger');
  if (menu && burger) {
    var setMenu = function (open) {
      menu.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
    };
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
  }

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

  // ---------- Demande de devis : quatre étapes, puis l'envoi au serveur, qui la transmet par e-mail à One Technologie ----------
  // Dans sa propre fonction : ses noms (steps, stage, next…) ne doivent pas croiser ceux des autres parties.
  var form = document.getElementById('devis');
  if (form) (function () {
    var STEPS = 4;
    var step = 1;
    var steps = [].slice.call(form.querySelectorAll('.quote-step'));
    var bar = [].slice.call(form.querySelectorAll('.quote-bar li'));
    var stage = document.querySelector('.quote-stage');
    var count = form.querySelector('[data-step-label]');
    var error = document.getElementById('form-error');
    var fallback = document.getElementById('form-fallback');
    var back = document.getElementById('devis-retour');
    var next = document.getElementById('devis-suivant');
    var nextLabel = form.querySelector('[data-step-next]');
    var message = form.querySelector('textarea[name="message"]');
    var messageCount = document.getElementById('message-count');
    var t = function (fr, english) {
      return lang === 'en' ? english : fr;
    };

    // Arrivée depuis un service (« Demander un devis pour un site web ») : le service est déjà choisi.
    var wantedService = (new URLSearchParams(location.search).get('service') || '').replace(/[^a-z-]/g, '');
    var wanted = wantedService && form.querySelector('input[name="service"][value="' + wantedService + '"]');
    if (wanted) wanted.checked = true;

    var values = function () {
      var data = new FormData(form);
      var out = {};
      ['name', 'phone', 'email', 'service', 'budget', 'deadline', 'message', 'website'].forEach(function (key) {
        out[key] = String(data.get(key) || '').trim();
      });
      return out;
    };
    // Le libellé affiché du choix (dans la langue de la page).
    var labelOf = function (name, value) {
      var input = form.querySelector('input[name="' + name + '"][value="' + value + '"]');
      var spans = input ? input.parentElement.querySelectorAll('span') : [];
      return spans.length ? spans[spans.length - 1].textContent : value;
    };
    var countMessage = function () {
      var n = message.value.trim().length;
      messageCount.textContent = n < 10 ? t('Encore quelques mots…', 'A few more words…') : n + ' ' + t('caractères', 'characters');
    };
    message.addEventListener('input', countMessage);
    var showError = function (text) {
      error.textContent = text;
      error.hidden = !text;
    };

    // Ce qu'il manque pour quitter une étape (rien : on peut avancer).
    var problemAt = function (n) {
      var v = values();
      if (n === 1 && !v.service) return t('Choisissez le type de projet.', 'Choose the type of project.');
      if (n === 3 && v.message.length < 10) return t('Décrivez votre projet en quelques mots.', 'Describe your project in a few words.');
      if (n === 4) {
        if (!v.name) return t('Indiquez votre nom ou celui de votre entreprise.', 'Please enter your name or your company’s name.');
        if (!v.phone && !v.email) return t('Laissez-nous un téléphone ou une adresse e-mail pour vous répondre.', 'Leave us a phone number or an e-mail address so we can answer you.');
        if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) return t('Cette adresse e-mail ne semble pas complète.', 'This e-mail address does not look complete.');
      }
      return '';
    };

    // Les textes qui dépendent de l'étape : refaits à chaque étape et au changement de langue.
    var labels = function () {
      count.textContent = t('Étape ' + step + ' sur ' + STEPS, 'Step ' + step + ' of ' + STEPS);
      nextLabel.textContent = step === STEPS ? t('Envoyer ma demande', 'Send my request') : t('Continuer', 'Continue');
      var v = values();
      [].forEach.call(form.querySelectorAll('[data-recap]'), function (dd) {
        dd.textContent = labelOf(dd.dataset.recap, v[dd.dataset.recap]);
      });
      countMessage();
    };
    document.addEventListener('one-lang', labels);

    var show = function (n, focus) {
      step = n;
      steps.forEach(function (fieldset, i) {
        var on = i + 1 === n;
        fieldset.hidden = !on;
        fieldset.classList.toggle('enter', on);
      });
      bar.forEach(function (item, i) {
        item.classList.toggle('done', i + 1 < n);
        item.classList.toggle('on', i + 1 === n);
      });
      if (stage) stage.dataset.active = String(n);
      back.hidden = n === 1;
      labels();
      showError('');
      if (focus) {
        var title = steps[n - 1].querySelector('h1');
        title.focus({ preventScroll: true });
        var top = form.getBoundingClientRect().top;
        if (top < 80) window.scrollBy({ top: top - 100, behavior: 'smooth' });
      }
    };

    back.addEventListener('click', function () {
      show(step - 1, true);
    });
    [].forEach.call(form.querySelectorAll('[data-goto]'), function (button) {
      button.addEventListener('click', function () {
        show(Number(button.dataset.goto), true);
      });
    });
    // Un service choisi fait passer tout seul à l'étape suivante, la première fois.
    var autoAdvanced = false;
    [].forEach.call(form.querySelectorAll('input[name="service"]'), function (input) {
      input.addEventListener('change', function () {
        showError('');
        if (autoAdvanced) return;
        autoAdvanced = true;
        setTimeout(function () {
          if (step === 1) show(2, true);
        }, 260);
      });
    });

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

    // « Continuer » (ou Entrée dans un champ) passe à l'étape suivante ; à la dernière, la demande part.
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var problem = problemAt(step);
      if (problem) return showError(problem);
      if (step < STEPS) return show(step + 1, true);
      var v = values();
      showError('');
      fallback.hidden = true;
      next.disabled = true;
      next.classList.add('busy');
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
          if (stage) stage.dataset.active = '5';
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
          next.disabled = false;
          next.classList.remove('busy');
        });
    });

    show(1, false);
  })();

  // ---------- Témoignages (page Réalisations) : ceux publiés, et la fenêtre pour en envoyer un ----------
  // Un témoignage envoyé est gardé sur le serveur ; il n'apparaît ici qu'après validation dans l'Espace One Technologie.
  (function () {
    var section = document.querySelector('[data-testimonials]');
    if (!section || !config.testimonialsUrl) return;
    var t = function (fr, english) {
      return lang === 'en' ? english : fr;
    };
    var stage = section.querySelector('[data-testi-stage]');
    var faces = section.querySelector('[data-testi-faces]');
    var card = section.querySelector('[data-testi-card]');
    var empty = section.querySelector('[data-testi-empty]');
    var STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-2.9-5.4 2.9 1.1-6-4.5-4.2 6.1-.8z"/></svg>';
    var initials = function (name) {
      return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(function (part) {
          return part.charAt(0).toUpperCase();
        })
        .join('');
    };
    // Une photo n'est acceptée que si c'est une image écrite en texte (data:image/…) : jamais une adresse extérieure.
    var safePhoto = function (photo) {
      return typeof photo === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(photo) ? photo : null;
    };
    var avatar = function (item) {
      var box = document.createElement('span');
      box.className = 'testi-face-img';
      var photo = safePhoto(item.photo);
      if (photo) {
        var img = document.createElement('img');
        img.src = photo;
        img.alt = '';
        box.appendChild(img);
      } else {
        box.textContent = initials(item.name);
      }
      return box;
    };

    var items = [];
    var current = 0;
    var show = function (index) {
      current = index;
      [].forEach.call(faces.children, function (button, i) {
        button.setAttribute('aria-selected', String(i === index));
        button.tabIndex = i === index ? 0 : -1;
      });
      var item = items[index];
      card.textContent = '';
      var stars = document.createElement('p');
      stars.className = 'testi-card-stars';
      stars.setAttribute('aria-label', t('Note : ' + item.rating + ' sur 5', 'Rating: ' + item.rating + ' out of 5'));
      for (var n = 1; n <= 5; n++) {
        var star = document.createElement('span');
        star.innerHTML = STAR;
        if (n <= item.rating) star.className = 'on';
        stars.appendChild(star);
      }
      var quote = document.createElement('blockquote');
      quote.textContent = '« ' + item.text + ' »';
      var who = document.createElement('figcaption');
      who.appendChild(avatar(item));
      var name = document.createElement('b');
      name.textContent = item.name;
      who.appendChild(name);
      if (item.role) {
        var role = document.createElement('span');
        role.textContent = item.role;
        who.appendChild(role);
      }
      card.appendChild(stars);
      card.appendChild(quote);
      card.appendChild(who);
      card.classList.remove('enter');
      void card.offsetWidth;
      card.classList.add('enter');
    };
    var render = function (list) {
      items = list.filter(function (item) {
        return item && typeof item.name === 'string' && typeof item.text === 'string';
      });
      if (!items.length) return;
      faces.textContent = '';
      items.forEach(function (item, i) {
        var button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('role', 'tab');
        button.className = 'testi-face';
        button.setAttribute('aria-label', item.name);
        button.appendChild(avatar(item));
        button.addEventListener('click', function () {
          show(i);
        });
        button.addEventListener('keydown', function (event) {
          var next = { ArrowDown: i + 1, ArrowRight: i + 1, ArrowUp: i - 1, ArrowLeft: i - 1 }[event.key];
          if (next === undefined) return;
          event.preventDefault();
          var target = (next + items.length) % items.length;
          show(target);
          faces.children[target].focus();
        });
        faces.appendChild(button);
      });
      stage.hidden = false;
      empty.hidden = true;
      show(0);
    };
    fetch(config.testimonialsUrl)
      .then(function (response) {
        return response.ok ? response.json() : [];
      })
      .then(function (list) {
        if (Array.isArray(list)) render(list);
      })
      .catch(function () {
        // Sans connexion au serveur, la section garde son message d'attente.
      });

    // ----- La fenêtre « Ajouter un témoignage » -----
    var dialog = document.querySelector('[data-testi-dialog]');
    var form = dialog.querySelector('[data-testi-form]');
    var body = dialog.querySelector('[data-testi-body]');
    var done = dialog.querySelector('[data-testi-done]');
    var error = dialog.querySelector('[data-testi-error]');
    var send = dialog.querySelector('[data-testi-send]');
    var file = dialog.querySelector('[data-testi-file]');
    var preview = dialog.querySelector('[data-testi-preview]');
    var removePhoto = dialog.querySelector('[data-testi-photo-remove]');
    var starsRow = dialog.querySelector('.testi-stars-row');
    // Deux étapes : 1. vous (photo, nom, fonction), 2. votre avis (note, texte, accord), puis l'envoi.
    var step = 1;
    var stepBoxes = [].slice.call(dialog.querySelectorAll('[data-testi-step]'));
    var stepBars = [].slice.call(dialog.querySelectorAll('.testi-bar li'));
    var count = dialog.querySelector('[data-testi-count]');
    var back = dialog.querySelector('[data-testi-back]');
    var cancel = dialog.querySelector('[data-testi-cancel]');
    var sendLabel = dialog.querySelector('[data-testi-send-label]');
    var sendMore = dialog.querySelector('[data-testi-send-more]');
    var stepLabels = function () {
      count.textContent = t('Étape ' + step + ' sur 2', 'Step ' + step + ' of 2');
      // « Envoyer mon témoignage » : la fin du libellé se cache sur les petits écrans.
      sendLabel.textContent = step === 1 ? t('Continuer', 'Continue') : t('Envoyer', 'Send');
      sendMore.textContent = step === 1 ? '' : t(' mon témoignage', ' my testimonial');
    };
    var showStep = function (n) {
      step = n;
      stepBoxes.forEach(function (box) {
        box.hidden = Number(box.dataset.testiStep) !== n;
      });
      stepBars.forEach(function (bar, i) {
        bar.classList.toggle('on', i + 1 === n);
        bar.classList.toggle('done', i + 1 < n);
      });
      back.hidden = n === 1;
      cancel.hidden = n !== 1;
      stepLabels();
      body.scrollTop = 0;
      dialog.scrollTop = 0;
    };
    document.addEventListener('one-lang', stepLabels);
    back.addEventListener('click', function () {
      showError('');
      showStep(1);
    });
    var cameraIcon = preview.innerHTML;
    var photo = null;
    var showError = function (text) {
      error.textContent = text;
      error.hidden = !text;
    };
    var paintStars = function (value) {
      starsRow.dataset.value = String(value);
    };
    var checkedRating = function () {
      var checked = form.querySelector('input[name="rating"]:checked');
      return checked ? Number(checked.value) : 0;
    };
    paintStars(checkedRating());
    [].forEach.call(starsRow.querySelectorAll('input'), function (input) {
      input.addEventListener('change', function () {
        paintStars(checkedRating());
      });
    });
    [].forEach.call(starsRow.querySelectorAll('label'), function (label, i) {
      label.addEventListener('mouseenter', function () {
        paintStars(i + 1);
      });
    });
    starsRow.addEventListener('mouseleave', function () {
      paintStars(checkedRating());
    });

    var open = function () {
      body.hidden = false;
      done.hidden = true;
      showError('');
      showStep(1);
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
      form.querySelector('input[name="name"]').focus();
    };
    var close = function () {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    };
    [].forEach.call(document.querySelectorAll('[data-testi-open]'), function (button) {
      button.addEventListener('click', open);
    });
    [].forEach.call(dialog.querySelectorAll('[data-testi-close]'), function (button) {
      button.addEventListener('click', close);
    });
    // Un clic sur le fond sombre, autour de la fenêtre, la ferme.
    dialog.addEventListener('click', function (event) {
      if (event.target === dialog) close();
    });

    // La photo : recadrée au centre en carré de 200 px, puis écrite en texte (JPEG), avant l'envoi.
    var setPhoto = function (value) {
      photo = value;
      preview.innerHTML = value ? '<img src="' + value + '" alt="">' : cameraIcon;
      removePhoto.hidden = !value;
    };
    file.addEventListener('change', function () {
      var chosen = file.files && file.files[0];
      file.value = '';
      if (!chosen) return;
      if (!/^image\//.test(chosen.type || 'image/')) return showError(t('Ce fichier n’est pas une image.', 'This file is not an image.'));
      var url = URL.createObjectURL(chosen);
      var img = new Image();
      img.onload = function () {
        var side = Math.min(img.naturalWidth, img.naturalHeight);
        var canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 200;
        canvas.getContext('2d').drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, 200, 200);
        URL.revokeObjectURL(url);
        showError('');
        setPhoto(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        showError(t('Cette image ne peut pas être lue. Essayez une autre photo.', 'This image cannot be read. Try another photo.'));
      };
      img.src = url;
    });
    removePhoto.addEventListener('click', function () {
      setPhoto(null);
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var data = new FormData(form);
      var v = {
        name: String(data.get('name') || '').trim(),
        role: String(data.get('role') || '').trim(),
        text: String(data.get('text') || '').trim(),
        rating: checkedRating(),
        photo: photo,
        consent: data.get('consent') === 'on',
        website: String(data.get('website') || ''),
        lang: lang,
      };
      if (!v.name) {
        showStep(1);
        return showError(t('Indiquez votre nom.', 'Please enter your name.'));
      }
      if (step === 1) {
        showError('');
        showStep(2);
        return;
      }
      if (!v.rating) return showError(t('Choisissez une note.', 'Choose a rating.'));
      if (v.text.length < 20) return showError(t('Écrivez quelques mots de plus (20 caractères au moins).', 'Write a few more words (at least 20 characters).'));
      if (!v.consent) return showError(t('Cochez la case pour accepter la publication.', 'Tick the box to accept publication.'));
      showError('');
      send.disabled = true;
      send.classList.add('busy');
      fetch(config.testimonialsUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v) })
        .then(function (response) {
          if (response.ok) return null;
          return response
            .json()
            .catch(function () {
              return {};
            })
            .then(function (answer) {
              throw new Error((lang === 'fr' && answer && answer.error) || t('Votre témoignage n’a pas pu partir. Réessayez dans quelques instants.', 'Your testimonial could not be sent. Try again in a moment.'));
            });
        })
        .then(function () {
          form.reset();
          setPhoto(null);
          paintStars(checkedRating());
          body.hidden = true;
          done.hidden = false;
          done.focus();
        })
        .catch(function (problem) {
          showError(problem instanceof TypeError ? t('Pas de connexion internet. Vérifiez votre réseau, puis réessayez.', 'No internet connection. Check your network, then try again.') : problem.message);
        })
        .then(function () {
          send.disabled = false;
          send.classList.remove('busy');
        });
    });
  })();

  // ---------- Les chiffres de l'accueil : ils comptent jusqu'à leur valeur quand ils apparaissent ----------
  (function () {
    var counters = [].slice.call(document.querySelectorAll('[data-count]'));
    if (!counters.length || still || !('IntersectionObserver' in window)) return;
    var run = function (el) {
      var to = Number(el.dataset.count);
      var from = Number(el.dataset.from || 0);
      var start = null;
      var step = function (time) {
        if (start === null) start = time;
        var t = Math.min((time - start) / 1600, 1);
        var eased = 1 - Math.pow(1 - t, 3);
        el.textContent = String(Math.round(from + (to - from) * eased));
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    counters.forEach(function (el) {
      el.textContent = el.dataset.from || '0';
    });
    var watch = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          watch.unobserve(entry.target);
          run(entry.target);
        });
      },
      { threshold: 0.6 },
    );
    counters.forEach(function (el) {
      watch.observe(el);
    });
  })();

  // ---------- Les réalisations de l'accueil s'empilent : la carte recouverte recule un peu ----------
  (function () {
    var cards = [].slice.call(document.querySelectorAll('.cases.stack .case'));
    if (cards.length < 2) return;
    cards.forEach(function (card, k) {
      card.style.setProperty('--k', k);
    });
    if (still) return;
    var ticking = false;
    var update = function () {
      ticking = false;
      cards.forEach(function (card, k) {
        var next = cards[k + 1];
        var progress = 0;
        if (next) {
          var a = card.getBoundingClientRect();
          var b = next.getBoundingClientRect();
          // 0 quand la suivante est encore sous la carte, 1 quand elle l'a entièrement recouverte.
          progress = Math.min(Math.max((a.bottom - b.top) / a.height, 0), 1);
        }
        card.style.setProperty('--s', String(1 - progress * 0.06));
        card.style.setProperty('--o', String(1 - progress * 0.45));
      });
    };
    window.addEventListener(
      'scroll',
      function () {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(update);
        }
      },
      { passive: true },
    );
    window.addEventListener('resize', update);
    update();
  })();

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
