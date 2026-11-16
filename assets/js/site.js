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
    image:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-4.5-4.5L6 21"/></svg>',
    pdf:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h2.5a1.5 1.5 0 0 1 0 3H8v-5M14 16v-5h1.5a2.5 2.5 0 0 1 0 5z"/></svg>',
    video:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="15" height="14" rx="2"/><path d="m17 10 5-3v10l-5-3"/></svg>',
    doc:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>',
    shield:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>',
    chevron:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    qr:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/></svg>',
    link:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>',
    menu:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
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
      short: "Chọn ngẫu nhiên, minigame",
      name: "Vòng quay may mắn",
      nav: "Vòng quay",
      desc: "Nhập danh sách tên, quay ngẫu nhiên để chọn người trúng thưởng. Phù hợp minigame, livestream, sự kiện.",
      href: "vong-quay/",
      icon: "wheel",
      status: "live"
    },
    {
      id: "chuyen-doi-anh",
      short: "JPG, PNG, WebP, giảm dung lượng",
      name: "Chuyển đổi & nén ảnh",
      nav: "Nén ảnh",
      desc: "Đổi định dạng JPG, PNG, WebP và giảm dung lượng ảnh hàng loạt, tải về từng ảnh hoặc file .zip.",
      href: "chuyen-doi-anh/",
      icon: "image",
      status: "live"
    },
    {
      id: "anh-sang-pdf",
      short: "Ghép nhiều ảnh thành PDF",
      name: "Ảnh sang PDF",
      nav: "Ảnh → PDF",
      desc: "Ghép nhiều ảnh thành một file PDF, sắp xếp thứ tự trang, chọn khổ giấy A4 và lề.",
      href: "anh-sang-pdf/",
      icon: "pdf",
      status: "live"
    },
    {
      id: "chuyen-doi-video",
      short: "Nén, đổi MP4, WebM, MOV",
      name: "Chuyển đổi & nén video",
      nav: "Video",
      desc: "Giảm dung lượng video, đổi sang MP4, WebM, MOV, hạ độ phân giải — xử lý ngay trên trình duyệt.",
      href: "chuyen-doi-video/",
      icon: "video",
      status: "live"
    },
    {
      id: "xoa-nhan-ai",
      short: "Gỡ C2PA, \"Made with AI\", GPS",
      name: "Xóa nhãn AI khỏi ảnh",
      nav: "Xóa nhãn AI",
      desc: "Xóa nhãn “AI info”, “Made with AI” (C2PA, XMP) và thông tin ẩn EXIF, GPS trong ảnh, giữ nguyên chất lượng.",
      href: "xoa-nhan-ai/",
      icon: "shield",
      status: "live"
    },
    {
      id: "tao-ma-qr",
      short: "Link, WiFi, danh thiếp, có logo",
      name: "Tạo mã QR",
      desc: "Tạo mã QR cho link, WiFi, danh thiếp, email, điện thoại; chỉnh màu, chèn logo, tải PNG hoặc SVG.",
      href: "tao-ma-qr/",
      icon: "qr",
      status: "live"
    },
    {
      id: "tao-link-utm",
      short: "Gắn UTM, tạo link seeding hàng loạt",
      name: "Tạo link UTM",
      desc: "Gắn UTM để đo hiệu quả từng kênh trong Google Analytics, tạo link riêng cho từng group seeding, xuất CSV.",
      href: "tao-link-utm/",
      icon: "link",
      status: "live"
    },
    {
      id: "word-sang-pdf",
      name: "Word sang PDF",
      desc: "Chuyển file Word (.docx) sang PDF.",
      icon: "doc",
      status: "soon"
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
    var live = TOOLS.filter(function (t) { return t.status === "live"; });
    var onTool = live.some(function (t) { return t.id === page; });
    var menuItems = live.map(function (t) {
      return '<a class="tools-menu__item" href="' + BASE + t.href + '"' + (page === t.id ? ' aria-current="page"' : "") + ">" +
        '<span class="tools-menu__icon">' + (ICONS[t.icon] || ICONS.wheel) + "</span>" +
        '<span><strong>' + esc(t.name) + "</strong><small>" + esc(t.short || t.desc) + "</small></span></a>";
    }).join("");

    host.className = "site-header";
    host.innerHTML =
      '<div class="container site-header__inner">' +
      '<a class="brand" href="' + HOME + '" aria-label="MAINN Media - Trang chủ công cụ">' +
      '<img class="brand__logo" src="' + BASE + 'assets/img/logo-mainn-media.png" alt="MAINN Media" width="371" height="96">' +
      '<span class="brand__divider"></span><span class="brand__sub">Bộ công cụ<br>miễn phí</span></a>' +
      '<nav class="nav" aria-label="Điều hướng chính">' +
      '<a class="nav__home" href="' + HOME + '"' + (page === "home" ? ' aria-current="page"' : "") + ">Trang chủ</a>" +
      '<button class="nav__tools" type="button" data-menu-toggle aria-expanded="false" aria-controls="toolsMenu"' + (onTool ? ' data-active="true"' : "") + ">" +
      "Công cụ " + ICONS.chevron + "</button>" +
      "</nav>" +
      '<div class="header-actions">' +
      '<button class="btn icon-btn theme-toggle" type="button" data-theme-toggle></button>' +
      '<a class="btn btn--dark btn--sm header-cta" href="https://mainnmedia.com" target="_blank" rel="noopener">mainnmedia.com ' + ICONS.external + "</a>" +
      "</div></div>" +
      '<div class="tools-menu" id="toolsMenu" hidden><div class="container"><div class="tools-menu__grid">' + menuItems + "</div></div></div>";

    var menuBtn = host.querySelector("[data-menu-toggle]"), menu = host.querySelector("#toolsMenu");
    function setMenu(open) {
      menu.hidden = !open;
      menuBtn.setAttribute("aria-expanded", String(open));
    }
    menuBtn.addEventListener("click", function () { setMenu(menu.hidden); });
    document.addEventListener("click", function (e) { if (!menu.hidden && !host.contains(e.target)) setMenu(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !menu.hidden) { setMenu(false); menuBtn.focus(); } });

    var toggle = host.querySelector("[data-theme-toggle]");
    function paint() {
      var dark = currentTheme() === "dark";
      // Hiển thị giao diện sẽ chuyển sang khi bấm
      toggle.innerHTML = dark ? ICONS.sun : ICONS.moon;
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
      '<div class="site-footer__brand"><img src="' + BASE + 'assets/img/logo-mainn-media.png" alt="MAINN Media" width="371" height="96">' +
      '<div>Chuyên gia marketing đồng hành cùng doanh nghiệp trên Facebook, TikTok, Shopee</div></div>' +
      "<div>© " + new Date().getFullYear() + ' MAINN Media · <a href="https://mainnmedia.com" target="_blank" rel="noopener">mainnmedia.com</a></div>' +
      "</div>" +
      '<div class="container site-footer__tools"><span>Công cụ miễn phí:</span>' +
      TOOLS.filter(function (t) { return t.status === "live"; }).map(function (t) {
        return '<a href="' + BASE + t.href + '">' + esc(t.name) + "</a>";
      }).join("") + "</div>";
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

  /* ---------- Dữ liệu có cấu trúc FAQ cho Google (tự lấy từ phần "Câu hỏi thường gặp") ---------- */
  function renderFaqSchema() {
    var items = document.querySelectorAll(".faq details");
    if (!items.length) return;
    var data = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: Array.prototype.map.call(items, function (d) {
        var q = d.querySelector("summary"), a = d.querySelector("p");
        return { "@type": "Question", name: q.textContent.trim(), acceptedAnswer: { "@type": "Answer", text: a ? a.textContent.trim() : "" } };
      })
    };
    var s = document.createElement("script");
    s.type = "application/ld+json";
    s.textContent = JSON.stringify(data);
    document.head.appendChild(s);
  }

  function init() {
    renderHeader();
    renderFooter();
    renderToolGrid();
    renderFaqSchema();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
