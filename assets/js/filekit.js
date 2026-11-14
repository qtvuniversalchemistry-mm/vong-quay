/* =========================================================
   Bộ hàm dùng chung cho các công cụ xử lý file (ảnh, PDF, video).
   Mọi xử lý diễn ra ngay trong trình duyệt — file KHÔNG được tải lên máy chủ.
   ========================================================= */
(function () {
  "use strict";
  var M = window.MAINN;

  function formatBytes(n) {
    if (n == null || isNaN(n)) return "—";
    if (n < 1024) return n + " B";
    var u = ["KB", "MB", "GB"], i = -1;
    do { n /= 1024; i++; } while (n >= 1024 && i < u.length - 1);
    return (n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(2)).replace(".", ",") + " " + u[i];
  }

  function formatDuration(sec) {
    if (!isFinite(sec)) return "—";
    sec = Math.max(0, Math.round(sec));
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    function p(x) { return (x < 10 ? "0" : "") + x; }
    return (h ? h + ":" + p(m) : m) + ":" + p(s);
  }

  function percentChange(before, after) {
    if (!before) return "";
    var pct = Math.round((1 - after / before) * 100);
    if (pct > 0) return "−" + pct + "%";
    if (pct < 0) return "+" + Math.abs(pct) + "%";
    return "0%";
  }

  function baseName(name) { return String(name).replace(/\.[^./\\]+$/, ""); }
  function withExt(name, ext) { return baseName(name) + "." + ext; }

  function download(blob, filename) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }

  var scriptCache = {};
  function loadScript(src) {
    if (!scriptCache[src]) {
      scriptCache[src] = new Promise(function (resolve, reject) {
        var s = document.createElement("script");
        s.src = src; s.onload = resolve;
        s.onerror = function () { delete scriptCache[src]; reject(new Error("Không tải được thư viện: " + src)); };
        document.head.appendChild(s);
      });
    }
    return scriptCache[src];
  }
  function vendor(file) { return M.BASE + "assets/vendor/" + file; }

  /* ---------- Ảnh ---------- */
  // Đọc ảnh (tự xoay đúng chiều theo EXIF nếu trình duyệt hỗ trợ)
  function loadImage(file) {
    if (window.createImageBitmap) {
      return createImageBitmap(file, { imageOrientation: "from-image" }).catch(function () { return loadImageEl(file); });
    }
    return loadImageEl(file);
  }
  function loadImageEl(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () { resolve(img); setTimeout(function () { URL.revokeObjectURL(url); }, 1000); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("decode")); };
      img.src = url;
    });
  }
  function imgSize(img) {
    return { w: img.naturalWidth || img.width, h: img.naturalHeight || img.height };
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (b) { b ? resolve(b) : reject(new Error("encode")); }, type, quality);
    });
  }

  // Vẽ ảnh lên canvas, có thể thu nhỏ theo cạnh dài; nền trắng nếu cần (JPG không có nền trong suốt)
  function drawToCanvas(img, maxEdge, whiteBg) {
    var s = imgSize(img), scale = 1;
    if (maxEdge && Math.max(s.w, s.h) > maxEdge) scale = maxEdge / Math.max(s.w, s.h);
    var w = Math.max(1, Math.round(s.w * scale)), h = Math.max(1, Math.round(s.h * scale));
    var c = document.createElement("canvas");
    c.width = w; c.height = h;
    var ctx = c.getContext("2d");
    if (whiteBg) { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h); }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, w, h);
    return c;
  }

  var encodeSupport = {};
  function supportsEncode(type) {
    if (!(type in encodeSupport)) {
      var c = document.createElement("canvas"); c.width = c.height = 2;
      encodeSupport[type] = new Promise(function (resolve) {
        try { c.toBlob(function (b) { resolve(!!b && b.type === type); }, type); } catch (e) { resolve(false); }
      });
    }
    return encodeSupport[type];
  }

  /* ---------- Nén nhiều file thành .zip ---------- */
  function zipFiles(entries, zipName) {
    return loadScript(vendor("fflate.min.js")).then(function () {
      var used = {}, data = {};
      return Promise.all(entries.map(function (e) {
        return e.blob.arrayBuffer().then(function (buf) {
          var name = e.name, base = baseName(name), ext = name.slice(base.length), n = 1;
          while (used[name.toLowerCase()]) name = base + " (" + (n++) + ")" + ext;
          used[name.toLowerCase()] = 1;
          data[name] = [new Uint8Array(buf), { level: 0 }]; // file đã nén sẵn, chỉ đóng gói
        });
      })).then(function () {
        var out = window.fflate.zipSync(data);
        download(new Blob([out], { type: "application/zip" }), zipName);
      });
    });
  }

  /* ---------- Vùng kéo thả file ---------- */
  var UPLOAD_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/></svg>';

  function dropzone(host, opts) {
    var input = document.createElement("input");
    input.type = "file"; input.hidden = true;
    if (opts.accept) input.accept = opts.accept;
    if (opts.multiple) input.multiple = true;

    host.classList.add("dropzone");
    host.setAttribute("tabindex", "0");
    host.setAttribute("role", "button");
    host.innerHTML =
      '<div class="dropzone__icon">' + UPLOAD_ICON + "</div>" +
      '<div class="dropzone__title">' + M.esc(opts.title || "Kéo thả file vào đây") + "</div>" +
      '<div class="dropzone__hint">' + M.esc(opts.hint || "") + "</div>" +
      '<span class="btn btn--primary btn--sm dropzone__btn">Chọn file</span>';
    host.appendChild(input);

    function accept(list) {
      var files = Array.prototype.slice.call(list || []);
      if (opts.filter) files = files.filter(opts.filter);
      if (!files.length) { if (list && list.length) M.toast(opts.rejectMessage || "File không đúng định dạng"); return; }
      if (!opts.multiple) files = files.slice(0, 1);
      opts.onFiles(files);
    }

    host.addEventListener("click", function (e) { if (e.target !== input) input.click(); });
    host.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } });
    input.addEventListener("change", function () { accept(input.files); input.value = ""; });

    var depth = 0;
    host.addEventListener("dragenter", function (e) { e.preventDefault(); depth++; host.classList.add("is-over"); });
    host.addEventListener("dragover", function (e) { e.preventDefault(); });
    host.addEventListener("dragleave", function () { if (--depth <= 0) { depth = 0; host.classList.remove("is-over"); } });
    host.addEventListener("drop", function (e) {
      e.preventDefault(); depth = 0; host.classList.remove("is-over");
      accept(e.dataTransfer && e.dataTransfer.files);
    });

    // Dán ảnh bằng Ctrl+V
    if (opts.paste) {
      document.addEventListener("paste", function (e) {
        var items = (e.clipboardData && e.clipboardData.files) || [];
        if (items.length) accept(items);
      });
    }
    return { open: function () { input.click(); } };
  }

  // Ngăn trình duyệt mở file khi thả ra ngoài vùng kéo thả
  ["dragover", "drop"].forEach(function (ev) {
    window.addEventListener(ev, function (e) {
      if (!e.target.closest || !e.target.closest(".dropzone")) e.preventDefault();
    });
  });

  M.files = {
    formatBytes: formatBytes, formatDuration: formatDuration, percentChange: percentChange,
    baseName: baseName, withExt: withExt, download: download, loadScript: loadScript, vendor: vendor,
    loadImage: loadImage, imgSize: imgSize, canvasToBlob: canvasToBlob, drawToCanvas: drawToCanvas,
    supportsEncode: supportsEncode, zipFiles: zipFiles, dropzone: dropzone
  };
})();
