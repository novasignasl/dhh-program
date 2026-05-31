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

  const signs = Array.isArray(lessonData.signs) ? lessonData.signs : [];
  const hasSigns = signs.length > 0;

  const player = new Vimeo.Player(iframe);
  let selectedSpeed = 1;

  const firstSign = hasSigns
    ? signs[0]?.label || signs[0]?.chip || ""
    : "";

  const topUI = document.createElement("div");
  topUI.className = hasSigns ? "player-top player-top-with-signs" : "player-top player-top-video-only";

  topUI.innerHTML = hasSigns
    ? `
      <div class="chapter-status" aria-live="polite">
        <span class="chapter-label">Now Practicing:</span>
        <strong id="currentSign">${firstSign}</strong>
      </div>

      <div class="speed-row">
        <span class="speed-label">Practice Speed:</span>
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
        <span class="speed-label">Practice Speed:</span>
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

    button.setAttribute("aria-pressed", button.classList.contains("active") ? "true" : "false");
  });

  // If there are no signs/chips/chapters, stop here.
  // The Vimeo player and speed buttons still work, but no chapter UI is shown.
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

  const currentSign = document.getElementById("currentSign");

  function setActiveSign(index) {
    const buttons = signsPanel.querySelectorAll(".sign-button");

    buttons.forEach(function (button) {
      button.classList.remove("is-active");
      button.setAttribute("aria-pressed", "false");
    });

    if (buttons[index]) {
      buttons[index].classList.add("is-active");
      buttons[index].setAttribute("aria-pressed", "true");
    }

    if (currentSign && signs[index]) {
      currentSign.textContent = signs[index].label || signs[index].chip || "";
    }
  }

  signs.forEach(function (sign, index) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "sign-button";
    button.textContent = `${sign.icon || ""} ${sign.chip || sign.label || "Sign"}`.trim();
    button.setAttribute("aria-pressed", index === 0 ? "true" : "false");

    if (index === 0) {
      button.classList.add("is-active");
    }

    button.addEventListener("click", function () {
      player.setPlaybackRate(selectedSpeed).catch(function () {});

      player.setCurrentTime(Number(sign.time) || 0)
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

  signsToggle.addEventListener("click", function () {
    const hidden = signsPanel.classList.toggle("is-hidden");

    signsToggle.textContent = hidden
      ? `Show Signs (${signs.length}) ▼`
      : `Hide Signs (${signs.length}) ▲`;

    signsToggle.setAttribute("aria-expanded", hidden ? "false" : "true");
  });

  player.on("timeupdate", function (data) {
    let activeIndex = 0;

    for (let i = 0; i < signs.length; i++) {
      if (data.seconds >= (Number(signs[i].time) || 0)) {
        activeIndex = i;
      }
    }

    setActiveSign(activeIndex);
  });
})();
