/* =========================================================
   Công cụ: Tạo mã QR (mã tĩnh, tạo ngay trên trình duyệt)
   Dùng thư viện qrcode-generator (MIT).
   ========================================================= */
(function () {
  "use strict";
  var M = window.MAINN, F = M.files;
  var $ = function (id) { return document.getElementById(id); };
  var qrlib = window.qrcode;
  qrlib.stringToBytes = qrlib.stringToBytesFuncs["UTF-8"]; // hỗ trợ tiếng Việt có dấu

  var FIELDS = {
    link: [["url", "Đường link", "text", "https://mainnmedia.com"]],
    text: [["text", "Nội dung", "textarea", "Nhập văn bản bất kỳ…"]],
    wifi: [["ssid", "Tên WiFi", "text", "VD: MAINN-Office"], ["pass", "Mật khẩu", "text", ""],
      ["sec", "Bảo mật", "select", [["WPA", "WPA/WPA2/WPA3"], ["WEP", "WEP"], ["nopass", "Không mật khẩu"]]], ["hidden", "Mạng ẩn", "checkbox"]],
    vcard: [["name", "Họ và tên", "text", "Nguyễn Văn A"], ["tel", "Số điện thoại", "tel", "0912 345 678"], ["email", "Email", "email", ""],
      ["org", "Công ty", "text", ""], ["title", "Chức danh", "text", ""], ["web", "Website", "text", ""], ["addr", "Địa chỉ", "text", ""]],
    email: [["to", "Gửi tới", "email", "ten@congty.vn"], ["subject", "Tiêu đề", "text", ""], ["body", "Nội dung", "textarea", ""]],
    tel: [["tel", "Số điện thoại", "tel", "0912 345 678"]],
    sms: [["tel", "Số điện thoại", "tel", "0912 345 678"], ["msg", "Tin nhắn", "textarea", ""]]
  };

  var el = {
    segType: $("segType"), fields: $("fields"), canvas: $("qrCanvas"), error: $("qrError"), info: $("qrInfo"),
    fg: $("fgColor"), bg: $("bgColor"), transparent: $("setTransparent"), segDot: $("segDot"), segEc: $("segEc"),
    segMargin: $("segMargin"), segSize: $("segSize"), logoBtn: $("btnLogo"), logoClear: $("btnLogoClear"), logoInput: $("logoInput"),
    png: $("btnPng"), svg: $("btnSvg"), copy: $("btnCopy"), contrast: $("contrastWarn")
  };

  var opts = Object.assign({ type: "link", fg: "#0a2540", bg: "#ffffff", transparent: false, dot: "square", ec: "M", margin: 2, size: 1024 },
    M.storage.get("mainn.qr.opts", {}));
  var values = {}, logo = null, current = null; // current = { qr, count, text }

  /* ---------- Biểu mẫu nhập nội dung ---------- */
  function renderFields() {
    el.fields.innerHTML = FIELDS[opts.type].map(function (f) {
      var id = "f_" + f[0], v = values[f[0]] == null ? "" : values[f[0]];
      if (f[2] === "textarea") return '<div class="field"><label for="' + id + '">' + f[1] + '</label><textarea class="input" rows="4" id="' + id + '" data-k="' + f[0] + '" placeholder="' + M.esc(f[3]) + '">' + M.esc(v) + "</textarea></div>";
      if (f[2] === "select") return '<div class="field"><label for="' + id + '">' + f[1] + '</label><select class="select" id="' + id + '" data-k="' + f[0] + '">' +
        f[3].map(function (o) { return '<option value="' + o[0] + '"' + ((v || f[3][0][0]) === o[0] ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") + "</select></div>";
      if (f[2] === "checkbox") return '<label class="switch"><span class="switch__text"><strong>' + f[1] + '</strong><span>Bật nếu WiFi không hiện tên công khai</span></span><input type="checkbox" id="' + id + '" data-k="' + f[0] + '"' + (v ? " checked" : "") + '><span class="switch__ui"></span></label>';
      return '<div class="field"><label for="' + id + '">' + f[1] + '</label><input class="input" type="' + f[2] + '" id="' + id + '" data-k="' + f[0] + '" value="' + M.esc(v) + '" placeholder="' + M.esc(f[3]) + '"></div>';
    }).join("");
  }
  el.fields.addEventListener("input", function (e) {
    var k = e.target.getAttribute("data-k"); if (!k) return;
    values[k] = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    schedule();
  });
  el.fields.addEventListener("change", function (e) {
    var k = e.target.getAttribute("data-k"); if (!k) return;
    values[k] = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    schedule();
  });

  function wifiEscape(s) { return String(s).replace(/([\\;,:"])/g, "\\$1"); }
  function vEscape(s) { return String(s).replace(/([\\;,])/g, "\\$1").replace(/\n/g, "\\n"); }
  function cleanTel(s) { return String(s || "").replace(/[^\d+]/g, ""); }

  function payload() {
    var v = values;
    switch (opts.type) {
      case "link":
        var u = (v.url || "").trim();
        if (u && !/^[a-z][a-z0-9+.-]*:/i.test(u)) u = "https://" + u;
        return u;
      case "text": return v.text || "";
      case "wifi":
        if (!v.ssid) return "";
        var sec = v.sec || "WPA";
        return "WIFI:T:" + sec + ";S:" + wifiEscape(v.ssid) + ";" + (sec !== "nopass" ? "P:" + wifiEscape(v.pass || "") + ";" : "") + (v.hidden ? "H:true;" : "") + ";";
      case "vcard":
        if (!v.name && !v.tel && !v.email) return "";
        return ["BEGIN:VCARD", "VERSION:3.0", "N:" + vEscape(v.name || "") + ";;;;", "FN:" + vEscape(v.name || ""),
          v.org ? "ORG:" + vEscape(v.org) : "", v.title ? "TITLE:" + vEscape(v.title) : "",
          v.tel ? "TEL;TYPE=CELL:" + cleanTel(v.tel) : "", v.email ? "EMAIL:" + v.email.trim() : "",
          v.web ? "URL:" + v.web.trim() : "", v.addr ? "ADR:;;" + vEscape(v.addr) + ";;;;" : "", "END:VCARD"].filter(Boolean).join("\r\n");
      case "email":
        if (!v.to) return "";
        var q = [];
        if (v.subject) q.push("subject=" + encodeURIComponent(v.subject));
        if (v.body) q.push("body=" + encodeURIComponent(v.body));
        return "mailto:" + v.to.trim() + (q.length ? "?" + q.join("&") : "");
      case "tel": return v.tel ? "tel:" + cleanTel(v.tel) : "";
      case "sms": return v.tel ? "SMSTO:" + cleanTel(v.tel) + ":" + (v.msg || "") : "";
    }
    return "";
  }

  /* ---------- Tạo ma trận QR ---------- */
  function build() {
    var text = payload();
    el.error.hidden = true;
    if (!text) { current = null; return draw(); }
    var ec = logo ? "H" : opts.ec;
    try {
      var qr = qrlib(0, ec);
      qr.addData(text, "Byte");
      qr.make();
      current = { qr: qr, count: qr.getModuleCount(), text: text, ec: ec };
    } catch (e) {
      current = null;
      el.error.hidden = false;
      el.error.textContent = "Nội dung quá dài để tạo mã QR. Hãy rút ngắn nội dung hoặc chọn mức sửa lỗi thấp hơn.";
    }
    draw();
  }
  var timer;
  function schedule() { clearTimeout(timer); timer = setTimeout(build, 120); }

  // Vị trí mẫu căn chỉnh (alignment pattern) theo chuẩn QR, phiên bản 1–40
  var ALIGN = [[], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50], [6, 30, 54], [6, 32, 58], [6, 34, 62],
    [6, 26, 46, 66], [6, 26, 48, 70], [6, 26, 50, 74], [6, 30, 54, 78], [6, 30, 56, 82], [6, 30, 58, 86], [6, 34, 62, 90], [6, 28, 50, 72, 94],
    [6, 26, 50, 74, 98], [6, 30, 54, 78, 102], [6, 28, 54, 80, 106], [6, 32, 58, 84, 110], [6, 30, 58, 86, 114], [6, 34, 62, 90, 118],
    [6, 26, 50, 74, 98, 122], [6, 30, 54, 78, 102, 126], [6, 26, 52, 78, 104, 130], [6, 30, 56, 82, 108, 134], [6, 34, 60, 86, 112, 138],
    [6, 30, 58, 86, 114, 142], [6, 34, 62, 90, 118, 146], [6, 30, 54, 78, 102, 126, 150], [6, 24, 50, 76, 102, 128, 154],
    [6, 28, 54, 80, 106, 132, 158], [6, 32, 58, 84, 110, 136, 162], [6, 26, 54, 82, 110, 138, 166], [6, 30, 58, 86, 114, 142, 170]];

  function isFinder(r, c, n) {
    return (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
  }
  function isAlign(r, c, n) {
    var pos = ALIGN[(n - 17) / 4 - 1] || [];
    for (var i = 0; i < pos.length; i++) for (var j = 0; j < pos.length; j++) {
      var pr = pos[i], pc = pos[j];
      if (isFinder(pr, pc, n)) continue;
      if (Math.abs(r - pr) <= 2 && Math.abs(c - pc) <= 2) return true;
    }
    return false;
  }
  function logoBox(n) {
    if (!logo) return null;
    var s = Math.round(n * 0.22); if ((n - s) % 2) s++;
    var a = (n - s) / 2;
    return { a: a, b: a + s };
  }

  function f(v) { return Math.round(v * 1000) / 1000; }
  function rrect(x, y, w, h, tl, tr, br, bl) {
    return "M" + f(x + tl) + " " + f(y) + "H" + f(x + w - tr) + (tr ? "A" + tr + " " + tr + " 0 0 1 " + f(x + w) + " " + f(y + tr) : "") +
      "V" + f(y + h - br) + (br ? "A" + br + " " + br + " 0 0 1 " + f(x + w - br) + " " + f(y + h) : "") +
      "H" + f(x + bl) + (bl ? "A" + bl + " " + bl + " 0 0 1 " + f(x) + " " + f(y + h - bl) : "") +
      "V" + f(y + tl) + (tl ? "A" + tl + " " + tl + " 0 0 1 " + f(x + tl) + " " + f(y) : "") + "Z";
  }

  // Toàn bộ hình mã QR thành 1 đường path (dùng chung cho PNG và SVG). Đơn vị = 1 ô, đã tính lề.
  function qrPath() {
    var n = current.count, m = opts.margin, box = logoBox(n), d = "", qr = current.qr;
    function dark(r, c) { return r >= 0 && c >= 0 && r < n && c < n && qr.isDark(r, c) && !isFinder(r, c, n) && !(box && r >= box.a && r < box.b && c >= box.a && c < box.b); }
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        if (!dark(r, c)) continue;
        var x = c + m, y = r + m;
        if (opts.dot === "square" || isAlign(r, c, n)) d += "M" + x + " " + y + "h1v1h-1z";
        else if (opts.dot === "dots") d += "M" + f(x + 0.04) + " " + f(y + 0.5) + "a0.46 0.46 0 1 0 0.92 0a0.46 0.46 0 1 0 -0.92 0z";
        else {
          // Bo góc mềm: chỉ bo những góc không nối với ô bên cạnh
          var up = dark(r - 1, c), dn = dark(r + 1, c), lf = dark(r, c - 1), rt = dark(r, c + 1), k = 0.5;
          d += rrect(x, y, 1, 1, !up && !lf ? k : 0, !up && !rt ? k : 0, !dn && !rt ? k : 0, !dn && !lf ? k : 0);
        }
      }
    }
    var ro = opts.dot === "square" ? 0 : 1.6, rm = opts.dot === "square" ? 0 : 1, ri = opts.dot === "square" ? 0 : 0.8;
    [[0, 0], [0, n - 7], [n - 7, 0]].forEach(function (p) {
      var x = p[1] + m, y = p[0] + m;
      d += rrect(x, y, 7, 7, ro, ro, ro, ro);
      // khoét lỗ (vẽ ngược chiều để dùng quy tắc even-odd)
      d += rrect(x + 1, y + 1, 5, 5, rm, rm, rm, rm);
      d += rrect(x + 2, y + 2, 3, 3, ri, ri, ri, ri);
    });
    return d;
  }

  // Vẽ lên canvas kích thước px×px
  function paintCanvas(ctx, px, transparentBg) {
    var n = current.count, m = opts.margin, total = n + 2 * m, k = px / total;
    ctx.clearRect(0, 0, px, px);
    if (!transparentBg) { ctx.fillStyle = opts.bg; ctx.fillRect(0, 0, px, px); }
    ctx.save();
    ctx.scale(k, k);
    ctx.fillStyle = opts.fg;
    ctx.fill(new Path2D(qrPath()), "evenodd");
    ctx.restore();
    var box = logoBox(n);
    if (box && logo) {
      var pad = (box.b - box.a) * k, x = (m + box.a) * k;
      if (!transparentBg) { ctx.fillStyle = opts.bg; ctx.fill(new Path2D(rrect(x, x, pad, pad, pad * 0.18, pad * 0.18, pad * 0.18, pad * 0.18))); }
      var inner = pad * 0.84, off = x + (pad - inner) / 2;
      var ratio = Math.min(inner / logo.width, inner / logo.height), w = logo.width * ratio, h = logo.height * ratio;
      ctx.drawImage(logo.img, off + (inner - w) / 2, off + (inner - h) / 2, w, h);
    }
  }

  function draw() {
    var c = el.canvas, ctx = c.getContext("2d"), px = 640;
    c.width = c.height = px;
    var has = !!current;
    [el.png, el.svg, el.copy].forEach(function (b) { b.disabled = !has; });
    if (!has) {
      ctx.fillStyle = "#eef3f8"; ctx.fillRect(0, 0, px, px);
      ctx.fillStyle = "#93a8bf"; ctx.font = "600 26px " + getComputedStyle(document.body).fontFamily;
      ctx.textAlign = "center"; ctx.fillText("Nhập nội dung để tạo mã QR", px / 2, px / 2);
      el.info.textContent = "";
      return;
    }
    paintCanvas(ctx, px, opts.transparent);
    el.info.textContent = "Mã " + current.count + "×" + current.count + " ô · mức sửa lỗi " + current.ec + (logo ? " (tự nâng lên H vì có logo)" : "") + " · " + current.text.length + " ký tự";
  }

  /* ---------- Tải về ---------- */
  function fileBase() {
    return "ma-qr-" + opts.type + "-" + new Date().toISOString().slice(0, 10);
  }
  function exportPng() {
    var c = document.createElement("canvas");
    c.width = c.height = opts.size;
    paintCanvas(c.getContext("2d"), opts.size, opts.transparent);
    return F.canvasToBlob(c, "image/png");
  }
  function exportSvg() {
    var n = current.count, m = opts.margin, total = n + 2 * m, box = logoBox(n), logoSvg = "";
    if (box && logo) {
      var sz = box.b - box.a, lx = m + box.a, inner = sz * 0.84, off = lx + (sz - inner) / 2, rr = f(sz * 0.18);
      var ratio = Math.min(inner / logo.width, inner / logo.height), w = logo.width * ratio, h = logo.height * ratio;
      logoSvg = (opts.transparent ? "" : '<path fill="' + opts.bg + '" d="' + rrect(lx, lx, sz, sz, rr, rr, rr, rr) + '"/>') +
        '<image href="' + logo.dataUrl + '" x="' + f(off + (inner - w) / 2) + '" y="' + f(off + (inner - h) / 2) + '" width="' + f(w) + '" height="' + f(h) + '"/>';
    }
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + total + " " + total + '" width="' + (total * 10) + '" height="' + (total * 10) + '"' +
      (opts.dot === "square" ? ' shape-rendering="crispEdges"' : "") + ">" +
      (opts.transparent ? "" : '<rect width="100%" height="100%" fill="' + opts.bg + '"/>') +
      '<path fill="' + opts.fg + '" fill-rule="evenodd" d="' + qrPath() + '"/>' + logoSvg + "</svg>";
    return new Blob([svg], { type: "image/svg+xml" });
  }

  el.png.addEventListener("click", function () { if (current) exportPng().then(function (b) { F.download(b, fileBase() + ".png"); }); });
  el.svg.addEventListener("click", function () { if (current) F.download(exportSvg(), fileBase() + ".svg"); });
  el.copy.addEventListener("click", function () {
    if (!current) return;
    if (!navigator.clipboard || !window.ClipboardItem) return M.toast("Trình duyệt chưa hỗ trợ sao chép ảnh, hãy dùng Tải PNG");
    navigator.clipboard.write([new ClipboardItem({ "image/png": exportPng() })])
      .then(function () { M.toast("Đã sao chép ảnh mã QR"); }, function () { M.toast("Không sao chép được, hãy dùng Tải PNG"); });
  });

  /* ---------- Giao diện ---------- */
  function paintSeg(seg, v) {
    Array.prototype.forEach.call(seg.querySelectorAll("button"), function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-v")) === String(v)); });
  }
  function luminance(hex) {
    var v = parseInt(hex.slice(1), 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255].map(function (c) { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); })
      .reduce(function (s, c, i) { return s + c * [0.2126, 0.7152, 0.0722][i]; }, 0);
  }
  function paintOpts() {
    paintSeg(el.segType, opts.type); paintSeg(el.segDot, opts.dot); paintSeg(el.segEc, logo ? "H" : opts.ec);
    paintSeg(el.segMargin, opts.margin); paintSeg(el.segSize, opts.size);
    el.fg.value = opts.fg; el.bg.value = opts.bg; el.transparent.checked = opts.transparent;
    el.bg.disabled = opts.transparent;
    Array.prototype.forEach.call(el.segEc.querySelectorAll("button"), function (b) { b.disabled = !!logo; });
    el.logoClear.hidden = !logo;
    var lf = luminance(opts.fg), lb = opts.transparent ? 1 : luminance(opts.bg);
    var ratio = (Math.max(lf, lb) + 0.05) / (Math.min(lf, lb) + 0.05);
    el.contrast.hidden = !(lf > lb || ratio < 3);
  }
  function optsChanged() { M.storage.set("mainn.qr.opts", opts); paintOpts(); build(); }

  el.segType.addEventListener("click", function (e) {
    var b = e.target.closest("button[data-v]"); if (!b) return;
    opts.type = b.getAttribute("data-v"); values = {}; renderFields(); optsChanged();
  });
  [[el.segDot, "dot", String], [el.segEc, "ec", String], [el.segMargin, "margin", Number], [el.segSize, "size", Number]].forEach(function (c) {
    c[0].addEventListener("click", function (e) {
      var b = e.target.closest("button[data-v]"); if (!b || b.disabled) return;
      opts[c[1]] = c[2](b.getAttribute("data-v")); optsChanged();
    });
  });
  el.fg.addEventListener("input", function () { opts.fg = el.fg.value; optsChanged(); });
  el.bg.addEventListener("input", function () { opts.bg = el.bg.value; optsChanged(); });
  el.transparent.addEventListener("change", function () { opts.transparent = el.transparent.checked; optsChanged(); });

  el.logoBtn.addEventListener("click", function () { el.logoInput.click(); });
  el.logoInput.addEventListener("change", function () {
    var f = el.logoInput.files && el.logoInput.files[0];
    el.logoInput.value = "";
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        logo = { img: img, width: img.naturalWidth || 100, height: img.naturalHeight || 100, dataUrl: reader.result };
        paintOpts(); build();
        M.toast("Đã chèn logo, mức sửa lỗi tự nâng lên H (30%)");
      };
      img.onerror = function () { M.toast("Không đọc được ảnh logo"); };
      img.src = reader.result;
    };
    reader.readAsDataURL(f);
  });
  el.logoClear.addEventListener("click", function () { logo = null; paintOpts(); build(); });

  // Nhận link từ công cụ khác, VD: ../tao-ma-qr/?url=https://...
  var preset = new URLSearchParams(location.search).get("url");
  if (preset) { opts.type = "link"; values.url = preset; }

  renderFields();
  paintOpts();
  build();
  M.qr = { payload: payload, values: values, opts: opts }; // cho kiểm thử tự động
})();
