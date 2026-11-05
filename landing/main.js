(function () {
  var cfg = window.TAB_COMMANDER_CONFIG || {};
  var checkout = cfg.PRO_CHECKOUT_URL || "";
  var email = cfg.CONTACT_EMAIL || "Edwin.Murillo@allin1sdm.com";

  function checkoutReady(url) {
    var parsed;
    try {
      parsed = new URL(url);
    } catch (err) {
      return false;
    }
    if (parsed.protocol !== "https:") return false;
    var host = parsed.hostname.toLowerCase();
    if (
      host === "example.com" ||
      host === "example.org" ||
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith(".example") ||
      host.endsWith(".invalid") ||
      host.endsWith(".localhost") ||
      host.indexOf("placeholder") !== -1
    ) {
      return false;
    }
    return true;
  }

  var ready = checkoutReady(checkout);
  var note = document.getElementById("pro-checkout-note");
  var waitlist = document.getElementById("pro-waitlist");

  document.querySelectorAll("[data-pro-cta]").forEach(function (el) {
    if (!ready) return;
    el.setAttribute("href", checkout);
    el.setAttribute("target", "_blank");
    el.setAttribute("rel", "noopener noreferrer");
    el.textContent = el.getAttribute("data-pro-label") || "Get Pro";
  });

  if (ready) {
    if (waitlist) waitlist.hidden = true;
    if (note) {
      note.textContent =
        "Monthly ($3) and lifetime ($29) are both offered from this one checkout link. This page does not collect card details.";
    }
  } else if (note) {
    note.textContent =
      "Pro is not for sale yet. The checkout link is still a placeholder, so the button opens a waitlist email to " +
      email +
      " instead of a payment page.";
  }

  var form = document.getElementById("waitlist-form");
  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var input = document.getElementById("waitlist-email");
      var status = document.getElementById("waitlist-status");
      if (!input.checkValidity()) {
        input.reportValidity();
        return;
      }
      var address = input.value.trim();
      var subject = "Tab Commander Pro waitlist";
      var body =
        "Please add this address to the Tab Commander Pro waitlist:\n" +
        address +
        "\n\nI'm interested in the planned Pro upgrade ($3/month or $29 once) when checkout is available.\n";
      if (status) {
        status.textContent =
          "Your email app should open with a message to " +
          email +
          ". If it doesn't, send the note yourself. Nothing was saved on this website.";
      }
      window.location.href =
        "mailto:" +
        email +
        "?subject=" +
        encodeURIComponent(subject) +
        "&body=" +
        encodeURIComponent(body);
    });
  }

  var navBox = document.getElementById("nav-check");
  var nav = document.getElementById("site-nav");
  var navLabel = document.querySelector(".nav-toggle");

  function setNav(open) {
    if (!navBox) return;
    navBox.checked = open;
    navBox.setAttribute("aria-expanded", open ? "true" : "false");
  }

  if (navBox && nav && navLabel) {
    navBox.setAttribute("aria-controls", "site-nav");
    navBox.setAttribute("aria-expanded", "false");
    navBox.addEventListener("change", function () {
      navBox.setAttribute("aria-expanded", navBox.checked ? "true" : "false");
    });
    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        setNav(false);
      });
    });
    document.addEventListener("click", function (event) {
      if (!navBox.checked) return;
      var target = event.target;
      if (target === navBox || nav.contains(target) || navLabel.contains(target)) return;
      setNav(false);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && navBox.checked) {
        setNav(false);
        navBox.focus();
      }
    });
  }

  document.querySelectorAll(".faq-item button").forEach(function (button) {
    button.addEventListener("click", function () {
      var panel = document.getElementById(button.getAttribute("aria-controls"));
      var open = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", open ? "false" : "true");
      if (panel) panel.hidden = open;
    });
  });
})();
