//test18

/* NovaSign ASL Vimeo JSON Player
   Supports:
   - Multiple players on one page
   - Old format: id="lessonData" and id="vimeo-player"
   - New format: class="lessonData" and class="vimeo-player"
   - Collapsible chip buttons
*/

(function () {
  function ready(fn) {
    if (document.readyState !== "loading") {
      fn();
    } else {
      document.addEventListener("DOMContentLoaded", fn);
    }
  }

  function waitForVimeo(callback, attempts) {
    attempts = attempts || 0;

    if (window.Vimeo && window.Vimeo.Player) {
      callback();
      return;
    }

    if (attempts > 50) {
      console.warn("NovaSign Player: Vimeo API did not load.");
      return;
    }

    setTimeout(function () {
      waitForVimeo(callback, attempts + 1);
    }, 100);
  }

  function getLessonData(playerWrap) {
    var dataScript =
      playerWrap.querySelector(".lessonData") ||
      playerWrap.querySelector("#lessonData");

    if (!dataScript) {
      return { signs: [] };
    }

    try {
      return JSON.parse(dataScript.textContent.trim());
    } catch (error) {
      console.error("NovaSign Player: Invalid lessonData JSON.", error);
      return { signs: [] };
    }
  }

  function getIframe(playerWrap) {
    return (
      playerWrap.querySelector(".vimeo-player") ||
      playerWrap.querySelector("#vimeo-player") ||
      playerWrap.querySelector("iframe")
    );
  }

  function formatChipText(sign) {
    var icon = sign.icon || "";
    var chip = sign.chip || sign.label || "";
    return (icon + " " + chip).trim();
  }

  function clearExistingControls(playerWrap) {
    var existing = playerWrap.querySelector(".asl-chip-panel");
    if (existing) {
      existing.remove();
    }
  }

  function createChipButton(sign, player) {
    var button = document.createElement("button");

    button.type = "button";
    button.className = "routine-chip";
    button.textContent = formatChipText(sign);
    button.setAttribute("aria-label", sign.label || sign.chip || "ASL sign");

    button.addEventListener("click", function () {
      var time = Number(sign.time) || 0;

      player
        .setCurrentTime(time)
        .then(function () {
          return player.play();
        })
        .catch(function (error) {
          console.warn("NovaSign Player: Could not seek/play video.", error);
        });
    });

    return button;
  }

  function buildChipPanel(playerWrap, signs, player) {
    clearExistingControls(playerWrap);

    var panel = document.createElement("div");
    panel.className = "asl-chip-panel";

    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "asl-chip-toggle";
    toggle.setAttribute("aria-expanded", "false");

    toggle.innerHTML =
    '<span class="asl-chip-toggle-label">Show Signs</span>' +
    '<span class="asl-chip-toggle-icon">⌄</span>';

    var chipsWrap = document.createElement("div");
    chipsWrap.className = "routine-chip-wrap";
    chipsWrap.hidden = true;

    signs.forEach(function (sign) {
      chipsWrap.appendChild(createChipButton(sign, player));
    });

    toggle.addEventListener("click", function () {
      var isOpen = toggle.getAttribute("aria-expanded") === "true";
      var nextOpen = !isOpen;

      toggle.setAttribute("aria-expanded", String(nextOpen));
      chipsWrap.hidden = !nextOpen;

      var label = toggle.querySelector(".asl-chip-toggle-label");
      var icon = toggle.querySelector(".asl-chip-toggle-icon");

      if (label) {
        label.textContent = nextOpen ? "Hide Signs" : "Show Signs";
      }

      if (icon) {
        icon.textContent = nextOpen ? "⌃" : "⌄";
      }
    });

    panel.appendChild(toggle);
    panel.appendChild(chipsWrap);
    playerWrap.appendChild(panel);
  }

  function initPlayer(playerWrap) {
    if (!playerWrap || playerWrap.dataset.novasignInitialized === "true") {
      return;
    }

    var iframe = getIframe(playerWrap);

    if (!iframe) {
      console.warn("NovaSign Player: No iframe found inside .asl-player.");
      return;
    }

    var lessonData = getLessonData(playerWrap);
    var signs = Array.isArray(lessonData.signs) ? lessonData.signs : [];

    var player;

    try {
      player = new Vimeo.Player(iframe);
    } catch (error) {
      console.error("NovaSign Player: Could not create Vimeo player.", error);
      return;
    }

    playerWrap.dataset.novasignInitialized = "true";

    if (signs.length > 0) {
      buildChipPanel(playerWrap, signs, player);
    }
  }

  function initAllPlayers() {
    var players = document.querySelectorAll(".asl-player");

    players.forEach(function (playerWrap) {
      initPlayer(playerWrap);
    });
  }

  ready(function () {
    waitForVimeo(initAllPlayers);
  });
})();
