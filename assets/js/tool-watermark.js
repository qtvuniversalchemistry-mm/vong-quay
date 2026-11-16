/* =========================================================
   Công cụ: Xóa watermark, logo, chữ trên ảnh
   Người dùng tô vùng cần xóa → Web Worker vẽ lại vùng đó từ các mảng ảnh xung quanh.
   ========================================================= */
(function () {
  "use strict";
  var M = window.MAINN, F = M.files;
  var $ = function (id) { return document.getElementById(id); };
  var MAX_WORK = 720; // cạnh dài tối đa của vùng xử lý (px) để chạy nhanh

  var el = {
    drop: $("drop"), editor: $("editor"), stage: $("stage"), view: $("view"),
    segTool: $("segTool"), size: $("brushSize"), sizeOut: $("brushSizeOut"),
    undo: $("btnUndo"), clearMask: $("btnClearMask"), run: $("btnRun"), runText: $("btnRunText"), compare: $("btnCompare"),
    progress: $("progress"), bar: $("progressBar"), change: $("btnChange"), fileName: $("fileName"), fileInfo: $("fileInfo"),
    download: $("btnDownload"), segFormat: $("segFormat"), hint: $("hint")
  };

  var file = null, img = null, orig = null, mask = null, mctx = null, ictx = null;
  var tool = "brush", brush = Number(M.storage.get("mainn.wm.brush", 28)), format = "same";
  var undoStack = [], busy = false, comparing = false, worker = null, edits = 0;

  /* ---------- Tải ảnh ---------- */
  function load(f) {
    F.loadImage(f).then(function (bmp) {
      var s = F.imgSize(bmp);
      file = f;
      img = document.createElement("canvas"); img.width = s.w; img.height = s.h;
      ictx = img.getContext("2d", { willReadFrequently: true });
      ictx.drawImage(bmp, 0, 0);
      orig = document.createElement("canvas"); orig.width = s.w; orig.height = s.h;
      orig.getContext("2d").drawImage(bmp, 0, 0);
      if (bmp.close) bmp.close();
      mask = document.createElement("canvas"); mask.width = s.w; mask.height = s.h;
      mctx = mask.getContext("2d", { willReadFrequently: true });
      undoStack = []; edits = 0;
      el.drop.hidden = true; el.editor.hidden = false;
      el.fileName.textContent = f.name;
      el.fileInfo.textContent = s.w + "×" + s.h + " px · " + F.formatBytes(f.size);
      layout(); paint(); state();
    }).catch(function () { M.toast("Không đọc được ảnh này. Hãy thử ảnh JPG, PNG hoặc WebP."); });
  }

  /* ---------- Hiển thị ---------- */
  var scale = 1; // pixel ảnh / pixel hiển thị (CSS)
  function layout() {
    if (!img) return;
    var maxW = el.stage.clientWidth, maxH = Math.max(320, window.innerHeight * 0.7);
    var k = Math.min(maxW / img.width, maxH / img.height, 1);
    var cw = Math.round(img.width * k), ch = Math.round(img.height * k), dpr = Math.min(window.devicePixelRatio || 1, 2);
    el.view.style.width = cw + "px"; el.view.style.height = ch + "px";
    el.view.width = Math.round(cw * dpr); el.view.height = Math.round(ch * dpr);
    scale = img.width / cw;
  }
  var overlay = document.createElement("canvas");
  function paint(preview) {
    if (!img) return;
    var c = el.view, ctx = c.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(comparing ? orig : img, 0, 0, c.width, c.height);
    if (comparing) return;
    overlay.width = c.width; overlay.height = c.height;
    var o = overlay.getContext("2d");
    o.clearRect(0, 0, c.width, c.height);
    o.drawImage(mask, 0, 0, c.width, c.height);
    o.globalCompositeOperation = "source-in";
    o.fillStyle = "rgba(255, 64, 96, 0.55)"; o.fillRect(0, 0, c.width, c.height);
    o.globalCompositeOperation = "source-over";
    ctx.drawImage(overlay, 0, 0);
    if (preview) {
      ctx.save(); ctx.strokeStyle = "#ff4060"; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
      var k = c.width / img.width;
      ctx.strokeRect(preview.x * k, preview.y * k, preview.w * k, preview.h * k); ctx.restore();
    }
  }

  /* ---------- Tô vùng ---------- */
  function toImg(e) {
    var r = el.view.getBoundingClientRect();
    return { x: (e.clientX - r.left) * scale, y: (e.clientY - r.top) * scale };
  }
  var drawing = false, last = null, rectStart = null, rectNow = null;
  function strokeTo(p) {
    mctx.save();
    mctx.globalCompositeOperation = tool === "erase" ? "destination-out" : "source-over";
    mctx.strokeStyle = mctx.fillStyle = "#fff";
    mctx.lineWidth = brush * scale; mctx.lineCap = mctx.lineJoin = "round";
    mctx.beginPath();
    if (last) { mctx.moveTo(last.x, last.y); mctx.lineTo(p.x, p.y); mctx.stroke(); }
    else { mctx.arc(p.x, p.y, brush * scale / 2, 0, Math.PI * 2); mctx.fill(); }
    mctx.restore();
    last = p;
  }
  el.view.addEventListener("pointerdown", function (e) {
    if (!img || busy) return;
    e.preventDefault();
    el.view.setPointerCapture(e.pointerId);
    drawing = true;
    var p = toImg(e);
    if (tool === "rect") { rectStart = p; rectNow = p; }
    else { last = null; strokeTo(p); paint(); }
  });
  el.view.addEventListener("pointermove", function (e) {
    if (!drawing) return;
    var p = toImg(e);
    if (tool === "rect") { rectNow = p; paint(rectBox()); }
    else { strokeTo(p); paint(); }
  });
  function rectBox() {
    return { x: Math.min(rectStart.x, rectNow.x), y: Math.min(rectStart.y, rectNow.y), w: Math.abs(rectNow.x - rectStart.x), h: Math.abs(rectNow.y - rectStart.y) };
  }
  function endDraw() {
    if (!drawing) return;
    drawing = false; last = null;
    if (tool === "rect" && rectStart) {
      var b = rectBox();
      if (b.w > 2 && b.h > 2) { mctx.fillStyle = "#fff"; mctx.fillRect(b.x, b.y, b.w, b.h); }
      rectStart = rectNow = null;
    }
    paint(); state();
  }
  el.view.addEventListener("pointerup", endDraw);
  el.view.addEventListener("pointercancel", endDraw);

  /* ---------- Xử lý ---------- */
  function maskBox() {
    var d = mctx.getImageData(0, 0, mask.width, mask.height).data, w = mask.width, h = mask.height;
    var x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (var y = 0; y < h; y++) {
      var row = y * w * 4;
      for (var x = 0; x < w; x++) if (d[row + x * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    return x1 < 0 ? null : { x0: x0, y0: y0, x1: x1, y1: y1 };
  }

  function run() {
    if (!img || busy) return;
    var b = maskBox();
    if (!b) return M.toast("Hãy tô lên vùng watermark, logo hoặc chữ cần xóa trước");
    var bw = b.x1 - b.x0 + 1, bh = b.y1 - b.y0 + 1;
    var margin = Math.round(Math.max(48, Math.max(bw, bh) * 0.75));
    var cx = Math.max(0, b.x0 - margin), cy = Math.max(0, b.y0 - margin);
    var cw = Math.min(img.width, b.x1 + margin + 1) - cx, ch = Math.min(img.height, b.y1 + margin + 1) - cy;
    var k = Math.min(1, MAX_WORK / Math.max(cw, ch));
    var ww = Math.max(8, Math.round(cw * k)), wh = Math.max(8, Math.round(ch * k));

    // Ảnh và vùng tô ở độ phân giải xử lý
    var wc = document.createElement("canvas"); wc.width = ww; wc.height = wh;
    var wctx = wc.getContext("2d", { willReadFrequently: true });
    wctx.drawImage(img, cx, cy, cw, ch, 0, 0, ww, wh);
    var rgba = wctx.getImageData(0, 0, ww, wh).data;
    var mc = document.createElement("canvas"); mc.width = ww; mc.height = wh;
    var mcx = mc.getContext("2d", { willReadFrequently: true });
    mcx.drawImage(mask, cx, cy, cw, ch, 0, 0, ww, wh);
    var md = mcx.getImageData(0, 0, ww, wh).data, m = new Uint8Array(ww * wh), i;
    for (i = 0; i < ww * wh; i++) m[i] = md[i * 4 + 3] > 10 ? 1 : 0;
    m = dilate(m, ww, wh, 2); // nới rộng để xóa cả viền mờ của chữ

    setBusy(true);
    if (!worker) worker = new Worker(M.BASE + "assets/js/inpaint-worker.js");
    worker.onmessage = function (e) {
      var d = e.data;
      if (d.progress != null) { el.bar.style.width = Math.round(d.progress * 100) + "%"; return; }
      if (d.error) { setBusy(false); return M.toast("Có lỗi khi xử lý, hãy thử tô vùng nhỏ hơn"); }
      apply(d.rgba, m, ww, wh, cx, cy, cw, ch);
      setBusy(false);
    };
    worker.onerror = function () { setBusy(false); M.toast("Trình duyệt không chạy được bộ xử lý, hãy thử Chrome hoặc Edge"); };
    worker.postMessage({ rgba: rgba, w: ww, h: wh, mask: m }, [rgba.buffer]);
  }

  function dilate(m, w, h, r) {
    var out = new Uint8Array(m.length);
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      if (!m[y * w + x]) continue;
      for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) {
        var xx = x + dx, yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < w && yy < h && dx * dx + dy * dy <= r * r) out[yy * w + xx] = 1;
      }
    }
    return out;
  }

  function apply(rgba, m, ww, wh, cx, cy, cw, ch) {
    // Lưu để hoàn tác
    undoStack.push({ x: cx, y: cy, data: ictx.getImageData(cx, cy, cw, ch) });
    if (undoStack.length > 10) undoStack.shift();

    var rc = document.createElement("canvas"); rc.width = ww; rc.height = wh;
    rc.getContext("2d").putImageData(new ImageData(rgba, ww, wh), 0, 0);
    // Mặt nạ mềm ở độ phân giải gốc, chỉ thay phần đã tô
    var ac = document.createElement("canvas"); ac.width = ww; ac.height = wh;
    var actx = ac.getContext("2d"), ad = actx.createImageData(ww, wh);
    for (var i = 0; i < m.length; i++) { ad.data[i * 4 + 3] = m[i] ? 255 : 0; }
    actx.putImageData(ad, 0, 0);
    var tc = document.createElement("canvas"); tc.width = cw; tc.height = ch;
    var t = tc.getContext("2d");
    t.imageSmoothingQuality = "high";
    t.drawImage(rc, 0, 0, cw, ch);
    t.globalCompositeOperation = "destination-in";
    var feather = Math.max(1, Math.round(cw / ww));
    if ("filter" in t) t.filter = "blur(" + feather + "px)";
    t.drawImage(ac, 0, 0, cw, ch);
    t.filter = "none";
    ictx.drawImage(tc, cx, cy);

    mctx.clearRect(0, 0, mask.width, mask.height);
    edits++;
    paint(); state();
    M.toast("Đã xóa. Còn sót thì tô lại chỗ đó và bấm xóa tiếp.");
  }

  function setBusy(on) {
    busy = on;
    el.progress.hidden = !on; el.bar.style.width = "0%";
    el.runText.textContent = on ? "Đang xử lý…" : "Xóa vùng đã tô";
    state();
  }
  function state() {
    var hasMask = !!img && !!maskBoxQuick();
    el.run.disabled = busy || !hasMask;
    el.clearMask.disabled = busy || !hasMask;
    el.undo.disabled = busy || !undoStack.length;
    el.download.disabled = busy || !img;
    el.compare.disabled = !edits;
  }
  // Kiểm tra nhanh có vùng tô hay không (lấy mẫu thưa)
  function maskBoxQuick() {
    if (!mask) return false;
    var s = document.createElement("canvas"), w = 160, h = Math.max(1, Math.round(160 * mask.height / mask.width));
    s.width = w; s.height = h;
    var c = s.getContext("2d", { willReadFrequently: true }); c.drawImage(mask, 0, 0, w, h);
    var d = c.getImageData(0, 0, w, h).data;
    for (var i = 3; i < d.length; i += 4) if (d[i] > 0) return true;
    return false;
  }

  /* ---------- Sự kiện ---------- */
  F.dropzone(el.drop, {
    accept: "image/*", multiple: false, paste: true,
    filter: function (f) { return /^image\//.test(f.type) || /\.(jpe?g|png|webp|gif|bmp|avif)$/i.test(f.name); },
    title: "Kéo thả ảnh cần xóa watermark",
    hint: "JPG, PNG, WebP… hoặc dán ảnh bằng Ctrl + V. Mỗi lần xử lý một ảnh.",
    rejectMessage: "Chỉ nhận file ảnh",
    onFiles: function (fs) { load(fs[0]); }
  });
  el.segTool.addEventListener("click", function (e) {
    var b = e.target.closest("button[data-v]"); if (!b) return;
    tool = b.getAttribute("data-v");
    Array.prototype.forEach.call(el.segTool.querySelectorAll("button"), function (x) { x.setAttribute("aria-pressed", String(x === b)); });
    el.view.dataset.tool = tool;
    el.hint.textContent = tool === "rect" ? "Kéo chuột để khoanh vùng hình chữ nhật (hợp với logo ở góc ảnh)." :
      tool === "erase" ? "Tô lên chỗ đã đánh dấu nhầm để bỏ đánh dấu." : "Tô kín watermark, logo, chữ cần xóa. Tô rộng hơn chữ một chút sẽ sạch hơn.";
  });
  el.size.value = brush; el.sizeOut.textContent = brush;
  el.size.addEventListener("input", function () { brush = Number(el.size.value); el.sizeOut.textContent = brush; M.storage.set("mainn.wm.brush", brush); });
  el.run.addEventListener("click", run);
  el.clearMask.addEventListener("click", function () { mctx.clearRect(0, 0, mask.width, mask.height); paint(); state(); });
  el.undo.addEventListener("click", function () {
    var u = undoStack.pop(); if (!u) return;
    ictx.putImageData(u.data, u.x, u.y); edits = Math.max(0, edits - 1); paint(); state();
  });
  function cmp(on) { if (el.compare.disabled) return; comparing = on; paint(); }
  el.compare.addEventListener("pointerdown", function () { cmp(true); });
  ["pointerup", "pointerleave", "pointercancel"].forEach(function (ev) { el.compare.addEventListener(ev, function () { cmp(false); }); });
  el.change.addEventListener("click", function () {
    if (busy) return;
    img = null; file = null; el.editor.hidden = true; el.drop.hidden = false;
  });
  el.segFormat.addEventListener("click", function (e) {
    var b = e.target.closest("button[data-v]"); if (!b) return;
    format = b.getAttribute("data-v");
    Array.prototype.forEach.call(el.segFormat.querySelectorAll("button"), function (x) { x.setAttribute("aria-pressed", String(x === b)); });
  });
  el.download.addEventListener("click", function () {
    if (!img) return;
    var type = format === "same" ? ({ "image/png": "image/png", "image/webp": "image/webp" }[file.type] || "image/jpeg") : format;
    var ext = { "image/png": "png", "image/webp": "webp", "image/jpeg": "jpg" }[type], out = img;
    if (type === "image/jpeg") { // JPG không có nền trong suốt
      out = document.createElement("canvas"); out.width = img.width; out.height = img.height;
      var o = out.getContext("2d"); o.fillStyle = "#fff"; o.fillRect(0, 0, out.width, out.height); o.drawImage(img, 0, 0);
    }
    F.canvasToBlob(out, type, 0.95).then(function (b) { F.download(b, F.baseName(file.name) + "-da-xoa." + ext); });
  });
  document.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !el.undo.disabled) { e.preventDefault(); el.undo.click(); }
  });
  var rt; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { layout(); paint(); }, 100); });

  M.wm = { load: load, run: run, maskCtx: function () { return mctx; }, image: function () { return img; } }; // kiểm thử
})();
