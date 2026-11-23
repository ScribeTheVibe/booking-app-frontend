(function () {
  "use strict";

  var DRAFT_KEY = "dideles-akys-booking-draft";
  var SELECTION_KEY = "dideles-akys-gear-selection";
  var AUTH_KEY = "dideles-akys-mock-auth";
  var FAILURE_KEY = "dideles-akys-mock-failure";
  var SEASON_START = "2026-12-19";
  var SEASON_END = "2027-03-14";
  var MOCK_SLOTS = {
    "full-day": { label: "Visa diena", start: "09:00", end: "20:00", pricePerPerson: 30 },
    morning: { label: "Rytas", start: "09:00", end: "13:00", pricePerPerson: 20 },
    evening: { label: "Vakaras", start: "16:00", end: "20:00", pricePerPerson: 25 }
  };
  var MOCK_GEAR = [
    { id: "ski-set", name: "Slidžių komplektas", price: 40 },
    { id: "skis", name: "Tik slidės", price: 30 },
    { id: "boots", name: "Slidinėjimo batai", price: 20 },
    { id: "helmet", name: "Šalmas", price: 10 }
  ];
  var RESCHEDULE_HOURS = 48;

  function delay() {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, 450);
    });
  }

  function readJson(key) {
    var value = sessionStorage.getItem(key);
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch (error) {
      sessionStorage.removeItem(key);
      return null;
    }
  }

  function getMockFailure() {
    if (sessionStorage.getItem(FAILURE_KEY) !== null) {
      return sessionStorage.getItem(FAILURE_KEY);
    }
    var queryFailure = new URLSearchParams(window.location.search).get("mockFailure");
    return queryFailure || "";
  }

  function saveSelection(selection) {
    sessionStorage.setItem(SELECTION_KEY, JSON.stringify(selection));
  }

  function getSelection() {
    return readJson(SELECTION_KEY);
  }

  function getDraft() {
    var draft = readJson(DRAFT_KEY);
    if (!draft && new URLSearchParams(window.location.search).get("mockDraft") === "demo") {
      return createDemoDraft();
    }
    return draft;
  }

  function isDateBookable(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    var parts = value.split("-").map(Number);
    var date = new Date(parts[0], parts[1] - 1, parts[2]);
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    return date.getFullYear() === parts[0] && date.getMonth() === parts[1] - 1 &&
      date.getDate() === parts[2] && value >= SEASON_START && value <= SEASON_END &&
      date >= today && [0, 5, 6].indexOf(date.getDay()) !== -1;
  }

  function getBookingWindow() {
    return { start: SEASON_START, end: SEASON_END };
  }

  function createDraft(selection) {
    var existingDraft = readJson(DRAFT_KEY);
    if (existingDraft && existingDraft.status === "confirmed") {
      var alreadyConfirmedError = new Error("Booking already confirmed");
      alreadyConfirmedError.code = "ALREADY_CONFIRMED";
      throw alreadyConfirmedError;
    }
    var slot = MOCK_SLOTS[selection.slotId];
    if (!slot) throw new Error("Missing mock slot configuration");

    var partySize = selection.attractions.reduce(function (total, attraction) {
      return total + attraction.adults + attraction.children;
    }, 0);
    var equipment = (selection.equipment || []).map(function (item) {
      var catalogItem = MOCK_GEAR.find(function (entry) { return entry.id === item.id; });
      if (!catalogItem) throw new Error("Missing mock equipment configuration");
      return {
        id: catalogItem.id,
        name: catalogItem.name,
        quantity: item.quantity,
        priceEach: catalogItem.price,
        size: item.size
      };
    });
    var equipmentTotal = equipment.reduce(function (total, item) {
      return total + item.quantity * item.priceEach;
    }, 0);
    var slotTotal = slot.pricePerPerson * partySize;
    var [year, month, day] = selection.date.split("-").map(Number);
    var slotStart = new Date(year, month - 1, day, Number(slot.start.slice(0, 2)), Number(slot.start.slice(3)));
    var deadline = new Date(slotStart.getTime() - RESCHEDULE_HOURS * 60 * 60 * 1000);
    var draft = {
      date: selection.date,
      slotId: selection.slotId,
      slotLabel: slot.label,
      startTime: slot.start,
      endTime: slot.end,
      slotPriceEach: slot.pricePerPerson,
      slotTotal: slotTotal,
      partySize: partySize,
      attractions: selection.attractions,
      equipment: equipment,
      equipmentTotal: equipmentTotal,
      grandTotal: slotTotal + equipmentTotal,
      customer: selection.customer,
      rescheduleDeadline: deadline.toISOString(),
      status: "draft"
    };
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    return draft;
  }

  function createDemoDraft() {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var seasonStart = new Date(2026, 11, 19);
    var date = new Date(Math.max(today.getTime() + 14 * 24 * 60 * 60 * 1000, seasonStart.getTime()));
    while ([0, 5, 6].indexOf(date.getDay()) === -1) date.setDate(date.getDate() + 1);
    var dateValue = date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") +
      "-" + String(date.getDate()).padStart(2, "0");
    return createDraft({
      date: dateValue,
      slotId: "full-day",
      attractions: [
        { id: "alpine-skiing", name: "Kalnų slidinėjimas", adults: 2, children: 1 }
      ],
      equipment: [
        { id: "ski-set", name: "Slidžių komplektas", quantity: 1, priceEach: 40, size: "EU 42" }
      ],
      customer: {
        name: "Demo Klientas",
        email: "demo@example.com",
        phone: "+37060000000"
      }
    });
  }

  function getAuthState() {
    return sessionStorage.getItem(AUTH_KEY) === "true";
  }

  function setAuthState(isLoggedIn) {
    sessionStorage.setItem(AUTH_KEY, String(Boolean(isLoggedIn)));
  }

  function setMockFailure(failure) {
    sessionStorage.setItem(FAILURE_KEY, failure || "");
  }

  function getSlots() {
    return Object.keys(MOCK_SLOTS).map(function (id) {
      var slot = MOCK_SLOTS[id];
      return {
        id: id,
        label: slot.label,
        start: slot.start,
        end: slot.end,
        pricePerPerson: slot.pricePerPerson
      };
    });
  }

  function getGearCatalog() {
    return MOCK_GEAR.map(function (item) {
      return { id: item.id, name: item.name, price: item.price };
    });
  }

  function login(email, password) {
    return delay().then(function () {
      if (getMockFailure() === "login-failed" || !email || !password) {
        var loginError = new Error("Mock login failed");
        loginError.code = "LOGIN_FAILED";
        throw loginError;
      }
      setAuthState(true);
      return { isLoggedIn: true };
    });
  }

  function confirmBooking() {
    return delay().then(function () {
      var failure = getMockFailure();
      if (failure === "slot-unavailable") {
        var unavailableError = new Error("Mock slot unavailable");
        unavailableError.code = "SLOT_UNAVAILABLE";
        throw unavailableError;
      }
      if (failure === "network-error") {
        var networkError = new Error("Mock network error");
        networkError.code = "NETWORK_ERROR";
        throw networkError;
      }

      var draft = getDraft();
      if (!draft) {
        var missingDraftError = new Error("Booking draft missing");
        missingDraftError.code = "DRAFT_MISSING";
        throw missingDraftError;
      }
      if (draft.status === "confirmed" && draft.reference) return draft;

      draft.status = "confirmed";
      draft.reference = "DA-" + Date.now().toString(36).toUpperCase();
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      return draft;
    });
  }

  window.mockBookingService = {
    getDraft: getDraft,
    createDemoDraft: createDemoDraft,
    createDraft: createDraft,
    getSelection: getSelection,
    saveSelection: saveSelection,
    getSlots: getSlots,
    getGearCatalog: getGearCatalog,
    getBookingWindow: getBookingWindow,
    isDateBookable: isDateBookable,
    getAuthState: getAuthState,
    setAuthState: setAuthState,
    setMockFailure: setMockFailure,
    getMockFailure: getMockFailure,
    login: login,
    confirmBooking: confirmBooking
  };
})();
