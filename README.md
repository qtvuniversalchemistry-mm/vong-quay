# Công cụ MAINN Media — Vòng quay may mắn

Website tĩnh (HTML/CSS/JS thuần, không cần cài đặt, không cần máy chủ), gồm:

- **Trang chủ** (`home/`): giới thiệu và danh sách công cụ. Địa chỉ gốc `/` tự chuyển đến `/home/`.
- **Vòng quay may mắn** (`vong-quay/`): nhập danh sách, quay ngẫu nhiên, xem lịch sử kết quả.
- **Chuyển đổi & nén ảnh** (`chuyen-doi-anh/`): đổi JPG/PNG/WebP, chỉnh chất lượng, thu nhỏ kích thước, xử lý hàng loạt, tải .zip.
- **Ảnh sang PDF** (`anh-sang-pdf/`): ghép nhiều ảnh thành PDF, kéo thả sắp xếp trang, khổ A4/Letter/vừa ảnh, lề, mức dung lượng.
- **Xóa nhãn AI khỏi ảnh** (`xoa-nhan-ai/`): tùy chọn "Nén ảnh luôn"; gỡ C2PA/Content Credentials, XMP, IPTC, tham số AI, EXIF, GPS khỏi JPG/PNG/WebP mà không nén lại ảnh; định dạng khác chuyển sang JPG/PNG. Không xóa được dấu ẩn trong điểm ảnh (VD SynthID).
- **Tạo mã QR** (`tao-ma-qr/`): link, văn bản, WiFi, danh thiếp vCard, email, điện thoại, SMS; màu, nền trong suốt, kiểu điểm, mức sửa lỗi, lề, logo; tải PNG (512–4096 px), SVG, sao chép ảnh. Nhận link sẵn qua `?url=`.
- **Tạo link UTM** (`tao-link-utm/`): gắn utm_source/medium/campaign/content/term, chuẩn hóa giá trị, chế độ nhiều link cho seeding, chép tất cả, xuất CSV, nút tạo mã QR. (Chưa có rút gọn link vì cần máy chủ.)
- **Chuyển đổi & nén video** (`chuyen-doi-video/`): nén dung lượng, đổi MP4/WebM/MOV, hạ độ phân giải, bỏ âm thanh. Cần Chrome/Edge bản mới (dùng WebCodecs).

Tất cả công cụ xử lý file đều chạy **ngay trong trình duyệt**, file không được tải lên máy chủ. Thư viện bên thứ ba nằm trong `assets/vendor/` (xem `assets/vendor/LICENSES.md`).

## Tính năng vòng quay

- Nhập mỗi dòng một tên (tối đa 2.000 mục), số mục cập nhật ngay trên vòng quay.
- Quay bằng nút QUAY, bấm vào vòng quay hoặc `Ctrl + Enter` (phím cách khi đang toàn màn hình).
- Kết quả chọn bằng bộ sinh số ngẫu nhiên an toàn của trình duyệt (`crypto.getRandomValues`), mỗi mục có cơ hội như nhau.
- Hộp thông báo người trúng: Quay tiếp / Xóa khỏi danh sách / Đóng; pháo giấy và âm thanh.
- **Vòng quay mẫu** (phía trên ô danh sách): Danh sách tên, Minigame livestream, Ý tưởng khuyến mãi, Ý tưởng video bán hàng, Quà tri ân khách hàng, Hôm nay ăn gì?, Lì xì năm mới, Hoạt động cuối tuần. Bấm là đổi ngay tiêu đề + danh sách; nếu đang có danh sách tự nhập, trang sẽ hỏi xác nhận trước khi thay. Sửa/thêm mẫu trong mảng `TEMPLATES` ở `assets/js/wheel.js`.
- Công cụ danh sách: Trộn, Sắp xếp A→Z, Xóa trùng, Nhập file `.txt`/`.csv`, Xóa hết.
- Lịch sử kết quả: sao chép, tải file CSV mở được bằng Excel (giữ đúng tiếng Việt), xóa lịch sử.
- Cài đặt: tiêu đề vòng quay, thời gian quay (2–20 giây), bảng màu (mặc định: Cầu vồng), tự động xóa người trúng, bật/tắt âm thanh, pháo giấy.
- Chế độ toàn màn hình (dùng khi livestream / trình chiếu), tương thích điện thoại.
- Giao diện sáng (mặc định) và tối: nút biểu tượng mặt trăng/mặt trời trên thanh menu; lựa chọn được lưu trong trình duyệt và áp dụng cho mọi trang.
- Sao chép link chia sẻ: người nhận mở link sẽ thấy đúng danh sách và tiêu đề.
- Dữ liệu tự lưu trong trình duyệt của người dùng (không gửi lên máy chủ).

## Bài viết SEO bên dưới mỗi công cụ

