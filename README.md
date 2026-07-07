# MeetPlanning

ระบบจองและจัดหาห้องประชุม สร้างด้วย Vue 3 + Node.js + MySQL

## ฟีเจอร์หลัก

- เข้าสู่ระบบด้วยบทบาท admin และ user
- Dashboard สรุปห้องพร้อมใช้ รายการรออนุมัติ และกำหนดการถัดไป
- ค้นหาห้องตามวัน เวลา จำนวนคน อาคาร และอุปกรณ์
- ส่งคำขอจองห้องพร้อมรายละเอียดการประชุม
- อนุมัติ ปฏิเสธ และยกเลิกการจอง
- API สำหรับห้อง อุปกรณ์ การจอง และ dashboard
- ฐานข้อมูล MySQL พร้อมข้อมูลตัวอย่าง

## เริ่มใช้งาน

1. Import `database/schema.sql` เข้า MySQL
2. คัดลอก `backend/.env.example` เป็น `backend/.env` แล้วแก้ค่าเชื่อมต่อฐานข้อมูล
3. เปิด backend

```bash
cd P:\MeetPlanning\backend
npm install
npm run dev
```

4. เปิด frontend

```bash
cd P:\MeetPlanning\frontend
npm install
npm run dev
```

## ค่าเริ่มต้น

- Frontend: http://localhost:5173
- Backend: http://localhost:4000
- Admin: `admin@meetplanning.local` / `admin1234`
- User: `user@meetplanning.local` / `user1234`
