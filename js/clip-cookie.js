/**
 * Clip Services — minimal UK GDPR cookie banner.
 * Shows on first visit, hides after Accept. Stored in localStorage.clipCookieAccepted.
 */
(function () {
  try {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    if (window.__clipCookieBannerInited) return;
    window.__clipCookieBannerInited = true;

    function init() {
      try {
        if (localStorage.getItem("clipCookieAccepted") === "true") return;
      } catch (_e) {
        return;
      }

      var banner = document.createElement("div");
      banner.id = "clip-cookie-banner";
      banner.style.cssText =
        "position:fixed;bottom:0;left:0;right:0;z-index:9998;background:#07101F;color:#EEF3FF;padding:18px 22px;border-top:2px solid #00C8F0;box-shadow:0 -8px 24px rgba(0,0,0,.25);font-family:Inter,system-ui,sans-serif;font-size:14px;line-height:1.55;";

      banner.innerHTML =
        '<div style="max-width:980px;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:14px;">' +
        '<p style="margin:0;flex:1 1 320px;color:#EEF3FF;">' +
        "We use only essential cookies needed to run Clip Services. We do not track you with marketing or analytics cookies. Read our " +
        '<a href="/privacy-policy" style="color:#00C8F0;text-decoration:underline;">Privacy Policy</a> for details.' +
        "</p>" +
        '<div style="display:flex;gap:10px;flex:0 0 auto;">' +
        '<button type="button" id="clip-cookie-prefs" style="background:transparent;color:#EEF3FF;border:1px solid #3A5080;padding:10px 16px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;">Manage preferences</button>' +
        '<button type="button" id="clip-cookie-accept" style="background:#00C8F0;color:#07101F;border:none;padding:10px 18px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;">Accept</button>' +
        "</div>" +
        "</div>";

      document.body.appendChild(banner);

      var accept = banner.querySelector("#clip-cookie-accept");
      if (accept) {
        accept.addEventListener("click", function () {
          try { localStorage.setItem("clipCookieAccepted", "true"); } catch (_e) {}
          banner.remove();
        });
      }
      var prefs = banner.querySelector("#clip-cookie-prefs");
      if (prefs) {
        prefs.addEventListener("click", function () {
          alert(
            "Only essential cookies are used. No preferences to manage.\n\n" +
              "Clip Services does not run marketing or analytics cookies. If we add them in future, this banner will return with toggles."
          );
        });
      }
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  } catch (_e) {}
})();
