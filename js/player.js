(function () {
  const dataEl = document.getElementById("lessonData");
  const iframe = document.getElementById("vimeo-player");
  const playerRoot = document.querySelector(".asl-player");

  if (!dataEl || !iframe || !playerRoot || typeof Vimeo === "undefined") {
    console.log("Missing lessonData, vimeo-player, asl-player, or Vimeo API.");
    return;
  }

  const lessonData = JSON.parse(dataEl.textContent);
  const signs = lessonData.signs || [];

  const player = new Vimeo.Player(iframe);
  let selectedSpeed = 1;

  const firstSign = signs[0]?.label || signs[0]?.chip || "";

  const topUI = document.createElement("div");
  topUI.innerHTML = `
    <div class="chapter-status" aria-live="polite">
      Now Practicing:
      <strong id="currentSign">${firstSign}</strong>
    </div>

    <div class="speed-row">
      <span class="speed-label">Practice Speed:</span>
      <div class="speed-pills">
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

  const signsToggle = document.createElement("button");
  signsToggle.type = "button";
  signsToggle.id = "signsToggle";
  signsToggle.className = "signs-toggle";
  signsToggle.textContent = `Show Signs (${signs.length}) ▼`;

  const signsPanel = document.createElement("div");
  signsPanel.id = "signsPanel";
  signsPanel.className = "signs-panel is-hidden";

  playerRoot.appendChild(signsToggle);
  playerRoot.appendChild(signsPanel);

  const currentSign = document.getElementById("currentSign");
  const speedButtons = document.querySelectorAll(".speed-btn");

  function setActiveSign(index) {
    const buttons = document.querySelectorAll(".sign-button");

    buttons.forEach(function (button) {
      button.classList.remove("is-active");
    });

    if (buttons[index]) {
      buttons[index].classList.add("is-active");
      currentSign.textContent = signs[index].label || signs[index].chip;
    }
  }

  signs.forEach(function (sign, index) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "sign-button";
    button.textContent = `${sign.icon || ""} ${sign.chip || sign.label}`;

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

  signsToggle.addEventListener("click", function () {
    const hidden = signsPanel.classList.toggle("is-hidden");

    signsToggle.textContent = hidden
      ? `Show Signs (${signs.length}) ▼`
      : `Hide Signs (${signs.length}) ▲`;
  });

  speedButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      selectedSpeed = parseFloat(button.dataset.speed);

      speedButtons.forEach(function (btn) {
        btn.classList.remove("active");
      });

      button.classList.add("active");

      player.setPlaybackRate(selectedSpeed).catch(function () {});
    });
  });

  player.on("timeupdate", function (data) {
    let activeIndex = 0;

    for (let i = 0; i < signs.length; i++) {
      if (data.seconds >= signs[i].time) {
        activeIndex = i;
      }
    }

    setActiveSign(activeIndex);
  });
})();