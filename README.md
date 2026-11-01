# Nhà Nguyện Bình An — TikTok Live RPC

Bản chuyển đổi Công giáo từ ZIP gốc. Nhân vật: giáo dân trang phục trắng/xanh, năm pose PNG trong suốt; cung thánh mới với thánh giá, bàn thờ, kính màu và lối đi đỏ. Nền và sprite tạo bằng công cụ tạo ảnh tích hợp; prompt nằm trong docs/asset-manifest.json.

## Chạy
Node.js 20+; `npm ci`, `npm start`; mở http://localhost:3000 và http://localhost:3000/admin. OBS Browser Source 1080×1920. Demo không cần TikTok. Không tự kết nối tài khoản của người khác khi khởi động; chỉ kết nối khi nhập tài khoản hoặc đặt TIKTOK_USER.

Trên màn hình chính, bấm **Phóng to thánh điện** để tập trung khung hình vào Chúa Giêsu và bàn thờ; bấm lại hoặc nhấn `Esc` để trở về. Nút này được ẩn trong chế độ OBS (`?obs=1`).

TTS dùng Web Speech API và giọng tiếng Việt có sẵn trong trình duyệt; không cần Python, model hoặc dịch vụ tổng hợp giọng trên server. Bấm nút bật âm thanh một lần để trình duyệt cho phép phát âm thanh. Giọng cụ thể phụ thuộc các giọng đã cài trong hệ điều hành/trình duyệt.

Kết nối TikTok LIVE: nhập username chính xác hoặc link LIVE của tài khoản đang phát công khai. Nếu TikTok không phân giải được Room ID từ username, có thể nhập Room ID dạng số trực tiếp.

Danh sách tương tác có thể gồm cả người từ sự kiện TikTok LIVE thật và tài khoản mô phỏng; giao diện chỉ gắn nhãn **LIVE THẬT**, **THỦ CÔNG** hoặc **LỊCH SỬ**, không hiển thị nhãn cho tài khoản mô phỏng.

## Chuyển đổi đầy đủ
- Bỏ ảnh Phật, hoa sen, chùa và sprite áo lam khỏi public/assets.
- Thắp hương → thắp nến; mõ → đọc kinh; xin xăm → thẻ suy niệm tự viết (không bói toán, không phải trích Kinh Thánh).
- Không lạy sát đất/tam bái: chuỗi đứng/đi → bái gối → quỳ và cúi đầu.
- Lời chào, lời mặc định, quà, TTS text, admin và màn hình OBS dùng nội dung Công giáo.
- Giữ namespace temple.*, event type và field cũ để tương thích client tích hợp. fortune là thẻ suy niệm; merit chỉ là điểm tương tác, không biểu thị ơn phúc hay công trạng tôn giáo; coins là metadata quà TikTok, không mua ơn phúc.
- Các biến CSS/JS như lotus, buddha, prostrate còn một số tên nội bộ tương thích; asset hiển thị đã đổi. Ba pose cũ dùng chung pose cúi đầu, không phải tám frame hoạt họa riêng.

## Kiểm tra
`npm test`: kiểm tra HTTP asset, JSON-RPC, comment routing, WebSocket, reflection deck và hình trong suốt. `node tests/browser.cjs`: kiểm tra trình duyệt desktop, mobile, OBS và nút tương tác (cần Playwright/Chromium). Kết quả thực tế trong docs/verification.json. Kết nối TikTok thật và giọng có sẵn trên trình duyệt cần xác minh trong môi trường tương ứng.
