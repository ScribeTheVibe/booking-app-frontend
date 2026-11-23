(function () {
  "use strict";

  var bookingWindow = window.mockBookingService.getBookingWindow();
  var SEASON_START = new Date(Number(bookingWindow.start.slice(0, 4)), Number(bookingWindow.start.slice(5, 7)) - 1, Number(bookingWindow.start.slice(8, 10)));
  var SEASON_END = new Date(Number(bookingWindow.end.slice(0, 4)), Number(bookingWindow.end.slice(5, 7)) - 1, Number(bookingWindow.end.slice(8, 10)));
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  var first = SEASON_START > today ? SEASON_START : today;
  var minView = new Date(first.getFullYear(), first.getMonth(), 1);
  var maxView = new Date(SEASON_END.getFullYear(), SEASON_END.getMonth(), 1);
  var savedSelection = window.mockBookingService.getSelection() || {};
  var state = {
    date: savedSelection.date || null,
    view: savedSelection.date
      ? new Date(Number(savedSelection.date.slice(0, 4)), Number(savedSelection.date.slice(5, 7)) - 1, 1)
      : new Date(minView)
  };
  var slots = window.mockBookingService.getSlots();
  var gearCatalog = window.mockBookingService.getGearCatalog();
  var attractions = [];
  try {
    attractions = JSON.parse(sessionStorage.getItem("dideles-akys-attractions") || "[]");
  } catch (error) {
    attractions = [];
  }

  var fmtMonth = new Intl.DateTimeFormat("lt-LT", { year: "numeric", month: "long" });
  var fmtWeekday = new Intl.DateTimeFormat("lt-LT", { weekday: "long" });
  var fmtDate = new Intl.DateTimeFormat("lt-LT", { month: "long", day: "numeric" });
  var grid = document.getElementById("cal-grid");
  var title = document.getElementById("cal-title");
  var prev = document.getElementById("cal-prev");
  var next = document.getElementById("cal-next");
  var timeSub = document.getElementById("time-sub");
  var sumTitle = document.getElementById("sum-title");
  var sumDetail = document.getElementById("sum-detail");
  var submit = document.getElementById("sum-submit");
  var form = document.getElementById("booking-form");
  var gearItems = Array.prototype.slice.call(document.querySelectorAll(".gear"));
  var customerName = document.getElementById("customer-name");
  var customerEmail = document.getElementById("customer-email");
  var customerPhone = document.getElementById("customer-phone");

  function pad(number) { return number < 10 ? "0" + number : String(number); }
  function iso(date) { return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()); }
  function isOpen(date) { return date >= first && window.mockBookingService.isDateBookable(iso(date)); }
  function eur(amount) { return new Intl.NumberFormat("lt-LT", { style: "currency", currency: "EUR" }).format(amount); }
  function cap(text) { return text.charAt(0).toUpperCase() + text.slice(1); }
  function formatDate(date) { return cap(fmtWeekday.format(date)) + ", " + fmtDate.format(date); }

  function renderSlots() {
    var sessionList = document.getElementById("sessions");
    slots.forEach(function (slot, index) {
      var label = document.createElement("label");
      label.className = "session";
      var input = document.createElement("input");
      input.type = "radio";
      input.name = "session";
      input.value = slot.id;
      input.dataset.label = slot.label;
      input.dataset.start = slot.start;
      input.dataset.end = slot.end;
      input.dataset.price = String(slot.pricePerPerson);
      input.checked = savedSelection.slotId ? savedSelection.slotId === slot.id : index === 0;

      var details = document.createElement("span");
      var strong = document.createElement("strong");
      strong.textContent = slot.label;
      var hours = document.createElement("small");
      hours.textContent = slot.start + "–" + slot.end;
      details.append(strong, hours);

      var price = document.createElement("span");
      price.className = "session-price";
      price.textContent = eur(slot.pricePerPerson) + " / asm.";
      label.append(input, details, price);
      sessionList.appendChild(label);
    });
  }

  function sizeOptions(type) {
    var options = [];
    var index;
    if (type === "boot") {
      options.push(["", "Batų dydis…"]);
      for (index = 35; index <= 47; index++) options.push(["EU " + index, "EU " + index]);
    } else if (type === "length") {
      options.push(["", "Slidžių ilgis…"]);
      for (index = 100; index <= 190; index += 10) options.push([index + " cm", index + " cm"]);
    } else {
      options.push(["", "Dydis…"]);
      ["XS", "S", "M", "L", "XL"].forEach(function (size) { options.push([size, size]); });
    }
    return options;
  }

  function restoreFormState() {
    customerName.value = savedSelection.customer ? savedSelection.customer.name || "" : "";
    customerEmail.value = savedSelection.customer ? savedSelection.customer.email || "" : "";
    customerPhone.value = savedSelection.customer ? savedSelection.customer.phone || "" : "";

    gearItems.forEach(function (item) {
      var savedGear = (savedSelection.equipment || []).find(function (entry) {
        return entry.id === item.dataset.id;
      });
      var select = item.querySelector(".gear-size");
      var quantity = item.querySelector('input[type="number"]');
      sizeOptions(item.dataset.size).forEach(function (option) {
        var element = document.createElement("option");
        element.value = option[0];
        element.textContent = option[1];
        select.appendChild(element);
      });
      quantity.value = savedGear ? String(savedGear.quantity) : "0";
      select.value = savedGear ? savedGear.size || "" : "";

      var catalogItem = gearCatalog.find(function (entry) { return entry.id === item.dataset.id; });
      if (catalogItem) {
        item.dataset.price = String(catalogItem.price);
        item.querySelector("[data-gear-price]").textContent = eur(catalogItem.price) + " / dieną";
      }
    });
  }

  function dayCell(date) {
    if (!date) {
      var empty = document.createElement("span");
      empty.className = "day is-empty";
      empty.setAttribute("aria-hidden", "true");
      return empty;
    }
    if (!isOpen(date)) {
      var closed = document.createElement("span");
      closed.className = "day is-closed";
      closed.innerHTML = '<span class="day-num"></span><span class="day-sub">Uždaryta</span>';
      closed.firstElementChild.textContent = String(date.getDate());
      return closed;
    }
    var label = document.createElement("label");
    label.className = "day";
    var input = document.createElement("input");
    input.type = "radio";
    input.name = "date";
    input.value = iso(date);
    input.checked = state.date === input.value;
    input.setAttribute("aria-label", formatDate(date));
    var number = document.createElement("span");
    number.className = "day-num";
    number.textContent = String(date.getDate());
    var status = document.createElement("span");
    status.className = "day-sub";
    status.textContent = "Atvira";
    label.append(input, number, status);
    return label;
  }

  function renderCalendar() {
    var year = state.view.getFullYear();
    var month = state.view.getMonth();
    var count = new Date(year, month + 1, 0).getDate();
    var rows = [];
    var byWeek = {};

    for (var day = 1; day <= count; day++) {
      var date = new Date(year, month, day);
      var weekday = date.getDay();
      if (weekday !== 5 && weekday !== 6 && weekday !== 0) continue;
      var key = day - ((weekday + 2) % 7);
      if (!byWeek[key]) {
        byWeek[key] = { fri: null, sat: null, sun: null };
        rows.push(byWeek[key]);
      }
      byWeek[key][weekday === 5 ? "fri" : weekday === 6 ? "sat" : "sun"] = date;
    }

    grid.innerHTML = "";
    var legend = document.createElement("legend");
    legend.className = "sr-only";
    legend.textContent = "Penktadienio, šeštadienio ir sekmadienio datos";
    grid.appendChild(legend);
    rows.forEach(function (row) {
      if (!(row.fri && isOpen(row.fri)) && !(row.sat && isOpen(row.sat)) && !(row.sun && isOpen(row.sun))) return;
      grid.append(dayCell(row.fri), dayCell(row.sat), dayCell(row.sun));
    });

    title.textContent = cap(fmtMonth.format(state.view));
    prev.disabled = state.view <= minView;
    next.disabled = state.view >= maxView;
  }

  function readEquipment() {
    var lines = [];
    var missingSizes = [];
    var total = 0;
    var equipment = [];
    gearItems.forEach(function (item) {
      var quantity = Math.min(10, Math.max(0, parseInt(item.querySelector('input[type="number"]').value, 10) || 0));
      var size = item.querySelector(".gear-size").value;
      var price = Number(item.dataset.price);
      var needsSize = quantity > 0 && !size;
      item.classList.toggle("is-active", quantity > 0);
      item.classList.toggle("needs-size", needsSize);
      if (quantity > 0) {
        total += quantity * price;
        lines.push(item.dataset.name + " × " + quantity);
        equipment.push({
          id: item.dataset.id,
          name: item.dataset.name,
          quantity: quantity,
          priceEach: price,
          size: size
        });
      }
      if (needsSize) missingSizes.push(item.dataset.name);
    });
    return { lines: lines, missingSizes: missingSizes, total: total, equipment: equipment };
  }

  function createSelection() {
    var checkedSlot = document.querySelector('#sessions input[name="session"]:checked');
    return {
      date: state.date,
      slotId: checkedSlot ? checkedSlot.value : "",
      attractions: attractions,
      equipment: readEquipment().equipment,
      customer: {
        name: customerName.value.trim(),
        email: customerEmail.value.trim(),
        phone: customerPhone.value.trim()
      }
    };
  }

  function update() {
    var equipment = readEquipment();
    var selectedSlot = document.querySelector('#sessions input[name="session"]:checked');
    var date = state.date ? new Date(Number(state.date.slice(0, 4)), Number(state.date.slice(5, 7)) - 1, Number(state.date.slice(8, 10))) : null;
    var partySize = attractions.reduce(function (total, attraction) {
      return total + (Number(attraction.adults) || 0) + (Number(attraction.children) || 0);
    }, 0);
    var fieldsValid = customerName.value.trim() && customerEmail.validity.valid &&
      customerEmail.value.trim() && customerPhone.value.trim();

    timeSub.textContent = date
      ? formatDate(date) + " · kainos vienam asmeniui"
      : "Pirmiausia pasirinkite datą · kainos vienam asmeniui";
    sumTitle.textContent = date && selectedSlot
      ? formatDate(date) + " · " + selectedSlot.dataset.label + " " + selectedSlot.dataset.start + "–" + selectedSlot.dataset.end
      : "Pasirinkite datą ir laiką";
    sumDetail.textContent = equipment.missingSizes.length
      ? "Pasirinkite dydį: " + equipment.missingSizes.join(", ")
      : (partySize ? partySize + " asm. · " : "Nenurodytas žmonių skaičius · ") +
        (equipment.lines.length ? "Įranga: " + equipment.lines.join(", ") + " · " + eur(equipment.total) : "Įranga nepasirinkta");

    gearItems.forEach(function (item) {
      var quantity = item.querySelector('input[type="number"]');
      var value = parseInt(quantity.value, 10) || 0;
      item.querySelector('[data-step="-1"]').disabled = value <= 0;
      item.querySelector('[data-step="1"]').disabled = value >= 10;
    });

    submit.disabled = !(date && selectedSlot && partySize > 0 && fieldsValid && !equipment.missingSizes.length);
    window.mockBookingService.saveSelection(createSelection());
  }

  prev.addEventListener("click", function () {
    state.view = new Date(state.view.getFullYear(), state.view.getMonth() - 1, 1);
    renderCalendar();
  });
  next.addEventListener("click", function () {
    state.view = new Date(state.view.getFullYear(), state.view.getMonth() + 1, 1);
    renderCalendar();
  });
  grid.addEventListener("change", function (event) {
    if (event.target.name === "date") {
      state.date = event.target.value;
      update();
    }
  });

  gearItems.forEach(function (item) {
    var quantity = item.querySelector('input[type="number"]');
    item.querySelectorAll("[data-step]").forEach(function (button) {
      button.addEventListener("click", function () {
        var value = (parseInt(quantity.value, 10) || 0) + parseInt(button.dataset.step, 10);
        quantity.value = String(Math.min(10, Math.max(0, value)));
        update();
      });
    });
    quantity.addEventListener("input", update);
    quantity.addEventListener("blur", function () {
      if (quantity.value === "") quantity.value = "0";
      update();
    });
    item.querySelector(".gear-size").addEventListener("change", update);
  });

  document.getElementById("sessions").addEventListener("change", update);
  [customerName, customerEmail, customerPhone].forEach(function (field) {
    field.addEventListener("input", update);
  });
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (submit.disabled) return;
    try {
      window.mockBookingService.createDraft(createSelection());
    } catch (error) {
      document.getElementById("submit-status").textContent = error.code === "ALREADY_CONFIRMED"
        ? "Ši rezervacija jau patvirtinta ir negali būti pateikta dar kartą."
        : "Nepavyko išsaugoti rezervacijos projekto. Bandykite dar kartą.";
      return;
    }
    window.location.href = "confirmation.html";
  });

  renderSlots();
  restoreFormState();
  renderCalendar();
  update();
})();
