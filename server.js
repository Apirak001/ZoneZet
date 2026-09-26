// นำเข้า Express framework สำหรับสร้างเว็บเซิร์ฟเวอร์
const express = require("express");
// นำเข้า module path สำหรับจัดการเส้นทางไฟล์
const path = require("path");

// สร้าง Express application
const app = express();
// กำหนดพอร์ต จาก environment variable หรือใช้ 3000 เป็นค่าเริ่มต้น
const PORT = process.env.PORT || 3000;

// ให้ Express เสิร์ฟไฟล์ static (HTML, CSS, รูปภาพ) จากโฟลเดอร์ "public"
app.use(express.static(path.join(__dirname, "public")));

// ถ้าเข้า URL ไหนที่ไม่ตรงกับไฟล์ static ให้ส่ง index.html กลับไป
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// เปิดเซิร์ฟเวอร์รอรับ request ที่พอร์ตที่กำหนด
app.listen(PORT, () => {
  console.log(`ZoneZet server is running at http://localhost:${PORT}`);
});
