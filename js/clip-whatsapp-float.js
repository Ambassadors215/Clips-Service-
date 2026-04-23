/* Floating WhatsApp — clipservice.app (all marketplace pages with pwa-core) */
(function () {
  var PH = "447487588706";

  function readCtx() {
    var c = window.__CLIP_CHAT_CTX || {};
    if (c.page === "store" && c.storeName) {
      return {
        text: "Hi, I'm interested in\nordering from " + String(c.storeName).replace(/\s+/g, " ").trim(),
        label: "page_store",
      };
    }
    return { text: null, label: "page_default" };
  }

  function track(label) {
    if (!window.fetch) return;
    try {
      fetch("/api/pwa-analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "float_whatsapp_click" }),
        keepalive: true,
      }).catch(function () {});
    } catch (e) {}
  }

  function init() {
    if (document.getElementById("clip-wa-float")) return;
    var path = location.pathname || "/";
    var u = new URLSearchParams(location.search);
    if (u.get("src") === "wa" && sessionStorage) {
      try {
        sessionStorage.setItem("clipOrderSource", "wa");
      } catch (e) {}
    }

    var pre;
    if (path === "/" || path === "/clip-services-marketplace" || path === "/clip-services-marketplace/") {
      pre = "Hi, I need help with\nClip Services";
    } else if (path.indexOf("/stores/") === 0 && path.split("/").length > 2) {
      var x = readCtx();
      if (x.text) pre = x.text;
      else
        pre =
          "Hi, I'm interested in\nordering from a store I saw on Clip";
    } else if (path.indexOf("/customer/orders") === 0) {
      pre = "Hi, I need help with\nmy Clip Services order";
      var ref = u.get("ref");
      if (ref) {
        pre = "Hi, I need help with\norder #" + ref;
      } else {
        var first = window.__CLIP_FIRST_ORDER_REF;
        if (first) pre = "Hi, I need help with\norder #" + first;
      }
    } else {
      pre = "Hi, I need help with\nmy Clip Services order";
    }

    var a = document.createElement("a");
    a.id = "clip-wa-float";
    a.href = "https://wa.me/" + PH + "?text=" + encodeURIComponent(pre);
    a.target = "_blank";
    a.rel = "noopener";
    a.setAttribute("aria-label", "Chat with us on WhatsApp");
    a.innerHTML =
      '<span class="clip-wa-ico" aria-hidden="true"></span><span class="clip-wa-txt">Chat with us <span class="wchat-emoji" aria-hidden="true">&#128172;</span></span>';
    a.addEventListener("click", function () {
      track(path);
    });

    if (!document.getElementById("clip-wa-float-style")) {
      var st = document.createElement("style");
      st.id = "clip-wa-float-style";
      st.textContent =
        "#clip-wa-float{position:fixed;z-index:99998;right:16px;bottom:16px;display:inline-flex;align-items:center;gap:10px;padding:12px 16px 12px 14px;border-radius:999px;background:linear-gradient(180deg,#25D366 0%,#1ebe57 100%);color:#fff;font-size:15px;font-weight:700;font-family:Inter,system-ui,sans-serif;text-decoration:none;box-shadow:0 6px 24px rgba(18,120,50,.4);line-height:1.25;max-width:min(100vw - 32px,280px)}" +
        "#clip-wa-float:hover{filter:brightness(1.05)}" +
        "#clip-wa-float:focus-visible{outline:3px solid #D4A017;outline-offset:2px}" +
        ".clip-wa-ico{flex:0 0 28px;width:28px;height:28px;background:#fff center/18px 18px no-repeat url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cpath fill='%2325D366' d='M19.11 18.4c-.3-.12-1.75-.86-2-.96-.25-.1-.44-.12-.6.1-.2.3-.7.95-.86 1.16-.16.2-.3.2-.6.07a8.6 8.6 0 0 1-2.5-1.6 8.1 8.1 0 0 1-1.6-2.1c-.18-.3.02-.4.2-.5l.5-.5c.15-.2.2-.3.3-.5.1-.2.1-.3 0-.4l-.6-1.3c-.2-.3-.3-.2-.4-.2h-.5a1 1 0 0 0-.8.2 2.5 2.5 0 0 0-.6 1.1c-.2.4-.2.8 0 1.2.4.9.9 1.7 1.6 2.5A15 15 0 0 0 20 25.5c.6.2.9.2 1.2.1.4-.2.8-.3 1-.6.1-.1.1-.1.1-.1l.1-.1c.2-.3.2-1.2 0-1.6'/%3E%3C/svg%3E\");border-radius:8px}" +
        ".clip-wa-txt{white-space:pre-line}@media(max-width:420px){#clip-wa-float{font-size:14px;padding:10px 12px;right:10px;bottom:10px}}";
      document.head.appendChild(st);
    }
    document.body.appendChild(a);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
