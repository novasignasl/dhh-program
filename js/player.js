//test9

(function () {
  const dataEl = document.getElementById("lessonData");
  const iframe = document.getElementById("vimeo-player");
  const playerRoot = document.querySelector(".asl-player");

  if (!dataEl || !iframe || !playerRoot || typeof Vimeo === "undefined") {
    console.log("Missing lessonData, vimeo-player, asl-player, or Vimeo API.");
    return;
  }

  let lessonData = {};

  try {
    lessonData = JSON.parse(dataEl.textContent || "{}");
  } catch (err) {
    console.log("Could not parse lessonData JSON.", err);
    lessonData = {};
  }

  const originalSigns = Array.isArray(lessonData.signs) ? lessonData.signs : [];

  // Sort by timestamp so "Now Practicing" follows the actual video time.
  const signs = originalSigns
    .filter(function (sign) {
      return sign && sign.time !== undefined && sign.time !== null;
    })
    .map(function (sign) {
      return {
        time: Number(sign.time) || 0,
        icon: sign.icon || "",
        chip: sign.chip || "",
        label: sign.label || sign.chip || "Sign"
      };
    })
    .sort(function (a, b) {
      return a.time - b.time;
    });

  const hasSigns = signs.length > 0;

  const player = new Vimeo.Player(iframe);
  let selectedSpeed = 1;
  let activeSignIndex = -1;

  const firstSign = hasSigns ? signs[0].label : "";
  const firstIcon = hasSigns ? signs[0].icon : "";

  const topUI = document.createElement("div");
  topUI.className = hasSigns ? "player-top player-top-with-signs" : "player-top player-top-video-only";

  topUI.innerHTML = hasSigns
    ? `
      <div class="chapter-status" aria-live="polite">
        <div class="player-section-heading">
          <span class="chapter-label">Now Practicing</span>
        </div>

        <div class="current-practice">
          <span id="currentSignIcon" class="current-sign-icon" aria-hidden="true">${firstIcon}</span>
          <strong id="currentSign">${firstSign}</strong>
        </div>
      </div>

      <div class="speed-row">
        <div class="player-section-heading speed-heading">
          <span class="player-icon" aria-hidden="true">⚡</span>
          <span class="speed-label">Practice Speed</span>
        </div>
        <div class="speed-pills" role="group" aria-label="Practice speed">
          <button type="button" class="speed-btn" data-speed="0.5">Slow</button>
          <button type="button" class="speed-btn" data-speed="0.75">Med</button>
          <button type="button" class="speed-btn active" data-speed="1">Normal</button>
          <button type="button" class="speed-btn" data-speed="1.25">Fast</button>
        </div>
      </div>
    `
    : `
      <div class="speed-row speed-row-only">
        <div class="player-section-heading speed-heading">
          <span class="player-icon" aria-hidden="true">⚡</span>
          <span class="speed-label">Practice Speed</span>
        </div>
        <div class="speed-pills" role="group" aria-label="Practice speed">
          <button type="button" class="speed-btn" data-speed="0.5">Slow</button>
          <button type="button" class="speed-btn" data-speed="0.75">Med</button>
          <button type="button" class="speed-btn active" data-speed="1">Normal</button>
          <button type="button" class="speed-btn" data-speed="1.25">Fast</button>
        </div>
      </div>
    `;

  const videoWrapper = document.createElement("div");
  videoWrapper.className = "video-wrapper";

  playerRoot.insertBefore(topUI, iframe);
  playerRoot.insertBefore(videoWrapper, iframe);
  videoWrapper.appendChild(iframe);

  const speedButtons = playerRoot.querySelectorAll(".speed-btn");

  speedButtons.forEach(function (button) {
    button.setAttribute("aria-pressed", button.classList.contains("active") ? "true" : "false");

    button.addEventListener("click", function () {
      selectedSpeed = parseFloat(button.dataset.speed);

      speedButtons.forEach(function (btn) {
        btn.classList.remove("active");
        btn.setAttribute("aria-pressed", "false");
      });

      button.classList.add("active");
      button.setAttribute("aria-pressed", "true");

      player.setPlaybackRate(selectedSpeed).catch(function () {});
    });
  });

  // No chips/chapters: keep the same styled player and speed controls only.
  if (!hasSigns) {
    playerRoot.classList.add("video-only");
    return;
  }

  playerRoot.classList.add("has-signs");

  const signsToggle = document.createElement("button");
  signsToggle.type = "button";
  signsToggle.id = "signsToggle";
  signsToggle.className = "signs-toggle";
  signsToggle.setAttribute("aria-expanded", "false");
  signsToggle.setAttribute("aria-controls", "signsPanel");
  signsToggle.textContent = `Show Signs (${signs.length}) ▼`;

  const signsPanel = document.createElement("div");
  signsPanel.id = "signsPanel";
  signsPanel.className = "signs-panel is-hidden";

  playerRoot.appendChild(signsToggle);
  playerRoot.appendChild(signsPanel);

  const currentSign = playerRoot.querySelector("#currentSign");
  const currentSignIcon = playerRoot.querySelector("#currentSignIcon");

  function getSignText(sign) {
    return sign.label || sign.chip || "Sign";
  }

  function getButtonText(sign) {
    return `${sign.icon || ""} ${sign.chip || sign.label || "Sign"}`.trim();
  }

  function getActiveIndexFromSeconds(seconds) {
    let index = 0;

    for (let i = 0; i < signs.length; i++) {
      if (seconds >= signs[i].time) {
        index = i;
      } else {
        break;
      }
    }

    return index;
  }

  function setActiveSign(index) {
    if (!signs[index] || index === activeSignIndex) {
      return;
    }

    activeSignIndex = index;

    const buttons = signsPanel.querySelectorAll(".sign-button");

    buttons.forEach(function (button, buttonIndex) {
      const isActive = buttonIndex === index;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    if (currentSign) {
      currentSign.textContent = getSignText(signs[index]);
    }

    if (currentSignIcon) {
      currentSignIcon.textContent = signs[index].icon || "•";
      currentSignIcon.classList.toggle("has-icon", Boolean(signs[index].icon));
    }
  }

  signs.forEach(function (sign, index) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "sign-button";
    button.textContent = getButtonText(sign);
    button.setAttribute("aria-pressed", index === 0 ? "true" : "false");

    if (index === 0) {
      button.classList.add("is-active");
    }

    button.addEventListener("click", function () {
      player.setPlaybackRate(selectedSpeed).catch(function () {});

      player.setCurrentTime(sign.time)
        .then(function () {
          return player.play();
        })
        .catch(function (err) {
          console.log(err);
        });

      setActiveSign(index);
    });

    signsPanel.appendChild(button);
  });

  // Initialize Now Practicing from the first timestamp.
  setActiveSign(0);

  signsToggle.addEventListener("click", function () {
    const hidden = signsPanel.classList.toggle("is-hidden");

    signsToggle.textContent = hidden
      ? `Show Signs (${signs.length}) ▼`
      : `Hide Signs (${signs.length}) ▲`;

    signsToggle.setAttribute("aria-expanded", hidden ? "false" : "true");
  });

  player.on("timeupdate", function (data) {
    const index = getActiveIndexFromSeconds(data.seconds || 0);
    setActiveSign(index);
  });

  player.on("seeked", function (data) {
    if (data && typeof data.seconds === "number") {
      setActiveSign(getActiveIndexFromSeconds(data.seconds));
      return;
    }

    player.getCurrentTime()
      .then(function (seconds) {
        setActiveSign(getActiveIndexFromSeconds(seconds || 0));
      })
      .catch(function () {});
  });
})();
