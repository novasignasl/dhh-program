//test20
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
        console.error("NovaSign Player: Could not load lesson JSON.", error);
        return { signs: [] };
      });

    return masterLessonPromise[jsonUrl];
  }

  function buildVimeoUrl(video) {
    if (video && video.url) {
      return video.url;
    }

    if (!video || !video.id) {