Mỗi trang công cụ có một khối `<article class="card article">` (đánh dấu bằng chú thích `BÀI VIẾT SEO`) gồm: tiêu đề H2, đoạn mở đầu, mục lục, hướng dẫn từng bước, mẹo, **Câu hỏi thường gặp**, liên kết sang công cụ khác và khối giới thiệu MAINN Media.

- Đây là **nội dung mẫu**, có thể viết lại toàn bộ cho phù hợp bộ từ khóa SEO.
- Mỗi trang chỉ có **một thẻ H1** (tên công cụ ở đầu trang); trong bài viết dùng H2/H3.
- Mục lục dùng liên kết `#id`: khi đổi tiêu đề H2, giữ hoặc cập nhật `id` tương ứng.
- Phần "Câu hỏi thường gặp" (`.faq details`) được tự động chuyển thành dữ liệu có cấu trúc **FAQPage** cho Google, không cần sửa riêng.
- Nên sửa thêm thẻ `<title>` và `<meta name="description">` ở đầu mỗi file cho khớp từ khóa chính.

## Đưa website lên mạng bằng GitHub Pages (miễn phí)

1. Mở repo trên GitHub → **Settings** → mục **Pages** (cột trái).
2. Ở **Build and deployment** → **Source**: chọn **Deploy from a branch**.
3. **Branch**: chọn nhánh chứa code (ví dụ `main`), thư mục **/ (root)** → bấm **Save**.
4. Đợi 1–2 phút, tải lại trang Settings → Pages sẽ hiện link dạng
   `https://<tên-tài-khoản>.github.io/vong-quay/`.
5. Mở link: trang tự chuyển đến trang chủ `.../vong-quay/home/`; công cụ vòng quay nằm ở `.../vong-quay/vong-quay/`.

> Phần `/vong-quay/` đứng đầu đường dẫn là **tên repo** (quy tắc của GitHub Pages). Muốn đường dẫn gọn
> dạng `ten-mien.com/home/` và `ten-mien.com/vong-quay/`, gắn tên miền riêng tại Settings → Pages → **Custom domain**.

> Lưu ý: GitHub Pages miễn phí yêu cầu repo **công khai (Public)**, trừ khi tài khoản/tổ chức có gói trả phí.

## Đổi màu thương hiệu

Mở `assets/css/theme.css`. Màu hiện tại lấy theo logo MAINN Media: xanh ngọc `#00F1A8` → xanh dương `#0099E5`.

| Biến | Dùng cho |
|---|---|
| `--brand-green`, `--brand-blue`, `--brand-gradient` | Hai màu logo và dải chuyển màu: nút chính, nút QUAY, điểm nhấn |
| `--brand`, `--brand-text`, `--brand-soft` | Viền, công tắc, chữ màu thương hiệu, nền nhạt |
| `--ink`, `--ink-soft` | Xanh navy đậm: nền tối, viền vòng quay, chân trang |
| `--wheel-1` … `--wheel-6` | 6 màu các ô trên vòng quay (bảng màu "MAINN Media") |

Logo nằm trong `assets/img/` (`logo-mainn-media.png` — giữ nguyên màu gốc ở cả giao diện sáng và tối, `logo-m.png`, `favicon.png`).

## Thêm công cụ mới

1. Tạo thư mục mới, ví dụ `chia-nhom/`, chứa `index.html` (sao chép từ `vong-quay/index.html` để giữ header/footer, rồi thay phần nội dung).
2. Mở `assets/js/site.js`, tìm mảng `TOOLS`, thêm/sửa một mục:
   ```js
   { id: "chia-nhom", name: "Chia nhóm ngẫu nhiên", nav: "Chia nhóm",
     desc: "Mô tả ngắn", href: "chia-nhom/", icon: "users", status: "live" }
   ```
   `status: "live"` = hiện trên menu và trang chủ; `"soon"` = hiện thẻ "Sắp ra mắt".
3. Trong `index.html` của công cụ mới, đặt `<body data-page="chia-nhom">` (trùng `id`) để menu tô sáng đúng mục.

## Cấu trúc thư mục

```
index.html              Chuyển hướng sang home/
home/index.html         Trang chủ
vong-quay/index.html    Trang vòng quay
assets/css/theme.css    Màu thương hiệu, giao diện sáng/tối (sửa ở đây)
assets/css/main.css     Giao diện chung
assets/js/site.js       Header, footer, danh sách công cụ, nút Sáng/Tối
assets/js/wheel.js      Logic vòng quay
assets/js/filekit.js    Hàm dùng chung cho công cụ file (kéo thả, tải về, nén zip)
assets/js/tool-*.js     Logic từng công cụ ảnh / PDF / video
assets/vendor/          Thư viện pdf-lib, fflate, Mediabunny
assets/img/             Logo, favicon
```
