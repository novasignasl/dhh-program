alert("GitHub JS Loaded");

(function () {
  const dataEl = document.getElementById("lessonData");
  const iframe = document.getElementById("vimeo-player");

  if (!dataEl || !iframe || typeof Vimeo === "undefined") {
    console.log("Missing lesson data, Vimeo iframe, or Vimeo API.");
    return;
  }

  const lessonData = JSON.parse(dataEl.textContent);
  const signs = lessonData.signs || [];

  const player = new Vimeo.Player(iframe);

  const currentSign = document.getElementById("currentSign");
  const signChips = document.getElementById("signChips");
  const signToggle = document.getElementById("signToggle");
  const speedButtons = document.querySelectorAll(".speed-btn");

  let selectedSpeed = 1;

  if (signs.length > 0) {
    currentSign.textContent = signs[0].label || signs[0].chip;
    signToggle.textContent = `Show Signs (${signs.length}) ▼`;
  }

  signs.forEach((sign, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sign-chip";
    btn.textContent = `${sign.icon || ""} ${sign.chip || sign.label}`;

    if (index === 0) btn.classList.add("active");

    btn.addEventListener("click", function () {
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

    signChips.appendChild(btn);
  });

  function setActiveSign(index) {
    const chips = document.querySelectorAll(".sign-chip");

    chips.forEach(function (chip) {
      chip.classList.remove("active");
    });

    if (chips[index]) {
      chips[index].classList.add("active");
      currentSign.textContent = signs[index].label || signs[index].chip;
    }
  }

  signToggle.addEventListener("click", function () {
    const collapsed = signChips.classList.toggle("collapsed");

    signToggle.setAttribute("aria-expanded", String(!collapsed));

    signToggle.textContent = collapsed
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