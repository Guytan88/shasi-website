// בדיקת רכב לפי מספר רישוי – הכול מתבצע בדפדפן מול המאגרים הפתוחים של
// משרד התחבורה ב-data.gov.il (מאפשרים קריאה ישירה מהדפדפן, בלי שרת שלנו).
(function () {
  "use strict";

  var API = "https://data.gov.il/api/3/action/datastore_search";
  var R = {
    main: "053cea08-09bc-40ec-8f7a-156f0677aff3",     // רכב פרטי ומסחרי פעיל
    personal: "03adc637-b6fe-402b-9937-7c3d3afc9140", // יבוא אישי
    moto: "bf9df4e2-d90d-4c0a-a400-19e15af8e95f",     // דו-גלגלי
    heavy: "cd3acc5c-03c3-4c89-9c54-d40f93c0d790",    // מעל 3.5 טון / בלי קוד דגם
    gone: "851ecab1-0622-4dbe-a6c7-f950cf82abf9",     // ירדו מהכביש – ביטול סופי
    inactive: "f6efe89a-fb3d-43a4-bb61-9bf12a9b9099", // רכב לא פעיל (עם קוד דגם)
    history: "56063a99-8a3e-4ff4-912e-5966c0279bad",  // ק"מ בטסט, שינויים
    owners: "bb2355dc-9ec7-4f06-9c3f-3344672171da",   // היסטוריית בעלויות
    openRecalls: "36bf1404-0be4-49d2-82dc-2f1ead4a8b93",
    recalls: "2c33523f-87aa-44ec-a736-edbb0a82975e",
    tag: "c8b9f9c8-4612-4068-934f-d4acd2e3c06e",      // תג נכה
    specs: "142afde2-6228-49f9-8a29-9b6c3a0cbe40"     // מפרט לפי דגם ושנה
  };

  var form = document.getElementById("plate-form");
  var input = document.getElementById("plate-input");
  var out = document.getElementById("plate-result");
  var storeHtml = (document.getElementById("store-buttons") || {}).innerHTML || "";

  function q(resource, filters, limit) {
    var u = new URL(API);
    u.searchParams.set("resource_id", resource);
    u.searchParams.set("filters", JSON.stringify(filters));
    u.searchParams.set("limit", String(limit || 20));
    return fetch(u.toString())
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (d) { return (d && d.result && d.result.records) || []; });
  }
  // מאגר שנכשל לא מפיל את כל הבדיקה – מציגים את מה שהצליח.
  function soft(p) { return p.catch(function () { return null; }); }

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function has(v) { return v !== null && v !== undefined && String(v).trim() !== "" && v !== 0; }
  function date(iso) {
    if (!iso) return "";
    var m = String(iso).match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?/);
    if (!m) return String(iso);
    return (m[3] ? pad(m[3]) + "." : "") + pad(m[2]) + "." + m[1];
  }
  function pad(n) { return ("0" + n).slice(-2); }
  function ym(n) { var s = String(n); return s.length === 6 ? s.slice(4) + "/" + s.slice(0, 4) : s; }
  function daysUntil(iso) {
    var d = new Date(iso + "T00:00:00");
    if (isNaN(d)) return null;
    var now = new Date(); now.setHours(0, 0, 0, 0);
    return Math.round((d - now) / 86400000);
  }
  function plateLabel(n) {
    var s = String(n);
    if (s.length === 7) return s.slice(0, 2) + "-" + s.slice(2, 5) + "-" + s.slice(5);
    if (s.length === 8) return s.slice(0, 3) + "-" + s.slice(3, 5) + "-" + s.slice(5);
    return s;
  }
  function rows(list) {
    var items = list.filter(function (r) { return has(r[1]); })
      .map(function (r) { return "<div><dt>" + esc(r[0]) + "</dt><dd dir=\"auto\">" + esc(r[1]) + "</dd></div>"; });
    return items.length ? '<dl class="kv">' + items.join("") + "</dl>" : "";
  }
  function section(title, inner) {
    return inner ? '<section class="res-card"><h2>' + esc(title) + "</h2>" + inner + "</section>" : "";
  }

  function lookup(plate) {
    var f = { mispar_rechev: plate };
    return q(R.main, f, 1).then(function (r) {
      if (r.length) return { kind: "main", car: r[0] };
      return Promise.all([
        soft(q(R.personal, f, 1)), soft(q(R.moto, f, 1)), soft(q(R.heavy, f, 1)), soft(q(R.gone, f, 1)), soft(q(R.inactive, f, 1))
      ]).then(function (x) {
        if (x[0] && x[0].length) return { kind: "personal", car: x[0][0] };
        if (x[1] && x[1].length) return { kind: "moto", car: x[1][0] };
        if (x[2] && x[2].length) return { kind: "heavy", car: x[2][0] };
        if (x[3] && x[3].length) return { kind: "gone", car: x[3][0] };
        if (x[4] && x[4].length) return { kind: "inactive", car: x[4][0] };
        return null;
      });
    });
  }

  function run(raw) {
    var plate = String(raw || "").replace(/\D/g, "");
    if (plate.length < 5 || plate.length > 8) {
      out.innerHTML = '<p class="res-error">מספר רישוי צריך להכיל 5 עד 8 ספרות.</p>';
      return;
    }
    var n = Number(plate);
    try { history.replaceState(null, "", "?plate=" + plate); } catch (e) { /* לא חובה */ }
    out.innerHTML = '<p class="res-loading">בודקים במאגרי משרד התחבורה…</p>';

    lookup(n).then(function (found) {
      if (!found) {
        out.innerHTML = '<p class="res-error">לא נמצא רכב עם המספר ' + esc(plateLabel(n)) +
          ". ודאו שהמספר נכון (רק ספרות, בלי מקפים).</p>";
        return;
      }
      var car = found.car;
      var f = { mispar_rechev: n };
      return Promise.all([
        soft(q(R.history, f, 1)),
        soft(q(R.owners, f, 50)),
        soft(q(R.openRecalls, { MISPAR_RECHEV: n }, 20)),
        soft(q(R.tag, { "MISPAR RECHEV": n }, 1)),
        car.degem_cd && car.tozeret_cd
          ? soft(q(R.specs, { tozeret_cd: car.tozeret_cd, degem_cd: car.degem_cd, shnat_yitzur: car.shnat_yitzur }, 1))
          : Promise.resolve(null)
      ]).then(function (x) {
        var open = x[2] || [];
        var ids = open.map(function (r) { return r.RECALL_ID; });
        var details = ids.length ? soft(q(R.recalls, { RECALL_ID: ids }, 20)) : Promise.resolve([]);
        return details.then(function (d) {
          render(n, found, (x[0] || [])[0], x[1], open, d || [], (x[3] || []).length > 0, (x[4] || [])[0]);
        });
      });
    }).catch(function () {
      out.innerHTML = '<p class="res-error">המאגר של משרד התחבורה לא זמין כרגע. נסו שוב בעוד כמה דקות.</p>';
    });
  }

  function render(n, found, hist, owners, open, recallInfo, tag, spec) {
    var c = found.car;
    var make = (c.tozeret_nm || "").trim().replace(/ארהב"/g, "ארה\"ב");
    var model = (c.kinuy_mishari || c.degem_nm || "").trim();
    var html = "";

    var active = found.kind !== "gone" && found.kind !== "inactive";
    var testDays = c.tokef_dt ? daysUntil(c.tokef_dt) : null;

    // ---- כותרת ----
    var chips = [];
    if (found.kind === "gone") chips.push('<span class="chip bad">ירד מהכביש' + (c.bitul_dt ? " · " + esc(date(c.bitul_dt)) : "") + "</span>");
    if (found.kind === "inactive") chips.push('<span class="chip bad">רכב לא פעיל</span>');
    if (c.tokef_dt && found.kind !== "gone" && found.kind !== "inactive") {
      var d = daysUntil(c.tokef_dt);
      if (d !== null) {
        chips.push(d < 0
          ? '<span class="chip bad">הטסט פג לפני ' + (-d) + " ימים</span>"
          : '<span class="chip ' + (d <= 30 ? "warn" : "ok") + '">טסט בתוקף עוד ' + d + " ימים</span>");
      }
    }
    if (open.length) chips.push('<span class="chip bad">' + open.length + " ריקול" + (open.length > 1 ? "ים" : "") + " פתוח" + (open.length > 1 ? "ים" : "") + "</span>");
    else if (found.kind === "main" || found.kind === "personal") chips.push('<span class="chip ok">אין ריקול פתוח</span>');
    if (tag) chips.push('<span class="chip">תג חניה לנכה</span>');
    if (found.kind === "personal") chips.push('<span class="chip">יבוא אישי</span>');

    html += '<section class="res-head">' +
      '<div class="il-plate" dir="ltr"><span class="il-flag">IL</span><span>' + esc(plateLabel(n)) + "</span></div>" +
      "<h2>" + esc(make) + " <bdi>" + esc(model) + "</bdi>" + (c.shnat_yitzur ? " · " + esc(c.shnat_yitzur) : "") + "</h2>" +
      (c.ramat_gimur ? '<p class="res-sub">רמת גימור: ' + esc(c.ramat_gimur) + "</p>" : "") +
      '<div class="chips">' + chips.join("") + "</div>" +
      (active ? window.ShasiPromo.remindButton(testDays !== null && testDays >= 0
        ? "קבלו תזכורת לפני הטסט ב-" + date(c.tokef_dt)
        : "קבלו תזכורות לטסט, לטיפולים ולביטוח") : "") +
      "</section>";

    // ---- טסט ----
    html += section("טסט ורישוי", rows([
      [found.kind === "inactive" ? "תוקף רישיון אחרון" : "תוקף רישיון (טסט הבא)", date(c.tokef_dt)],
      ["טסט אחרון", date(c.mivchan_acharon_dt)],
      ["ק\"מ בטסט האחרון", hist && has(hist.kilometer_test_aharon) ? Number(hist.kilometer_test_aharon).toLocaleString("he-IL") : ""],
      ["עלייה לכביש", date(c.moed_aliya_lakvish)],
      ["רישום ראשון", hist ? date(hist.rishum_rishon_dt) : ""]
    ]));

    // ---- פרטי הרכב ----
    html += section("פרטי הרכב", rows([
      ["יצרן", make],
      ["דגם", model],
      ["קוד דגם", c.degem_nm],
      ["שנת ייצור", c.shnat_yitzur],
      ["צבע", c.tzeva_rechev],
      ["סוג דלק", c.sug_delek_nm],
      ["דגם מנוע", c.degem_manoa],
      ["נפח מנוע", c.nefach_manoa ? c.nefach_manoa + " סמ\"ק" : ""],
      ["בעלות נוכחית", c.baalut],
      ["סוג רכב", c.sug_rechev_nm || c.kvutzat_sug_rechev],
      ["מספר שלדה (VIN)", c.misgeret || c.shilda || c.mispar_shilda],
      ["צמיג קדמי", (c.zmig_kidmi || c.mida_zmig_kidmi || "").replace(/\\/g, "/")],
      ["צמיג אחורי", (c.zmig_ahori || c.mida_zmig_ahori || "").replace(/\\/g, "/")],
      ["קבוצת זיהום", c.kvutzat_zihum],
      ["סוג יבוא", c.sug_yevu]
    ]));

    // ---- בעלויות ----
    if (owners && owners.length) {
      var list = owners.slice().sort(function (a, b) { return a.baalut_dt - b.baalut_dt; });
      html += section("היסטוריית בעלויות",
        '<p class="res-note">' + list.length + " רישומי בעלות במאגר" + (list.length > 1 ? " (כל שורה = העברת בעלות)" : "") + "</p>" +
        '<ol class="timeline">' + list.map(function (o) {
          return "<li><strong>" + esc(ym(o.baalut_dt)) + "</strong> " + esc(o.baalut) + "</li>";
        }).join("") + "</ol>");
    }

    // ---- שינויים ----
    if (hist) {
      var flags = [
        ["שינוי מבנה", hist.shinui_mivne_ind],
        ["הותקן גפ\"מ (גז)", hist.gapam_ind],
        ["שינוי צבע", hist.shnui_zeva_ind],
        ["שינוי מידת צמיגים", hist.shinui_zmig_ind]
      ];
      html += section("שינויים שנרשמו",
        '<ul class="flags">' + flags.map(function (fl) {
          return '<li class="' + (fl[1] ? "yes" : "no") + '">' + esc(fl[0]) + ": <strong>" + (fl[1] ? "כן" : "לא") + "</strong></li>";
        }).join("") + "</ul>" +
        (hist.mkoriut_nm ? '<p class="res-note">מקוריות: ' + esc(hist.mkoriut_nm) + "</p>" : ""));
    }

    // ---- ריקולים ----
    if (found.kind === "main" || found.kind === "personal" || open.length) {
      var byId = {};
      recallInfo.forEach(function (r) { byId[r.RECALL_ID] = r; });
      html += section("ריקולים (קריאות שירות)", open.length
        ? open.map(function (r) {
            var i = byId[r.RECALL_ID] || {};
            return '<div class="recall"><strong>' + esc(r.SUG_TAKALA || r.SUG_RECALL) + "</strong>" +
              "<p>" + esc(r.TEUR_TAKALA) + "</p>" +
              '<p class="res-note">נפתח: ' + esc(date(r.TAARICH_PTICHA)) +
              (i.OFEN_TIKUN ? " · תיקון: " + esc(i.OFEN_TIKUN) : "") +
              (i.YEVUAN_TEUR ? " · יבואן: " + esc(i.YEVUAN_TEUR) : "") +
              (i.TELEPHONE ? ' · <a href="tel:' + esc(i.TELEPHONE) + '" dir="ltr">' + esc(i.TELEPHONE) + "</a>" : "") +
              "</p>" +
              '<p class="res-note">התיקון במסגרת ריקול ניתן בחינם אצל היבואן.</p></div>';
          }).join("")
        : '<p class="res-good">לא נמצא ריקול פתוח לרכב הזה.</p>');
    }

    // ---- מפרט ----
    if (spec) {
      html += section("מפרט הדגם", rows([
        ["סוג מרכב", spec.merkav],
        ["כוח סוס", spec.koah_sus],
        ["נפח מנוע", spec.nefah_manoa ? spec.nefah_manoa + " סמ\"ק" : ""],
        ["הנעה", spec.technologiat_hanaa_nm],
        ["תיבת הילוכים", spec.automatic_ind === 1 ? "אוטומטית" : spec.automatic_ind === 0 ? "ידנית" : ""],
        ["כריות אוויר", spec.mispar_kariot_avir],
        ["רמת אבזור בטיחותי", has(spec.ramat_eivzur_betihuty) ? spec.ramat_eivzur_betihuty + " מתוך 8" : ""],
        ["ניקוד בטיחות", spec.nikud_betihut],
        ["מושבים", spec.mispar_moshavim],
        ["דלתות", spec.mispar_dlatot],
        ["משקל כולל", spec.mishkal_kolel ? spec.mishkal_kolel + " ק\"ג" : ""],
        ["קבוצת אגרה", spec.kvuzat_agra_cd]
      ]));
    }

    // ---- CTA ----
    html += '<aside class="cta res-cta"><div class="cta-text"><strong>רוצים תזכורת לפני הטסט הבא?</strong>' +
      "<p>מכניסים את אותו מספר רישוי באפליקציית Shasi, ומקבלים לוח טיפולים מותאם לדגם ותזכורות לטסט ולביטוח.</p></div>" +
      storeHtml + "</aside>";

    html += '<p class="res-source">המידע מתוך המאגרים הפתוחים של משרד התחבורה (data.gov.il), ומתעדכן אצלם מעת לעת. ייתכנו פערים בין המאגר למצב בפועל.</p>';
    out.innerHTML = html;
    if (active) {
      window.ShasiPromo.showBar({
        title: "לא לפספס את הטסט הבא",
        text: testDays !== null && testDays >= 0
          ? "תזכורת לפני " + date(c.tokef_dt) + ", וגם לטיפולים ולביטוח."
          : "Shasi מזכירה לפני כל טסט, טיפול וחידוש ביטוח.",
        button: "הורדה",
        close: "סגירה"
      });
    }
    out.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  form.addEventListener("submit", function (e) { e.preventDefault(); run(input.value); });
  var initial = new URLSearchParams(location.search).get("plate");
  if (initial) { input.value = initial; run(initial); }
})();
