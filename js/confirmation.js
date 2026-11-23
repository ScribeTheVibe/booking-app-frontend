(function () {
  "use strict";

  var service = window.mockBookingService;
  var draft = service.getDraft();
  var missingPanel = document.getElementById("draft-missing");
  var content = document.getElementById("confirmation-content");
  var validationPanel = document.getElementById("validation-panel");
  var validationContent = document.getElementById("validation-content");
  var feedback = document.getElementById("feedback");
  var terms = document.getElementById("terms-accepted");
  var confirmButton = document.getElementById("confirm-button");
  var controls = document.getElementById("confirm-controls");
  var successPanel = document.getElementById("success-panel");
  var successHome = document.getElementById("success-home-link");
  var dialog = document.getElementById("login-dialog");
  var loginForm = document.getElementById("mock-login-form");
  var loginEmail = document.getElementById("mock-login-email");
  var loginPassword = document.getElementById("mock-login-password");
  var loginSubmit = document.getElementById("login-submit");
  var loginFeedback = document.getElementById("login-feedback");
  var confirmationInFlight = false;
  var loginInFlight = false;
  var missingNames = {
    name: "Vardas ir pavardė",
    email: "El. paštas",
    phone: "Telefono numeris",
    date: "Data",
    slot: "Laikas",
    partySize: "Žmonių skaičius"
  };
  var missingTargets = {
    name: { label: missingNames.name, href: "gear.html" },
    email: { label: missingNames.email, href: "gear.html" },
    phone: { label: missingNames.phone, href: "gear.html" },
    date: { label: missingNames.date, href: "gear.html" },
    slot: { label: missingNames.slot, href: "gear.html" },
    partySize: { label: missingNames.partySize, href: "attractions.html" }
  };

  function byId(id) { return document.getElementById(id); }
  function formatMoney(amount) {
    return new Intl.NumberFormat("lt-LT", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }
  function formatDate(date) {
    return new Intl.DateTimeFormat("lt-LT", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    }).format(date);
  }
  function isValidDateString(value) {
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
  }
  function parseBookingDate(value) {
    if (!isValidDateString(value)) return null;
    var parts = value.split("-").map(Number);
    var date = new Date(parts[0], parts[1] - 1, parts[2]);
    return date.getFullYear() === parts[0] && date.getMonth() === parts[1] - 1 && date.getDate() === parts[2]
      ? date
      : null;
  }
  function customerValue(field) {
    return draft.customer && typeof draft.customer[field] === "string"
      ? draft.customer[field].trim()
      : "";
  }
  function renderMissingFields(fields) {
    var list = document.createElement("ul");
    fields.forEach(function (field) {
      var item = document.createElement("li");
      var link = document.createElement("a");
      link.href = missingTargets[field].href;
      link.textContent = missingTargets[field].label;
      item.appendChild(link);
      list.appendChild(item);
    });
    validationContent.append("Trūksta šių privalomų duomenų: ", list);
  }

  function validateDraft() {
    var missing = [];
    var errors = [];
    var customer = draft.customer || {};
    if (!customerValue("name")) missing.push("name");
    if (!customerValue("email")) missing.push("email");
    if (!customerValue("phone")) missing.push("phone");
    if (!draft.date) missing.push("date");
    if (!draft.slotId || !draft.slotLabel || !draft.startTime || !draft.endTime) missing.push("slot");
    if (!Number.isInteger(draft.partySize) || draft.partySize <= 0) missing.push("partySize");

    if (customerValue("email") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerValue("email"))) {
      errors.push("El. pašto adresas netinkamas. Grįžkite į įrangos ir datos žingsnį ir jį pataisykite.");
    }

    var date = parseBookingDate(draft.date);
    if (draft.date && !date) {
      errors.push("Rezervacijos data netinkama. Pasirinkite datą iš naujo.");
    } else if (date) {
      var today = new Date();
      today.setHours(0, 0, 0, 0);
      if (date < today) errors.push("Pasirinkta data jau praėjo. Pasirinkite kitą datą.");
      if ([0, 5, 6].indexOf(date.getDay()) === -1) {
        errors.push("Kurortas priima rezervacijas tik penktadieniais, šeštadieniais ir sekmadieniais.");
      }
      if (date >= today && !service.isDateBookable(draft.date)) {
        errors.push("Pasirinkta data nepatenka į šiuo metu rezervuojamą sezoną. Pasirinkite kitą datą.");
      }
    }

    var deadline = draft.rescheduleDeadline ? new Date(draft.rescheduleDeadline) : null;
    if (!deadline || Number.isNaN(deadline.getTime())) {
      errors.push("Nepavyko nustatyti datos keitimo termino. Grįžkite ir pasirinkite datą iš naujo.");
    } else if (deadline <= new Date()) {
      errors.push("Datos keitimo terminas jau praėjo. Pasirinkite kitą rezervacijos datą.");
    }

    if (!Number.isFinite(draft.slotTotal) || !Number.isFinite(draft.equipmentTotal) || !Number.isFinite(draft.grandTotal)) {
      errors.push("Kainų informacija netinkama. Grįžkite ir atnaujinkite rezervacijos duomenis.");
    }

    return { missing: missing, errors: errors, deadline: deadline, date: date };
  }

  function renderSummary(validation) {
    var customer = draft.customer || {};
    byId("summary-date").textContent = validation.date ? formatDate(validation.date) : "Nenurodyta";
    byId("summary-slot").textContent = draft.slotLabel && draft.startTime && draft.endTime
      ? draft.slotLabel + " · " + draft.startTime + "–" + draft.endTime
      : "Nenurodytas";
    byId("summary-party").textContent = Number.isInteger(draft.partySize) && draft.partySize > 0
      ? draft.partySize + (draft.partySize === 1 ? " asmuo" : " asmenys")
      : "Nenurodyta";
    byId("summary-attractions").textContent = Array.isArray(draft.attractions) && draft.attractions.length
      ? draft.attractions.map(function (item) { return item.name; }).filter(Boolean).join(", ") || "Nenurodyta"
      : "Nenurodyta";
    byId("customer-name").textContent = customerValue("name") || "Nenurodyta";
    byId("customer-email").textContent = customerValue("email") || "Nenurodyta";
    byId("customer-phone").textContent = customerValue("phone") || "Nenurodyta";

    var equipmentList = byId("equipment-list");
    equipmentList.replaceChildren();
    var equipment = Array.isArray(draft.equipment) ? draft.equipment : [];
    var validEquipment = equipment.filter(function (item) {
      return item && typeof item.name === "string" && Number.isInteger(item.quantity) &&
        item.quantity > 0 && Number.isFinite(item.priceEach);
    });
    byId("no-equipment").hidden = validEquipment.length > 0;
    validEquipment.forEach(function (item) {
      var row = document.createElement("li");
      row.className = "equipment-item";
      var description = document.createElement("span");
      var name = document.createElement("span");
      name.className = "equipment-name";
      name.textContent = item.name;
      var meta = document.createElement("span");
      meta.className = "equipment-meta";
      meta.textContent = item.quantity + " × " + formatMoney(item.priceEach) +
        (item.size ? " · " + item.size : "");
      description.append(name, meta);
      var price = document.createElement("span");
      price.className = "equipment-price";
      price.textContent = formatMoney(item.quantity * item.priceEach);
      row.append(description, price);
      equipmentList.appendChild(row);
    });

    byId("slot-price-label").textContent = "Seansas · " + (draft.partySize || 0) + " asm. × " +
      formatMoney(Number.isFinite(draft.slotPriceEach) ? draft.slotPriceEach : 0);
    byId("slot-total").textContent = formatMoney(Number.isFinite(draft.slotTotal) ? draft.slotTotal : 0);
    byId("equipment-total").textContent = formatMoney(Number.isFinite(draft.equipmentTotal) ? draft.equipmentTotal : 0);
    byId("grand-total").textContent = formatMoney(Number.isFinite(draft.grandTotal) ? draft.grandTotal : 0);

    if (validation.deadline && Number.isFinite(validation.deadline.getTime())) {
      var formattedDeadline = new Intl.DateTimeFormat("lt-LT", {
        dateStyle: "long",
        timeStyle: "short"
      }).format(validation.deadline);
      byId("reschedule-policy").textContent = "Rezervacijos neatšaukiamos. Datą galite keisti iki " + formattedDeadline + ".";
    } else {
      byId("reschedule-policy").textContent = "Rezervacijos neatšaukiamos. Datos keitimo terminas nenurodytas.";
    }
  }

  function renderValidation(validation) {
    validationContent.replaceChildren();
    validationPanel.hidden = validation.missing.length === 0 && validation.errors.length === 0;
    if (validation.missing.length) renderMissingFields(validation.missing);
    if (validation.errors.length) {
      var list = document.createElement("ul");
      validation.errors.forEach(function (message) {
        var item = document.createElement("li");
        item.textContent = message;
        list.appendChild(item);
      });
      if (validation.missing.length) validationContent.appendChild(document.createElement("br"));
      validationContent.appendChild(list);
    }
    confirmButton.disabled = validation.missing.length > 0 || validation.errors.length > 0 || !terms.checked;
  }

  function setFeedback(message) {
    feedback.textContent = message;
    feedback.hidden = !message;
  }

  function setButtonLoading(button, loading, text) {
    button.disabled = loading;
    button.textContent = loading ? text : button.dataset.defaultText;
    if (loading) button.setAttribute("aria-busy", "true");
    else button.removeAttribute("aria-busy");
  }

  function showSuccess(confirmedDraft) {
    draft = confirmedDraft;
    renderSummary(validateDraft());
    setFeedback("");
    validationPanel.hidden = true;
    controls.hidden = true;
    confirmButton.disabled = true;
    successHome.hidden = false;
    successPanel.hidden = false;
    byId("booking-reference").textContent = draft.reference;
    byId("success-title").focus();
    document.title = "Rezervacija patvirtinta – Didelės akys kalnų kurortas";
  }

  function showConfirmError(error) {
    var messages = {
      SLOT_UNAVAILABLE: "Šis laikas ką tik tapo nepasiekiamas. Grįžkite ir pasirinkite kitą laiką.",
      NETWORK_ERROR: "Nepavyko užbaigti rezervacijos dėl ryšio sutrikimo. Bandykite dar kartą.",
      DRAFT_MISSING: "Rezervacijos projektas nerastas. Pradėkite rezervaciją iš naujo."
    };
    setFeedback(messages[error.code] || "Patvirtinti rezervacijos nepavyko. Bandykite dar kartą.");
  }

  function confirmBooking() {
    if (confirmationInFlight || confirmButton.disabled || !terms.checked) return;
    confirmationInFlight = true;
    setFeedback("");
    confirmButton.dataset.defaultText = "Patvirtinti rezervaciją →";
    setButtonLoading(confirmButton, true, "Tvirtinama…");
    service.confirmBooking().then(function (confirmedDraft) {
      showSuccess(confirmedDraft);
    }).catch(showConfirmError).finally(function () {
      confirmationInFlight = false;
      confirmButton.dataset.defaultText = "Patvirtinti rezervaciją →";
      setButtonLoading(confirmButton, false);
      if (!successPanel.hidden) {
        confirmButton.disabled = true;
        return;
      }
      renderValidation(validateDraft());
    });
  }

  function beginConfirmation() {
    if (confirmationInFlight || loginInFlight || confirmButton.disabled || !terms.checked) return;
    if (!service.getAuthState()) {
      loginEmail.value = customerValue("email");
      loginFeedback.hidden = true;
      dialog.showModal();
      loginPassword.focus();
      return;
    }
    confirmBooking();
  }

  if (!draft) {
    missingPanel.hidden = false;
    document.getElementById("page-title").textContent = "Rezervacijos projektas";
    document.querySelector(".page-intro .lead").textContent = "Prieš patvirtinant rezervaciją reikia išsaugoto projekto.";
    document.getElementById("confirmation-content").hidden = true;
    document.querySelector(".mock-controls").hidden = true;
    return;
  }

  content.hidden = false;
  var validation = validateDraft();
  renderSummary(validation);
  renderValidation(validation);
  confirmButton.dataset.defaultText = "Patvirtinti rezervaciją →";

  if (draft.status === "confirmed" && draft.reference) {
    showSuccess(draft);
  }

  terms.addEventListener("change", function () {
    renderValidation(validateDraft());
  });
  confirmButton.addEventListener("click", beginConfirmation);

  loginForm.addEventListener("submit", function (event) {
    event.preventDefault();
    if (loginInFlight) return;
    loginInFlight = true;
    loginFeedback.hidden = true;
    setButtonLoading(loginSubmit, true, "Jungiamasi…");
    service.login(loginEmail.value.trim(), loginPassword.value).then(function () {
      dialog.close();
      loginPassword.value = "";
      confirmBooking();
    }).catch(function () {
      loginFeedback.textContent = "Prisijungti nepavyko. Patikrinkite duomenis ir bandykite dar kartą.";
      loginFeedback.hidden = false;
    }).finally(function () {
      loginInFlight = false;
      loginSubmit.dataset.defaultText = "Prisijungti ir tęsti";
      setButtonLoading(loginSubmit, false);
    });
  });

  document.getElementById("login-close").addEventListener("click", function () {
    dialog.close();
    confirmButton.focus();
  });

  var mockAuth = document.getElementById("mock-auth");
  mockAuth.checked = service.getAuthState();
  mockAuth.addEventListener("change", function () {
    service.setAuthState(mockAuth.checked);
  });
  var mockFailure = document.getElementById("mock-failure");
  mockFailure.value = service.getMockFailure();
  mockFailure.addEventListener("change", function () {
    service.setMockFailure(mockFailure.value);
  });
})();
