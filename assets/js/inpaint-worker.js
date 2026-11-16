/* =========================================================
   Xóa vật thể / watermark: vẽ lại vùng bị che bằng các mảng ảnh xung quanh.
   Thuật toán: PatchMatch nhiều tầng (Barnes 2009, Wexler 2007) – chạy trong Web Worker.
   Nhận: { rgba: Uint8ClampedArray, w, h, mask: Uint8Array (1 = cần xóa) }
   Trả:  { rgba: Uint8ClampedArray } (ảnh đã lấp đầy)
   ========================================================= */
"use strict";

var R = 3;            // bán kính mảng ảnh (patch 7×7)
var P = 2 * R + 1;

self.onmessage = function (e) {
  var d = e.data;
  try {
    var out = inpaint(d.rgba, d.w, d.h, d.mask, function (p) { self.postMessage({ progress: p }); });
    self.postMessage({ rgba: out }, [out.buffer]);
  } catch (err) {
    self.postMessage({ error: String(err && err.message || err) });
  }
};

function makeLevel(w, h) {
  return { w: w, h: h, img: new Float32Array(w * h * 3), mask: new Uint8Array(w * h) };
}

function downsample(L) {
  var w = Math.max(1, L.w >> 1), h = Math.max(1, L.h >> 1), N = makeLevel(w, h);
  for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
    var r = 0, g = 0, b = 0, n = 0, holes = 0;
    for (var dy = 0; dy < 2; dy++) for (var dx = 0; dx < 2; dx++) {
      var sx = Math.min(L.w - 1, 2 * x + dx), sy = Math.min(L.h - 1, 2 * y + dy), i = sy * L.w + sx;
      if (L.mask[i]) { holes++; continue; }
      r += L.img[i * 3]; g += L.img[i * 3 + 1]; b += L.img[i * 3 + 2]; n++;
    }
    var j = y * w + x;
    if (n) { N.img[j * 3] = r / n; N.img[j * 3 + 1] = g / n; N.img[j * 3 + 2] = b / n; }
    N.mask[j] = holes > 0 ? 1 : 0;
  }
  return N;
}

// Lấp vùng trống ban đầu bằng khuếch tán màu từ viền vào trong
function diffuse(L) {
  var w = L.w, h = L.h, img = L.img, m = L.mask, known = new Uint8Array(w * h), i, k;
  for (i = 0; i < w * h; i++) known[i] = m[i] ? 0 : 1;
  var queue = [];
  for (i = 0; i < w * h; i++) if (!known[i]) queue.push(i);
  // Lấp dần từ ngoài vào trong
  var changed = true, guard = 0;
  while (changed && guard++ < w + h) {
    changed = false;
    var next = [];
    for (k = 0; k < queue.length; k++) {
      i = queue[k];
      var x = i % w, y = (i / w) | 0, r = 0, g = 0, b = 0, n = 0;
      for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
        var xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        var j = yy * w + xx;
        if (known[j] === 1) { r += img[j * 3]; g += img[j * 3 + 1]; b += img[j * 3 + 2]; n++; }
      }
      if (n) { img[i * 3] = r / n; img[i * 3 + 1] = g / n; img[i * 3 + 2] = b / n; known[i] = 2; changed = true; }
      else next.push(i);
    }
    for (k = 0; k < queue.length; k++) if (known[queue[k]] === 2) known[queue[k]] = 1;
    queue = next;
  }
  // Làm mượt vài lượt
  for (var it = 0; it < 30; it++) {
    for (i = 0; i < w * h; i++) {
      if (!m[i]) continue;
      var x2 = i % w, y2 = (i / w) | 0, r2 = 0, g2 = 0, b2 = 0, n2 = 0;
      if (x2 > 0) { r2 += img[(i - 1) * 3]; g2 += img[(i - 1) * 3 + 1]; b2 += img[(i - 1) * 3 + 2]; n2++; }
      if (x2 < w - 1) { r2 += img[(i + 1) * 3]; g2 += img[(i + 1) * 3 + 1]; b2 += img[(i + 1) * 3 + 2]; n2++; }
      if (y2 > 0) { r2 += img[(i - w) * 3]; g2 += img[(i - w) * 3 + 1]; b2 += img[(i - w) * 3 + 2]; n2++; }
      if (y2 < h - 1) { r2 += img[(i + w) * 3]; g2 += img[(i + w) * 3 + 1]; b2 += img[(i + w) * 3 + 2]; n2++; }
      img[i * 3] = r2 / n2; img[i * 3 + 1] = g2 / n2; img[i * 3 + 2] = b2 / n2;
    }
  }
}

