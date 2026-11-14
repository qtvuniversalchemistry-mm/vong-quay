/* =========================================================
   Công cụ: Ảnh sang PDF (dùng thư viện pdf-lib, chạy trong trình duyệt)
   ========================================================= */
(function () {
  "use strict";
  var M = window.MAINN, F = M.files;
  var MAX_FILES = 300;
  var MM = 72 / 25.4; // 1 mm = 2.8346 pt
  var PAGES = { a4: [595.28, 841.89], letter: [612, 792] };
  var QUALITY = {
    original: { help: "Giữ nguyên ảnh gốc, nét nhất nhưng file PDF nặng nhất." },
    high: { maxEdge: 2480, q: 0.9, help: "Ảnh rõ nét khi in A4 (khoảng 300 dpi)." },
    medium: { maxEdge: 1754, q: 0.8, help: "Đủ nét để đọc trên màn hình và in thông thường, file nhẹ hơn nhiều." },
    low: { maxEdge: 1240, q: 0.65, help: "File nhẹ nhất, phù hợp gửi qua Zalo, email." }
  };

  var $ = function (id) { return document.getElementById(id); };
  var el = {
    thumbs: $("thumbs"), listHead: $("listHead"), listTitle: $("listTitle"), orderHelp: $("orderHelp"),
    sortName: $("btnSortName"), clearAll: $("btnClearAll"),
    segPage: $("segPage"), segOrient: $("segOrient"), fieldOrient: $("fieldOrient"), segMargin: $("segMargin"),
    segQuality: $("segQuality"), qualityHelp: $("qualityHelp"), name: $("pdfName"),
    progress: $("progress"), bar: $("progressBar"), make: $("btnMake"), makeText: $("btnMakeText"), resultInfo: $("resultInfo")
  };

  var opts = M.storage.get("mainn.pdf.opts", { page: "a4", orient: "auto", margin: 10, quality: "high" });
  var items = [], uid = 0, busy = false;

  /* ---------- Tùy chọn ---------- */
  function paintSeg(seg, value) {
    Array.prototype.forEach.call(seg.querySelectorAll("button"), function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-v")) === String(value));
    });
  }
  function paintOptions() {
    paintSeg(el.segPage, opts.page); paintSeg(el.segOrient, opts.orient);
    paintSeg(el.segMargin, opts.margin); paintSeg(el.segQuality, opts.quality);
    el.fieldOrient.hidden = opts.page === "fit";
    el.qualityHelp.textContent = QUALITY[opts.quality].help;
  }
  [["segPage", "page", String], ["segOrient", "orient", String], ["segMargin", "margin", Number], ["segQuality", "quality", String]]
    .forEach(function (c) {
      el[c[0]].addEventListener("click", function (e) {
        var b = e.target.closest("button[data-v]");
        if (!b) return;
        opts[c[1]] = c[2](b.getAttribute("data-v"));
        M.storage.set("mainn.pdf.opts", opts);
        paintOptions();
        el.resultInfo.hidden = true;
      });
    });

  /* ---------- Danh sách ảnh ---------- */
  function isImage(f) { return /^image\//.test(f.type) || /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif)$/i.test(f.name); }

  function addFiles(files) {
    var room = MAX_FILES - items.length;
    if (files.length > room) M.toast("Tối đa " + MAX_FILES + " ảnh, đã bỏ bớt " + (files.length - room) + " ảnh");
    files.slice(0, Math.max(0, room)).forEach(function (f) {
      items.push({ id: ++uid, file: f, thumb: URL.createObjectURL(f) });
    });
    if (!el.name.value && items.length) el.name.placeholder = F.baseName(items[0].file.name);
    render();
  }

  function move(id, delta) {
    var i = items.findIndex(function (x) { return x.id === id; }), j = i + delta;
    if (i < 0 || j < 0 || j >= items.length) return;
    var t = items[i]; items[i] = items[j]; items[j] = t;
    render();
  }

  function render() {
    el.thumbs.innerHTML = items.map(function (it, i) {
      return '<li class="thumb-card" draggable="true" data-id="' + it.id + '">' +
        '<span class="thumb-card__no">' + (i + 1) + "</span>" +
        '<img src="' + it.thumb + '" alt="Trang ' + (i + 1) + '">' +
        '<span class="thumb-card__name" title="' + M.esc(it.file.name) + '">' + M.esc(it.file.name) + "</span>" +
        '<div class="thumb-card__actions">' +
        '<button class="btn btn--sm" type="button" data-act="left" aria-label="Lên trước"' + (i === 0 ? " disabled" : "") + ">◀</button>" +
        '<button class="btn btn--sm btn--ghost" type="button" data-act="rm" aria-label="Bỏ ảnh">✕</button>' +
        '<button class="btn btn--sm" type="button" data-act="right" aria-label="Ra sau"' + (i === items.length - 1 ? " disabled" : "") + ">▶</button>" +
        "</div></li>";
    }).join("");
    el.listHead.hidden = !items.length;
    el.orderHelp.hidden = items.length < 2;
    el.listTitle.textContent = items.length + " ảnh = " + items.length + " trang";
    el.make.disabled = busy || !items.length;
    el.resultInfo.hidden = true;
  }

  el.thumbs.addEventListener("click", function (e) {
    var b = e.target.closest("button[data-act]");
    if (!b || busy) return;
    var id = Number(b.closest("[data-id]").getAttribute("data-id")), act = b.getAttribute("data-act");
    if (act === "left") move(id, -1);
    else if (act === "right") move(id, 1);
    else {
      items = items.filter(function (x) { if (x.id === id) URL.revokeObjectURL(x.thumb); return x.id !== id; });
      render();
    }
  });

  // Kéo thả để đổi thứ tự (máy tính)
  var dragId = null;
  el.thumbs.addEventListener("dragstart", function (e) {
    var li = e.target.closest("[data-id]"); if (!li) return;
    dragId = Number(li.getAttribute("data-id"));
    li.classList.add("is-dragging");
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", String(dragId)); } catch (err) {}
  });
  el.thumbs.addEventListener("dragover", function (e) {
    if (dragId == null) return;
    e.preventDefault();
    Array.prototype.forEach.call(el.thumbs.querySelectorAll(".is-target"), function (x) { x.classList.remove("is-target"); });
    var li = e.target.closest("[data-id]"); if (li) li.classList.add("is-target");
  });
  el.thumbs.addEventListener("drop", function (e) {
    if (dragId == null) return;
    e.preventDefault(); e.stopPropagation();
    var li = e.target.closest("[data-id]");
    if (li) {
      var to = items.findIndex(function (x) { return x.id === Number(li.getAttribute("data-id")); });
      var from = items.findIndex(function (x) { return x.id === dragId; });
      var it = items.splice(from, 1)[0];
      items.splice(to, 0, it);
    }
    dragId = null; render();
  });
  el.thumbs.addEventListener("dragend", function () { dragId = null; render(); });

  el.sortName.addEventListener("click", function () {
    items.sort(function (a, b) { return a.file.name.localeCompare(b.file.name, "vi", { numeric: true, sensitivity: "base" }); });
    render();
  });
  el.clearAll.addEventListener("click", function () {
    items.forEach(function (it) { URL.revokeObjectURL(it.thumb); });
    items = []; render();
  });

  /* ---------- Tạo PDF ---------- */
  // Đọc hướng xoay EXIF của ảnh JPG (1 = bình thường)
  function jpegOrientation(buf) {
    var v = new DataView(buf);
    if (v.byteLength < 4 || v.getUint16(0) !== 0xffd8) return 1;
    var off = 2;
    while (off + 4 < v.byteLength) {
      var marker = v.getUint16(off), len = v.getUint16(off + 2);
      if (marker === 0xffe1 && v.getUint32(off + 4) === 0x45786966) {
        var t = off + 10, little = v.getUint16(t) === 0x4949;
        var ifd = t + v.getUint32(t + 4, little), n = v.getUint16(ifd, little);
        for (var i = 0; i < n; i++) {
          var e = ifd + 2 + i * 12;
          if (v.getUint16(e, little) === 0x0112) return v.getUint16(e + 8, little);
        }
        return 1;
      }
      if ((marker & 0xff00) !== 0xff00) break;
      off += 2 + len;
    }
    return 1;
  }

  function imageBytes(it) {
    var q = QUALITY[opts.quality];
    return it.file.arrayBuffer().then(function (buf) {
      var isJpg = /^image\/jpe?g$/.test(it.file.type) || /\.jpe?g$/i.test(it.file.name);
      var isPng = it.file.type === "image/png" || /\.png$/i.test(it.file.name);
      if (opts.quality === "original") {
        if (isJpg && jpegOrientation(buf) === 1) return { kind: "jpg", bytes: buf };
        if (isPng) return { kind: "png", bytes: buf };
      }
      return F.loadImage(it.file).then(function (img) {
        var c = F.drawToCanvas(img, q.maxEdge || 0, true);
        if (img.close) img.close();
        return F.canvasToBlob(c, "image/jpeg", q.q || 0.92).then(function (b) {
          c.width = c.height = 0;
          return b.arrayBuffer();
        }).then(function (b) { return { kind: "jpg", bytes: b }; });
      });
    });
  }

  function pageFor(w, h) {
    var m = opts.margin * MM;
    if (opts.page === "fit") {
      var pw = w * 0.75, ph = h * 0.75, max = 14400 - 2 * m; // giới hạn kích thước trang PDF
      var k = Math.min(1, max / Math.max(pw, ph));
      pw *= k; ph *= k;
      return { size: [pw + 2 * m, ph + 2 * m], box: [m, m, pw, ph] };
    }
    var size = PAGES[opts.page].slice();
    var landscape = opts.orient === "landscape" || (opts.orient === "auto" && w > h);
    if (landscape) size.reverse();
    var aw = size[0] - 2 * m, ah = size[1] - 2 * m;
    var s = Math.min(aw / w, ah / h), dw = w * s, dh = h * s;
    return { size: size, box: [(size[0] - dw) / 2, (size[1] - dh) / 2, dw, dh] };
  }

  function setBusy(on, text) {
    busy = on;
    el.make.disabled = on || !items.length;
    el.makeText.textContent = text || "Tạo & tải PDF";
    el.progress.hidden = !on;
  }

  el.make.addEventListener("click", function () {
    if (busy || !items.length) return;
    var list = items.slice(), done = 0, failed = [];
    setBusy(true, "Đang chuẩn bị…");
    el.bar.style.width = "0%";
    F.loadScript(F.vendor("pdf-lib.min.js")).then(function () {
      return window.PDFLib.PDFDocument.create();
    }).then(function (pdf) {
      pdf.setTitle(el.name.value.trim() || el.name.placeholder || "Ảnh sang PDF");
      pdf.setCreator("MAINN Media – Công cụ miễn phí");
      pdf.setProducer("MAINN Media");
      return list.reduce(function (p, it) {
        return p.then(function () {
          el.makeText.textContent = "Đang xử lý ảnh " + (done + 1) + "/" + list.length + "…";
          return imageBytes(it).then(function (data) {
            return data.kind === "png" ? pdf.embedPng(data.bytes) : pdf.embedJpg(data.bytes);
          }).then(function (img) {
            var layout = pageFor(img.width, img.height);
            var page = pdf.addPage(layout.size);
            page.drawImage(img, { x: layout.box[0], y: layout.box[1], width: layout.box[2], height: layout.box[3] });
          }).catch(function () { failed.push(it.file.name); })
            .then(function () { done++; el.bar.style.width = Math.round(done / list.length * 100) + "%"; });
        });
      }, Promise.resolve()).then(function () {
        if (!pdf.getPageCount()) throw new Error("empty");
        el.makeText.textContent = "Đang lưu file PDF…";
        return pdf.save();
      });
    }).then(function (bytes) {
      var blob = new Blob([bytes], { type: "application/pdf" });
      var name = (el.name.value.trim() || el.name.placeholder || "anh-sang-pdf").replace(/[\\/:*?"<>|]+/g, "-");
      F.download(blob, F.withExt(name.replace(/\.pdf$/i, ""), "pdf"));
      var pages = list.length - failed.length;
      el.resultInfo.innerHTML = "✅ Đã tạo PDF <strong>" + pages + " trang</strong>, dung lượng <strong>" + F.formatBytes(blob.size) + "</strong>." +
        (failed.length ? '<br><span class="status-err">Bỏ qua ' + failed.length + " ảnh không đọc được: " + M.esc(failed.join(", ")) + "</span>" : "");
      el.resultInfo.hidden = false;
    }).catch(function (err) {
      M.toast(err && err.message === "empty" ? "Không đọc được ảnh nào để tạo PDF" : "Có lỗi khi tạo PDF, vui lòng thử lại");
    }).then(function () { setBusy(false); });
  });

  F.dropzone($("drop"), {
    accept: "image/*,.heic,.heif", multiple: true, paste: true, filter: isImage,
    title: "Kéo thả ảnh vào đây",
    hint: "Chọn nhiều ảnh JPG, PNG, WebP… Mỗi ảnh sẽ là một trang PDF.",
    rejectMessage: "Chỉ nhận file ảnh",
    onFiles: addFiles
  });

  paintOptions();
  render();
})();
