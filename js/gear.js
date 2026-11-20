(function () {
  "use strict";

  /* ---- Season: edit these two dates. Only Saturdays and Sundays in this range are bookable. ---- */
  var SEASON_START = new Date(2026, 11, 19); // 2026-12-19
  var SEASON_END = new Date(2027, 2, 14);    // 2027-03-14

  var today = new Date();
  today.setHours(0, 0, 0, 0);
  var first = SEASON_START > today ? SEASON_START : today;

  var minView = new Date(first.getFullYear(), first.getMonth(), 1);
  var maxView = new Date(SEASON_END.getFullYear(), SEASON_END.getMonth(), 1);
  var state = { date: null, view: new Date(minView) };

  var fmtMonth = new Intl.DateTimeFormat("lt-LT", { year: "numeric", month: "long" });
  var fmtWeekday = new Intl.DateTimeFormat("lt-LT", { weekday: "long" });
  var fmtDate = new Intl.DateTimeFormat("lt-LT", { month: "long", day: "numeric" });
  var fmtDay = { format: function (d) { return fmtWeekday.format(d) + ", " + fmtDate.format(d); } }; // "sekmadienis, gruodžio 20 d."

  var grid = document.getElementById("cal-grid");
  var title = document.getElementById("cal-title");
  var prev = document.getElementById("cal-prev");
  var next = document.getElementById("cal-next");
  var timeSub = document.getElementById("time-sub");
  var sumTitle = document.getElementById("sum-title");
  var sumDetail = document.getElementById("sum-detail");
  var submit = document.getElementById("sum-submit");
  var gearItems = Array.prototype.slice.call(document.querySelectorAll(".gear"));

  function pad(n) { return n < 10 ? "0" + n : String(n); }
  function iso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function isOpen(d) { return d >= first && d <= SEASON_END; }
  function eur(n) { return n + " €"; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* ---------- Calendar: two columns (Sat, Sun), one row per weekend ---------- */
  function dayCell(d) {
    if (!d) return '<span class="day is-empty" aria-hidden="true"></span>';
    var n = d.getDate();
    if (!isOpen(d)) {
      return '<span class="day is-closed"><span class="day-num">' + n + '</span><span class="day-sub">Uždaryta</span></span>';
    }
    var v = iso(d);
    return '<label class="day"><input type="radio" name="date" value="' + v + '"' +
      (state.date === v ? " checked" : "") + ' aria-label="' + fmtDay.format(d) + '">' +
      '<span class="day-num">' + n + '</span><span class="day-sub">Atvira</span></label>';
  }

  function renderCalendar() {
    var y = state.view.getFullYear();
    var m = state.view.getMonth();
    var count = new Date(y, m + 1, 0).getDate();
    var rows = [];
    var byWeek = {};

    for (var i = 1; i <= count; i++) {
      var d = new Date(y, m, i);
      var dow = d.getDay();
      if (dow !== 0 && dow !== 6) continue;
      var key = i - ((dow + 6) % 7); // day-of-month of that week's Monday
      if (!byWeek[key]) { byWeek[key] = { sat: null, sun: null }; rows.push(byWeek[key]); }
      byWeek[key][dow === 6 ? "sat" : "sun"] = d;
    }

    var html = "";
    rows.forEach(function (r) {
      if (!(r.sat && isOpen(r.sat)) && !(r.sun && isOpen(r.sun))) return; // skip weekends that are fully closed
      html += dayCell(r.sat) + dayCell(r.sun);
    });
    grid.innerHTML = '<legend class="sr-only">Savaitgalio datos</legend>' + html;

    title.textContent = cap(fmtMonth.format(state.view));
    prev.disabled = state.view <= minView;
    next.disabled = state.view >= maxView;
  }

  prev.addEventListener("click", function () {
    state.view = new Date(state.view.getFullYear(), state.view.getMonth() - 1, 1);
    renderCalendar();
  });
  next.addEventListener("click", function () {
    state.view = new Date(state.view.getFullYear(), state.view.getMonth() + 1, 1);
    renderCalendar();
  });
  grid.addEventListener("change", function (e) {
    if (e.target.name === "date") { state.date = e.target.value; update(); }
  });

  /* ---------- Gear ---------- */
  function sizeOptions(type) {
    var out = [], i;
    if (type === "boot") {
      out.push(["", "Batų dydis…"]);
      for (i = 35; i <= 47; i++) out.push(["EU " + i, "EU " + i]);
    } else if (type === "length") {
      out.push(["", "Slidžių ilgis…"]);
      for (i = 100; i <= 190; i += 10) out.push([i + " cm", i + " cm"]);
    } else {
      out.push(["", "Dydis…"]);
      ["XS", "S", "M", "L", "XL"].forEach(function (s) { out.push([s, s]); });
    }
    return out.map(function (o) { return '<option value="' + o[0] + '">' + o[1] + "</option>"; }).join("");
  }

  gearItems.forEach(function (item) {
    var sel = item.querySelector(".gear-size");
    var qty = item.querySelector('input[type="number"]');
    var buttons = item.querySelectorAll("[data-step]");
    sel.innerHTML = sizeOptions(item.dataset.size);

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var v = (parseInt(qty.value, 10) || 0) + parseInt(btn.dataset.step, 10);
        qty.value = Math.min(10, Math.max(0, v));
        update();
      });
    });
    qty.addEventListener("input", function () {
      var value = parseInt(qty.value, 10);
      if (!Number.isNaN(value)) qty.value = Math.min(10, Math.max(0, value));
      update();
    });
    qty.addEventListener("blur", function () {
      if (qty.value === "") qty.value = "0";
      update();
    });
    sel.addEventListener("change", update);
  });

  function readGear() {
    var lines = [];
    var missing = [];
    var total = 0;
    gearItems.forEach(function (item) {
      var qty = Math.min(10, Math.max(0, parseInt(item.querySelector('input[type="number"]').value, 10) || 0));
      var size = item.querySelector(".gear-size").value;
      var needs = qty > 0 && !size;
      item.classList.toggle("is-active", qty > 0);
      item.classList.toggle("needs-size", needs);
      if (qty > 0) {
        total += qty * parseInt(item.dataset.price, 10);
        lines.push(item.dataset.name + " × " + qty);
      }
      if (needs) missing.push(item.dataset.name);
    });
    return { lines: lines, missing: missing, total: total };
  }

  /* ---------- Summary ---------- */
  function update() {
    var gear = readGear();
    var session = document.querySelector('#sessions input:checked');
    var dateObj = null;
    if (state.date) {
      var p = state.date.split("-");
      dateObj = new Date(+p[0], +p[1] - 1, +p[2]);
    }

    timeSub.textContent = dateObj
      ? cap(fmtDay.format(dateObj)) + " · suaugusiųjų kainos"
      : "Pirmiausia pasirinkite datą · suaugusiųjų kainos";

    sumTitle.textContent = dateObj
      ? cap(fmtDay.format(dateObj)) + (session ? " · " + session.dataset.label + " " + session.dataset.hours : "")
      : "Pasirinkite datą";

    if (gear.missing.length) {
      sumDetail.textContent = "Pasirinkite dydį: " + gear.missing.join(", ");
    } else if (gear.lines.length) {
      sumDetail.textContent = "Įranga: " + gear.lines.join(", ") + " · " + eur(gear.total) + " už dieną";
    } else {
      sumDetail.textContent = "Įranga nepasirinkta";
    }

    gearItems.forEach(function (item) {
      var qty = item.querySelector('input[type="number"]');
      var value = parseInt(qty.value, 10) || 0;
      item.querySelector('[data-step="-1"]').disabled = value <= 0;
      item.querySelector('[data-step="1"]').disabled = value >= 10;
    });

    submit.disabled = !(dateObj && session && !gear.missing.length);
  }

  document.getElementById("sessions").addEventListener("change", update);

  document.getElementById("booking-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var status = document.getElementById("submit-status");
    if (submit.disabled) return;
    status.textContent = "Pasirinkimas pridėtas į rezervaciją. Apmokėjimo žingsnis dar nėra prijungtas.";
  });

  renderCalendar();
  update();
})();