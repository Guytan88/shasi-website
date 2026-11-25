// Free VIN check – runs entirely in the browser against NHTSA's free public
// APIs (vPIC decoder, recalls, complaints, NCAP safety ratings).
(function () {
  "use strict";

  var form = document.getElementById("vin-form");
  var input = document.getElementById("vin-input");
  var out = document.getElementById("vin-result");
  var storeHtml = (document.getElementById("store-buttons") || {}).innerHTML || "";

  function getJson(url) {
    return fetch(url).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });
  }
  function soft(p) { return p.catch(function () { return null; }); }
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function has(v) { return v !== null && v !== undefined && String(v).trim() !== "" && v !== "Not Applicable" && v !== "0"; }
  function rows(list) {
    var items = list.filter(function (r) { return has(r[1]); })
      .map(function (r) { return "<div><dt>" + esc(r[0]) + "</dt><dd>" + esc(r[1]) + "</dd></div>"; });
    return items.length ? '<dl class="kv">' + items.join("") + "</dl>" : "";
  }
  function section(title, inner) {
    return inner ? '<section class="res-card"><h2>' + esc(title) + "</h2>" + inner + "</section>" : "";
  }
  function stars(v) {
    var n = parseInt(v, 10);
    if (!(n >= 1 && n <= 5)) return "";
    return '<span class="stars" aria-label="' + n + ' out of 5 stars">' + "★★★★★".slice(0, n) +
      '<span class="off">' + "★★★★★".slice(n) + "</span></span>";
  }
  function date(s) {
    // NHTSA uses "dd/mm/yyyy" in recalls and ISO elsewhere.
    if (!s) return "";
    var m = String(s).match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    var d = m ? new Date(+m[3], +m[2] - 1, +m[1]) : new Date(s);
    return isNaN(d) ? String(s) : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  }
  function engine(v) {
    var parts = [];
    if (has(v.DisplacementL)) parts.push(Number(v.DisplacementL).toFixed(1) + "L");
    if (has(v.EngineCylinders)) parts.push(v.EngineCylinders + "-cyl");
    if (has(v.EngineHP)) parts.push(Math.round(v.EngineHP) + " hp");
    if (has(v.FuelTypePrimary)) parts.push(v.FuelTypePrimary);
    return parts.join(" · ");
  }

  function run(raw) {
    var vin = String(raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (vin.length !== 17) {
      out.innerHTML = '<p class="res-error">A VIN has exactly 17 letters and digits. You entered ' + vin.length + ".</p>";
      return;
    }
    if (/[IOQ]/.test(vin)) {
      out.innerHTML = '<p class="res-error">VINs never contain the letters I, O or Q. Check for a 1, 0 or 9 instead.</p>';
      return;
    }
    try { history.replaceState(null, "", "?vin=" + vin); } catch (e) { /* optional */ }
    out.innerHTML = '<p class="res-loading">Checking NHTSA records…</p>';

    getJson("https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/" + vin + "?format=json")
      .then(function (d) {
        var v = (d.Results || [])[0] || {};
        if (!has(v.Make) || !has(v.ModelYear)) {
          out.innerHTML = '<p class="res-error">We couldn\'t decode this VIN. ' +
            (v.ErrorText ? esc(v.ErrorText.split(";")[0]) : "Double-check it against your registration or the driver-side dashboard.") + "</p>";
          return;
        }
        var mk = encodeURIComponent(v.Make), md = encodeURIComponent(v.Model || ""), yr = encodeURIComponent(v.ModelYear);
        var base = "https://api.nhtsa.gov";
        render(vin, v, null, null, null, true);
        out.scrollIntoView({ behavior: "smooth", block: "start" });
        return Promise.all([
          soft(getJson(base + "/recalls/recallsByVehicle?make=" + mk + "&model=" + md + "&modelYear=" + yr)),
          soft(getJson(base + "/complaints/complaintsByVehicle?make=" + mk + "&model=" + md + "&modelYear=" + yr)),
          soft(getJson(base + "/SafetyRatings/modelyear/" + yr + "/make/" + mk + "/model/" + md).then(function (s) {
            var first = (s.Results || [])[0];
            return first ? getJson(base + "/SafetyRatings/VehicleId/" + first.VehicleId).then(function (r) { return (r.Results || [])[0] || null; }) : null;
          }))
        ]).then(function (x) { render(vin, v, x[0], x[1], x[2], false); });
      })
      .catch(function () {
        out.innerHTML = '<p class="res-error">NHTSA\'s service isn\'t responding right now. Please try again in a few minutes.</p>';
      });
  }

  function render(vin, v, recalls, complaints, rating, pending) {
    var title = [v.ModelYear, v.Make, v.Model, v.Trim].filter(has).join(" ");
    var rec = (recalls && recalls.results) || [];
    var comp = (complaints && complaints.results) || [];
    var html = "";

    var chips = [];
    if (pending) chips.push('<span class="chip">Checking recalls…</span>');
    else chips.push(rec.length
      ? '<span class="chip bad">' + rec.length + " recall" + (rec.length > 1 ? "s" : "") + " for this model</span>"
      : '<span class="chip ok">No recalls for this model</span>');
    if (rating && has(rating.OverallRating) && rating.OverallRating !== "Not Rated") chips.push('<span class="chip">NHTSA ' + esc(rating.OverallRating) + "★ overall</span>");
    if (comp.length) chips.push('<span class="chip">' + comp.length + " owner complaints</span>");

    html += '<section class="res-head"><div class="vin-badge">' + esc(vin) + "</div>" +
      "<h2>" + esc(title) + "</h2>" +
      (has(v.BodyClass) ? '<p class="res-sub">' + esc(v.BodyClass) + (has(v.VehicleType) ? " · " + esc(v.VehicleType) : "") + "</p>" : "") +
      '<div class="chips">' + chips.join("") + "</div>" +
      window.ShasiPromo.remindButton("Get oil change & recall reminders for this " + (v.Model || "car")) +
      "</section>";

    html += section("Vehicle details", rows([
      ["Year", v.ModelYear], ["Make", v.Make], ["Model", v.Model], ["Trim", v.Trim], ["Series", v.Series],
      ["Body", v.BodyClass], ["Doors", v.Doors], ["Engine", engine(v)], ["Engine model", v.EngineModel],
      ["Electrification", v.ElectrificationLevel], ["Transmission", [v.TransmissionStyle, has(v.TransmissionSpeeds) ? v.TransmissionSpeeds + "-speed" : ""].filter(has).join(", ")],
      ["Drive", v.DriveType], ["GVWR", v.GVWR], ["Seats", v.Seats],
      ["Built in", [v.PlantCity, v.PlantState, v.PlantCountry].filter(has).join(", ")],
      ["Manufacturer", v.Manufacturer]
    ]));

    html += section("Safety equipment", rows([
      ["Front airbags", v.AirBagLocFront], ["Side airbags", v.AirBagLocSide], ["Curtain airbags", v.AirBagLocCurtain],
      ["Knee airbags", v.AirBagLocKnee], ["ABS", v.ABS], ["Electronic stability control", v.ESC],
      ["Traction control", v.TractionControl], ["Backup camera", v.RearVisibilitySystem],
      ["Automatic emergency braking", v.CIB], ["Forward collision warning", v.ForwardCollisionWarning],
      ["Lane departure warning", v.LaneDepartureWarning], ["Blind spot warning", v.BlindSpotMon],
      ["Adaptive cruise control", v.AdaptiveCruiseControl], ["TPMS", v.TPMS]
    ]));

    var rated = rating && ["OverallRating", "OverallFrontCrashRating", "OverallSideCrashRating", "RolloverRating"]
      .some(function (k) { return stars(rating[k]); });
    if (rated) {
      html += section("NHTSA crash test ratings",
        '<dl class="kv">' + [
          ["Overall", rating.OverallRating], ["Frontal crash", rating.OverallFrontCrashRating],
          ["Side crash", rating.OverallSideCrashRating], ["Rollover", rating.RolloverRating]
        ].filter(function (r) { return stars(r[1]); }).map(function (r) {
          return "<div><dt>" + esc(r[0]) + "</dt><dd>" + stars(r[1]) + "</dd></div>";
        }).join("") + "</dl>" +
        (rating.VehicleDescription ? '<p class="res-note">Rated variant: ' + esc(rating.VehicleDescription) + "</p>" : ""));
    }

    if (pending) {
      html += '<p class="res-loading">Loading recalls, crash ratings and owner complaints…</p>';
      out.innerHTML = html;
      return;
    }

    html += section("Recalls", (rec.length
      ? rec.map(function (r) {
          return '<details class="recall"><summary><strong>' + esc(String(r.Component || "").toLowerCase().split(":").join(" › ")) + '</strong> <span class="res-note">' +
            esc(date(r.ReportReceivedDate)) + "</span></summary>" +
            "<p>" + esc(r.Summary) + "</p>" +
            (r.Consequence ? '<p class="res-note"><b>Risk:</b> ' + esc(r.Consequence) + "</p>" : "") +
            (r.Remedy ? '<p class="res-note"><b>Remedy:</b> ' + esc(r.Remedy) + "</p>" : "") +
            '<p class="res-note">NHTSA campaign ' + esc(r.NHTSACampaignNumber) + "</p></details>";
        }).join("")
      : '<p class="res-good">NHTSA lists no recalls for the ' + esc([v.ModelYear, v.Make, v.Model].join(" ")) + ".</p>") +
      '<p class="res-note">These recalls cover the model year. To see whether this exact car still has an unrepaired recall, ' +
      '<a href="https://www.nhtsa.gov/recalls?vin=' + esc(vin) + '" rel="noopener" target="_blank">check this VIN on NHTSA.gov</a>. Recall repairs are free at any authorized dealer.</p>');

    if (comp.length) {
      var counts = {};
      comp.forEach(function (c) {
        String(c.components || "").split(",").forEach(function (p) {
          p = p.trim(); if (p) counts[p] = (counts[p] || 0) + 1;
        });
      });
      var top = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).slice(0, 6);
      html += section("Most reported problems",
        '<p class="res-note">' + comp.length + " complaints filed with NHTSA by owners of this model year.</p>" +
        '<ol class="bars">' + top.map(function (k) {
          var pct = Math.max(6, Math.round(counts[k] / counts[top[0]] * 100));
          return '<li><span class="bar-label">' + esc(k.toLowerCase()) + '</span><span class="bar"><i style="width:' + pct + '%"></i></span><span class="bar-n">' + counts[k] + "</span></li>";
        }).join("") + "</ol>");
    }

    html += '<aside class="cta res-cta"><div class="cta-text"><strong>Never miss an oil change again</strong>' +
      "<p>Shasi builds a maintenance schedule for your car and reminds you before every service, registration renewal and insurance date.</p></div>" +
      storeHtml + "</aside>";
    window.ShasiPromo.showBar({
      title: "Never miss a service",
      text: "Reminders for oil changes, service and registration for your " + (v.Model || "car") + ".",
      button: "Get the app",
      close: "Close"
    });
    html += '<p class="res-source">Data from the U.S. National Highway Traffic Safety Administration (NHTSA) public APIs. Shasi is not affiliated with NHTSA.</p>';
    out.innerHTML = html;
  }

  form.addEventListener("submit", function (e) { e.preventDefault(); run(input.value); });
  var initial = new URLSearchParams(location.search).get("vin");
  if (initial) { input.value = initial; run(initial); }
})();
