# Tài liệu Hướng dẫn Chức năng Khách Hàng (Customer Feature)

Tài liệu này tổng hợp logic hoạt động cốt lõi của tính năng Quản lý/Thêm mới/Phân bổ Khách hàng. Nó được viết dưới dạng ngôn ngữ tự nhiên để các mô hình AI (như Google AI Studio, ChatGPT) hoặc lập trình viên mới tiếp cận có thể đọc hiểu ngay lập tức.

## 1. Cấu trúc Component Chính
Chức năng tạo mới khách hàng trước đây nằm trọn trong 1 file, hiện tại đã được thiết kế theo mô hình Component-based:
- **`CustomerFormModal.jsx`**: Đóng vai trò là "Bộ điều khiển" (Controller). Nó quản lý mảng (array) danh sách khách hàng muốn thêm mới (State `rows`), quản lý Loading state, gọi API để lấy Config (danh sách dòng xe, nguồn, kênh...) và gọi API để Lưu khách hàng.
- **`CustomerFormRow.jsx`**: Là Component giao diện (View). Chịu trách nhiệm hiển thị các ô nhập liệu cho 1 dòng khách hàng duy nhất.
- **`smartPasteUtils.js`**: Chứa logic xử lý văn bản phức tạp (Smart Paste) để bóc tách thông tin từ một chuỗi thô.

## 2. Các Biến (Trường Dữ Liệu) Chính
Mỗi một khách hàng được biểu diễn bằng một Object (trong hàm `createEmptyRow`) bao gồm:
* `customerName` (String): Tên khách hàng (Bắt buộc).
* `phone` (String): Số điện thoại khách hàng (Bắt buộc, chỉ nhận số, độ dài tiêu chuẩn).
* `ward` (String), `province` (String): Xã/Phường và Tỉnh/Thành phố. Có tính năng gợi ý (Suggestions) khi gõ phường.
* `carModel` (String): Dòng xe khách hàng quan tâm.
* `version` (String): Phiên bản của dòng xe.
* `source` (String): Nguồn mang khách hàng tới (Ví dụ: Hãng, Tự kiếm...).
* `channel` (String): Kênh tiếp cận (Ví dụ: Facebook, Zalo, Showroom...).
* `leadRating` (String): Phân loại tiềm năng (Hot, Warm, Cold, Booking).
* `testDrive` (String): Trạng thái lái thử. Mặc định là "Chưa". Nếu có, sẽ lưu ngày tháng (YYYY-MM-DD).
* `saleNote` (String): Ghi chú của Sales (Bắt buộc).

**Chế độ Phân Khách (Assign Mode):** Nếu người dùng là Quản lý (Manager, Admin, Giám đốc, TPKD), họ có quyền phân bổ khách cho nhân viên Sales. Các trường sau sẽ được thêm vào:
* `assigneeEmail`: Email của Sales nhận khách.
* `assigneeRole`: Vai trò của Sales.
* `assigneeDept`: Phòng ban của Sales.

## 3. Logic "Smart Paste" (Dán nhanh nội dung tổng hợp)
Đây là tính năng giúp Sales dán một đoạn text dài (copy từ Zalo/Facebook) và hệ thống tự bóc tách thông tin. Logic diễn ra như sau:
1. **Làm sạch chuỗi**: Loại bỏ các đường link URL dư thừa, xóa khoảng trắng thừa.
2. **Tìm Số Điện Thoại**: Dùng RegEx (`/(?:0|\+84)\s*[1-9](?:\s*\d){8}/g`) để tìm số điện thoại. Số điện thoại sẽ làm **Cột mốc chia đôi chuỗi**.
3. **Phân tách**: Phần text nằm *trước* số điện thoại thường là **Tên + Địa chỉ**. Phần text nằm *sau* số điện thoại thường là **Ghi chú**.
4. **Tìm Dòng xe & Nhân viên (nếu có)**: Quét các từ khóa về dòng xe (từ Config) và tên nhân viên (từ Staff List) trong hai đoạn text trên để điền vào trường tương ứng.
5. **Cập nhật State**: Sau khi bóc tách xong, dữ liệu sẽ được bắn ngược lại State của dòng nhập liệu đó.

## 4. Luồng Gọi API (API Flow)
- **Khi mở Popup**: Hệ thống gọi `getConfig` để lấy dropdowns (xe, tỉnh thành) và gọi `getStaffList` (nếu user có quyền phân khách).
- **Khi bấm Lưu (Submit)**:
  1. Validate: Kiểm tra các dòng (Rows) xem đã có Tên và SĐT chưa. Nếu đang ở Assign Mode, kiểm tra xem đã chọn Nhân viên nhận khách chưa.
  2. Formatting: Chuyển trường `leadRating` thành `"LEAD RATING"` (do backend yêu cầu).
  3. Gửi Request: 
     - Nếu là `isAssignMode = true`: Gọi `createAssignedCustomer` kèm danh sách phân bổ.
     - Nếu là mode bình thường: Gọi `addCustomers` (loại bỏ biến assignee trước khi gửi).
  4. Phản hồi: Hiển thị thông báo thành công (toast), đóng Modal và refresh lại danh sách khách hàng bên ngoài (`onSuccess`).
