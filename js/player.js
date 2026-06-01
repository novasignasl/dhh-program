//test19

/* NovaSign ASL Vimeo JSON Player
   Supports:
   - Multiple players on one page
   - Old format: id="lessonData" and id="vimeo-player"
   - New format: class="lessonData" and class="vimeo-player"
   - Practicing Now panel
   - Speed buttons
   - Collapsible sign buttons
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

  function formatSignText(sign) {
    var icon = sign.icon || "";
    var text = sign.chip || sign.label || "";
    return (icon + " " + text).trim();
  }

  function getSignLabel(sign) {
    return sign.label || sign.chip || "Choose a sign";
  }

  function getSignIcon(sign) {
    return sign.icon || "👋";
  }

  function clearExistingGeneratedUI(playerWrap) {
    var existingTop = playerWrap.querySelector(".player-top");
    var existingPanel = playerWrap.querySelector(".asl-chip-panel");

    if (existingTop) {
      existingTop.remove();
    }

    if (existingPanel) {
      existingPanel.remove();
    }
  }

  function buildTopUI(playerWrap, signs, player) {
    var hasSigns = signs.length > 0;

    var top = document.createElement("div");
    top.className = hasSigns
      ? "player-top player-top-with-signs"
      : "player-top player-top-video-only";

    if (hasSigns) {
      var chapterStatus = document.createElement("div");
      chapterStatus.className = "chapter-status";

      var chapterLabel = document.createElement("div");
      chapterLabel.className = "chapter-label";
      chapterLabel.textContent = "Practicing Now:";

      var currentPractice = document.createElement("div");
      currentPractice.className = "current-practice";

      var currentIcon = document.createElement("span");
      currentIcon.className = "current-sign-icon";
      currentIcon.textContent = getSignIcon(signs[0]);

      var currentText = document.createElement("strong");
      currentText.className = "current-sign-label";
      currentText.textContent = getSignLabel(signs[0]);

      currentPractice.appendChild(currentIcon);
      currentPractice.appendChild(currentText);

      chapterStatus.appendChild(chapterLabel);
      chapterStatus.appendChild(currentPractice);

      top.appendChild(chapterStatus);
    }

    var speedRow = document.createElement("div");
    speedRow.className = hasSigns ? "speed-row" : "speed-row speed-row-only";

    var speedHeading = document.createElement("div");
    speedHeading.className = "speed-heading player-section-heading";

    var speedIcon = document.createElement("span");
    speedIcon.className = "player-icon";
    speedIcon.textContent = "⚡";

    var speedLabel = document.createElement("span");
    speedLabel.className = "speed-label";
    speedLabel.textContent = "Speed";

    speedHeading.appendChild(speedIcon);
    speedHeading.appendChild(speedLabel);

    var speedPills = document.createElement("div");
    speedPills.className = "speed-pills";

    var speeds = [
      { label: "Slow", rate: 0.75 },
      { label: "Normal", rate: 1 },
      { label: "Fast", rate: 1.25 }
    ];

    speeds.forEach(function (speed) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "speed-btn";
      button.textContent = speed.label;
      button.setAttribute("data-speed", String(speed.rate));

      if (speed.rate === 1) {
        button.classList.add("active");
      }

      button.addEventListener("click", function () {
        var allButtons = speedPills.querySelectorAll(".speed-btn");

        allButtons.forEach(function (btn) {
          btn.classList.remove("active");
        });

        button.classList.add("active");

        player
          .setPlaybackRate(speed.rate)
          .catch(function (error) {
            console.warn("NovaSign Player: Could not change playback speed.", error);
          });
      });

      speedPills.appendChild(button);
    });

    speedRow.appendChild(speedHeading);
    speedRow.appendChild(speedPills);

    top.appendChild(speedRow);

    var iframe = getIframe(playerWrap);
    if (iframe) {
      playerWrap.insertBefore(top, iframe);
    } else {
      playerWrap.insertBefore(top, playerWrap.firstChild);
    }
  }

  function createSignButton(sign, player, playerWrap) {
    var button = document.createElement("button");

    button.type = "button";
    button.className = "sign-button";
    button.textContent = formatSignText(sign);
    button.setAttribute("aria-label", sign.label || sign.chip || "ASL sign");
    button.setAttribute("data-time", String(Number(sign.time) || 0));

    button.addEventListener("click", function () {
      var time = Number(sign.time) || 0;

      player
        .setCurrentTime(time)
        .then(function () {
          updateCurrentSign(playerWrap, sign, button);
          return player.play();
        })
        .catch(function (error) {
          console.warn("NovaSign Player: Could not seek/play video.", error);
        });
    });

    return button;
  }

  function updateCurrentSign(playerWrap, sign, activeButton) {
    var icon = playerWrap.querySelector(".current-sign-icon");
    var label = playerWrap.querySelector(".current-sign-label");
    var buttons = playerWrap.querySelectorAll(".sign-button");

    if (icon) {
      icon.textContent = getSignIcon(sign);
    }

    if (label) {
      label.textContent = getSignLabel(sign);
    }

    buttons.forEach(function (button) {
      button.classList.remove("is-active");
    });

    if (activeButton) {
      activeButton.classList.add("is-active");
    }
  }

  function buildChipPanel(playerWrap, signs, player) {
    var panel = document.createElement("div");
    panel.className = "asl-chip-panel";

    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "asl-chip-toggle";
    toggle.setAttribute("aria-expanded", "false");

    toggle.innerHTML =
      '<span class="asl-chip-toggle-label">Show Signs</span>' +
      '<span class="asl-chip-toggle-icon">⌄</span>';

    var signsWrap = document.createElement("div");
    signsWrap.className = "sign-buttons-wrap";
    signsWrap.hidden = true;

    signs.forEach(function (sign) {
      signsWrap.appendChild(createSignButton(sign, player, playerWrap));
    });

    toggle.addEventListener("click", function () {
      var isOpen = toggle.getAttribute("aria-expanded") === "true";
      var nextOpen = !isOpen;

      toggle.setAttribute("aria-expanded", String(nextOpen));
      signsWrap.hidden = !nextOpen;

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
    panel.appendChild(signsWrap);
    playerWrap.appendChild(panel);
  }

  function getCurrentSign(signs, currentTime) {
    var current = signs[0];

    signs.forEach(function (sign) {
      if (currentTime >= Number(sign.time || 0)) {
        current = sign;
      }
    });

    return current;
  }

  function syncCurrentSignWithVideo(playerWrap, signs, player) {
    if (!signs.length) return;

    player.on("timeupdate", function (data) {
      var currentTime = data.seconds || 0;
      var currentSign = getCurrentSign(signs, currentTime);
      var buttons = playerWrap.querySelectorAll(".sign-button");
      var activeButton = null;

      buttons.forEach(function (button) {
        var buttonTime = Number(button.getAttribute("data-time")) || 0;

        if (buttonTime === Number(currentSign.time || 0)) {
          activeButton = button;
        }
      });

      updateCurrentSign(playerWrap, currentSign, activeButton);
    });
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

    signs.sort(function (a, b) {
      return Number(a.time || 0) - Number(b.time || 0);
    });

    var player;

    try {
      player = new Vimeo.Player(iframe);
    } catch (error) {
      console.error("NovaSign Player: Could not create Vimeo player.", error);
      return;
    }

    playerWrap.dataset.novasignInitialized = "true";

    clearExistingGeneratedUI(playerWrap);

    if (signs.length === 0) {
      playerWrap.classList.add("video-only");
    } else {
      playerWrap.classList.remove("video-only");
    }

    buildTopUI(playerWrap, signs, player);

    if (signs.length > 0) {
      buildChipPanel(playerWrap, signs, player);
      syncCurrentSignWithVideo(playerWrap, signs, player);
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