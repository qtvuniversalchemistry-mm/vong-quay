/* =========================================================
   Công cụ: Chuyển đổi & nén video
   Dùng thư viện Mediabunny + WebCodecs của trình duyệt (có tăng tốc phần cứng).
   ========================================================= */
const M = window.MAINN, F = M.files;
const $ = (id) => document.getElementById(id);
const el = {
  unsupported: $("unsupported"), drop: $("drop"), fileBox: $("fileBox"), fileName: $("fileName"), info: $("info"),
  change: $("btnChange"), resultBox: $("resultBox"), resultSaving: $("resultSaving"), preview: $("preview"), resultInfo: $("resultInfo"),
  segMode: $("segMode"), modeHelp: $("modeHelp"), segFormat: $("segFormat"), segQuality: $("segQuality"), fieldQuality: $("fieldQuality"),
  segRes: $("segRes"), fieldRes: $("fieldRes"), mute: $("setMute"),
  progressBox: $("progressBox"), bar: $("progressBar"), progressText: $("progressText"),
  start: $("btnStart"), cancel: $("btnCancel"), download: $("btnDownload")
};

const opts = Object.assign({ mode: "compress", format: "mp4", quality: "medium", res: 0, mute: false },
  M.storage.get("mainn.video.opts", {}));

const FORMATS = {
  mp4: { label: "MP4", codecs: ["avc", "hevc", "vp9", "av1"], make: (MB) => new MB.Mp4OutputFormat() },
  webm: { label: "WebM", codecs: ["vp9", "vp8", "av1"], make: (MB) => new MB.WebMOutputFormat() },
  mov: { label: "MOV", codecs: ["avc", "hevc"], make: (MB) => new MB.MovOutputFormat() }
};
const CODEC_NAMES = { avc: "H.264", hevc: "H.265", vp8: "VP8", vp9: "VP9", av1: "AV1", aac: "AAC", opus: "Opus", mp3: "MP3", vorbis: "Vorbis", flac: "FLAC" };
const REASONS = {
  undecodable_source_codec: "trình duyệt không giải mã được",
  unknown_source_codec: "không nhận diện được định dạng",
  no_encodable_target_codec: "trình duyệt không mã hóa được sang định dạng này",
  max_track_count_of_type_reached: "định dạng đầu ra không chứa được",
  max_track_count_reached: "định dạng đầu ra không chứa được"
};

let MB = null;           // thư viện Mediabunny (tải khi cần)
let file = null, meta = null, conversion = null, result = null, running = false;

/* ---------- Tùy chọn ---------- */
function paintSeg(seg, value) {
  seg.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v) === String(value)));
}
function paintOptions() {
  paintSeg(el.segMode, opts.mode); paintSeg(el.segFormat, opts.format);
  paintSeg(el.segQuality, opts.quality); paintSeg(el.segRes, opts.res);
  el.mute.checked = !!opts.mute;
  const compress = opts.mode === "compress";
  el.fieldQuality.hidden = !compress;
  el.modeHelp.textContent = compress
    ? "Mã hóa lại video để giảm dung lượng. Video càng dài, thời gian xử lý càng lâu."
    : "Đổi sang định dạng khác, giữ nguyên chất lượng. Rất nhanh nếu video tương thích sẵn.";
  // Chỉ bật các mức độ phân giải nhỏ hơn video gốc
  el.segRes.querySelectorAll("button").forEach((b) => {
    const v = Number(b.dataset.v);
    b.disabled = !!(v && meta && meta.short && v >= meta.short);
  });
  if (opts.res && meta && meta.short && opts.res >= meta.short) { opts.res = 0; paintSeg(el.segRes, 0); }
}
[["segMode", "mode", String], ["segFormat", "format", String], ["segQuality", "quality", String], ["segRes", "res", Number]]
  .forEach(([seg, key, parse]) => {
    el[seg].addEventListener("click", (e) => {
      const b = e.target.closest("button[data-v]");
      if (!b || b.disabled || running) return;
      opts[key] = parse(b.dataset.v);
      M.storage.set("mainn.video.opts", opts);
      paintOptions();
    });
  });
el.mute.addEventListener("change", () => { opts.mute = el.mute.checked; M.storage.set("mainn.video.opts", opts); });

/* ---------- Thư viện ---------- */
function loadLib() {
  if (!MB) MB = import(F.vendor("mediabunny.min.mjs"));
  return MB;
}

/* ---------- Chọn video ---------- */
function infoHtml(rows) {
  return rows.filter((r) => r[1] != null && r[1] !== "").map((r) => `<div><span>${r[0]}</span><strong>${M.esc(r[1])}</strong></div>`).join("");
}

