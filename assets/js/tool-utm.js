/* =========================================================
   Công cụ: Tạo link UTM (1 link hoặc hàng loạt cho seeding)
   ========================================================= */
(function () {
  "use strict";
  var M = window.MAINN, F = M.files;
  var $ = function (id) { return document.getElementById(id); };
  var KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  var QUICK = {
    utm_source: ["facebook", "zalo", "tiktok", "google", "youtube", "shopee"],
    utm_medium: ["seeding", "social", "cpc", "email", "qr"]
  };
  var el = {
    segMode: $("segMode"), dest: $("dest"), normalize: $("setNormalize"), fieldContent: $("fieldContent"), fieldBatch: $("fieldBatch"),
    places: $("places"), single: $("single"), singleActions: $("singleActions"), batch: $("batch"), batchList: $("batchList"),
    copy: $("btnCopy"), open: $("btnOpen"), qr: $("btnQr"), copyAll: $("btnCopyAll"), csv: $("btnCsv"), warn: $("utmWarn"), resultTitle: $("resultTitle")
  };
  KEYS.forEach(function (k) { el[k] = $(k); });

  var saved = M.storage.get("mainn.utm.last", {});
  var mode = saved.mode || "single";
  ["utm_source", "utm_medium", "utm_campaign"].forEach(function (k) { if (saved[k]) el[k].value = saved[k]; });
  if (saved.normalize === false) el.normalize.checked = false;

  // Chuẩn hóa: chữ thường, bỏ dấu tiếng Việt, khoảng trắng → "-"
  function norm(s) {
    s = String(s || "").trim();
    if (!el.normalize.checked) return s;
    return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d")
      .replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  }

  function parseDest() {
    var d = el.dest.value.trim();
    if (!d) return null;
    if (!/^https?:\/\//i.test(d)) d = "https://" + d;
    try {
      var u = new URL(d);
      if (!/\./.test(u.hostname)) return null;
      return u;
    } catch (e) { return null; }
  }

  function build(content) {
    var u = parseDest();
    if (!u) return null;
    KEYS.forEach(function (k) {
      var v = k === "utm_content" && content != null ? content : el[k].value;
      v = norm(v);
      if (v) u.searchParams.set(k, v); else u.searchParams.delete(k);
    });
    return u.toString();
  }

  function warnings() {
    var w = [];
    if (el.dest.value.trim() && !parseDest()) w.push("Link đích chưa đúng định dạng.");
    if (!el.utm_source.value.trim()) w.push("Cần nhập Nguồn (utm_source).");
    if (!el.utm_medium.value.trim()) w.push("Nên nhập Kênh (utm_medium) để phân loại trong báo cáo.");
    if (!el.utm_campaign.value.trim()) w.push("Nên nhập Chiến dịch (utm_campaign).");
    return w;
  }

  function places() {
    return el.places.value.split(/\r?\n/).map(function (l) { return l.split("\t")[0].trim(); }).filter(Boolean);
  }

  var batchRows = [];
  function update() {
    var w = warnings(), ready = !!parseDest() && !!el.utm_source.value.trim();
    el.warn.hidden = !w.length || !el.dest.value.trim();
    el.warn.innerHTML = w.map(M.esc).join("<br>");
    saveLast();

    var batch = mode === "batch";
    el.single.hidden = batch; el.singleActions.hidden = batch; el.batch.hidden = !batch;
    el.fieldContent.hidden = batch; el.fieldBatch.hidden = !batch;
    el.resultTitle.textContent = batch ? "Link cho từng nơi đăng" : "Link đã gắn UTM";

    if (!batch) {
      var link = ready ? build() : null;
      el.single.innerHTML = link ? '<code class="utm-link">' + highlight(link) + "</code>" : '<span class="muted">Nhập link đích, nguồn, kênh và chiến dịch.</span>';
      el.copy.disabled = !link;
      [el.open, el.qr].forEach(function (a) { a.setAttribute("aria-disabled", String(!link)); });
      el.open.href = link || "#";
      el.qr.href = link ? "../tao-ma-qr/?url=" + encodeURIComponent(link) : "#";
      return;
    }
    var used = {};
    batchRows = ready ? places().map(function (p) {
      var c = norm(p) || p, key = c, n = 2;
      while (used[key]) key = c + "-" + (n++);
      used[key] = 1;
      return { place: p, content: key, link: build(key) };
    }) : [];
    el.batchList.innerHTML = batchRows.length ? batchRows.map(function (r, i) {
      return '<li><div class="utm-list__place">' + M.esc(r.place) + '</div><code class="utm-link">' + highlight(r.link) + "</code>" +
        '<button class="btn btn--sm" type="button" data-copy="' + i + '">Sao chép</button></li>';
    }).join("") : '<li class="empty" style="display:block">' + (ready ? "Nhập danh sách nơi đăng, mỗi dòng một nơi." : "Nhập link đích và nguồn trước.") + "</li>";
    el.copyAll.disabled = el.csv.disabled = !batchRows.length;
  }

  function highlight(link) {
    var i = link.indexOf("?");
    if (i < 0) return M.esc(link);
    return M.esc(link.slice(0, i)) + '<span class="utm-q">' + M.esc(link.slice(i)) + "</span>";
  }

  function saveLast() {
    M.storage.set("mainn.utm.last", {
      mode: mode, normalize: el.normalize.checked,
      utm_source: el.utm_source.value.trim(), utm_medium: el.utm_medium.value.trim(), utm_campaign: el.utm_campaign.value.trim()
    });
  }

  function copyText(t, msg) {
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(function () { M.toast(msg); }, fallback);
    else fallback();
    function fallback() {
      var ta = document.createElement("textarea"); ta.value = t; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); M.toast(msg); } catch (e) { M.toast("Không sao chép được"); }
      ta.remove();
    }
  }

  /* ---------- Sự kiện ---------- */
  Object.keys(QUICK).forEach(function (k) {
    var row = document.querySelector('[data-for="' + k + '"]');
    row.innerHTML = QUICK[k].map(function (v) { return '<button class="btn btn--sm btn--ghost" type="button" data-v="' + v + '">' + v + "</button>"; }).join("");
    row.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-v]"); if (!b) return;
      el[k].value = b.getAttribute("data-v"); update();
    });
  });
  el.segMode.addEventListener("click", function (e) {
    var b = e.target.closest("button[data-v]"); if (!b) return;
    mode = b.getAttribute("data-v");
    Array.prototype.forEach.call(el.segMode.querySelectorAll("button"), function (x) { x.setAttribute("aria-pressed", String(x === b)); });
    update();
  });
  ["dest", "places"].concat(KEYS).forEach(function (k) { el[k].addEventListener("input", update); });
  el.normalize.addEventListener("change", update);
  el.dest.addEventListener("blur", function () {
    var u = parseDest(); if (u && !/^https?:\/\//i.test(el.dest.value.trim())) el.dest.value = u.toString();
  });

  el.copy.addEventListener("click", function () { var l = build(); if (l) copyText(l, "Đã sao chép link UTM"); });
  [el.open, el.qr].forEach(function (a) { a.addEventListener("click", function (e) { if (a.getAttribute("aria-disabled") === "true") e.preventDefault(); }); });
  el.batchList.addEventListener("click", function (e) {
    var b = e.target.closest("[data-copy]"); if (!b) return;
    copyText(batchRows[Number(b.getAttribute("data-copy"))].link, "Đã sao chép link");
  });
  el.copyAll.addEventListener("click", function () {
    copyText(batchRows.map(function (r) { return r.place + "\t" + r.link; }).join("\n"), "Đã chép " + batchRows.length + " link (dán được vào Google Sheets)");
  });
  el.csv.addEventListener("click", function () {
    function q(s) { return '"' + String(s).replace(/"/g, '""') + '"'; }
    var rows = [["Nơi đăng", "utm_content", "Link"]].concat(batchRows.map(function (r) { return [r.place, r.content, r.link]; }));
    var csv = "﻿" + rows.map(function (r) { return r.map(q).join(","); }).join("\r\n");
    F.download(new Blob([csv], { type: "text/csv;charset=utf-8" }), "link-utm-" + (norm(el.utm_campaign.value) || "seeding") + ".csv");
  });

  Array.prototype.forEach.call(el.segMode.querySelectorAll("button"), function (x) { x.setAttribute("aria-pressed", String(x.getAttribute("data-v") === mode)); });
  update();
  M.utm = { build: build, norm: norm }; // cho kiểm thử tự động
})();