// Ô nguồn hợp lệ: cả mảng 7×7 nằm trong ảnh và không chạm vùng trống
function sourceMap(L) {
  var w = L.w, h = L.h, ok = new Uint8Array(w * h), list = [];
  // tổng tích lũy số ô trống để tra nhanh
  var S = new Int32Array((w + 1) * (h + 1));
  for (var y = 0; y < h; y++) {
    var row = 0;
    for (var x = 0; x < w; x++) { row += L.mask[y * w + x]; S[(y + 1) * (w + 1) + x + 1] = S[y * (w + 1) + x + 1] + row; }
  }
  for (y = R; y < h - R; y++) for (x = R; x < w - R; x++) {
    var x0 = x - R, y0 = y - R, x1 = x + R + 1, y1 = y + R + 1;
    var holes = S[y1 * (w + 1) + x1] - S[y0 * (w + 1) + x1] - S[y1 * (w + 1) + x0] + S[y0 * (w + 1) + x0];
    if (!holes) { ok[y * w + x] = 1; list.push(y * w + x); }
  }
  return { ok: ok, list: list };
}

// Các tâm mảng cần xử lý: mảng chứa ít nhất một ô trống
function targetList(L) {
  var w = L.w, h = L.h, t = [];
  for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
    var hit = false;
    for (var dy = -R; dy <= R && !hit; dy++) {
      var yy = y + dy; if (yy < 0 || yy >= h) continue;
      for (var dx = -R; dx <= R; dx++) {
        var xx = x + dx; if (xx < 0 || xx >= w) continue;
        if (L.mask[yy * w + xx]) { hit = true; break; }
      }
    }
    if (hit) t.push(y * w + x);
  }
  return t;
}

function dist(L, t, s, best) {
  var w = L.w, h = L.h, img = L.img, tx = t % w, ty = (t / w) | 0, sx = s % w, sy = (s / w) | 0, d = 0, n = 0;
  for (var dy = -R; dy <= R; dy++) {
    var yy = ty + dy; if (yy < 0 || yy >= h) continue;
    for (var dx = -R; dx <= R; dx++) {
      var xx = tx + dx; if (xx < 0 || xx >= w) continue;
      var a = (yy * w + xx) * 3, b = ((sy + dy) * w + sx + dx) * 3;
      var e0 = img[a] - img[b], e1 = img[a + 1] - img[b + 1], e2 = img[a + 2] - img[b + 2];
      d += e0 * e0 + e1 * e1 + e2 * e2; n++;
    }
    if (best !== undefined && d > best * n * 1.0001 && n > P) return Infinity;
  }
  return d / Math.max(1, n);
}

function patchMatch(L, T, nnf, cost, src, iters) {
  var w = L.w, h = L.h, index = new Int32Array(w * h).fill(-1), k;
  for (k = 0; k < T.length; k++) index[T[k]] = k;
  for (k = 0; k < T.length; k++) cost[k] = dist(L, T[k], nnf[k]);
  for (var it = 0; it < iters; it++) {
    var fwd = it % 2 === 0, start = fwd ? 0 : T.length - 1, end = fwd ? T.length : -1, step = fwd ? 1 : -1, dir = fwd ? -1 : 1;
    for (k = start; k !== end; k += step) {
      var t = T[k], tx = t % w, ty = (t / w) | 0, best = nnf[k], bc = cost[k];
      // Lan truyền từ hàng xóm (trái/phải, trên/dưới tùy chiều quét)
      for (var q = 0; q < 2; q++) {
        var ddx = q === 0 ? dir : 0, ddy = q === 0 ? 0 : dir, nx = tx + ddx, ny = ty + ddy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        var ki = index[ny * w + nx]; if (ki < 0) continue;
        var ns = nnf[ki], csx = (ns % w) - ddx, csy = ((ns / w) | 0) - ddy;
        if (csx < R || csy < R || csx >= w - R || csy >= h - R) continue;
        var cand = csy * w + csx;
        if (cand === best || !src.ok[cand]) continue;
        var c = dist(L, t, cand, bc);
        if (c < bc) { bc = c; best = cand; }
      }
      // Tìm ngẫu nhiên với bán kính giảm dần
      var bx = best % w, by = (best / w) | 0;
      for (var rad = Math.max(w, h); rad >= 1; rad >>= 1) {
        var rx = bx + Math.round((Math.random() * 2 - 1) * rad), ry = by + Math.round((Math.random() * 2 - 1) * rad);
        if (rx < R || ry < R || rx >= w - R || ry >= h - R) continue;
        var cs = ry * w + rx;
        if (!src.ok[cs]) continue;
        var c2 = dist(L, t, cs, bc);
        if (c2 < bc) { bc = c2; best = cs; bx = rx; by = ry; }
      }
      nnf[k] = best; cost[k] = bc;
    }
  }
}

