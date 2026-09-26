const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// 1. โครงสร้างข้อมูล Queue (ตามสไลด์ Week 6)
// ==========================================
class Queue {
  constructor() {
    this.items = [];
  }

  // เพิ่มข้อมูลต่อท้ายคิว
  enqueue(item) {
    this.items.push(item);
  }

  // เอาข้อมูลหัวคิวออก (FIFO)
  dequeue() {
    if (this.isEmpty()) {
      return null;
    }
    return this.items.shift();
  }

  // ดูข้อมูลหัวคิว
  peek() {
    return this.items[0];
  }

  // เช็คว่าคิวว่างไหม
  isEmpty() {
    return this.items.length === 0;
  }

  // ดูจำนวนในคิว
  size() {
    return this.items.length;
  }
}

// ==========================================
// 2. อัลกอริทึม Sort (Bubble Sort เขียนเอง)
// ==========================================
// เรียงลำดับจากค่ามากไปน้อย เพื่อหา TOP 5
function bubbleSort(arr) {
  let result = [...arr];
  for (let i = 0; i < result.length; i++) {
    for (let j = 0; j < result.length - 1; j++) {
      if (result[j].value < result[j + 1].value) {
        // สลับที่ด้วยตัวแปร temp
        let temp = result[j];
        result[j] = result[j + 1];
        result[j + 1] = temp;
      }
    }
  }
  return result;
}

// ==========================================
// 3. กำหนดเงื่อนไขสีตัวเลข (ดี = เขียว / แย่ = แดง)
// ==========================================
function getColor(type, value) {
  if (type === 'gdp') {
    // GDP: โตเกิน 0% คือดี (เขียว), ติดลบคือแย่ (แดง)
    return value > 0 ? 'green' : 'red';
  }
  if (type === 'inflation') {
    // เงินเฟ้อ: 1% - 4% ถือว่าปกติ (เขียว), ถ้าสูงเกินไปหรือติดลบ (แดง)
    return value >= 1.0 && value <= 4.0 ? 'green' : 'red';
  }
  if (type === 'unemployment') {
    // ว่างงาน: ต่ำกว่า 5% ถือว่าดี (เขียว), 5% ขึ้นไปคือคนตกงานเยอะ (แดง)
    return value < 5.0 ? 'green' : 'red';
  }
  return 'green';
}

// ข้อมูลสำรองกรณีเน็ตหลุดหรือไม่สามารถเชื่อมต่อ API ได้ (ปี 2025)
const fallbackData = {
  gdp: [
    { country: 'Guyana', value: 19.3, displayValue: '19.3%', colorClass: 'green', year: '2025' },
    { country: 'Libya', value: 13.4, displayValue: '13.4%', colorClass: 'green', year: '2025' },
    { country: 'Ireland', value: 12.3, displayValue: '12.3%', colorClass: 'green', year: '2025' },
    { country: 'Kyrgyz Republic', value: 11.1, displayValue: '11.1%', colorClass: 'green', year: '2025' },
    { country: 'Ethiopia', value: 9.8, displayValue: '9.8%', colorClass: 'green', year: '2025' }
  ],
  inflation: [
    { country: 'Iran, Islamic Rep.', value: 42.2, displayValue: '42.2%', colorClass: 'red', year: '2025' },
    { country: 'Turkiye', value: 34.9, displayValue: '34.9%', colorClass: 'red', year: '2025' },
    { country: 'Burundi', value: 34.1, displayValue: '34.1%', colorClass: 'red', year: '2025' },
    { country: 'Haiti', value: 28.6, displayValue: '28.6%', colorClass: 'red', year: '2025' },
    { country: 'Malawi', value: 28.4, displayValue: '28.4%', colorClass: 'red', year: '2025' }
  ],
  unemployment: [
    { country: 'Eswatini', value: 34.2, displayValue: '34.2%', colorClass: 'red', year: '2025' },
    { country: 'South Africa', value: 32.4, displayValue: '32.4%', colorClass: 'red', year: '2025' },
    { country: 'Djibouti', value: 26.0, displayValue: '26.0%', colorClass: 'red', year: '2025' },
    { country: 'Botswana', value: 24.5, displayValue: '24.5%', colorClass: 'red', year: '2025' },
    { country: 'Gabon', value: 20.2, displayValue: '20.2%', colorClass: 'red', year: '2025' }
  ]
};

// ==========================================
// 4. ฟังก์ชันดึงข้อมูลจาก World Bank API (ปี 2025)
// ==========================================
async function fetchIndicator(indicatorCode) {
  // ล็อคปี 2025 ตามที่ผู้ใช้ต้องการ
  const url = `https://api.worldbank.org/v2/country/all/indicator/${indicatorCode}?date=2025&format=json&per_page=300`;
  const response = await fetch(url);
  const data = await response.json();

  let list = [];
  if (data && data[1]) {
    for (let item of data[1]) {
      // กรองเอาเฉพาะข้อมูลที่มีตัวเลข และไม่ใช่ชื่อภูมิภาค
      if (item.value !== null && item.countryiso3code && !item.country.value.includes('&')) {
        list.push({
          country: item.country.value,
          value: parseFloat(item.value.toFixed(1)),
          displayValue: item.value.toFixed(1) + '%',
          year: '2025'
        });
      }
    }
  }
  return list;
}

// ตัวแปรแคชใน Memory (ตามที่อาจารย์แนะนำในข้อควรรู้เรื่อง Vercel)
// ช่วยให้กดรีเฟรชแล้วข้อมูลแสดงทันทีใน 1ms ไม่ต้องรอยิง World Bank ซ้ำ
let cachedTop5 = null;

// ==========================================
// 5. REST API สำหรับส่งข้อมูล TOP 5 ให้หน้าบ้าน
// ==========================================
app.get('/api/dashboard/top5', async (req, res) => {
  // ถ้าเคยดึงมาแล้วและมีแคชอยู่ ให้ส่งกลับทันที ไม่ต้องรอนาน
  if (cachedTop5) {
    return res.json({
      status: 'success',
      data: cachedTop5
    });
  }

  try {
    // นำ Queue มาใช้จัดคิวการดึงข้อมูล 3 ตัวตามลำดับ (FIFO)
    const requestQueue = new Queue();
    requestQueue.enqueue({ type: 'gdp', code: 'NY.GDP.MKTP.KD.ZG' });
    requestQueue.enqueue({ type: 'inflation', code: 'FP.CPI.TOTL.ZG' });
    requestQueue.enqueue({ type: 'unemployment', code: 'SL.UEM.TOTL.ZS' });

    const results = {};

    // ดึงข้อมูลออกจากคิวทีละตัวตามลำดับ
    while (!requestQueue.isEmpty()) {
      const task = requestQueue.dequeue();
      const rawData = await fetchIndicator(task.code);

      // เรียงลำดับด้วย Bubble Sort ที่เขียนเอง
      const sorted = bubbleSort(rawData);

      // ตัดเอา 5 อันดับแรก พร้อมใส่สี green / red
      const top5 = sorted.slice(0, 5).map(item => ({
        ...item,
        colorClass: getColor(task.type, item.value)
      }));

      results[task.type] = top5;
    }

    // เก็บผลลัพธ์ไว้ในตัวแปรแคช
    cachedTop5 = results;

    res.json({
      status: 'success',
      data: results
    });

  } catch (error) {
    console.log('API Error, using fallback data:', error.message);
    res.json({
      status: 'fallback',
      data: fallbackData
    });
  }
});

// ส่ง index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// เปิด server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server is running at: http://localhost:${PORT}`);
  });
}

module.exports = app;