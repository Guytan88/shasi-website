// קידום האפליקציה בדפי הכלים: כפתור תזכורת בתוך התוצאה, ופס תחתון
// שעולה רק אחרי שמשתמש קיבל תוצאה, ונסגר בלחיצה (ונשאר סגור עד סוף הביקור).
(function () {
  "use strict";

  var BELL = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22zm7-6V11a7 7 0 0 0-5.5-6.84V3.5a1.5 1.5 0 0 0-3 0v.66A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2z"/></svg>';
  var KEY = "shasi-app-bar-closed";
  var timer = null;

  function urls() {
    var t = document.getElementById("store-buttons");
    var a = t ? t.content.querySelectorAll("a") : [];
    return { ios: a[0] ? a[0].href : "#", android: a[1] ? a[1].href : "#" };
  }
  function storeUrl() {
    var u = urls();
    return /android/i.test(navigator.userAgent) ? u.android : u.ios;
  }
  function closed() {
    try { return sessionStorage.getItem(KEY) === "1"; } catch (e) { return false; }
  }
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /** כפתור שחור בתוך כרטיס התוצאה. */
  function remindButton(text) {
    return '<a class="remind-btn" href="' + esc(storeUrl()) + '" rel="noopener">' + BELL + "<span>" + esc(text) + "</span></a>";
  }

  /** הפס התחתון – מופיע שנייה וחצי אחרי התוצאה, לא מיד, כדי לא לקפוץ מול העיניים. */
  function showBar(opts) {
    if (closed()) return;
    clearTimeout(timer);
    var bar = document.getElementById("app-bar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "app-bar";
      bar.className = "app-bar";
      bar.setAttribute("role", "complementary");
      document.body.appendChild(bar);
    }
    bar.classList.remove("show");
    bar.innerHTML =
      '<img src="/logo.png" alt="" width="40" height="40">' +
      '<div class="app-bar-text"><strong>' + esc(opts.title) + "</strong><span>" + esc(opts.text) + "</span></div>" +
      '<a class="app-bar-btn" href="' + esc(storeUrl()) + '" rel="noopener">' + esc(opts.button) + "</a>" +
      '<button class="app-bar-x" type="button" aria-label="' + esc(opts.close) + '">×</button>';
    bar.querySelector(".app-bar-x").addEventListener("click", function () {
      bar.classList.remove("show");
      document.body.classList.remove("has-app-bar");
      try { sessionStorage.setItem(KEY, "1"); } catch (e) { /* לא חובה */ }
    });
    timer = setTimeout(function () {
      bar.classList.add("show");
      document.body.classList.add("has-app-bar");
    }, 1500);
  }

  window.ShasiPromo = { remindButton: remindButton, showBar: showBar };
})();