// Mỗi ô trống lấy trung bình có trọng số từ các mảng nguồn phủ lên nó
function vote(L, T, nnf, cost) {
  var w = L.w, h = L.h, n = w * h, acc = new Float32Array(n * 3), wsum = new Float32Array(n), k;
  var sorted = Array.prototype.slice.call(cost).filter(isFinite).sort(function (a, b) { return a - b; });
  var sigma2 = Math.max(1, sorted.length ? sorted[Math.floor(sorted.length * 0.75)] : 1);
  for (k = 0; k < T.length; k++) {
    var t = T[k], s = nnf[k], tx = t % w, ty = (t / w) | 0, sx = s % w, sy = (s / w) | 0;
    var wt = Math.exp(-cost[k] / (2 * sigma2)) + 1e-6;
    for (var dy = -R; dy <= R; dy++) {
      var yy = ty + dy; if (yy < 0 || yy >= h) continue;
      for (var dx = -R; dx <= R; dx++) {
        var xx = tx + dx; if (xx < 0 || xx >= w) continue;
        var i = yy * w + xx; if (!L.mask[i]) continue;
        var j = ((sy + dy) * w + sx + dx) * 3;
        acc[i * 3] += L.img[j] * wt; acc[i * 3 + 1] += L.img[j + 1] * wt; acc[i * 3 + 2] += L.img[j + 2] * wt; wsum[i] += wt;
      }
    }
  }
  for (var i2 = 0; i2 < n; i2++) {
    if (!L.mask[i2] || !wsum[i2]) continue;
    L.img[i2 * 3] = acc[i2 * 3] / wsum[i2]; L.img[i2 * 3 + 1] = acc[i2 * 3 + 1] / wsum[i2]; L.img[i2 * 3 + 2] = acc[i2 * 3 + 2] / wsum[i2];
  }
}

function randomInit(T, src) {
  var nnf = new Int32Array(T.length);
  for (var k = 0; k < T.length; k++) nnf[k] = src.list[(Math.random() * src.list.length) | 0];
  return nnf;
}

function inpaint(rgba, w, h, maskIn, onProgress) {
  var L0 = makeLevel(w, h), i;
  for (i = 0; i < w * h; i++) {
    L0.img[i * 3] = rgba[i * 4]; L0.img[i * 3 + 1] = rgba[i * 4 + 1]; L0.img[i * 3 + 2] = rgba[i * 4 + 2];
    L0.mask[i] = maskIn[i] ? 1 : 0;
  }
  var levels = [L0];
  while (true) {
    var top = levels[levels.length - 1];
    if (Math.min(top.w, top.h) < 4 * P || Math.max(top.w, top.h) <= 48) break;
    var nx = downsample(top);
    // dừng nếu tầng thô hết vùng nguồn
    if (sourceMap(nx).list.length < 16) break;
    levels.push(nx);
  }
  var coarse = levels[levels.length - 1];
  diffuse(coarse);

  var nnfPrev = null, Tprev = null, prevW = 0, total = levels.length;
  for (var li = levels.length - 1; li >= 0; li--) {
    var Lv = levels[li], src = sourceMap(Lv);
    if (!src.list.length) { diffuse(Lv); continue; }
    var T = targetList(Lv), nnf, cost = new Float64Array(T.length);
    if (nnfPrev) {
      // Phóng NNF từ tầng thô lên
      var map = new Map();
      for (var k = 0; k < Tprev.length; k++) map.set(Tprev[k], nnfPrev[k]);
      nnf = new Int32Array(T.length);
      for (k = 0; k < T.length; k++) {
        var t = T[k], tx = t % Lv.w, ty = (t / Lv.w) | 0, pt = Math.min(Lv.h >> 1, ty >> 1) * prevW + Math.min(prevW - 1, tx >> 1);
        var ps = map.get(pt), cand = -1;
        if (ps !== undefined) {
          var sx = (ps % prevW) * 2 + (tx & 1), sy = ((ps / prevW) | 0) * 2 + (ty & 1);
          if (sx >= R && sy >= R && sx < Lv.w - R && sy < Lv.h - R && src.ok[sy * Lv.w + sx]) cand = sy * Lv.w + sx;
        }
        nnf[k] = cand >= 0 ? cand : src.list[(Math.random() * src.list.length) | 0];
      }
      for (k = 0; k < T.length; k++) cost[k] = dist(Lv, T[k], nnf[k]);
      vote(Lv, T, nnf, cost); // dựng ảnh tầng này từ NNF phóng lên
    } else nnf = randomInit(T, src);

    var em = li === levels.length - 1 ? 6 : li === 0 ? 2 : 3;
    for (var e = 0; e < em; e++) {
      patchMatch(Lv, T, nnf, cost, src, li === 0 ? 2 : 4);
      vote(Lv, T, nnf, cost);
      if (onProgress) onProgress(((total - 1 - li) + (e + 1) / em) / total);
    }
    nnfPrev = nnf; Tprev = T; prevW = Lv.w;
  }

  var out = new Uint8ClampedArray(w * h * 4);
  for (i = 0; i < w * h; i++) {
    out[i * 4] = L0.img[i * 3]; out[i * 4 + 1] = L0.img[i * 3 + 1]; out[i * 4 + 2] = L0.img[i * 3 + 2]; out[i * 4 + 3] = rgba[i * 4 + 3];
  }
  return out;
}
