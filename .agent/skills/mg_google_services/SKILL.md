---
name: mg-google-services
description: >-
  Skill chuyên dụng để quản lý, kết nối trực tiếp, đồng bộ dữ liệu và tự động deploy toàn bộ hệ thống
  Google Apps Script, Google Sheets, Google Drive và Cloud Firestore của dự án MG CRM Bình Dương.
  Kích hoạt khi cần can thiệp, cập nhật code Apps Script, đồng bộ báo cáo Lead, đọc/ghi Google Sheets,
  hoặc cấu hình triển khai hệ thống CRM MG.
---

# MG CRM — Kỹ năng Quản lý & Tự động Triển khai Toàn phần Google Services

Skill này cung cấp đầy đủ thông tin định danh, cấu hình, mã lệnh và quy trình tự động hóa 100% để Agent có toàn quyền điều khiển Google Apps Script, Google Sheets, Cloud Firestore và Vercel của dự án MG Bình Dương mà không cần yêu cầu người dùng cài đặt lại bất kỳ thứ gì.

---

## 1. Hệ thống Google Apps Script & Clasp CLI

Dự án đã cấu hình sẵn công cụ **Google Clasp CLI** được ủy quyền trực tiếp trên máy cục bộ.

* **Script ID**: `16Sa88sBePBFmwrsMciD35v3PtHvLeh5-dypShvvsLtUFU6iHO42fJnSb`
* **Thư mục mã nguồn Apps Script**: `/Users/thach/Data/Skoda/WebApp/skoda-crm_new/gs/`
* **Deployment ID chính**: `AKfycbzlqjS0pGwOq1zlW5nA5-cBfeJmOwdPU9jqC4utlP4XbK9oI9Nn6GO4AjxUr_fgBJeiOA`
* **Deployment ID dự phòng**: `AKfycbxHiYvE47lfRfUUB69esVJm9UUnICecFJsVzOMsRcsD7jr-FBm8ZC0ObnEh8b58Jl9axg`
* **URL Webhook Hoạt Động (Production)**:
  `https://script.google.com/macros/s/AKfycbzlqjS0pGwOq1zlW5nA5-cBfeJmOwdPU9jqC4utlP4XbK9oI9Nn6GO4AjxUr_fgBJeiOA/exec`

### 🛠️ Lệnh Tự Động Đẩy Code & Deploy Apps Script:
Mỗi khi chỉnh sửa file trong thư mục `gs/`, chạy chuỗi lệnh sau trong terminal để tự động cập nhật lên Google Apps Script:
```bash
npx @google/clasp push && npx @google/clasp deploy -i "AKfycbzlqjS0pGwOq1zlW5nA5-cBfeJmOwdPU9jqC4utlP4XbK9oI9Nn6GO4AjxUr_fgBJeiOA" --description "Auto Deploy"
```

---

## 2. Bản đồ Tệp Google Sheets (Spreadsheet Database)

| Tên Bảng Tính | Spreadsheet ID | Sheet Name | Mục Đích |
|---|---|---|---|
| **Báo cáo Lead Năm 2026 (Lead Report)** | `1x-j-IZsDNevlApwRN4HECVxtA7TryFFUH-7glH1stRU` | Tự động tạo theo tháng (`08/2026`, `09/2026`, ...) | Nhận danh sách KH tháng (cột A:E) và bảng đếm xe theo ngày (cột G:P) |
| **Dữ liệu CRM Tổng (KHTN / Config)** | `1ldrCJ3RT-ScXAyW4Xr6OAsXmEdWabfKn8uPiKuE3ZHU` | `KHTN`, `CAC NGUON`, `BC SOCIAL` | Sheet lưu trữ phụ và cấu hình nguồn |
| **Dữ liệu Nhân sự** | `1VvFRZ83Q1fIgcWWr7J16kc1JKw_4wLnbwKiaNxEwbLo` | `NHÂN SỰ` | Danh sách tài khoản nhân viên và phân quyền |

