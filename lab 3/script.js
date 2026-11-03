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

  /* ===== Lab Work 3 additions =====
     Output methods used below:
       innerHTML        -> live time line, open/closed status, dialog content, form status
       document.write() -> printable hotline list window
       window.alert()   -> feedback form errors, blocked pop-up warning
       console          -> start-up message, form logs, event-loop order demo */

  var KL = 'Asia/Kuala_Lumpur';
  var DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Date and time handling: read weekday, hour and minute in Malaysia time
  function klParts(date) {
    var out = {};
    new Intl.DateTimeFormat('en-US', { timeZone: KL, weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false })
      .formatToParts(date).forEach(function (p) { out[p.type] = p.value; });
    return { dayIndex: DAY_SHORT.indexOf(out.weekday), minutes: (Number(out.hour) % 24) * 60 + Number(out.minute) };
  }

  function formatKL(date) {
    return date.toLocaleString('en-GB', { timeZone: KL, weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', hour12: true });
  }

  var OPEN_AT = 9 * 60 + 30;   // 9:30 am
  var CLOSE_AT = 17 * 60 + 30; // 5:30 pm

  function awamStatusHtml(t) {
    var isWeekday = t.dayIndex >= 1 && t.dayIndex <= 5;
    if (isWeekday && t.minutes >= OPEN_AT && t.minutes < CLOSE_AT) {
      return '<strong>Open now</strong>, closes at 5:30 pm.';
    }
    // control flow: look ahead day by day for the next weekday opening
    for (var step = 0; step < 8; step++) {
      var d = (t.dayIndex + step) % 7;
      var weekday = d >= 1 && d <= 5;
      if (weekday && (step > 0 || t.minutes < OPEN_AT)) {
        var when = step === 0 ? 'today' : (step === 1 ? 'tomorrow' : DAY_NAMES[d]);
        return '<strong>Closed now</strong>, opens ' + when + ' at 9:30 am. Call Talian Kasih (24 hours) if you need help sooner.';
      }
    }
    return '';
  }

  var nowLine = document.getElementById('nowLine');
  var awamStatus = document.getElementById('awamStatus');

  function updateLive() {
    var now = new Date();
    nowLine.innerHTML = 'Malaysia time now: <strong>' + esc(formatKL(now)) + '</strong>. Talian Kasih 15999 runs 24 hours a day.';
    awamStatus.innerHTML = awamStatusHtml(klParts(now));
  }
  updateLive();
  setInterval(updateLive, 30 * 1000); // event loop: repeating timer

  // Pop-up dialog (native <dialog>)
  var dialog = document.getElementById('infoDialog');
  var dialogTitle = document.getElementById('dialogTitle');
  var dialogBody = document.getElementById('dialogBody');

  function openDialog(title, html) {
    dialogTitle.textContent = title;
    dialogBody.innerHTML = html;
    if (typeof dialog.showModal === 'function') { dialog.showModal(); } else { dialog.setAttribute('open', ''); }
  }
  function closeDialog() {
    if (typeof dialog.close === 'function') { dialog.close(); } else { dialog.removeAttribute('open'); }
  }
  document.getElementById('dialogClose').addEventListener('click', closeDialog);
  dialog.addEventListener('click', function (e) { if (e.target === dialog) closeDialog(); });

  var safetyTips = [
    'Open this site in a private or incognito window and close it afterwards.',
    'Clear your browser history and call log after you look up help.',
    'Save helpline numbers under an ordinary name, such as a clinic or a shop.',
    'Agree a code word with a trusted person so they know when to call for help.',
    'Keep ID, money, medicine and a charger somewhere you can grab quickly.',
    'If you think your phone is being monitored, use a device they cannot access.'
  ];

  document.getElementById('safetyBtn').addEventListener('click', function () {
    var items = '';
    for (var i = 0; i < safetyTips.length; i++) { items += '<li>' + safetyTips[i] + '</li>'; }
    openDialog('Staying safe online', '<ul>' + items + '</ul><p>No method is perfectly safe. The Quick exit button at the top leaves this page at once.</p>');
  });

  // document.write(): printable hotline list in a new window
  document.getElementById('printBtn').addEventListener('click', function () {
    var win = window.open('', 'safePlaceList', 'width=720,height=860');
    if (!win) {
      window.alert('Your browser blocked the pop-up window. Allow pop-ups for this page and try again.');
      return;
    }
    var rows = '<tr><td>Police</td><td>999</td></tr><tr><td>Talian Kasih (JKM)</td><td>15999</td></tr>';
    cards.forEach(function (card) { // all cards, even ones hidden by the filter
      var name = card.querySelector('h3').textContent;
      var number = card.querySelector('.num').textContent;
      if (name !== 'Talian Kasih') { rows += '<tr><td>' + esc(name) + '</td><td>' + esc(number) + '</td></tr>'; }
    });
    win.document.open();
    win.document.write(
      '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Hotline list - SAFE PLACE MY</title>' +
      '<style>body{font-family:system-ui,Arial,sans-serif;color:#1e1b3f;background:#fbfaff;margin:0;padding:2rem;line-height:1.5}' +
      'main{max-width:36rem;margin:auto;background:#fff;border:1px solid #ddd8f3;border-radius:16px;padding:1.5rem}' +
      'h1{font-size:1.5rem;margin:0 0 .3rem;color:#231e57}p{color:#57557a;margin:0 0 1rem}' +
      'table{width:100%;border-collapse:collapse}td{padding:.55rem .4rem;border-top:1px solid #ddd8f3}' +
      'td:last-child{text-align:right;font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap}' +
      'button{margin-top:1.2rem;font:inherit;font-weight:700;background:#3b5bdb;color:#fff;border:0;border-radius:999px;padding:.6rem 1.2rem;cursor:pointer}' +
      '@media print{body{background:#fff;padding:0}main{border:0}button{display:none}}</style></head><body><main>' +
      '<h1>SAFE PLACE MY: hotline list</h1>' +
      '<p>Printed ' + esc(formatKL(new Date())) + '. Keep this page somewhere private.</p>' +
      '<table>' + rows + '</table>' +
      '<button onclick="window.print()">Print this page</button></main></body></html>'
    );
    win.document.close();
    console.log('[print] hotline list written with document.write(), rows:', cards.length + 2);
  });

  // Feedback form: validation, alert, event loop, dialog
  var form = document.getElementById('feedback');
  var status = document.getElementById('fstatus');
  var fmsg = document.getElementById('fmsg');
  var fcount = document.getElementById('fcount');
  var sending = false;

  fmsg.addEventListener('input', function () {
    var used = fmsg.value.length;
    fcount.textContent = used + ' / 500';
    fcount.classList.toggle('warn', used > 450);
  });

  function showStatus(html, isError) {
    status.hidden = false;
    status.innerHTML = html;
    status.classList.toggle('error', !!isError);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sending) return;

    var name = document.getElementById('fname').value.trim();
    var gmail = document.getElementById('fgmail').value.trim();
    var topic = document.getElementById('ftopic').value;
    var msg = fmsg.value.trim();
    var problems = [];

    if (!gmail) {
      problems.push('Please enter your Gmail.');
    } else if (!/^[a-z0-9.]{6,30}@gmail\.com$/i.test(gmail)) {
      problems.push('Wrong Gmail. Use a Gmail address like yourname@gmail.com.');
    }
    if (!msg) {
      problems.push('Please write a short message first.');
    } else if (msg.length < 10) {
      problems.push('Your message is too short (' + msg.length + ' of at least 10 characters).');
    }

    if (problems.length > 0) {
      var list = '';
      problems.forEach(function (p) { list += '<li>' + esc(p) + '</li>'; });
      showStatus('Please fix this before sending:<ul>' + list + '</ul>', true);
      console.warn('[feedback] validation failed:', problems);
      window.alert(problems.join('\n'));
      return;
    }

    sending = true;
    var now = new Date();

    // event loop order: synchronous code, then microtasks, then timers
    console.log('[loop] 1. synchronous: form accepted');
    setTimeout(function () { console.log('[loop] 4. macrotask: setTimeout(0) runs last'); }, 0);
    Promise.resolve().then(function () { console.log('[loop] 3. microtask: promise runs before timers'); });
    console.log('[loop] 2. synchronous: end of submit handler');

    console.log('[feedback] accepted', { topic: topic, hasName: name !== '', messageLength: msg.length, time: now.toISOString() });

    showStatus('Sending&hellip;', false);

    setTimeout(function () {
      var ref = 'SP-' + now.toISOString().slice(2, 10).replace(/-/g, '') + '-' + (Math.floor(Math.random() * 9000) + 1000);
      showStatus('Gmail accepted. This is a class project demo, so nothing was sent. Reference <strong>' + ref + '</strong>.', false);
      openDialog('Thank you' + (name ? ', ' + esc(name) : ''),
        '<p>Your feedback about <strong>' + esc(topic.toLowerCase()) + '</strong> was checked on ' + esc(formatKL(now)) + '.</p>' +
        '<p>This is a class project demo, so nothing was sent. If you need help now, call 999 or Talian Kasih 15999.</p>');
      form.reset();
      fcount.textContent = '0 / 500';
      sending = false;
    }, 700);
  });

  console.log('SAFE PLACE MY loaded at ' + formatKL(new Date()));

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