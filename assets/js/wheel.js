/* =========================================================
   Công cụ Vòng quay may mắn — MAINN Media
   - Kết quả được chọn bằng crypto.getRandomValues (ngẫu nhiên đều),
     sau đó vòng quay được tính toán để dừng đúng ô đã chọn.
   - Dữ liệu lưu trong localStorage của trình duyệt người dùng.
   ========================================================= */
(function () {
  "use strict";

  var M = window.MAINN;
  var STORE_KEY = "mainn.wheel.v1";
  var TAU = Math.PI * 2;
  var MAX_ITEMS = 2000;

  var SAMPLE = [
    "Nguyễn Văn An", "Trần Thị Bình", "Lê Hoàng Cường", "Phạm Minh Dũng",
    "Hoàng Thu Hà", "Vũ Đức Khánh", "Đặng Ngọc Lan", "Bùi Quang Minh",
    "Đỗ Phương Nga", "Ngô Thanh Phong", "Dương Mỹ Quyên", "Lý Gia Tuấn"
  ];

  // Vòng quay mẫu: hiển thị phía trên ô danh sách, bấm để thay tiêu đề + danh sách
  var TEMPLATES = [
    { id: "names", icon: "👥", title: "Vòng quay may mắn", label: "Danh sách tên", color: "#0099e5", items: SAMPLE },
    { id: "breakfast", icon: "🍜", title: "Sáng nay ăn gì?", label: "Sáng nay ăn gì?", color: "#00a877",
      items: ["Phở bò", "Bún chả", "Bánh mì", "Xôi xéo", "Bún bò Huế", "Bánh cuốn", "Cháo sườn", "Miến gà", "Hủ tiếu", "Cơm tấm", "Bún riêu", "Bánh bao"] },
    { id: "shirt", icon: "👕", title: "Hôm nay mặc áo màu gì?", label: "Chọn màu áo", color: "#e08a00",
      items: ["Trắng", "Đen", "Xanh dương", "Xanh lá", "Đỏ", "Vàng", "Hồng", "Xám", "Be", "Tím", "Cam", "Xanh navy"] },
    { id: "boy", icon: "👦", title: "Đặt tên con trai", label: "Đặt tên con trai", color: "#1d5fa6",
      items: ["Minh Khang", "Gia Bảo", "Đức Anh", "Hoàng Nam", "Quốc Bảo", "Minh Quân", "Anh Khoa", "Tuấn Kiệt", "Phúc An", "Bảo Long", "Đăng Khoa", "Nhật Minh"] },
    { id: "girl", icon: "👧", title: "Đặt tên con gái", label: "Đặt tên con gái", color: "#e0457b",
      items: ["Bảo Ngọc", "Khánh Linh", "Minh Anh", "Ngọc Hân", "Phương Thảo", "Gia Hân", "An Nhiên", "Thảo Vy", "Tuệ Nhi", "Mai Anh", "Diệp Chi", "Hà My"] },
    { id: "luckymoney", icon: "🧧", title: "Lì xì năm mới", label: "Lì xì năm mới", color: "#e5484d",
      items: ["10.000đ", "20.000đ", "50.000đ", "100.000đ", "200.000đ", "500.000đ", "Thêm 1 lượt quay", "Chúc may mắn lần sau"] },
    { id: "voucher", icon: "🎟️", title: "Vòng quay voucher", label: "Tặng voucher", color: "#00a3b8",
      items: ["Giảm 10%", "Giảm 20%", "Giảm 30%", "Giảm 50%", "Freeship", "Mua 1 tặng 1", "Quà tặng kèm", "Chúc may mắn lần sau"] },
    { id: "gift", icon: "🎁", title: "Tặng quà gì cho bạn gái?", label: "Tặng quà gì cho bạn gái?", color: "#7c5cff",
      items: ["Hoa tươi", "Son môi", "Nước hoa", "Gấu bông", "Túi xách", "Đồng hồ", "Trang sức", "Sô-cô-la", "Váy đầm", "Bữa tối lãng mạn", "Album ảnh kỷ niệm", "Chuyến du lịch ngắn"] },
    { id: "weekend", icon: "🏕️", title: "Cuối tuần này làm gì?", label: "Hoạt động cuối tuần", color: "#00b884",
      items: ["Đi cà phê", "Xem phim", "Đi picnic", "Leo núi", "Đi bơi", "Nấu ăn ở nhà", "Đọc sách", "Chơi board game", "Đi karaoke", "Dọn dẹp nhà cửa", "Về thăm gia đình", "Ngủ nướng"] }
  ];

  // "brand" đọc màu từ assets/css/theme.css (--wheel-1 ... --wheel-6)
  var PALETTES = [
    { id: "brand", name: "MAINN Media", colors: null },
    { id: "sunset", name: "Hoàng hôn", colors: ["#ff5a1f", "#ff8a3d", "#ffb020", "#f43f5e", "#c026d3", "#7c3aed"] },
    { id: "ocean", name: "Đại dương", colors: ["#0f1b3d", "#1e40af", "#2563eb", "#0ea5e9", "#06b6d4", "#14b8a6"] },
    { id: "candy", name: "Kẹo ngọt", colors: ["#fda4af", "#fdba74", "#fde047", "#86efac", "#7dd3fc", "#c4b5fd"] },
    { id: "rainbow", name: "Cầu vồng", colors: ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6"] },
    { id: "mono", name: "Tối giản", colors: ["#0f1b3d", "#ffffff", "#24345f", "#f1f3f9"] }
  ];

  var DEFAULT_STATE = {
    title: "Vòng quay may mắn",
    text: SAMPLE.join("\n"),
    results: [],
    settings: { duration: 6, sound: true, confetti: true, autoRemove: false, palette: "brand" }
  };

  /* ---------- DOM ---------- */
  function $(id) { return document.getElementById(id); }
  var el = {
    stage: $("stage"), wrap: $("wheelWrap"), canvas: $("wheel"), pointer: $("pointer"),
    title: $("wheelTitle"), spin: $("btnSpin"), spin2: $("btnSpin2"), share: $("btnShare"), fullscreen: $("btnFullscreen"),
    entries: $("entries"), entryCount: $("entryCount"), entryHint: $("entryHint"),
    shuffle: $("btnShuffle"), sort: $("btnSort"), dedupe: $("btnDedupe"), importBtn: $("btnImport"),
    templateRow: $("templateRow"), clear: $("btnClear"), file: $("fileInput"),
    results: $("results"), resultCount: $("resultCount"),
    copyResults: $("btnCopyResults"), exportResults: $("btnExportResults"), clearResults: $("btnClearResults"),
    setTitle: $("setTitle"), setDuration: $("setDuration"), durationOut: $("durationOut"),
    paletteGrid: $("paletteGrid"), setAutoRemove: $("setAutoRemove"), setSound: $("setSound"), setConfetti: $("setConfetti"),
    dialog: $("winnerDialog"), winnerName: $("winnerName"), winnerMeta: $("winnerMeta"),
    spinAgain: $("btnSpinAgain"), removeWinner: $("btnRemoveWinner"), closeWinner: $("btnCloseWinner")
  };
  var ctx = el.canvas.getContext("2d");

  /* ---------- Trạng thái ---------- */
  var state = loadState();
  var items = [];          // [{ label, line }] — line là chỉ số dòng trong ô nhập
  var rotation = 0;        // góc quay hiện tại (radian)
  var spinning = false;
  var wheelImage = null;   // ảnh vòng quay vẽ sẵn để quay mượt
  var lastWinner = null;   // { label, line }
  var winnerRemoved = false;

  function loadState() {
    var s = M.storage.get(STORE_KEY, null);
    var out = JSON.parse(JSON.stringify(DEFAULT_STATE));
    if (s && typeof s === "object") {
      if (typeof s.title === "string") out.title = s.title;
      if (typeof s.text === "string") out.text = s.text;
      if (Array.isArray(s.results)) out.results = s.results.slice(0, 500);
      if (s.settings) for (var k in out.settings) if (k in s.settings) out.settings[k] = s.settings[k];
    }
    return out;
  }
  var saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { M.storage.set(STORE_KEY, state); }, 200);
  }

  /* ---------- Ngẫu nhiên an toàn ---------- */
  function randomFloat() {
    if (window.crypto && crypto.getRandomValues) {
      var a = new Uint32Array(1);
      crypto.getRandomValues(a);
      return a[0] / 4294967296;
    }
    return Math.random();
  }
  function randomInt(n) {
    // Loại bỏ sai lệch modulo
    if (window.crypto && crypto.getRandomValues) {
      var max = Math.floor(4294967296 / n) * n, a = new Uint32Array(1);
      do { crypto.getRandomValues(a); } while (a[0] >= max);
      return a[0] % n;
    }
    return Math.floor(Math.random() * n);
  }

  /* ---------- Danh sách ---------- */
  function lines() { return el.entries.value.split(/\r?\n/); }

  function parseItems() {
    items = [];
    var ls = lines();
    for (var i = 0; i < ls.length && items.length < MAX_ITEMS; i++) {
      var label = ls[i].trim();
      if (label) items.push({ label: label, line: i });
    }
    el.entryCount.textContent = items.length;
    var total = ls.filter(function (l) { return l.trim(); }).length;
    el.entryHint.textContent = total > MAX_ITEMS ? "Chỉ dùng " + MAX_ITEMS + " mục đầu" : items.length + " mục";
  }

  function setText(text) {
    el.entries.value = text;
    onEntriesChanged();
  }

  function onEntriesChanged() {
    state.text = el.entries.value;
    parseItems();
    renderTemplates();
    buildWheel();
    render();
    save();
  }

  function currentLabels() { return items.map(function (it) { return it.label; }); }

  /* ---------- Màu ---------- */
  function paletteColors() {
    var p = PALETTES.filter(function (x) { return x.id === state.settings.palette; })[0] || PALETTES[0];
    if (p.colors) return p.colors;
    var cs = getComputedStyle(document.documentElement), out = [];
    for (var i = 1; i <= 6; i++) {
      var c = cs.getPropertyValue("--wheel-" + i).trim();
      if (c) out.push(c);
    }
    return out.length ? out : ["#0099e5", "#00e0a4", "#0a2540", "#00bcd4"];
  }

  function segmentColors(n) {
    var pal = paletteColors(), out = [];
    for (var i = 0; i < n; i++) out.push(pal[i % pal.length]);
    // Tránh 2 ô cạnh nhau cùng màu ở chỗ nối ô cuối – ô đầu
    if (n > 2 && out[n - 1] === out[0]) {
      for (var k = 0; k < pal.length; k++) {
        if (pal[k] !== out[0] && pal[k] !== out[n - 2]) { out[n - 1] = pal[k]; break; }
      }
    }
    return out;
  }

  // Chọn chữ trắng hoặc xanh navy tùy màu nền nào tương phản tốt hơn (chuẩn WCAG)
  function luminance(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) return 0;
    var v = parseInt(m[1], 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255].map(function (c) {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    }).reduce(function (sum, c, i) { return sum + c * [0.2126, 0.7152, 0.0722][i]; }, 0);
  }
  function textColorFor(hex) {
    var L = luminance(hex), dark = "#04223f", Ld = luminance(dark);
    var vsWhite = 1.05 / (L + 0.05), vsDark = (L + 0.05) / (Ld + 0.05);
    return vsDark > vsWhite ? dark : "#ffffff";
  }

  /* ---------- Vẽ vòng quay ---------- */
  function canvasSize() {
    var size = Math.round(el.wrap.clientWidth);
    var dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    return { size: size, dpr: dpr };
  }

  function buildWheel() {
    var cs = canvasSize();
    if (!cs.size) return;
    var px = Math.round(cs.size * cs.dpr);
    if (el.canvas.width !== px) { el.canvas.width = px; el.canvas.height = px; }

    var off = document.createElement("canvas");
    off.width = px; off.height = px;
    var c = off.getContext("2d");
    c.scale(cs.dpr, cs.dpr);

    var size = cs.size, cx = size / 2, cy = size / 2;
    var R = size / 2 - 4;
    var rim = Math.max(8, size * 0.028);
    var r = R - rim;
    var ink = getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#0a2540";
    var n = items.length;

    // Viền ngoài
    c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.fillStyle = ink; c.fill();
    c.lineWidth = 2; c.strokeStyle = "rgba(255,255,255,0.18)"; c.stroke();

    if (n === 0) {
      c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.fillStyle = "#e3e7f0"; c.fill();
      c.fillStyle = "#5d6680"; c.textAlign = "center"; c.textBaseline = "middle";
      c.font = "600 " + Math.max(13, size * 0.035) + "px " + fontFamily();
      c.fillText("Thêm tên vào danh sách", cx, cy + size * 0.2);
    } else {
      var seg = TAU / n, colors = segmentColors(n);
      for (var i = 0; i < n; i++) {
        var a0 = i * seg - Math.PI / 2, a1 = a0 + seg;
        c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, r, a0, a1); c.closePath();
        c.fillStyle = colors[i]; c.fill();
        if (n <= 180) { c.strokeStyle = "rgba(255,255,255,0.55)"; c.lineWidth = n > 60 ? 0.5 : 1.5; c.stroke(); }
      }

      // Chữ
      var hubR = size * 0.11;
      var maxW = r - hubR - size * 0.05;
      var arcH = r * seg; // chiều cao ô ở mép ngoài
      var baseFont = Math.min(size * 0.045, arcH * 0.5, 26);
      var minFont = Math.max(7, baseFont * 0.62);
      if (baseFont >= 7) {
        c.textBaseline = "middle"; c.textAlign = "right";
        for (var j = 0; j < n; j++) {
          var mid = j * seg + seg / 2 - Math.PI / 2;
          var label = items[j].label;
          // Thu nhỏ chữ để vừa ô, nếu vẫn dài thì cắt bớt bằng "…"
          var fs = baseFont;
          c.font = "700 " + fs.toFixed(1) + "px " + fontFamily();
          var w = c.measureText(label).width;
          if (w > maxW) {
            fs = Math.max(minFont, baseFont * maxW / w);
            c.font = "700 " + fs.toFixed(1) + "px " + fontFamily();
          }
          c.save();
          c.translate(cx, cy); c.rotate(mid);
          c.fillStyle = textColorFor(colors[j]);
          c.fillText(fit(c, label, maxW), r - size * 0.035, 0);
          c.restore();
        }
      }
    }

    // Đèn trang trí trên viền
    var dots = 24;
    for (var d = 0; d < dots; d++) {
      var ang = (d / dots) * TAU;
      c.beginPath();
      c.arc(cx + Math.cos(ang) * (R - rim / 2), cy + Math.sin(ang) * (R - rim / 2), Math.max(1.6, rim * 0.22), 0, TAU);
      c.fillStyle = d % 2 ? "#00f1a8" : "#ffffff"; c.fill();
    }

    // Bóng mờ bên trong tạo chiều sâu
    var g = c.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
    g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.85, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,0.18)");
    c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.fillStyle = g; c.fill();

    wheelImage = off;
  }

  function fit(c, text, maxW) {
    if (c.measureText(text).width <= maxW) return text;
    var t = text;
    while (t.length > 1 && c.measureText(t + "…").width > maxW) t = t.slice(0, -1);
    return t + "…";
  }

  function fontFamily() {
    return '"Be Vietnam Pro", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  }

  function render() {
    if (!wheelImage) return;
    var w = el.canvas.width;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, w);
    ctx.translate(w / 2, w / 2);
    ctx.rotate(rotation);
    ctx.drawImage(wheelImage, -w / 2, -w / 2);
  }

  // Ô đang nằm dưới kim (kim ở đỉnh vòng quay)
  function indexAtPointer(rot, n) {
    var theta = ((-rot % TAU) + TAU) % TAU;
    return Math.min(n - 1, Math.floor(theta / (TAU / n)));
  }

  /* ---------- Âm thanh (Web Audio, không cần file) ---------- */
  var audio = null;
  function ac() {
    if (!audio) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audio = new AC();
    }
    if (audio.state === "suspended") audio.resume();
    return audio;
  }
  var lastTick = 0;
  function tick() {
    if (!state.settings.sound) return;
    var a = ac(); if (!a) return;
    var now = a.currentTime;
    if (now - lastTick < 0.035) return;
    lastTick = now;
    var o = a.createOscillator(), g = a.createGain();
    o.type = "triangle"; o.frequency.value = 1400;
    g.gain.setValueAtTime(0.12, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    o.connect(g).connect(a.destination); o.start(now); o.stop(now + 0.05);
  }
  function fanfare() {
    if (!state.settings.sound) return;
    var a = ac(); if (!a) return;
    var t = a.currentTime, notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach(function (f, i) {
      var o = a.createOscillator(), g = a.createGain(), s = t + i * 0.11;
      o.type = "triangle"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(0.18, s + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, s + (i === notes.length - 1 ? 0.7 : 0.25));
      o.connect(g).connect(a.destination); o.start(s); o.stop(s + 0.8);
    });
  }

  /* ---------- Quay ---------- */
  function easeOut(t) { return 1 - Math.pow(1 - t, 4); }

  function spin() {
    if (spinning) return;
    if (el.dialog.open) closeWinner();
    var n = items.length;
    if (n < 2) {
      M.toast(n === 0 ? "Hãy nhập ít nhất 2 mục vào danh sách" : "Cần ít nhất 2 mục để quay");
      el.entries.focus();
      return;
    }
    ac(); // mở khóa âm thanh trên điện thoại

    var seg = TAU / n;
    var winnerIdx = randomInt(n);
    var target = (winnerIdx + 0.12 + randomFloat() * 0.76) * seg; // tránh dừng sát vạch
    var start = rotation;
    var delta = (((-target - start) % TAU) + TAU) % TAU;
    var duration = Math.max(2, Math.min(20, Number(state.settings.duration) || 6)) * 1000;
    var turns = Math.round(3 + duration / 1000 * 1.1);
    var end = start + turns * TAU + delta;

    var snapshot = items.slice(); // khóa danh sách trong lúc quay
    var lastIdx = indexAtPointer(start, n);
    var t0 = performance.now();
    setSpinning(true);

    function frame(now) {
      var t = Math.min(1, (now - t0) / duration);
      rotation = start + (end - start) * easeOut(t);
      render();
      var idx = indexAtPointer(rotation, n);
      if (idx !== lastIdx) {
        lastIdx = idx;
        tick();
        el.pointer.classList.remove("tick"); void el.pointer.offsetWidth; el.pointer.classList.add("tick");
      }
      if (t < 1) requestAnimationFrame(frame);
      else {
        rotation = end % TAU;
        render();
        setSpinning(false);
        finish(snapshot[indexAtPointer(rotation, n)]);
      }
    }
    requestAnimationFrame(frame);
  }

  function setSpinning(on) {
    spinning = on;
    el.spin.disabled = on; el.spin2.disabled = on;
    el.entries.disabled = on;
    [el.shuffle, el.sort, el.dedupe, el.importBtn, el.clear].forEach(function (b) { b.disabled = on; });
    Array.prototype.forEach.call(el.templateRow.querySelectorAll("button"), function (b) { b.disabled = on; });
  }

  function finish(winner) {
    lastWinner = winner;
    winnerRemoved = false;
    var entry = { name: winner.label, at: Date.now(), wheel: state.title };
    state.results.unshift(entry);
    if (state.results.length > 500) state.results.length = 500;
    renderResults();
    save();

    el.winnerName.textContent = winner.label;
    el.winnerMeta.textContent = "Lượt quay thứ " + state.results.length + " · " + formatTime(entry.at) +
      (state.settings.autoRemove ? " · sẽ được loại khỏi danh sách" : "");
    el.removeWinner.hidden = !!state.settings.autoRemove;
    el.dialog.showModal();
    el.spinAgain.focus();
    fanfare();
    if (state.settings.confetti) confetti();
  }

  function removeWinnerFromList() {
    if (!lastWinner || winnerRemoved) return;
    var ls = lines();
    // Xóa đúng dòng; nếu dòng đã đổi thì tìm dòng trùng tên đầu tiên
    var i = ls[lastWinner.line] !== undefined && ls[lastWinner.line].trim() === lastWinner.label
      ? lastWinner.line
      : ls.findIndex(function (l) { return l.trim() === lastWinner.label; });
    if (i >= 0) {
      ls.splice(i, 1);
      setText(ls.join("\n"));
    }
    winnerRemoved = true;
  }

  function closeWinner() {
    if (state.settings.autoRemove) removeWinnerFromList();
    if (el.dialog.open) el.dialog.close();
  }

  /* ---------- Kết quả ---------- */
  function formatTime(ts) {
    var d = new Date(ts);
    function p(x) { return (x < 10 ? "0" : "") + x; }
    return p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds()) + " " + p(d.getDate()) + "/" + p(d.getMonth() + 1) + "/" + d.getFullYear();
  }

  function renderResults() {
    var r = state.results;
    el.resultCount.textContent = r.length;
    if (!r.length) {
      el.results.innerHTML = '<li class="empty" style="display:block">Chưa có kết quả. Bấm QUAY để bắt đầu!</li>';
      return;
    }
    el.results.innerHTML = r.map(function (x, i) {
      return '<li><span class="idx">' + (r.length - i) + '</span><span class="name">' + M.esc(x.name) +
        '</span><span class="time">' + formatTime(x.at).slice(0, 5) + "</span></li>";
    }).join("");
  }

  function resultsAsText() {
    return state.results.slice().reverse().map(function (x, i) { return (i + 1) + ". " + x.name; }).join("\n");
  }

  function exportCsv() {
    if (!state.results.length) return M.toast("Chưa có kết quả để tải");
    function q(s) { return '"' + String(s).replace(/"/g, '""') + '"'; }
    var rows = [["STT", "Kết quả", "Thời gian", "Vòng quay"]];
    state.results.slice().reverse().forEach(function (x, i) { rows.push([i + 1, x.name, formatTime(x.at), x.wheel || ""]); });
    var csv = "﻿" + rows.map(function (r) { return r.map(q).join(","); }).join("\r\n");
    var blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ket-qua-vong-quay-" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  function copyText(text, okMsg) {
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) {}
      ta.remove();
      M.toast(ok ? okMsg : "Không sao chép được, vui lòng thử lại");
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { M.toast(okMsg); }, fallback);
    } else fallback();
  }

  /* ---------- Chia sẻ qua link ---------- */
  function b64encode(str) {
    var bytes = new TextEncoder().encode(str), bin = "";
    bytes.forEach(function (b) { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function b64decode(s) {
    s = s.replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    var bin = atob(s), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function shareLink() {
    var payload = b64encode(JSON.stringify({ t: state.title, e: currentLabels() }));
    var url = location.href.split("#")[0] + "#d=" + payload;
    if (url.length > 8000) return M.toast("Danh sách quá dài để chia sẻ qua link, hãy dùng chức năng Nhập file");
    copyText(url, "Đã sao chép link. Người nhận mở link sẽ thấy đúng danh sách này");
  }
  function loadFromHash() {
    var m = /[#&]d=([A-Za-z0-9_-]+)/.exec(location.hash);
    if (!m) return false;
    try {
      var data = JSON.parse(b64decode(m[1]));
      if (Array.isArray(data.e)) state.text = data.e.map(String).join("\n");
      if (typeof data.t === "string" && data.t.trim()) state.title = data.t.slice(0, 80);
      history.replaceState(null, "", location.pathname + location.search);
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ---------- Pháo giấy ---------- */
  function confetti() {
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var host = document.fullscreenElement || document.body;
    var cv = document.createElement("canvas");
    cv.className = "confetti-canvas";
    host.appendChild(cv);
    // Đưa lên lớp trên cùng (trên cả hộp thoại kết quả) nếu trình duyệt hỗ trợ
    if (cv.showPopover) { cv.setAttribute("popover", "manual"); try { cv.showPopover(); } catch (e) {} }
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = window.innerWidth, H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    var c = cv.getContext("2d"); c.scale(dpr, dpr);
    var colors = ["#00f1a8", "#0099e5", "#7af3cf", "#3dbcf5", "#ffffff", "#0a2540"];
    var parts = [];
    for (var i = 0; i < 180; i++) {
      var fromLeft = i % 2 === 0;
      parts.push({
        x: fromLeft ? -10 : W + 10, y: H * (0.55 + Math.random() * 0.3),
        vx: (fromLeft ? 1 : -1) * (6 + Math.random() * 9), vy: -(10 + Math.random() * 10),
        w: 6 + Math.random() * 6, h: 8 + Math.random() * 8,
        rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 0.4,
        color: colors[i % colors.length]
      });
    }
    var t0 = performance.now();
    (function loop(now) {
      var life = (now - t0) / 1000;
      c.clearRect(0, 0, W, H);
      parts.forEach(function (p) {
        p.vy += 0.35; p.vx *= 0.99; p.vy *= 0.99;
        p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot);
        c.globalAlpha = Math.max(0, 1 - Math.max(0, life - 2.2) / 1);
        c.fillStyle = p.color; c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.rot)));
        c.restore();
      });
      if (life < 3.3) requestAnimationFrame(loop); else cv.remove();
    })(t0);
  }

  /* ---------- Cài đặt ---------- */
  function renderPalettes() {
    el.paletteGrid.innerHTML = PALETTES.map(function (p) {
      var cols = p.colors || paletteColorsFor("brand");
      return '<button type="button" class="palette-opt" data-pal="' + p.id + '" aria-pressed="' + (p.id === state.settings.palette) + '">' +
        '<span class="palette-opt__sw">' + cols.map(function (c) { return '<i style="background:' + c + '"></i>'; }).join("") + "</span>" +
        M.esc(p.name) + "</button>";
    }).join("");
  }
  function paletteColorsFor(id) {
    var keep = state.settings.palette;
    state.settings.palette = id;
    var c = paletteColors();
    state.settings.palette = keep;
    return c;
  }

  /* ---------- Vòng quay mẫu ---------- */
  function templateText(t) { return t.items.join("\n"); }

  function renderTemplates() {
    var current = currentLabels().join("\n");
    el.templateRow.innerHTML = TEMPLATES.map(function (t) {
      return '<button type="button" class="template-chip" data-tpl="' + t.id + '" style="--c:' + t.color + '" aria-pressed="' +
        (templateText(t) === current) + '"><span aria-hidden="true">' + t.icon + "</span>" + M.esc(t.label) + "</button>";
    }).join("");
  }

  function applyTemplate(id) {
    var t = TEMPLATES.filter(function (x) { return x.id === id; })[0];
    if (!t) return;
    var current = currentLabels().join("\n");
    var isTemplate = !current || TEMPLATES.some(function (x) { return templateText(x) === current; });
    if (!isTemplate && !confirm("Thay danh sách hiện tại (" + items.length + " mục) bằng vòng quay mẫu \"" + t.label + "\"?")) return;
    state.title = t.title;
    el.title.textContent = t.title;
    el.setTitle.value = t.title;
    setText(templateText(t));
    M.toast("Đã chọn vòng quay mẫu: " + t.label);
  }

  function applySettingsToUI() {
    var s = state.settings;
    el.title.textContent = state.title || "Vòng quay may mắn";
    el.setTitle.value = state.title;
    el.setDuration.value = s.duration;
    el.durationOut.textContent = s.duration + " giây";
    el.setAutoRemove.checked = !!s.autoRemove;
    el.setSound.checked = !!s.sound;
    el.setConfetti.checked = !!s.confetti;
    renderPalettes();
  }

  /* ---------- Tabs ---------- */
  function initTabs() {
    var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
    function select(tab) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", on);
        t.tabIndex = on ? 0 : -1;
        $(t.getAttribute("aria-controls")).hidden = !on;
      });
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { select(t); });
      t.addEventListener("keydown", function (e) {
        var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!d) return;
        var next = tabs[(i + d + tabs.length) % tabs.length];
        select(next); next.focus();
      });
    });
  }

  /* ---------- Sự kiện ---------- */
  function bind() {
    el.spin.addEventListener("click", spin);
    el.spin2.addEventListener("click", spin);
    el.canvas.addEventListener("click", spin);

    var inputTimer;
    el.entries.addEventListener("input", function () {
      clearTimeout(inputTimer);
      inputTimer = setTimeout(onEntriesChanged, 120);
    });

    el.shuffle.addEventListener("click", function () {
      var ls = currentLabels();
      for (var i = ls.length - 1; i > 0; i--) { var j = randomInt(i + 1), t = ls[i]; ls[i] = ls[j]; ls[j] = t; }
      setText(ls.join("\n")); M.toast("Đã trộn ngẫu nhiên danh sách");
    });
    el.sort.addEventListener("click", function () {
      var ls = currentLabels().sort(function (a, b) { return a.localeCompare(b, "vi", { sensitivity: "base", numeric: true }); });
      setText(ls.join("\n")); M.toast("Đã sắp xếp A → Z");
    });
    el.dedupe.addEventListener("click", function () {
      var seen = {}, before = items.length;
      var ls = currentLabels().filter(function (l) { var k = l.toLowerCase(); if (seen[k]) return false; seen[k] = 1; return true; });
      setText(ls.join("\n"));
      var removed = before - ls.length;
      M.toast(removed ? "Đã xóa " + removed + " dòng trùng" : "Không có dòng trùng");
    });
    el.templateRow.addEventListener("click", function (e) {
      var b = e.target.closest("[data-tpl]");
      if (!b || spinning) return;
      applyTemplate(b.getAttribute("data-tpl"));
    });
    el.clear.addEventListener("click", function () {
      if (!items.length) return;
      if (!confirm("Xóa toàn bộ " + items.length + " mục trong danh sách?")) return;
      setText(""); el.entries.focus();
    });
    el.importBtn.addEventListener("click", function () { el.file.click(); });
    el.file.addEventListener("change", function () {
      var f = el.file.files && el.file.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        var text = String(reader.result).replace(/^﻿/, "");
        var isCsv = /\.csv$/i.test(f.name);
        var rows = text.split(/\r?\n/).map(function (l) {
          if (!isCsv) return l.trim();
          var m = /^\s*"((?:[^"]|"")*)"|^([^,;\t]*)/.exec(l);
          return (m[1] !== undefined ? m[1].replace(/""/g, '"') : m[2] || "").trim();
        }).filter(Boolean);
        if (!rows.length) return M.toast("File không có dữ liệu");
        var replace = !items.length || confirm("Thay danh sách hiện tại bằng " + rows.length + " mục từ file?\n(Bấm Hủy để thêm vào cuối danh sách)");
        setText(replace ? rows.join("\n") : currentLabels().concat(rows).join("\n"));
        M.toast("Đã nhập " + rows.length + " mục từ file");
      };
      reader.readAsText(f, "utf-8");
      el.file.value = "";
    });

    el.copyResults.addEventListener("click", function () {
      if (!state.results.length) return M.toast("Chưa có kết quả để sao chép");
      copyText(resultsAsText(), "Đã sao chép kết quả");
    });
    el.exportResults.addEventListener("click", exportCsv);
    el.clearResults.addEventListener("click", function () {
      if (!state.results.length) return;
      if (!confirm("Xóa toàn bộ lịch sử kết quả?")) return;
      state.results = []; renderResults(); save();
    });

    el.setTitle.addEventListener("input", function () {
      state.title = el.setTitle.value;
      el.title.textContent = state.title.trim() || "Vòng quay may mắn";
      save();
    });
    el.setDuration.addEventListener("input", function () {
      state.settings.duration = Number(el.setDuration.value);
      el.durationOut.textContent = state.settings.duration + " giây";
      save();
    });
    [["setAutoRemove", "autoRemove"], ["setSound", "sound"], ["setConfetti", "confetti"]].forEach(function (pair) {
      el[pair[0]].addEventListener("change", function () { state.settings[pair[1]] = el[pair[0]].checked; save(); });
    });
    el.paletteGrid.addEventListener("click", function (e) {
      var b = e.target.closest("[data-pal]");
      if (!b) return;
      state.settings.palette = b.getAttribute("data-pal");
      renderPalettes(); buildWheel(); render(); save();
    });

    el.spinAgain.addEventListener("click", function () { closeWinner(); spin(); });
    el.closeWinner.addEventListener("click", closeWinner);
    el.removeWinner.addEventListener("click", function () {
      removeWinnerFromList(); M.toast("Đã xóa \"" + lastWinner.label + "\" khỏi danh sách"); el.dialog.close();
    });
    el.dialog.addEventListener("cancel", function (e) { e.preventDefault(); closeWinner(); });
    el.dialog.addEventListener("click", function (e) { if (e.target === el.dialog) closeWinner(); });

    el.share.addEventListener("click", shareLink);

    el.fullscreen.addEventListener("click", function () {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (el.stage.requestFullscreen) el.stage.requestFullscreen().catch(function () { M.toast("Trình duyệt không hỗ trợ toàn màn hình"); });
      else M.toast("Trình duyệt không hỗ trợ toàn màn hình");
    });

    document.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); spin(); return; }
      var tag = (e.target.tagName || "").toLowerCase();
      if (e.key === " " && document.fullscreenElement && tag !== "textarea" && tag !== "input") { e.preventDefault(); spin(); }
    });

    var resizeTimer;
    var ro = new ResizeObserver(function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { buildWheel(); render(); }, 60);
    });
    ro.observe(el.wrap);

    document.addEventListener("mainn:themechange", function () { buildWheel(); render(); renderPalettes(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { buildWheel(); render(); });
  }

  /* ---------- Khởi động ---------- */
  var fromLink = loadFromHash();
  el.entries.value = state.text;
  parseItems();
  renderTemplates();
  applySettingsToUI();
  renderResults();
  initTabs();
  bind();
  buildWheel();
  render();
  if (fromLink) { save(); M.toast("Đã tải danh sách từ link chia sẻ"); }

  // Cho phép kiểm thử tự động
  window.MAINN.wheel = { spin: spin, items: function () { return items; }, state: state };
})();
