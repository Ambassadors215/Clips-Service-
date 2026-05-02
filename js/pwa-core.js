/* Clip Services — PWA: install prompt, welcome, splash, offline, analytics */
(function () {
  var PREF = "clip_";
  var K_DISMISS = PREF + "pwa_dismiss_until";
  var K_WELCOME = PREF + "pwa_welcome_done";
  var K_BROWSER_WELCOME_DONE = PREF + "browser_welcome_done";
  var K_SPLASH = PREF + "splash_v1";
  var K_PAGEV = PREF + "session_pv";
  var K_STANDALONE_SENT = PREF + "pwa_dau_today";
  var K_RECENT_ST = PREF + "recent_stores_v1";
  var K_RECENT_PR = PREF + "recent_products_v1";
  var K_FAV = PREF + "fav_stores_v1";
  var SW_URL = "/sw.js";

  function isStandalone() {
    return (
      (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || !!window.navigator.standalone
    );
  }

  function postPwaEvent(ev) {
    if (!ev) return;
    if (window.fetch) {
      fetch("/api/pwa-analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: ev }),
        keepalive: true,
      }).catch(function () {});
    }
  }

  function onStandaloneSessionOncePerDay() {
    if (!isStandalone()) return;
    try {
      var d = new Date().toISOString().slice(0, 10);
      if (localStorage.getItem(K_STANDALONE_SENT) === d) return;
      localStorage.setItem(K_STANDALONE_SENT, d);
    } catch (e) {
      return;
    }
    postPwaEvent("standalone_session");
  }

  function registerSW() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register(SW_URL, { scope: "/" }).catch(function () {});

    navigator.serviceWorker.addEventListener("message", function (e) {
      if (e.data && e.data.type === "CLIP_SW_VERSION") {
        /* optional: toast new version */
      }
    });
  }

  function showOfflineBar() {
    if (document.getElementById("clip-offline-bar")) return;
    var bar = document.createElement("div");
    bar.id = "clip-offline-bar";
    bar.setAttribute("role", "status");
    bar.textContent = "You're offline — showing saved content. Ordering will work again when you're back online.";
    bar.style.cssText =
      "position:fixed;top:0;left:0;right:0;z-index:100002;background:#2C1810;color:#F5F0E8;padding:10px 14px;font-size:14px;text-align:center;font-family:Inter,system-ui,sans-serif;box-shadow:0 2px 12px rgba(0,0,0,.2)";
    document.documentElement.classList.add("clip-offline");
    document.body.insertBefore(bar, document.body.firstChild);
  }

  function hideOfflineBar() {
    var b = document.getElementById("clip-offline-bar");
    if (b) b.remove();
    document.documentElement.classList.remove("clip-offline");
  }

  function wireNetwork() {
    if (typeof navigator.onLine === "undefined") return;
    function u() {
      if (navigator.onLine) {
        hideOfflineBar();
        try {
          document.dispatchEvent(new Event("clip-online"));
        } catch (e) {}
      } else {
        showOfflineBar();
        try {
          document.dispatchEvent(new Event("clip-offline"));
        } catch (e) {}
      }
    }
    window.addEventListener("online", u);
    window.addEventListener("offline", u);
    if (!navigator.onLine) u();
  }

  function dismissUntil7d() {
    var t = Date.now() + 7 * 24 * 60 * 60 * 1000;
    try {
      localStorage.setItem(K_DISMISS, String(t));
    } catch (e) {}
  }

  function isDismissed() {
    try {
      var t = parseInt(localStorage.getItem(K_DISMISS) || "0", 10);
      return t > Date.now();
    } catch (e) {
      return false;
    }
  }

  function isWelcomeOverlayVisible() {
    var w = document.getElementById("clip-pwa-welcome");
    return !!(w && !w.hidden && w.style.display !== "none");
  }

  /** Install bar only after modal dismissed / return visit — not overlapping first-time welcome */
  function canOfferInstallBanner() {
    try {
      var pv = parseInt(sessionStorage.getItem(K_PAGEV) || "0", 10) || 0;
      if (pv >= 2) return true;
      if (localStorage.getItem(K_BROWSER_WELCOME_DONE) === "1") return true;
    } catch (e) {}
    return isStandalone();
  }

  function showInstallBanner(bip) {
    if (installShown || isStandalone() || isDismissed()) return;
    if (isWelcomeOverlayVisible() || !canOfferInstallBanner()) return;
    var b = document.getElementById("clip-pwa-install");
    if (!b || !bip) return;
    installShown = true;
    b.hidden = false;
    postPwaEvent("install_prompt_shown");
    b.querySelector("[data-pwa-install]").onclick = function () {
      postPwaEvent("install_cta_click");
      try {
        bip.prompt();
        bip.userChoice.finally(function () {});
      } catch (e) {}
    };
    b.querySelector("[data-pwa-later]").onclick = function () {
      b.hidden = true;
      dismissUntil7d();
      postPwaEvent("install_dismiss_7d");
    };
  }

  var deferredBip = null;
  var installShown = false;

  /** After welcome dismissal, eligibility for bottom install banner may flip — retry once deferredBip exists. */
  function tryDeferredInstallSoon() {
    setTimeout(function () {
      try {
        if (installShown || isDismissed() || isStandalone() || !deferredBip) return;
        showInstallBanner(deferredBip);
      } catch (e) {}
    }, 500);
  }

  function wireInstall() {
    function tryShow() {
      if (installShown || isDismissed() || isStandalone() || !deferredBip) return;
      showInstallBanner(deferredBip);
    }
    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault();
      deferredBip = e;
      if (isDismissed() || isStandalone()) return;
      var p = (location.pathname || "/").replace(/\/$/, "");
      var isHome = p === "" || p === "/index.html" || p === "/";
      if (isHome) {
        setTimeout(tryShow, 15000);
      }
      try {
        if ((parseInt(sessionStorage.getItem(K_PAGEV) || "0", 10) || 0) >= 2) {
          setTimeout(tryShow, 300);
        }
        if (window.clipBasketIntent) {
          setTimeout(tryShow, 100);
        }
      } catch (err) {}
    });
    window.addEventListener("appinstalled", function () {
      try {
        localStorage.removeItem(K_DISMISS);
      } catch (e) {}
      var n = document.getElementById("clip-pwa-install");
      if (n) n.hidden = true;
      postPwaEvent("appinstalled");
    });
    try {
      var n2 = (parseInt(sessionStorage.getItem(K_PAGEV) || "0", 10) || 0) + 1;
      sessionStorage.setItem(K_PAGEV, String(n2));
      if (n2 >= 2 && deferredBip) {
        setTimeout(tryShow, 300);
      }
    } catch (e) {}
    window.addEventListener("clip-first-basket", function () {
      window.clipBasketIntent = true;
      if (deferredBip) {
        setTimeout(tryShow, 200);
      }
    });
  }

  function showSplash() {
    if (!isStandalone()) return;
    try {
      if (sessionStorage.getItem(K_SPLASH)) return;
      sessionStorage.setItem(K_SPLASH, "1");
    } catch (e) {
      return;
    }
    var s = document.createElement("div");
    s.id = "clip-splash";
    s.style.cssText =
      "position:fixed;inset:0;z-index:200000;background:#8B3A3A;display:flex;flex-direction:column;align-items:center;justify-content:center;transition:opacity .45s ease;opacity:1";
    s.innerHTML =
      '<div style="text-align:center;padding:32px;max-width:90%"><img src="/icons/clip-logo-full.svg" alt="Clip Services" style="height:64px;filter:brightness(0) invert(1);margin-bottom:20px" /><p style="font-family:Playfair Display,Georgia,serif;font-size:1.5rem;color:#fff;margin:0 0 8px">Clip Services</p><p style="color:rgba(255,255,255,.9);font-size:1.05rem;margin:0">Your community, online</p></div>';
    document.body.appendChild(s);
    setTimeout(function () {
      s.style.opacity = "0";
      setTimeout(function () {
        s.remove();
      }, 500);
    }, 1500);
  }

  function markBrowserWelcomeDone() {
    try {
      localStorage.setItem(K_BROWSER_WELCOME_DONE, "1");
    } catch (e) {}
  }

  function pickCityOptionFromPlace(citySel, detectedCity) {
    if (!citySel || !detectedCity) return false;
    var place = String(detectedCity)
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
    if (!place) return false;
    for (var i = 0; i < citySel.options.length; i++) {
      var opt = citySel.options[i];
      var val = String(opt.value || "").trim().toLowerCase();
      var label = String(opt.text || opt.textContent || "")
        .trim()
        .toLowerCase();
      if ((!val || val === "") && (!label || label.indexOf("all cities") >= 0 || label.indexOf("skip") >= 0)) continue;
      var key = val || label;
      if (!key || key.indexOf("/") >= 0) continue;
      if (place.indexOf(key) >= 0 || key.indexOf(place.split(" ")[0]) >= 0) {
        citySel.selectedIndex = i;
        return true;
      }
    }
    return false;
  }

  /** Map common UK areas returned by nominatim to a label in `#wel-city` / stores dropdown. */
  function nearestWelCityLabel(placeName) {
    var p = String(placeName || "").toLowerCase();
    if (!p) return "";
    if (/\b(greater )?manchester\b|\bsalford\b|\bstockport\b|\boldham\b|\bbolton\b|\bbury\b|\btrafford\b|\brochdale\b|\bwigan\b|\bcrewe\b|\btameside\b/.test(p))
      return "Manchester";
    if (/\blondon\b|\bwestminster\b|\bcroydon\b|\bcamden\b|\bislington\b|\btower hamlets\b|\bhackney\b|\blambeth\b|\bsouthwark\b|\blewisham\b|\bgreenwich\b|\bnewham\b|\benfield\b|\bharingey\b|\bwaltham forest\b|\bredbridge\b|\bbarking\b|\bmerton\b|\bstreatham\b|\bpeckham\b|\bealing\b|\bhounslow\b/.test(p))
      return "London";
    if (/\bbirmingham\b/.test(p) || /\bwest midlands\b/.test(p)) return "Birmingham";
    if (/\bleeds\b/.test(p)) return "Leeds";
    if (/\bleicester\b/.test(p)) return "Leicester";
    if (/\bbristol\b/.test(p)) return "Bristol";
    if (/\bliverpool\b/.test(p)) return "Liverpool";
    if (/\bsheffield\b/.test(p)) return "Sheffield";
    if (/\bnottingham\b/.test(p)) return "Nottingham";
    if (/\bbradford\b/.test(p)) return "Bradford";
    return "";
  }

  function welSelectionCityParam(citySel) {
    if (!citySel || citySel.selectedIndex < 0) return "";
    var opt = citySel.options[citySel.selectedIndex];
    var v = String(opt.value || "").trim();
    var t = String(opt.textContent || "").trim();
    var out = v || t;
    if (!out || out.toLowerCase().indexOf("all cities") >= 0 || out.toLowerCase().indexOf("skip") >= 0) return "";
    return out;
  }

  function showWelcome() {
    var w = document.getElementById("clip-pwa-welcome");
    if (!w) return;

    if (!isStandalone()) {
      try {
        if (localStorage.getItem(K_BROWSER_WELCOME_DONE) === "1") return;
      } catch (e) {
        return;
      }
    } else {
      try {
        if (localStorage.getItem(K_WELCOME) === "1") return;
      } catch (e) {
        return;
      }
      try {
        localStorage.setItem(K_WELCOME, "1");
      } catch (e) {}
    }

    w.hidden = false;

    var closeBtn = w.querySelector("[data-wel-close]");
    if (closeBtn)
      closeBtn.onclick = function () {
        w.hidden = true;
        if (!isStandalone()) markBrowserWelcomeDone();
        tryDeferredInstallSoon();
      };

    var btnGeo = w.querySelector("[data-wel-geo]");
    var citySel = w.querySelector("#wel-city");
    var st = w.querySelector("[data-wel-go]");
    var geoMsg = w.querySelector("#wel-geo-status");
    function geoStatus(t) {
      if (geoMsg) geoMsg.textContent = t || "";
    }

    /** Same as tapping “Find stores near me”: persist city, dismiss, go to filtered /stores */
    function finishWelcomeNavigate(rawCity) {
      var cityParam = String(rawCity || "").trim();
      try {
        localStorage.setItem(PREF + "user_city", cityParam);
        if (isStandalone()) localStorage.setItem(K_WELCOME, "1");
        else markBrowserWelcomeDone();
      } catch (e) {}
      w.hidden = true;
      tryDeferredInstallSoon();
      location.href = cityParam ? "/stores?city=" + encodeURIComponent(cityParam) : "/stores";
    }

    if (btnGeo) {
      btnGeo.onclick = function () {
        geoStatus("");
        if (!window.isSecureContext) {
          geoStatus("Location needs HTTPS. Try picking a city below.");
          return;
        }
        if (!navigator.geolocation) {
          geoStatus("This browser doesn't support location. Pick a city below.");
          return;
        }
        geoStatus("Getting your location…");
        btnGeo.disabled = true;
        navigator.geolocation.getCurrentPosition(
          function (pos) {
            var navigated = false;
            var lat = pos.coords.latitude;
            var lon = pos.coords.longitude;
            fetch(
              "https://nominatim.openstreetmap.org/reverse?lat=" +
                encodeURIComponent(lat) +
                "&lon=" +
                encodeURIComponent(lon) +
                "&format=jsonv2&accept-language=en",
              { headers: { "Accept-Charset": "utf-8", "Accept-Language": "en-GB,en;q=0.9" }, mode: "cors", credentials: "omit" }
            )
              .then(function (r) {
                return r.ok ? r.json() : {};
              })
              .then(function (j) {
                var a = (j && j.address) || {};
                var city =
                  a.city ||
                  a.town ||
                  a.village ||
                  a.city_district ||
                  a.borough ||
                  a.county ||
                  "";
                if (!citySel) {
                  var fallback = nearestWelCityLabel(city) || city;
                  if (fallback) {
                    geoStatus("Taking you to stores…");
                    navigated = true;
                    finishWelcomeNavigate(fallback);
                  } else geoStatus("Choose a city below, then tap Find stores.");
                  return;
                }
                var picked = city && pickCityOptionFromPlace(citySel, city);
                var suggested = nearestWelCityLabel(city);
                if (!picked && suggested) picked = pickCityOptionFromPlace(citySel, suggested);

                var forNav = "";
                if (picked) forNav = welSelectionCityParam(citySel);
                if (!forNav && suggested) forNav = suggested;
                if (!forNav && city) forNav = city;

                if (forNav) {
                  geoStatus("Taking you to stores…");
                  navigated = true;
                  finishWelcomeNavigate(forNav);
                } else if (city) geoStatus("Detected " + city + ". Pick your city below, then tap Find stores.");
                else geoStatus("Could not map coordinates to a city. Please choose below.");
              })
              .catch(function () {
                geoStatus("Could not resolve your area. Pick a city below.");
              })
              .finally(function () {
                if (!navigated) btnGeo.disabled = false;
              });
          },
          function (err) {
            btnGeo.disabled = false;
            var msg = "Could not read your location. Pick a city below.";
            try {
              if (err && err.code === err.PERMISSION_DENIED) msg = "Location access denied. Allow location for this site, or choose a city.";
              else if (err && err.code === err.POSITION_UNAVAILABLE) msg = "Position unavailable. Try again or choose a city.";
              else if (err && err.code === err.TIMEOUT) msg = "Location timed out. Try again or pick a city.";
            } catch (_e3) {}
            geoStatus(msg);
          },
          { enableHighAccuracy: false, maximumAge: 60000, timeout: 15000 }
        );
      };
    }
    if (st) {
      st.onclick = function () {
        finishWelcomeNavigate((citySel && citySel.value) || "");
      };
    }
  }

  function addRecentStore(entry) {
    if (!entry || !entry.id) return;
    try {
      var arr = JSON.parse(localStorage.getItem(K_RECENT_ST) || "[]");
      if (!Array.isArray(arr)) arr = [];
      arr = [entry].concat(
        arr.filter(function (x) {
          return !x || x.id !== entry.id;
        })
      );
      while (arr.length > 4) arr.pop();
      localStorage.setItem(K_RECENT_ST, JSON.stringify(arr));
    } catch (e) {}
  }

  function addRecentProduct(p) {
    if (!p) return;
    try {
      var arr = JSON.parse(localStorage.getItem(K_RECENT_PR) || "[]");
      if (!Array.isArray(arr)) arr = [];
      arr = [p].concat(
        arr.filter(function (x) {
          return !x || x.key !== p.key;
        })
      );
      while (arr.length > 6) arr.pop();
      localStorage.setItem(K_RECENT_PR, JSON.stringify(arr));
    } catch (e) {}
  }

  function isFav(id) {
    try {
      return JSON.parse(localStorage.getItem(K_FAV) || "[]").indexOf(String(id)) >= 0;
    } catch (e) {
      return false;
    }
  }

  function toggleFav(id) {
    try {
      var s = String(id);
      var arr = JSON.parse(localStorage.getItem(K_FAV) || "[]");
      if (!Array.isArray(arr)) arr = [];
      var i = arr.indexOf(s);
      if (i >= 0) arr.splice(i, 1);
      else arr.unshift(s);
      while (arr.length > 30) arr.pop();
      localStorage.setItem(K_FAV, JSON.stringify(arr));
    } catch (e) {}
    return isFav(id);
  }

  function prefetchStores() {
    if (!document.head) return;
    var l = document.createElement("link");
    l.rel = "prefetch";
    l.href = "/stores";
    document.head.appendChild(l);
  }

  function init() {
    registerSW();
    onStandaloneSessionOncePerDay();
    wireNetwork();
    wireInstall();
    showSplash();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () {
        setTimeout(showWelcome, 200);
        prefetchStores();
      });
    } else {
      setTimeout(showWelcome, 200);
      prefetchStores();
    }
  }

  init();

  window.ClipPwa = {
    isStandalone: isStandalone,
    postPwaEvent: postPwaEvent,
    onStandaloneSessionOncePerDay: onStandaloneSessionOncePerDay,
    addRecentStore: addRecentStore,
    addRecentProduct: addRecentProduct,
    isFav: isFav,
    toggleFav: toggleFav,
  };
})();
