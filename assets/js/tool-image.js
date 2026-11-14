/* =========================================================
   Công cụ: Chuyển đổi & nén ảnh
   ========================================================= */
(function () {
  "use strict";
  var M = window.MAINN, F = M.files;
  var MAX_FILES = 200;
  var EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
  var DL_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>';
  var X_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';

  var $ = function (id) { return document.getElementById(id); };
  var el = {
    list: $("fileList"), listHead: $("listHead"), listTitle: $("listTitle"), clearAll: $("btnClearAll"),
    segFormat: $("segFormat"), segSize: $("segSize"), quality: $("quality"), qualityOut: $("qualityOut"),
    qualityHelp: $("qualityHelp"), formatHelp: $("formatHelp"),
    summary: $("summary"), sumBefore: $("sumBefore"), sumAfter: $("sumAfter"), sumSaved: $("sumSaved"),
    zip: $("btnZip"), zipText: $("btnZipText")
  };

  var opts = M.storage.get("mainn.img.opts", { format: "same", quality: 80, maxEdge: 0 });
  var items = [], uid = 0, generation = 0, running = false;

  /* ---------- Tùy chọn ---------- */
  function bindSeg(seg, key, parse) {
    seg.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-v]");
      if (!b || b.disabled) return;
      opts[key] = parse(b.getAttribute("data-v"));
      paintOptions(); optionsChanged();
    });
  }
  function paintSeg(seg, value) {
    Array.prototype.forEach.call(seg.querySelectorAll("button"), function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-v")) === String(value));
    });
  }
  function paintOptions() {
    paintSeg(el.segFormat, opts.format);
    paintSeg(el.segSize, opts.maxEdge);
    el.quality.value = opts.quality;
    el.qualityOut.textContent = opts.quality + "%";
    var png = opts.format === "image/png";
    el.quality.disabled = png;
    el.qualityHelp.textContent = png
      ? "PNG không giảm chất lượng được. Muốn file nhẹ hơn, hãy giảm kích thước hoặc chọn WebP/JPG."
      : "70–85% giảm mạnh dung lượng mà mắt thường khó thấy khác biệt.";
  }
  var optTimer;
  function optionsChanged() {
    M.storage.set("mainn.img.opts", opts);
    clearTimeout(optTimer);
    optTimer = setTimeout(function () {
      items.forEach(function (it) { if (it.status !== "error") it.status = "pending"; });
      generation++; render(); run();
    }, 250);
  }

  /* ---------- Thêm / xóa ảnh ---------- */
  function isImage(f) {
    return /^image\//.test(f.type) || /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif|tiff?)$/i.test(f.name);
  }
  function addFiles(files) {
    var room = MAX_FILES - items.length;
    if (files.length > room) M.toast("Tối đa " + MAX_FILES + " ảnh mỗi lần, đã bỏ bớt " + (files.length - room) + " ảnh");
    files.slice(0, Math.max(0, room)).forEach(function (f) {
      items.push({ id: ++uid, file: f, status: "pending", thumb: URL.createObjectURL(f) });
    });
    render(); run();
  }
  function removeItem(id) {
    items = items.filter(function (it) {
      if (it.id === id) { URL.revokeObjectURL(it.thumb); return false; }
      return true;
    });
    render();
  }

  /* ---------- Xử lý ---------- */
  function targetType(file) {
    if (opts.format !== "same") return opts.format;
    return EXT[file.type] ? file.type : "image/jpeg";
  }

  function processOne(it) {
    var type = targetType(it.file);
    return F.loadImage(it.file).then(function (img) {
      var size = F.imgSize(img);
      var canvas = F.drawToCanvas(img, opts.maxEdge, type === "image/jpeg");
      if (img.close) img.close();
      var q = type === "image/png" ? undefined : opts.quality / 100;
      return F.canvasToBlob(canvas, type, q).then(function (blob) {
        var resized = canvas.width !== size.w || canvas.height !== size.h;
        var kept = false;
        // Ảnh gốc đã nhẹ hơn và không đổi định dạng/kích thước → giữ ảnh gốc
        if (!resized && type === it.file.type && blob.size >= it.file.size) { blob = it.file; kept = true; }
        it.result = {
          blob: blob, kept: kept,
          name: F.withExt(it.file.name, EXT[type]),
          from: size, to: { w: canvas.width, h: canvas.height }
        };
        canvas.width = canvas.height = 0;
        it.status = "done";
      });
    }).catch(function () {
      it.status = "error";
      it.error = "Không đọc được ảnh này (định dạng chưa được trình duyệt hỗ trợ).";
    });
  }

  function run() {
    if (running) return;
    running = true;
    var gen = generation;
    (function next() {
      if (gen !== generation) { running = false; return run(); }
      var it = items.filter(function (x) { return x.status === "pending"; })[0];
      if (!it) { running = false; render(); return; }
      it.status = "working"; renderRow(it);
      processOne(it).then(function () {
        if (gen !== generation && it.status === "done") it.status = "pending";
        renderRow(it); renderSummary();
        setTimeout(next, 0);
      });
    })();
  }

  /* ---------- Hiển thị ---------- */
  function rowHtml(it) {
    var meta = "", r = it.result;
    if (it.status === "working" || it.status === "pending") {
      meta = '<span><span class="spinner"></span> ' + (it.status === "working" ? "Đang xử lý…" : "Đang chờ…") + "</span>" +
        "<span>" + F.formatBytes(it.file.size) + "</span>";
    } else if (it.status === "error") {
      meta = '<span class="status-err">' + M.esc(it.error) + "</span>";
    } else {
      var worse = r.blob.size > it.file.size;
      meta = "<span>" + F.formatBytes(it.file.size) + " → <strong>" + F.formatBytes(r.blob.size) + "</strong></span>" +
        '<span class="saving' + (worse ? " is-worse" : "") + '">' + F.percentChange(it.file.size, r.blob.size) + "</span>" +
        "<span>" + r.from.w + "×" + r.from.h + (r.to.w !== r.from.w ? " → " + r.to.w + "×" + r.to.h : "") + "</span>" +
        (r.kept ? "<span>Ảnh gốc đã tối ưu, giữ nguyên</span>" : "");
    }
    var name = it.status === "done" ? r.name : it.file.name;
    return '<img class="file-row__thumb" src="' + it.thumb + '" alt="" onerror="this.replaceWith(Object.assign(document.createElement(\'span\'),{className:\'file-row__thumb\',textContent:\'' +
      M.esc((it.file.name.split(".").pop() || "").toUpperCase().slice(0, 4)) + '\'}))">' +
      '<div style="min-width:0"><div class="file-row__name" title="' + M.esc(name) + '">' + M.esc(name) + "</div>" +
      '<div class="file-row__meta">' + meta + "</div></div>" +
      '<div class="file-row__actions">' +
      (it.status === "done" ? '<button class="btn btn--sm" type="button" data-act="dl" data-id="' + it.id + '">' + DL_ICON + "Tải</button>" : "") +
      '<button class="btn btn--sm btn--ghost icon-btn" style="width:34px;height:34px" type="button" data-act="rm" data-id="' + it.id + '" aria-label="Bỏ ảnh này">' + X_ICON + "</button>" +
      "</div>";
  }
  function renderRow(it) {
    var li = el.list.querySelector('[data-row="' + it.id + '"]');
    if (li) li.innerHTML = rowHtml(it);
  }
  function render() {
    el.list.innerHTML = items.map(function (it) {
      return '<li class="file-row" data-row="' + it.id + '">' + rowHtml(it) + "</li>";
    }).join("");
    el.listHead.hidden = !items.length;
    el.listTitle.textContent = items.length + " ảnh";
    renderSummary();
  }
  function renderSummary() {
    var done = items.filter(function (it) { return it.status === "done"; });
    var busy = items.some(function (it) { return it.status === "pending" || it.status === "working"; });
    el.summary.hidden = !done.length;
    var before = 0, after = 0;
    done.forEach(function (it) { before += it.file.size; after += it.result.blob.size; });
    el.sumBefore.textContent = F.formatBytes(before);
    el.sumAfter.textContent = F.formatBytes(after);
    el.sumSaved.textContent = F.percentChange(before, after);
    el.zip.disabled = busy || !done.length;
    el.zipText.textContent = busy ? "Đang xử lý…" : done.length > 1 ? "Tải tất cả " + done.length + " ảnh (.zip)" : "Tải ảnh";
  }

  /* ---------- Sự kiện ---------- */
  F.dropzone(document.getElementById("drop"), {
    accept: "image/*,.heic,.heif", multiple: true, paste: true, filter: isImage,
    title: "Kéo thả ảnh vào đây",
    hint: "Hỗ trợ JPG, PNG, WebP, GIF, BMP… Có thể chọn nhiều ảnh hoặc dán ảnh bằng Ctrl + V.",
    rejectMessage: "Chỉ nhận file ảnh",
    onFiles: addFiles
  });

  el.list.addEventListener("click", function (e) {
    var b = e.target.closest("button[data-act]");
    if (!b) return;
    var id = Number(b.getAttribute("data-id"));
    var it = items.filter(function (x) { return x.id === id; })[0];
    if (!it) return;
    if (b.getAttribute("data-act") === "rm") removeItem(id);
    else F.download(it.result.blob, it.result.name);
  });
  el.clearAll.addEventListener("click", function () {
    items.forEach(function (it) { URL.revokeObjectURL(it.thumb); });
    items = []; generation++; render();
  });
  el.zip.addEventListener("click", function () {
    var done = items.filter(function (it) { return it.status === "done"; });
    if (!done.length) return;
    if (done.length === 1) return F.download(done[0].result.blob, done[0].result.name);
    el.zip.disabled = true; el.zipText.textContent = "Đang đóng gói…";
    F.zipFiles(done.map(function (it) { return { name: it.result.name, blob: it.result.blob }; }),
      "anh-mainn-" + new Date().toISOString().slice(0, 10) + ".zip")
      .catch(function () { M.toast("Không tạo được file .zip, hãy tải từng ảnh"); })
      .then(renderSummary);
  });

  bindSeg(el.segFormat, "format", String);
  bindSeg(el.segSize, "maxEdge", Number);
  el.quality.addEventListener("input", function () {
    opts.quality = Number(el.quality.value);
    el.qualityOut.textContent = opts.quality + "%";
    optionsChanged();
  });

  // Tắt định dạng trình duyệt không xuất được (VD: WebP trên Safari cũ)
  ["image/webp"].forEach(function (t) {
    F.supportsEncode(t).then(function (ok) {
      if (ok) return;
      var b = el.segFormat.querySelector('[data-v="' + t + '"]');
      b.disabled = true; b.title = "Trình duyệt này chưa hỗ trợ xuất " + EXT[t].toUpperCase();
      if (opts.format === t) { opts.format = "same"; paintOptions(); }
    });
  });

  paintOptions();
  render();
})();
