// NovaSign dev player v21 - loop fix - 2026-06-20
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
  url.searchParams.set("_novasign", String(Date.now()));

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

  function parseBoolean(value, fallback) {
    if (value == null || value === "") {
      return fallback;
    }

    if (typeof value === "boolean") {
      return value;
    }

    var normalized = String(value).trim().toLowerCase();

    if (["1", "true", "yes", "on"].indexOf(normalized) !== -1) {
      return true;
    }

    if (["0", "false", "no", "off"].indexOf(normalized) !== -1) {
      return false;
    }

    return fallback;
  }

  function getLoopEnabled(playerWrap, lessonData) {
    var config = window.NovaSignPlayerConfig || {};
    var configuredValue = playerWrap.getAttribute("data-loop");

    if (configuredValue == null && lessonData && lessonData.loop != null) {
      configuredValue = lessonData.loop;
    }

    if (configuredValue == null && config.loop != null) {
      configuredValue = config.loop;
    }

    return parseBoolean(configuredValue, true);
  }

  function applyLoopSetting(state) {
    if (!state.player) {
      return Promise.resolve();
    }

    return state.player.setLoop(state.loopEnabled).catch(function (error) {
      console.warn("NovaSign Player: Could not set loop behavior.", error);
    });
  }

  function buildVimeoUrl(video, loopEnabled) {
    loopEnabled = loopEnabled !== false;

    if (video && video.url) {
      try {
        var directUrl = new URL(video.url, window.location.href);

        if (!directUrl.searchParams.has("playsinline")) {
          directUrl.searchParams.set("playsinline", "1");
        }

        directUrl.searchParams.set("loop", loopEnabled ? "1" : "0");

        return directUrl.href;
      } catch (error) {
        return video.url;
      }
    }

    if (!video || !video.id) {
      return "";
    }

    var url = "https://player.vimeo.com/video/" + encodeURIComponent(video.id);
    var params = Object.assign({}, video.params || {});

    // Vimeo needs this query param for reliable inline playback on mobile Safari.
    if (params.playsinline == null) {
      params.playsinline = 1;
    }

    params.loop = loopEnabled ? 1 : 0;

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

  function getConfiguredScrollOffset(playerWrap) {
    var config = window.NovaSignPlayerConfig || {};
    var rawValue =
      playerWrap.getAttribute("data-scroll-offset") ||
      config.scrollOffset ||
      getComputedStyle(document.documentElement).getPropertyValue("--novasign-scroll-offset") ||
      96;

    var offset = parseInt(rawValue, 10);
    return Number.isFinite(offset) ? offset : 96;
  }

  function getVideoElement(playerWrap) {
    return playerWrap.querySelector(".video-wrapper") || getIframe(playerWrap) || playerWrap;
  }

  function isVideoVisible(playerWrap, scrollOffset) {
    var videoElement = getVideoElement(playerWrap);
    var rect = videoElement.getBoundingClientRect();
    var viewportHeight = window.innerHeight || document.documentElement.clientHeight;

    // Treat any meaningful intersection as visible so a user already watching
    // the player is not yanked around by an unnecessary scroll.
    return rect.bottom > scrollOffset && rect.top < viewportHeight;
  }

  function scrollVideoIntoView(playerWrap) {
    var scrollOffset = getConfiguredScrollOffset(playerWrap);

    if (isVideoVisible(playerWrap, scrollOffset)) {
      return;
    }

    var videoElement = getVideoElement(playerWrap);
    var targetTop =
      videoElement.getBoundingClientRect().top +
      window.pageYOffset -
      scrollOffset;

    window.scrollTo({
      top: Math.max(targetTop, 0),
      behavior: "smooth"
    });
  }

  function ensureLoadingStatus(playerWrap) {
    var wrapper = playerWrap.querySelector(".video-wrapper");
    var iframe = getIframe(playerWrap);

    if (!wrapper) {
      var inlineStatus = playerWrap.querySelector(".asl-video-loading");

      if (!inlineStatus && iframe) {
        inlineStatus = document.createElement("div");
        inlineStatus.className = "asl-video-loading asl-video-loading-inline";
        inlineStatus.setAttribute("role", "status");
        inlineStatus.setAttribute("aria-live", "polite");
        inlineStatus.textContent = "Loading video...";
        iframe.parentNode.insertBefore(inlineStatus, iframe.nextSibling);
      }

      return inlineStatus;
    }

    var status = wrapper.querySelector(".asl-video-loading");

    if (!status) {
      status = document.createElement("div");
      status.className = "asl-video-loading";
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      status.textContent = "Loading video...";
      wrapper.appendChild(status);
    }

    return status;
  }

  function setLoadingState(state, isLoading) {
    state.playerWrap.classList.toggle("is-video-loading", Boolean(isLoading));

    if (state.selectedButton) {
      state.selectedButton.setAttribute("aria-busy", String(Boolean(isLoading)));
    }

    ensureLoadingStatus(state.playerWrap);
  }

  function getSignVideo(sign, fallbackVideo) {
    var source = sign.video || {};

    if (typeof source === "string") {
      source = /^\d+$/.test(source) ? { id: source } : { url: source };
    }

    var videoUrl = sign.videoUrl || sign.url || source.url;
    var videoId = sign.vimeoId || sign.videoId || source.vimeoId || source.videoId || source.id;
    var hash = sign.hash || source.hash;

    if (videoUrl || videoId) {
      return {
        url: videoUrl,
        id: videoId,
        hash: hash,
        title: sign.videoTitle || sign.title || sign.label || source.title,
        params: Object.assign({}, fallbackVideo && fallbackVideo.params, source.params || {})
      };
    }

    return fallbackVideo || null;
  }

  function createVimeoPlayer(iframe) {
    iframe.setAttribute("playsinline", "");
    iframe.setAttribute("webkit-playsinline", "");
    iframe.allow = "autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share";

    return new Vimeo.Player(iframe);
  }

  function setPlaybackRate(state) {
    if (!state.player || !state.playbackRate) {
      return Promise.resolve();
    }

    return state.player.setPlaybackRate(state.playbackRate).catch(function (error) {
      console.warn("NovaSign Player: Could not change playback speed.", error);
    });
  }

  function safePlay(state, requestId) {
    if (!state.player || requestId !== state.requestId) {
      return Promise.resolve();
    }

    return state.player.play().catch(function (error) {
      // Mobile autoplay policies can still reject play() even after a tap.
      // The video is loaded and visible, so leave controls available.
      console.warn("NovaSign Player: Playback was blocked by the browser.", error);
    });
  }

  function replaceIframeSource(state, videoUrl, videoTitle) {
    var oldIframe = state.iframe;
    var nextIframe = oldIframe.cloneNode(false);

    nextIframe.src = videoUrl;
    nextIframe.title = videoTitle || oldIframe.title || "NovaSign Lesson Video";
    nextIframe.className = oldIframe.className || "vimeo-player";
    nextIframe.referrerPolicy = oldIframe.referrerPolicy || "strict-origin-when-cross-origin";
    nextIframe.allowFullscreen = true;
    nextIframe.setAttribute("playsinline", "");
    nextIframe.setAttribute("webkit-playsinline", "");

    oldIframe.parentNode.replaceChild(nextIframe, oldIframe);
    state.iframe = nextIframe;
    state.player = createVimeoPlayer(nextIframe);
    state.currentVideoUrl = videoUrl;
    applyLoopSetting(state);
    bindCurrentSignSync(state);
  }

  function waitForReady(state, requestId) {
    if (!state.player || requestId !== state.requestId) {
      return Promise.resolve(false);
    }

    return state.player.ready().then(function () {
      return requestId === state.requestId;
    });
  }

  function playSelectedSign(state, sign, button) {
    var requestId = ++state.requestId;
    var video = getSignVideo(sign, state.lessonData.video);
    var videoUrl = buildVimeoUrl(video, state.loopEnabled);
    var startTime = Number(sign.time) || 0;

    state.selectedButton = button;
    updateCurrentSign(state.playerWrap, sign, button);
    setLoadingState(state, true);

    if (videoUrl && videoUrl !== state.currentVideoUrl) {
      replaceIframeSource(state, videoUrl, video && video.title);
    }

    scrollVideoIntoView(state.playerWrap);

    waitForReady(state, requestId)
      .then(function (isCurrent) {
        if (!isCurrent) return null;
        return setPlaybackRate(state);
      })
      .then(function () {
        if (!state.player || requestId !== state.requestId) return null;

        if (startTime > 0) {
          return state.player.setCurrentTime(startTime).catch(function (error) {
            console.warn("NovaSign Player: Could not seek selected video.", error);
          });
        }

        return null;
      })
      .then(function () {
        return safePlay(state, requestId);
      })
      .then(function () {
        if (requestId === state.requestId) {
          setLoadingState(state, false);
        }
      })
      .catch(function (error) {
        if (requestId === state.requestId) {
          setLoadingState(state, false);
        }

        console.warn("NovaSign Player: Could not load/play selected video.", error);
      });
  }

  function getIframe(playerWrap) {
    return (
      playerWrap.querySelector(".vimeo-player") ||
      playerWrap.querySelector("#vimeo-player") ||
      playerWrap.querySelector("iframe")
    );
  }

  function ensureIframe(playerWrap, lessonData, loopEnabled) {
    var iframe = getIframe(playerWrap);
    if (iframe) return iframe;

    var videoUrl = buildVimeoUrl(lessonData.video, loopEnabled);

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
    iframe.setAttribute("playsinline", "");
    iframe.setAttribute("webkit-playsinline", "");

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

  function buildTopUI(playerWrap, signs, state, iframe) {
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
        state.playbackRate = speed.rate;

        speedPills.querySelectorAll(".speed-btn").forEach(function (btn) {
          btn.classList.remove("active");
        });

        button.classList.add("active");
        setPlaybackRate(state);
      });

      speedPills.appendChild(button);
    });

    speedRow.appendChild(speedHeading);
    speedRow.appendChild(speedPills);
    top.appendChild(speedRow);

    var insertTarget = iframe.closest(".video-wrapper") || iframe;
    playerWrap.insertBefore(top, insertTarget);
  }

  function createSignButton(sign) {
    var button = document.createElement("button");

    button.type = "button";
    button.className = "sign-button";
    button.textContent = formatSignText(sign);
    button.setAttribute("aria-label", sign.label || sign.chip || "ASL sign");
    button.setAttribute("data-time", String(Number(sign.time) || 0));

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

  function buildChipPanel(playerWrap, signs, state) {
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

    signs.forEach(function (sign, index) {
      var button = createSignButton(sign);
      button.setAttribute("data-sign-index", String(index));
      signsWrap.appendChild(button);
    });

    signsWrap.addEventListener("click", function (event) {
      var button = event.target.closest(".sign-button");

      if (!button || !signsWrap.contains(button)) {
        return;
      }

      var sign = signs[Number(button.getAttribute("data-sign-index"))];

      if (sign) {
        playSelectedSign(state, sign, button);
      }
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

  function bindCurrentSignSync(state) {
    if (!state.signs.length || !state.player) return;

    var player = state.player;

    player.on("timeupdate", function (data) {
      if (player !== state.player || state.playerWrap.classList.contains("is-video-loading")) {
        return;
      }

      var currentTime = data.seconds || 0;
      var currentSign = getCurrentSign(state.signs, currentTime);
      var buttons = state.playerWrap.querySelectorAll(".sign-button");
      var activeButton = null;

      buttons.forEach(function (button) {
        var buttonTime = Number(button.getAttribute("data-time")) || 0;

        if (buttonTime === Number(currentSign.time || 0)) {
          activeButton = button;
        }
      });

      updateCurrentSign(state.playerWrap, currentSign, activeButton);
    });
  }

  function initPlayer(playerWrap) {
    if (
      !playerWrap ||
      playerWrap.dataset.novasignInitialized === "true" ||
      playerWrap.dataset.novasignInitializing === "true"
    ) {
      return;
    }

    playerWrap.dataset.novasignInitializing = "true";

    fetchLessonData(playerWrap).then(function (lessonData) {
      var signs = Array.isArray(lessonData.signs) ? lessonData.signs : [];

      signs.sort(function (a, b) {
        return Number(a.time || 0) - Number(b.time || 0);
      });

      var loopEnabled = getLoopEnabled(playerWrap, lessonData);
      var iframe = ensureIframe(playerWrap, lessonData, loopEnabled);

      if (!iframe) {
        playerWrap.dataset.novasignInitializing = "false";
        console.warn("NovaSign Player: No iframe found or created inside .asl-player.");
        return;
      }

      var player;

      try {
        player = createVimeoPlayer(iframe);
      } catch (error) {
        playerWrap.dataset.novasignInitializing = "false";
        console.error("NovaSign Player: Could not create Vimeo player.", error);
        return;
      }

      var state = {
        playerWrap: playerWrap,
        lessonData: lessonData,
        signs: signs,
        iframe: iframe,
        player: player,
        currentVideoUrl: iframe.getAttribute("src") || buildVimeoUrl(lessonData.video, loopEnabled),
        loopEnabled: loopEnabled,
        requestId: 0,
        selectedButton: null,
        playbackRate: 1
      };

      playerWrap.__novaSignPlayerState = state;
      playerWrap.dataset.novasignInitialized = "true";
      playerWrap.dataset.novasignInitializing = "false";
      clearExistingGeneratedUI(playerWrap);

      if (signs.length === 0) {
        playerWrap.classList.add("video-only");
      } else {
        playerWrap.classList.remove("video-only");
      }

      applyLoopSetting(state);
      buildTopUI(playerWrap, signs, state, iframe);
      if (signs.length) buildChipPanel(playerWrap, signs, state);
      bindCurrentSignSync(state);
    }).catch(function (error) {
      playerWrap.dataset.novasignInitializing = "false";
      console.error("NovaSign Player: Could not initialize player.", error);
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

  window.NovaSignInitPlayers = function (options) {
    var force = Boolean(options && options.force);

    document.querySelectorAll(".asl-player").forEach(function (playerWrap) {
      if (force) {
        playerWrap.dataset.novasignInitialized = "false";
        playerWrap.dataset.novasignInitializing = "false";
      }

      initPlayer(playerWrap);
    });
  };
})();
