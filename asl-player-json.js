// NovaSign ASL Vimeo Player - PHP/private JSON version

(function () {
  var masterLessonPromise = {};

  function ready(fn) {
    if (document.readyState !== "loading") {
      fn();
    } else {
      document.addEventListener("DOMContentLoaded", fn);
    }
  }

  function loadScriptOnce(src) {
    return new Promise(function (resolve, reject) {
      if (window.Vimeo && window.Vimeo.Player) {
        resolve();
        return;
      }

      var existing = document.querySelector('script[src="' + src + '"]');
      if (existing) {
        existing.addEventListener("load", resolve);
        existing.addEventListener("error", reject);
        return;
      }

      var script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function normalizeLessonKey(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getLessonName(playerWrap) {
    return (
      playerWrap.getAttribute("data-lesson") ||
      playerWrap.getAttribute("lesson") ||
      ""
    );
  }

  function getLessonApiUrl(playerWrap) {
    var endpoint = playerWrap.getAttribute("data-lesson-api");
    var lessonName = getLessonName(playerWrap);

    if (!endpoint) {
      console.warn("NovaSign Player: Add data-lesson-api to .asl-player.");
      return "";
    }

    var url = new URL(endpoint, window.location.href);
    url.searchParams.set("lesson", lessonName);
    return url.href;
  }

  function fetchLessonData(playerWrap) {
    var jsonUrl = getLessonApiUrl(playerWrap);

    if (!jsonUrl) {
      return Promise.resolve({ signs: [] });
    }

    if (masterLessonPromise[jsonUrl]) {
      return masterLessonPromise[jsonUrl];
    }

    masterLessonPromise[jsonUrl] = fetch(jsonUrl, { cache: "no-cache" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("HTTP " + response.status + " while loading " + jsonUrl);
        }
        return response.json();
      })
      .catch(function (error) {
        console.warn("NovaSign Player: fetch failed, trying JSONP fallback.", error);
        return fetchLessonDataJsonp(jsonUrl);
      });

    return masterLessonPromise[jsonUrl];
  }

  function fetchLessonDataJsonp(jsonUrl) {
    return new Promise(function (resolve, reject) {
      var callbackName =
        "__NovaSignLessonCallback_" +
        String(Date.now()) +
        "_" +
        String(Math.floor(Math.random() * 100000));

      var script = document.createElement("script");
      var url = new URL(jsonUrl, window.location.href);
      url.searchParams.set("callback", callbackName);

      var cleanup = function () {
        try {
          delete window[callbackName];
        } catch (error) {
          window[callbackName] = undefined;
        }

        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      };

      var timeout = setTimeout(function () {
        cleanup();
        reject(new Error("JSONP lesson load timed out."));
      }, 10000);

      window[callbackName] = function (data) {
        clearTimeout(timeout);
        cleanup();
        resolve(data || { signs: [] });
      };

      script.src = url.href;
      script.async = true;
      script.onerror = function () {
        clearTimeout(timeout);
        cleanup();
        reject(new Error("JSONP lesson script failed to load."));
      };

      document.head.appendChild(script);
    }).catch(function (error) {
      console.error("NovaSign Player: Could not load lesson JSON.", error);
      return { signs: [] };
    });
  }

  function buildVimeoUrl(video) {
    if (video && video.url) {
      return video.url;
    }

    if (!video || !video.id) {
      return "";
    }

    var url = "https://player.vimeo.com/video/" + encodeURIComponent(video.id);
    var params = Object.assign({}, video.params || {});

    if (video.hash) {
      params.h = video.hash;
    }

    var query = Object.keys(params)
      .map(function (key) {
        return encodeURIComponent(key) + "=" + encodeURIComponent(params[key]);
      })
      .join("&");

    return query ? url + "?" + query : url;
  }

  function getIframe(playerWrap) {
    return (
      playerWrap.querySelector(".vimeo-player") ||
      playerWrap.querySelector("#vimeo-player") ||
      playerWrap.querySelector("iframe")
    );
  }

  function ensureIframe(playerWrap, lessonData) {
    var iframe = getIframe(playerWrap);
    if (iframe) return iframe;

    var videoUrl = buildVimeoUrl(lessonData.video);

    if (!videoUrl) {
      console.warn("NovaSign Player: No Vimeo video URL or video id found in selected lesson.");
      return null;
    }

    var wrapper = document.createElement("div");
    wrapper.className = "video-wrapper";

    iframe = document.createElement("iframe");
    iframe.className = "vimeo-player";
    iframe.src = videoUrl;
    iframe.title =
      (lessonData.video && lessonData.video.title) ||
      lessonData.title ||
      "NovaSign Lesson Video";
    iframe.allow = "autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.allowFullscreen = true;

    wrapper.appendChild(iframe);
    playerWrap.appendChild(wrapper);

    return iframe;
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
    return sign.icon || "";
  }

  function clearExistingGeneratedUI(playerWrap) {
    var existingTop = playerWrap.querySelector(".player-top");
    var existingPanel = playerWrap.querySelector(".asl-chip-panel");

    if (existingTop) existingTop.remove();
    if (existingPanel) existingPanel.remove();
  }

  function buildTopUI(playerWrap, signs, player, iframe) {
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
    speedIcon.textContent = "Speed";

    var speedLabel = document.createElement("span");
    speedLabel.className = "speed-label";
    speedLabel.textContent = "Speed";

    speedHeading.appendChild(speedIcon);
    speedHeading.appendChild(speedLabel);

    var speedPills = document.createElement("div");
    speedPills.className = "speed-pills";

    [
      { label: "Slow", rate: 0.75 },
      { label: "Normal", rate: 1 },
      { label: "Fast", rate: 1.25 }
    ].forEach(function (speed) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "speed-btn";
      button.textContent = speed.label;
      button.setAttribute("data-speed", String(speed.rate));

      if (speed.rate === 1) button.classList.add("active");

      button.addEventListener("click", function () {
        speedPills.querySelectorAll(".speed-btn").forEach(function (btn) {
          btn.classList.remove("active");
        });

        button.classList.add("active");

        player.setPlaybackRate(speed.rate).catch(function (error) {
          console.warn("NovaSign Player: Could not change playback speed.", error);
        });
      });

      speedPills.appendChild(button);
    });

    speedRow.appendChild(speedHeading);
    speedRow.appendChild(speedPills);
    top.appendChild(speedRow);

    var insertTarget = iframe.closest(".video-wrapper") || iframe;
    playerWrap.insertBefore(top, insertTarget);
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

    if (icon) icon.textContent = getSignIcon(sign);
    if (label) label.textContent = getSignLabel(sign);

    buttons.forEach(function (button) {
      button.classList.remove("is-active");
    });

    if (activeButton) activeButton.classList.add("is-active");
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
      '<span class="asl-chip-toggle-icon">v</span>';

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

      if (label) label.textContent = nextOpen ? "Hide Signs" : "Show Signs";
      if (icon) icon.textContent = nextOpen ? "^" : "v";
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

    fetchLessonData(playerWrap).then(function (lessonData) {
      var signs = Array.isArray(lessonData.signs) ? lessonData.signs : [];

      signs.sort(function (a, b) {
        return Number(a.time || 0) - Number(b.time || 0);
      });

      var iframe = ensureIframe(playerWrap, lessonData);

      if (!iframe) {
        console.warn("NovaSign Player: No iframe found or created inside .asl-player.");
        return;
      }

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

      buildTopUI(playerWrap, signs, player, iframe);
      if (signs.length) buildChipPanel(playerWrap, signs, player);
      syncCurrentSignWithVideo(playerWrap, signs, player);
    });
  }

  function initAllPlayers() {
    document.querySelectorAll(".asl-player").forEach(initPlayer);
  }

  ready(function () {
    loadScriptOnce("https://player.vimeo.com/api/player.js").then(function () {
      initAllPlayers();

      // ThriveCart can inject HTML blocks after the page has already loaded.
      setTimeout(initAllPlayers, 300);
      setTimeout(initAllPlayers, 1000);
      setTimeout(initAllPlayers, 2500);

      if (window.MutationObserver && document.body) {
        var observer = new MutationObserver(function () {
          initAllPlayers();
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      }
    });
  });

  window.NovaSignInitPlayers = function () {
    document.querySelectorAll(".asl-player").forEach(function (playerWrap) {
      playerWrap.dataset.novasignInitialized = "false";
      initPlayer(playerWrap);
    });
  };
})();
