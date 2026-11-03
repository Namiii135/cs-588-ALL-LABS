(function () {
  var menuBtn = document.getElementById('menuBtn');
  var nav = document.getElementById('nav');
  menuBtn.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  nav.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') { nav.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); }
  });

  document.addEventListener('click', function (e) {
    var b = e.target.closest('.copy');
    if (!b) return;
    var text = b.getAttribute('data-copy');
    var done = function (ok) {
      var old = b.textContent;
      b.textContent = ok ? 'Copied' : 'Select number';
      setTimeout(function () { b.textContent = old; }, 1500);
    };
    try {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
    } catch (err) { done(false); }
  });

  var chips = document.querySelectorAll('.chip');
  var cards = document.querySelectorAll('#hotGrid .hot');
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var f = chip.getAttribute('data-filter');
      chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
      cards.forEach(function (card) {
        card.hidden = card.getAttribute('data-tags').split(' ').indexOf(f) === -1;
      });
    });
  });

    var form = document.getElementById('feedback');
  var status = document.getElementById('fstatus');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var gmail = document.getElementById('fgmail').value.trim();
    var msg = document.getElementById('fmsg').value.trim();
    var gmailOk = /^[a-z0-9.]{6,30}@gmail\.com$/i.test(gmail);
    status.hidden = false;

    if (!gmail) {
      status.textContent = 'Please enter your Gmail.';
    } else if (!gmailOk) {
      status.textContent = 'Wrong Gmail. Use a Gmail address like yourname@gmail.com.';
    } else if (!msg) {
      status.textContent = 'Please write a short message first.';
    } else {
      status.textContent = 'Gmail accepted. This is a class project demo, so nothing was sent.';
    }
  });

})();
  var root = document.documentElement;
  var themeBtn = document.getElementById('themeBtn');

  function currentTheme() {
    var t = root.getAttribute('data-theme');
    if (t) return t;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    themeBtn.textContent = t === 'dark' ? 'Light mode' : 'Dark mode';
    try { localStorage.setItem('theme', t); } catch (err) {}
  }

  var saved = null;
  try { saved = localStorage.getItem('theme'); } catch (err) {}
  applyTheme(saved || currentTheme());

  themeBtn.addEventListener('click', function () {
    applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
  });