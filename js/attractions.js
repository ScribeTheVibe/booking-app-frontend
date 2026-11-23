(function () {
  "use strict";

  var form = document.getElementById("booking-form");
  var cards = Array.prototype.slice.call(document.querySelectorAll(".card[data-attraction]"));
  var summaryTitle = document.querySelector("[data-summary-title]");
  var summaryDetail = document.querySelector("[data-summary-detail]");
  var submit = document.querySelector("[data-summary-submit]");

  function selectedCards() {
    return cards.filter(function (card) {
      return card.querySelector('input[data-select]').checked;
    });
  }

  function updateSummary() {
    var selected = selectedCards();
    var count = selected.length;
    summaryTitle.textContent = "Pasirinkta pramogų: " + count;

    if (!count) {
      summaryDetail.textContent = "Pasirinkite bent vieną pramogą.";
      submit.disabled = true;
      return;
    }

    summaryDetail.textContent = selected.map(function (card) {
      var adults = parseInt(card.querySelector('[data-qty="adults"]').value, 10) || 0;
      var children = parseInt(card.querySelector('[data-qty="children"]').value, 10) || 0;
      var people = adults + " suaug. · " + children + " vaik.";
      return card.dataset.name + " · " + people;
    }).join(" | ");
    submit.disabled = false;
  }

  cards.forEach(function (card) {
    card.querySelectorAll('input').forEach(function (input) {
      input.addEventListener("change", updateSummary);
    });
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var selected = selectedCards();
    if (!selected.length) {
      updateSummary();
      return;
    }

    var attractions = selected.map(function (card) {
      return {
        id: card.dataset.attraction,
        name: card.dataset.name,
        adults: parseInt(card.querySelector('[data-qty="adults"]').value, 10) || 0,
        children: parseInt(card.querySelector('[data-qty="children"]').value, 10) || 0
      };
    });
    sessionStorage.setItem("dideles-akys-attractions", JSON.stringify(attractions));
    window.location.href = "gear.html";
  });

  updateSummary();
})();
