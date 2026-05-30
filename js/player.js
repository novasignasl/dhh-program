// js/player.js
(function () {
  const lessonDataEl = document.getElementById("lessonData");
  const iframe = document.getElementById("vimeo-player");
  const playerRoot = document.querySelector(".asl-player");

  if (!lessonDataEl || !iframe || !playerRoot || typeof Vimeo === "undefined") {
    console.log("Missing lessonData, vimeo-player, asl-player, or Vimeo API.");
    return;
  }

  const lessonData = JSON.parse(lessonDataEl.textContent);
  const signs = lessonData.signs || [];

  const player = new Vimeo.Player(iframe);
  let selectedSpeed = 1;

  const firstLabel = signs[0]?.label || signs[0]?.chip || "";

  const topUI = document.createElement("div");
  topUI.innerHTML = `
    <div class="chapter-status" aria-live="polite">
      Now Practicing:
      <strong id="currentSign">${firstLabel}</strong>
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

  const bottomUI = document.createElement("div");
  bottomUI.innerHTML = `
    <button
      type="button"
      class="sign-toggle"
      id="signToggle"
      aria-expanded="false">
      Show Signs (${signs.length}) ▼
    </button>

    <div class="sign-chips collapsed" id="signChips"></div>
  `;

  playerRoot.insertBefore(topUI, iframe);
  playerRoot.appendChild(bottomUI);

  const currentSign = document.getElementById("currentSign");
  const signToggle = document.getElementById("signToggle");
  const signChips = document.getElementById("signChips");
  const speedButtons = document.querySelectorAll(".speed-btn");

  function setActiveSign(index) {
    const chips = document.querySelectorAll(".sign-chip");

    chips.forEach(chip => chip.classList.remove("active"));

    if (chips[index]) {
      chips[index].classList.add("active");
      currentSign.textContent = signs[index].label || signs[index].chip;
    }
  }

  signs.forEach((sign, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "sign-chip";
    button.innerHTML = `${sign.icon || ""} ${sign.chip || sign.label}`;

    if (index === 0) {
      button.classList.add("active");
    }

    button.addEventListener("click", () => {
      player.setPlaybackRate(selectedSpeed).catch(() => {});

      player.setCurrentTime(sign.time)
        .then(() => player.play());

      setActiveSign(index);
    });

    signChips.appendChild(button);
  });

  signToggle.addEventListener("click", () => {
    const isCollapsed = signChips.classList.toggle("collapsed");

    signToggle.setAttribute("aria-expanded", !isCollapsed);

    signToggle.textContent = isCollapsed
      ? `Show Signs (${signs.length}) ▼`
      : `Hide Signs (${signs.length}) ▲`;
  });

  speedButtons.forEach(button => {
    button.addEventListener("click", () => {
      selectedSpeed = parseFloat(button.dataset.speed);

      speedButtons.forEach(btn => btn.classList.remove("active"));
      button.classList.add("active");

      player.setPlaybackRate(selectedSpeed).catch(() => {});
    });
  });

  player.on("timeupdate", data => {
    let activeIndex = 0;

    for (let i = 0; i < signs.length; i++) {
      if (data.seconds >= signs[i].time) {
        activeIndex = i;
      }
    }

    setActiveSign(activeIndex);
  });
})();