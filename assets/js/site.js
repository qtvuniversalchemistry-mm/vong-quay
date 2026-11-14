/* =========================================================
   Phần dùng chung cho mọi trang: header, footer, danh sách công cụ,
   chế độ sáng/tối, thông báo nhỏ (toast).

   THÊM CÔNG CỤ MỚI: thêm 1 dòng vào mảng TOOLS bên dưới
   (status: "live" = đang chạy, "soon" = sắp ra mắt).
   ========================================================= */
(function () {
  "use strict";

  var script = document.currentScript;
  // Đường dẫn gốc của website (hoạt động cả khi chạy trên GitHub Pages dạng /ten-repo/)
  var BASE = new URL("../../", script.src).href;

  var ICONS = {
    wheel:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2"/><path d="M12 3v7M12 14v7M3 12h7M14 12h7M5.6 5.6l5 5M13.4 13.4l5 5M18.4 5.6l-5 5M10.6 13.4l-5 5"/></svg>',
    users:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    dice:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.2" fill="currentColor"/><circle cx="16" cy="8" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="8" cy="16" r="1.2" fill="currentColor"/><circle cx="16" cy="16" r="1.2" fill="currentColor"/></svg>',
    sun:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    external:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3h7v7M10 14 21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></svg>'
  };

  var TOOLS = [
    {
      id: "vong-quay",
      name: "Vòng quay may mắn",
      nav: "Vòng quay",
      desc: "Nhập danh sách tên, quay ngẫu nhiên để chọn người trúng thưởng. Phù hợp minigame, livestream, sự kiện.",
      href: "vong-quay/",
      icon: "wheel",
      status: "live"
    },
    {
      id: "chia-nhom",
      name: "Chia nhóm ngẫu nhiên",
      desc: "Chia danh sách thành các nhóm đều nhau chỉ với một cú bấm.",
      icon: "users",
      status: "soon"
    },
    {
      id: "boc-so",
      name: "Bốc số ngẫu nhiên",
      desc: "Chọn số ngẫu nhiên trong khoảng tùy chọn, không trùng lặp.",
      icon: "dice",
      status: "soon"
    }
  ];

  /* ---------- Lưu trữ an toàn (không lỗi khi trình duyệt chặn) ---------- */
  var storage = {
    get: function (key, fallback) {
      try {
        var raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (e) {
        return fallback;
      }
    },
    set: function (key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {}
    }
  };

  /* ---------- Sáng / tối ----------
     Mặc định: giao diện sáng. Lựa chọn của người dùng được lưu trong trình duyệt
     (localStorage "mainn.theme") và tự áp dụng lại ở lần truy cập sau. */
  var HOME = BASE + "home/";
  var savedTheme = storage.get("mainn.theme", "light");
  document.documentElement.setAttribute("data-theme", savedTheme === "dark" ? "dark" : "light");

  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  /* ---------- Toast ---------- */
  function toast(message, ms) {
    var host = document.querySelector(".toast-host");
    if (!host) {
      host = document.createElement("div");
      host.className = "toast-host";
      host.setAttribute("role", "status");
      host.setAttribute("aria-live", "polite");
      document.body.appendChild(host);
    }
    var el = document.createElement("div");
    el.className = "toast";
    el.textContent = message;
    host.appendChild(el);
    setTimeout(function () {
      el.classList.add("out");
      setTimeout(function () { el.remove(); }, 300);
    }, ms || 2400);
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------- Header ---------- */
  function renderHeader() {
    var host = document.querySelector("[data-site-header]");
    if (!host) return;
    var page = document.body.getAttribute("data-page") || "home";
    var links = '<a href="' + HOME + '"' + (page === "home" ? ' aria-current="page"' : "") + ">Trang chủ</a>";
    TOOLS.forEach(function (t) {
      if (t.status !== "live") return;
      links +=
        '<a href="' + BASE + t.href + '"' + (page === t.id ? ' aria-current="page"' : "") + ">" + esc(t.nav || t.name) + "</a>";
    });

    host.className = "site-header";
    host.innerHTML =
      '<div class="container site-header__inner">' +
      '<a class="brand" href="' + HOME + '" aria-label="MAINN Media - Trang chủ công cụ">' +
      '<img class="brand__logo logo--on-light" src="' + BASE + 'assets/img/logo-mainn-media.png" alt="MAINN Media" width="371" height="96">' +
      '<img class="brand__logo logo--on-dark" src="' + BASE + 'assets/img/logo-mainn-media-light.png" alt="MAINN Media" width="371" height="96">' +
      '<span class="brand__divider"></span><span class="brand__sub">Bộ công cụ<br>miễn phí</span></a>' +
      '<nav class="nav" aria-label="Điều hướng chính">' + links + "</nav>" +
      '<div class="header-actions">' +
      '<button class="btn theme-toggle" type="button" data-theme-toggle></button>' +
      '<a class="btn btn--dark btn--sm header-cta" href="https://mainnmedia.com" target="_blank" rel="noopener">mainnmedia.com ' + ICONS.external + "</a>" +
      "</div></div>";

    var toggle = host.querySelector("[data-theme-toggle]");
    function paint() {
      var dark = currentTheme() === "dark";
      // Hiển thị giao diện sẽ chuyển sang khi bấm
      toggle.innerHTML = (dark ? ICONS.sun : ICONS.moon) + '<span class="theme-toggle__label">' + (dark ? "Sáng" : "Tối") + "</span>";
      toggle.setAttribute("aria-label", dark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối");
      toggle.title = toggle.getAttribute("aria-label");
    }
    paint();
    toggle.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      storage.set("mainn.theme", next);
      paint();
      document.dispatchEvent(new CustomEvent("mainn:themechange"));
    });
  }

  /* ---------- Footer ---------- */
  function renderFooter() {
    var host = document.querySelector("[data-site-footer]");
    if (!host) return;
    host.className = "site-footer";
    host.innerHTML =
      '<div class="site-footer__bar"></div>' +
      '<div class="container site-footer__inner">' +
      '<div class="site-footer__brand"><img src="' + BASE + 'assets/img/logo-mainn-media-light.png" alt="MAINN Media" width="371" height="96">' +
      '<div>Agency Marketing &amp; vận hành thương mại điện tử</div></div>' +
      "<div>© " + new Date().getFullYear() + ' MAINN Media · <a href="https://mainnmedia.com" target="_blank" rel="noopener">mainnmedia.com</a></div>' +
      "</div>";
  }

  /* ---------- Lưới công cụ ở trang chủ ---------- */
  function renderToolGrid() {
    var host = document.querySelector("[data-tool-grid]");
    if (!host) return;
    host.innerHTML = TOOLS.map(function (t) {
      var live = t.status === "live";
      var inner =
        '<span class="badge' + (live ? " badge--live" : "") + '">' + (live ? "Dùng ngay" : "Sắp ra mắt") + "</span>" +
        '<div class="tool-card__icon">' + (ICONS[t.icon] || ICONS.wheel) + "</div>" +
        "<h3>" + esc(t.name) + "</h3>" +
        "<p>" + esc(t.desc) + "</p>" +
        (live ? '<span class="tool-card__cta">Mở công cụ →</span>' : "");
      return live
        ? '<a class="card tool-card" href="' + BASE + t.href + '">' + inner + "</a>"
        : '<div class="card tool-card tool-card--soon" aria-disabled="true">' + inner + "</div>";
    }).join("");
  }

  window.MAINN = { BASE: BASE, HOME: HOME, TOOLS: TOOLS, ICONS: ICONS, storage: storage, toast: toast, esc: esc };

  function init() {
    renderHeader();
    renderFooter();
    renderToolGrid();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
