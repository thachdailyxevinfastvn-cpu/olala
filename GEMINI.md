# MG CRM 2026 — Quy chuẩn Hệ thống & Tự động Triển khai

## 1. Dịch vụ Google Apps Script & Sheets
* Thư mục mã nguồn Apps Script: `gs/`
* Lệnh tự động đẩy code & deploy:
  `npx @google/clasp push && npx @google/clasp deploy -i "AKfycbzlqjS0pGwOq1zlW5nA5-cBfeJmOwdPU9jqC4utlP4XbK9oI9Nn6GO4AjxUr_fgBJeiOA" --description "Auto Deploy"`
* Sheet Báo cáo Lead Năm 2026: `1x-j-IZsDNevlApwRN4HECVxtA7TryFFUH-7glH1stRU` (Tên file: `(MBDU) - Báo cáo Lead 2026`)
* Cấu trúc Sheet: Tự động tạo và rót dữ liệu theo từng tháng (`08/2026`, `09/2026`, `10/2026`...)
* Sheet Dữ liệu Nguồn: `1ldrCJ3RT-ScXAyW4Xr6OAsXmEdWabfKn8uPiKuE3ZHU`
* Webhook Production URL: `https://script.google.com/macros/s/AKfycbzlqjS0pGwOq1zlW5nA5-cBfeJmOwdPU9jqC4utlP4XbK9oI9Nn6GO4AjxUr_fgBJeiOA/exec`

## 2. Cloud Firestore (mg-crm-26)
* Project ID: `mg-crm-26`
* REST API: `https://firestore.googleapis.com/v1/projects/mg-crm-26/databases/(default)/documents/{collection}`
* Collections: `customers`, `reports`, `users`, `configs`, `assigned_customers`

## 3. Vercel Production
* Team/Scope: `thach-team`
* Project: `mg-crm-2026`
* Domain: `https://crm.binhduong-mgmotor.com.vn`
* Lệnh deploy: `npm run build && npx vercel --prod --yes`

## 4. Quy chuẩn Dữ liệu Khách hàng Báo cáo Lead
* Lọc bỏ số điện thoại rác: `cleanPhone.length >= 8 && !/^0+$/.test(cleanPhone)`
* Lọc bỏ khách hàng thiếu tên xe
* Gộp `NEW MG5` vào `MG5`
* Bỏ qua xe `RX5` ở bảng đếm