async function pickFile(f) {
  if (running) return;
  file = f; meta = null; clearResult();
  el.drop.hidden = true; el.fileBox.hidden = false;
  el.fileName.textContent = f.name;
  el.info.innerHTML = infoHtml([["Dung lượng", F.formatBytes(f.size)], ["Trạng thái", "Đang đọc thông tin…"]]);
  el.start.disabled = true;
  try {
    const lib = await loadLib();
    const input = new lib.Input({ source: new lib.BlobSource(f), formats: lib.ALL_FORMATS });
    const [duration, video, audio] = await Promise.all([
      input.computeDuration(), input.getPrimaryVideoTrack(), input.getPrimaryAudioTrack()
    ]);
    if (!video) throw new Error("novideo");
    const w = video.displayWidth, h = video.displayHeight;
    meta = { duration, w, h, short: Math.min(w, h), vcodec: video.codec, acodec: audio && audio.codec };
    input.dispose && input.dispose();
    el.info.innerHTML = infoHtml([
      ["Dung lượng", F.formatBytes(f.size)],
      ["Thời lượng", F.formatDuration(duration)],
      ["Độ phân giải", w + "×" + h],
      ["Mã hóa", (CODEC_NAMES[meta.vcodec] || meta.vcodec || "?") + (meta.acodec ? " / " + (CODEC_NAMES[meta.acodec] || meta.acodec) : " / không tiếng")]
    ]);
    el.start.disabled = false;
    paintOptions();
  } catch (err) {
    el.info.innerHTML = infoHtml([["Dung lượng", F.formatBytes(f.size)]]) +
      `<div style="grid-column:1/-1"><span>Lỗi</span><strong class="status-err">${err && err.message === "novideo"
        ? "File này không có hình ảnh video."
        : "Không đọc được video này. Hãy thử file MP4, MOV, WebM hoặc MKV khác."}</strong></div>`;
  }
}

function clearResult() {
  if (result) URL.revokeObjectURL(result.url);
  result = null;
  el.resultBox.hidden = true; el.download.hidden = true;
  el.preview.removeAttribute("src"); el.preview.load();
}

/* ---------- Xử lý ---------- */
function setRunning(on) {
  running = on;
  el.start.hidden = on; el.cancel.hidden = !on; el.progressBox.hidden = !on;
  el.change.disabled = on;
  document.querySelectorAll(".file-side .seg button, #setMute").forEach((b) => { b.disabled = on; });
  if (!on) paintOptions();
}

async function start() {
  if (!file || running) return;
  clearResult();
  setRunning(true);
  el.bar.style.width = "0%";
  el.progressText.textContent = "Đang chuẩn bị…";
  const t0 = performance.now();
  try {
    const lib = await loadLib();
    const fmt = FORMATS[opts.format];
    const input = new lib.Input({ source: new lib.BlobSource(file), formats: lib.ALL_FORMATS });
    const output = new lib.Output({ format: fmt.make(lib), target: new lib.BufferTarget() });

    const video = { };
    const compress = opts.mode === "compress";
    if (opts.res && meta && opts.res < meta.short) {
      if (meta.w >= meta.h) video.height = opts.res; else video.width = opts.res;
    }
    // Chọn mã hóa video đầu tiên mà trình duyệt hỗ trợ cho định dạng này
    const needEncode = compress || video.width || video.height || !fmt.codecs.includes(meta && meta.vcodec);
    if (needEncode) {
      const codec = await lib.getFirstEncodableVideoCodec(fmt.codecs, {
        width: video.width || (meta ? meta.w : undefined), height: video.height || (meta ? meta.h : undefined)
      });
      if (!codec) throw new Error("noencoder");
      video.codec = codec;
    }
    if (compress) { video.quality = new lib.Quality(opts.quality); video.forceTranscode = true; }

    // Âm thanh: giữ nguyên nếu được (dung lượng nhỏ, tương thích tốt). MP4/MOV ưu tiên AAC để phát được trên mọi máy.
    let audio = {}, opusInMp4 = false;
    if (opts.mute) audio = { discard: true };
    else if (meta && meta.acodec && opts.format !== "webm" && meta.acodec !== "aac") {
      const ac = await lib.getFirstEncodableAudioCodec(["aac", "opus"]);
      if (ac) audio.codec = ac;
      opusInMp4 = ac !== "aac";
    }

    conversion = await lib.Conversion.init({ input, output, video, audio, showWarnings: false });
    if (!conversion.isValid) {
      const why = conversion.discardedTracks.map((d) => (d.track.type === "video" ? "Hình ảnh" : "Âm thanh") + ": " + (REASONS[d.reason] || d.reason));
      throw Object.assign(new Error("invalid"), { detail: why.join("; ") });
    }
    const lostAudio = conversion.discardedTracks.some((d) => d.track.type === "audio" && d.reason !== "discarded_by_user");

    conversion.onProgress = (p) => {
      const pct = Math.max(0, Math.min(1, p));
      el.bar.style.width = (pct * 100).toFixed(1) + "%";
      const elapsed = (performance.now() - t0) / 1000;
      const eta = pct > 0.03 ? elapsed / pct - elapsed : NaN;
      el.progressText.textContent = "Đã xử lý " + Math.round(pct * 100) + "%" + (isFinite(eta) ? " · còn khoảng " + F.formatDuration(eta) : "");
    };
    await conversion.execute();

    const blob = new Blob([output.target.buffer], { type: output.format.mimeType });
    const name = F.baseName(file.name) + (compress ? "-nen" : "") + output.format.fileExtension;
    result = { blob, name, url: URL.createObjectURL(blob) };
    showResult(blob, (performance.now() - t0) / 1000, lostAudio, opusInMp4 && !lostAudio);
  } catch (err) {
    if (err && err.name === "ConversionCanceledError") M.toast("Đã hủy xử lý video");
    else if (err && err.message === "noencoder") M.toast("Trình duyệt này không xuất được " + FORMATS[opts.format].label + ". Hãy chọn định dạng khác hoặc dùng Chrome/Edge.", 5000);
    else if (err && err.message === "invalid") M.toast("Không xử lý được video: " + err.detail, 6000);
    else { console.error(err); M.toast("Có lỗi khi xử lý video. Hãy thử định dạng khác hoặc video ngắn hơn.", 5000); }
  } finally {
    conversion = null;
    setRunning(false);
  }
}

