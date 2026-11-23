(function () {
  "use strict";

  var form = document.getElementById("booking-form");
  var cards = Array.prototype.slice.call(document.querySelectorAll(".card[data-attraction]"));
  var summaryTitle = document.querySelector("[data-summary-title]");
  var summaryDetail = document.querySelector("[data-summary-detail]");
  var submit = document.querySelector("[data-summary-submit]");

  function readSavedAttractions() {
    try {
      return JSON.parse(sessionStorage.getItem("dideles-akys-attractions") || "[]");
    } catch (error) {
      return [];
    }
  }

  function currentSelection() {
    return selectedCards().map(function (card) {
      return {
        id: card.dataset.attraction,
        name: card.dataset.name,
        adults: parseInt(card.querySelector('[data-qty="adults"]').value, 10) || 0,
        children: parseInt(card.querySelector('[data-qty="children"]').value, 10) || 0
      };
    });
  }

  function selectedCards() {
    return cards.filter(function (card) {
      return card.querySelector('input[data-select]').checked;
    });
  }

  function updateSummary() {
    var selected = selectedCards();
    var current = currentSelection();
    var count = selected.length;
    var partySize = selected.reduce(function (total, card) {
      return total +
        (parseInt(card.querySelector('[data-qty="adults"]').value, 10) || 0) +
        (parseInt(card.querySelector('[data-qty="children"]').value, 10) || 0);
    }, 0);
    summaryTitle.textContent = "Pasirinkta pramogų: " + count;

    if (!count) {
      summaryDetail.textContent = "Pasirinkite bent vieną pramogą.";
      submit.disabled = true;
      sessionStorage.setItem("dideles-akys-attractions", "[]");
      return;
    }

    summaryDetail.textContent = selected.map(function (card) {
      var adults = parseInt(card.querySelector('[data-qty="adults"]').value, 10) || 0;
      var children = parseInt(card.querySelector('[data-qty="children"]').value, 10) || 0;
      var people = adults + " suaug. · " + children + " vaik.";
      return card.dataset.name + " · " + people;
    }).join(" | ") + (partySize ? "" : " · Nurodykite bent vieną asmenį.");
    submit.disabled = partySize === 0;
    sessionStorage.setItem("dideles-akys-attractions", JSON.stringify(current));
  }

  readSavedAttractions().forEach(function (saved) {
    var card = cards.find(function (item) { return item.dataset.attraction === saved.id; });
    if (!card) return;
    card.querySelector("[data-select]").checked = true;
    card.querySelector('[data-qty="adults"]').value = String(saved.adults || 0);
    card.querySelector('[data-qty="children"]').value = String(saved.children || 0);
  });

  cards.forEach(function (card) {
    card.querySelectorAll('input').forEach(function (input) {
      input.addEventListener("change", updateSummary);
    });
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var selected = selectedCards();
    if (!selected.length || selected.reduce(function (total, card) {
      return total +
        (parseInt(card.querySelector('[data-qty="adults"]').value, 10) || 0) +
        (parseInt(card.querySelector('[data-qty="children"]').value, 10) || 0);
    }, 0) === 0) {
      updateSummary();
      return;
    }

    sessionStorage.setItem("dideles-akys-attractions", JSON.stringify(currentSelection()));
    window.location.href = "gear.html";
  });

  updateSummary();
})();