---

## 3. Cơ sở Dữ liệu Cloud Firestore (Chính)

Hệ thống Web App CRM đọc/ghi dữ liệu thời gian thực trực tiếp qua Firebase Cloud Firestore:

* **Firebase Project ID**: `mg-crm-26`
* **API Key**: `AIzaSyCZk2pmZaCxo2vgIyJFglrnXHIV9dnYpXk`
* **Auth Domain**: `mg-crm-26.firebaseapp.com`
* **Các Collections chính**:
  * `customers`: Toàn bộ dữ liệu khách hàng CRM
  * `reports`: Báo cáo hoạt động (Video, Livestream)
  * `users`: Danh sách nhân viên và quyền Admin/TPKD/Sale
  * `configs`: Cấu hình danh mục xe, kênh, nguồn
  * `assigned_customers`: Khách hàng được phân bổ chờ duyệt
* **REST API Endpoint**:
  `https://firestore.googleapis.com/v1/projects/mg-crm-26/databases/(default)/documents/{collection}`
* **Firestore Security Rules**: Luôn duy trì `allow read, write: if true;` vĩnh viễn trên Console.

---

## 4. Quy tắc Đồng bộ & Chuẩn hóa Dữ liệu Báo cáo Lead

### A. Bộ Lọc Dữ liệu Rác (Auto-Cleaner):
* **Số điện thoại không hợp lệ**: Loại bỏ số có độ dài `< 8` chữ số, hoặc chỉ toàn số `0` (`0`, `00000`, `0000000`).
* **Dòng xe để trống**: Loại bỏ bản ghi có `carModel` rỗng, `-`, `null`, `undefined`.

### B. Bảng Ánh Xạ Tên Xe (Car Model Mapping):
```javascript
const CAR_MODEL_MAP = {
  'mg5': 'MG5',
  'new mg5': 'MG5',       // Gộp NEW MG5 vào MG5
  'zs': 'ZS',
  'hs': 'HS',
  'mg7': 'MG7',
  'mg4': 'MG4',
  'g50': 'G50',
  'cyberster': 'Cyberster',
  'mg urban': 'MG Urban'
};
// Thứ tự cột đếm H->O: ['MG5', 'ZS', 'HS', 'MG7', 'MG4', 'G50', 'Cyberster', 'MG Urban']
```

### C. Cấu trúc Vùng Dữ liệu Sheet "Báo cáo":
* **Cột A**: `STT` (1, 2, 3...)
* **Cột B**: `Họ tên`
* **Cột C**: `Số điện thoại` (dạng text `'09...`)
* **Cột D**: `Xe quan tâm` (đã mapping)
* **Cột E**: `Ngày` (`DD/MM/YYYY`)
* **Cột G**: `Ngày` (1 đến 31)
* **Cột H -> O**: Đếm số xe phát sinh theo từng ngày
* **Cột P**: `Tổng` xe trong ngày
* **Dòng 33**: Hàng `Tổng` cộng toàn bộ tháng

---

## 5. Tự động Hóa Triển khai Vercel (Frontend)

* **Vercel Scope/Team**: `thach-team`
* **Project Name**: `mg-crm-2026`
* **Production Domain**: `https://crm.binhduong-mgmotor.com.vn`
* **Lệnh Build & Deploy Production**:
```bash
npm run build && npx vercel --prod --yes
```

---

## 6. Lịch Tự Động Hóa Hàng Ngày (Trigger 16:00)

* Hàm kích hoạt: `autoSyncLeadReport()` trong `LeadReportSync.gs`.
* Lịch trình: Chạy tự động lúc **16:00 ICT** mỗi ngày qua Google Apps Script Time-Driven Trigger.
* Cơ chế: Tự động truy vấn Cloud Firestore REST API, lọc khách hàng hợp lệ trong tháng và ghi đè số liệu chính xác vào Sheet Báo cáo.