function showResult(blob, seconds, lostAudio, opusInMp4) {
  el.preview.src = result.url;
  el.resultBox.hidden = false; el.download.hidden = false;
  const worse = blob.size > file.size;
  el.resultSaving.textContent = F.percentChange(file.size, blob.size);
  el.resultSaving.classList.toggle("is-worse", worse);
  el.resultInfo.innerHTML = infoHtml([
    ["Trước", F.formatBytes(file.size)],
    ["Sau", F.formatBytes(blob.size)],
    ["Thời gian xử lý", F.formatDuration(seconds)],
    ["Tên file", result.name]
  ]) + (worse ? `<div style="grid-column:1/-1"><span>Lưu ý</span><strong>Video gốc đã được nén tốt, bản mới nặng hơn. Hãy chọn chất lượng thấp hơn hoặc giảm độ phân giải.</strong></div>` : "")
    + (opusInMp4 ? `<div style="grid-column:1/-1"><span>Lưu ý</span><strong>Trình duyệt này không tạo được âm thanh AAC nên dùng Opus. Video phát tốt trên Chrome, Android; một số thiết bị cũ (nhất là iPhone) có thể không có tiếng. Nếu gặp lỗi này, hãy thử xử lý lại trên máy tính khác.</strong></div>` : "")
    + (lostAudio ? `<div style="grid-column:1/-1"><span>Lưu ý</span><strong>Trình duyệt không xử lý được phần âm thanh nên video kết quả không có tiếng. Hãy thử định dạng WebM.</strong></div>` : "");
  el.download.focus();
}

/* ---------- Sự kiện ---------- */
el.start.addEventListener("click", start);
el.cancel.addEventListener("click", () => { if (conversion) conversion.cancel(); });
el.download.addEventListener("click", () => { if (result) F.download(result.blob, result.name); });
el.change.addEventListener("click", () => { if (!running) { file = null; meta = null; clearResult(); el.fileBox.hidden = true; el.drop.hidden = false; el.start.disabled = true; paintOptions(); } });
window.addEventListener("beforeunload", (e) => { if (running) { e.preventDefault(); e.returnValue = ""; } });

const supported = "VideoEncoder" in window && "VideoDecoder" in window;
if (!supported) {
  el.unsupported.hidden = false;
  el.start.disabled = true;
}
F.dropzone(el.drop, {
  accept: "video/*,.mkv,.mov,.m4v,.webm,.avi", multiple: false,
  filter: (f) => /^video\//.test(f.type) || /\.(mp4|m4v|mov|webm|mkv|avi|3gp|ts)$/i.test(f.name),
  title: "Kéo thả video vào đây",
  hint: "Hỗ trợ MP4, MOV, WebM, MKV… Mỗi lần xử lý một video.",
  rejectMessage: "Chỉ nhận file video",
  onFiles: (files) => { if (supported) pickFile(files[0]); else M.toast("Trình duyệt chưa hỗ trợ, hãy dùng Chrome hoặc Edge"); }
});
paintOptions();
