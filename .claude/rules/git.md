# Git workflow (ใช้กับทุกงาน)

## Commit message

  - ใช้ conventional commit message format : `<type>(<scope>): <subject>`
  - feat: เพิ่มฟีเจอร์ใหม่
  - fix: แก้ไขบั๊ก
  - docs: แก้ไขเอกสาร
  - style: แก้ไขรูปแบบโค้ด (เช่น การจัดวาง, การเว้นวรรค)
  - refactor: ปรับปรุงโค้ดโดยไม่เปลี่ยนพฤติกรรม
  - test: เพิ่มหรือแก้ไขการทดสอบ
  - chore: งานอื่น ๆ ที่ไม่เกี่ยวข้องกับโค้ด (เช่น การตั้งค่า, การอัปเดต dependencies)
  - ใช้ ภาษาอังกฤษ ตัวพิมพ์เล็ก ไม่เกิน 72 ตัวอักษร เช่น `feat: add coupon validate at checkout`
  - ใช้ 1 commit ต่อ 1 เรื่อง ห้ามรวมการจัด format ไฟล์อื่นไปกับการแก้ logic