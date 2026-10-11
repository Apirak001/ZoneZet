/**
 * ==============================================================
 * Project: ZoneZet Economic Dashboard (Course 801201)
 * File: server.js
 * Description: เซิร์ฟเวอร์หลักของโปรเจกต์ ZoneZet ทำงานด้วย Node.js & Express
 *              - นำโครงสร้างข้อมูล Queue (Week 6) มาประยุกต์ใช้จัดลำดับการดึงข้อมูล
 *              - ใช้อัลกอริทึม Bubble Sort จัดอันดับข้อมูล TOP 5
 *              - ให้บริการ REST API สำหรับหน้า Dashboard และตารางข้อมูล
 *              - มีระบบ In-Memory Cache (Hash Table) เพื่อความรวดเร็วในการโหลดข้อมูล
 * ==============================================================
 */

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// [ตั้งค่า Middleware]: รองรับ JSON Body และแชร์ไฟล์ Static ในโฟลเดอร์ public
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==============================================================
// 1. โครงสร้างข้อมูล Queue (FIFO — First-In, First-Out) ตามสไลด์ Week 6
// ==============================================================
// [หน้าที่]: ใช้จัดลำดับคำขอ (Task Queue) ในการดึงข้อมูล 3 ตัวชี้วัดให้ประมวลผลตามลำดับอย่างเป็นธรรม
class Queue {
  constructor() {
    this.items = []; // อาเรย์ภายในสำหรับจัดเก็บสมาชิกในคิว
  }

  // [Enqueue]: เพิ่มข้อมูลตัวใหม่ต่อท้ายคิว
  enqueue(item) {
    this.items.push(item);
  }

  // [Dequeue]: นำข้อมูลตัวแรกสุดออกจากหัวคิว (FIFO) และคืนค่ากลับมา
  dequeue() {
    if (this.isEmpty()) {
      return null;
    }
    return this.items.shift();
  }

  // [Peek]: ดูข้อมูลตัวแรกที่อยู่หัวคิวโดยไม่นำออกจากคิว
  peek() {
    return this.items[0];
  }

  // [isEmpty]: ตรวจสอบว่าคิวว่างหรือไม่ (คืนค่า true/false)
  isEmpty() {
    return this.items.length === 0;
  }

  // [Size]: ดูจำนวนงานหรือข้อมูลทั้งหมดที่กำลังรออยู่ในคิว
  size() {
    return this.items.length;
  }
}

// ==============================================================
// 2. อัลกอริทึม Sort (Bubble Sort เขียนเอง ไม่ใช้ .sort() built-in)
// ==============================================================
/**
 * [หน้าที่]: จัดเรียงข้อมูลจากค่ามากไปหาน้อย เพื่อหา 5 อันดับแรก (TOP 5)
 * [หลักการ]: เปรียบเทียบข้อมูลคู่ติดกัน หากตัวซ้ายน้อยกว่าตัวขวา จะสลับที่กันด้วยตัวแปร temp
 * [ประโยชน์ต่อ UX]: ผู้ใช้เห็น 5 ประเทศที่มีอัตราสูงสุดได้ทันทีบนหน้าแรก
 * @param {Array} arr - อาร์เรย์ของข้อมูลตัวเลขเศรษฐกิจ
 * @returns {Array} อาร์เรย์ใหม่ที่จัดเรียงลำดับเรียบร้อยแล้ว
 */
function bubbleSort(arr) {
  let result = [...arr]; // โคลนข้อมูลออกมาเพื่อไม่ให้กระทบข้อมูลต้นฉบับ
  for (let i = 0; i < result.length; i++) {
    for (let j = 0; j < result.length - 1; j++) {
      // เงื่อนไขเรียงจากมากไปน้อย: ถ้าตัวหน้า < ตัวหลัง ให้สลับตำแหน่ง
      if (result[j].value < result[j + 1].value) {
        let temp = result[j];          // พักค่าตัวหน้าไว้ใน temp
        result[j] = result[j + 1];     // เอาตัวหลังมาแทนที่ตัวหน้า
        result[j + 1] = temp;          // เอาค่าจาก temp ไปใส่ตัวหลัง
      }
    }
  }
  return result;
}

// ==============================================================
// 3. กำหนดเงื่อนไขสีตัวเลขและ Icon แนวโน้ม (ดี = เขียว / แย่ = แดง)
// ==============================================================
// [หน้าที่]: แปลงตัวเลขเปอร์เซ็นต์ให้เป็นสถานะสีและทิศทางตามหลักเศรษฐศาสตร์
function getIndicatorStatus(type, value) {
  if (type === 'gdp') {
    // GDP: เติบโตมากกว่า 0% = ดี (เขียว, ลูกศรขึ้น), ติดลบ = ถดถอย (แดง, ลูกศรลง)
    const isGood = value > 0;
    return {
      trend: isGood ? 'up' : 'down',
      colorClass: isGood ? 'green' : 'red'
    };
  }

  if (type === 'inflation') {
    // เงินเฟ้อ: 1% - 4% = พอดี (เขียว, ลูกศรขึ้น), > 4% = แพงเกิน (แดง), < 1% = เสี่ยงเงินฝืด (แดง)
    const isGood = value >= 1.0 && value <= 4.0;
    return {
      trend: value >= 0 ? 'up' : 'down',
      colorClass: isGood ? 'green' : 'red'
    };
  }

  if (type === 'unemployment') {
    // อัตราว่างงาน: ต่ำกว่า 5% = ดี คนมีงานทำ (เขียว, ลูกศรลง), 5% ขึ้นไป = ว่างงานสูง (แดง, ลูกศรขึ้น)
    const isGood = value < 5.0;
    return {
      trend: isGood ? 'down' : 'up',
      colorClass: isGood ? 'green' : 'red'
    };
  }

  return { trend: 'up', colorClass: 'green' };
}

// ==============================================================
// 4. [DSA: Hash Set] จัดการรายชื่อกลุ่มทวีปและเกลี่ยภูมิภาคเดี่ยว
// ==============================================================
// [Hash Set O(1)]: รวมรหัสและชื่อกลุ่มภูมิภาครวม (Aggregates) ที่ต้องตัดทิ้ง เพื่อไม่ให้หลุดมาเป็นชื่อประเทศ
const EXCLUDED_ENTITIES = new Set([
  'South Asia', 'East Asia & Pacific', 'Europe & Central Asia',
  'Latin America & Caribbean', 'Middle East & North Africa',
  'Sub-Saharan Africa', 'North America', 'World', 'Arab World',
  'Euro area', 'European Union', 'SAS', 'EAS', 'ECS', 'LCN', 'MEA', 'SSF', 'NAC', 'WLD'
]);

/**
 * [หน้าที่]: เกลี่ยชื่อภูมิภาคผสมของ World Bank ให้เป็นภูมิภาคเดี่ยวที่แม่นยำ
 * [แก้ปัญหา]: ไม่ให้ 1 ประเทศมีชื่อภูมิภาคซัดไป 2-4 อัน (เช่น Europe & Central Asia)
 */
function normalizeRegion(countryName, rawRegion) {
  if (!rawRegion) return 'Other';
  const cName = (countryName || '').trim();
  const region = rawRegion.trim();

  // 1. แยกประเทศแถบเอเชียกลางออกจากยุโรป
  const centralAsianCountries = ['Kazakhstan', 'Kyrgyz Republic', 'Kyrgyzstan', 'Tajikistan', 'Turkmenistan', 'Uzbekistan'];
  if (centralAsianCountries.some(c => cName.includes(c))) return 'Central Asia';

  // 2. แยกประเทศแถบแอฟริกาเหนือออกจากตะวันออกกลาง
  const northAfricanCountries = ['Egypt, Arab Rep.', 'Egypt', 'Libya', 'Algeria', 'Morocco', 'Tunisia'];
  if (northAfricanCountries.some(c => cName.includes(c))) return 'North Africa';

  // 3. ปรับชื่อกลุ่มผสมให้กระชับ
  if (region.includes('Middle East') || region.includes('North Africa')) {
    if (cName.includes('Afghanistan') || cName.includes('Pakistan')) return 'South Asia';
    return 'Middle East';
  }
  if (region.includes('Europe')) return 'Europe';
  if (region.includes('Latin America') || region.includes('Caribbean')) {
    const caribbean = ['Bahamas', 'Barbados', 'Cuba', 'Dominican Republic', 'Haiti', 'Jamaica', 'Trinidad and Tobago'];
    if (caribbean.some(c => cName.includes(c))) return 'Caribbean';
    return 'Latin America';
  }
  if (region.includes('East Asia') || region.includes('Pacific')) {
    const oceania = ['Australia', 'New Zealand', 'Fiji', 'Papua New Guinea', 'Samoa', 'Tonga', 'Vanuatu', 'Solomon Islands'];
    if (oceania.some(c => cName.includes(c))) return 'Oceania';
    return 'East Asia';
  }
  if (region.includes('Sub-Saharan') || region.includes('Africa')) return 'Sub-Saharan Africa';
  if (region.includes('South Asia')) return 'South Asia';
  if (region.includes('North America')) return 'North America';

  return region;
}

// [DSA: Hash Table]: แคชข้อมูลประเทศในหน่วยความจำ
let serverCountryMetadataCache = null;

/**
 * [หน้าที่]: ดึงและสร้าง Hash Table รายชื่อประเทศจริงจาก World Bank (คัดกลุ่มทวีปออก)
 */
async function getServerCountryMetadata() {
  if (serverCountryMetadataCache) return serverCountryMetadataCache;
  try {
    const res = await fetch('https://api.worldbank.org/v2/country?format=json&per_page=350');
    const data = await res.json();
    const map = {}; // สร้าง Hash Table สำหรับเก็บข้อมูลประเทศ

    if (data && data[1]) {
      data[1].forEach(c => {
        const name = c.name ? c.name.trim() : '';
        const id = c.id ? c.id.trim() : '';
        const capital = c.capitalCity ? c.capitalCity.trim() : '';
        const regionVal = (c.region && c.region.value) ? c.region.value.trim() : '';

        // เงื่อนไขประเทศจริง: ต้องมีเมืองหลวง และไม่ใช่ Aggregates
        if (
          regionVal !== 'Aggregates' &&
          regionVal !== '' &&
          capital !== '' &&
          !EXCLUDED_ENTITIES.has(name) &&
          !EXCLUDED_ENTITIES.has(id)
        ) {
          // เก็บลง Hash Table โดยใช้รหัสประเทศ id เป็น Key เพื่อให้ค้นหาได้ในเวลา O(1)
          map[id] = {
            name: name,
            iso2: c.iso2Code ? c.iso2Code.toLowerCase() : '',
            region: normalizeRegion(name, regionVal)
          };
        }
      });
    }

    serverCountryMetadataCache = map;
    return serverCountryMetadataCache;
  } catch (err) {
    return {};
  }
}

// ==============================================================
// 5. ฟังก์ชันดึงข้อมูลสถิติจาก World Bank API ตามปีที่ระบุ
// ==============================================================
async function fetchIndicator(indicatorCode, year = '2025') {
  const [countryMap, rawResponse] = await Promise.all([
    getServerCountryMetadata(),
    fetch(`https://api.worldbank.org/v2/country/all/indicator/${indicatorCode}?date=${year}&format=json&per_page=300`)
      .then(r => r.json())
      .catch(() => null)
  ]);

  let list = [];
  if (rawResponse && rawResponse[1]) {
    for (let item of rawResponse[1]) {
      const code = item.countryiso3code || (item.country && item.country.id);
      // [DSA: Hash Table Lookup O(1)]: ตรวจสอบข้อมูลประเทศด้วย countryMap[code] ทันที
      if (item.value !== null && countryMap[code] && !EXCLUDED_ENTITIES.has(countryMap[code].name)) {
        list.push({
          country: countryMap[code].name,
          iso2: countryMap[code].iso2,
          region: countryMap[code].region,
          value: parseFloat(item.value.toFixed(1)),
          displayValue: item.value.toFixed(1) + '%',
          year: String(year)
        });
      }
    }
  }
  return list;
}

// [ข้อมูลสำรอง]: ป้องกันระบบล่มกรณีเน็ตหลุดหรือไม่สามารถเชื่อมต่อ API ได้ (Technical Execution)
const fallbackData = {
  gdp: [
    { country: 'Guyana', iso2: 'gy', value: 19.3, displayValue: '19.3%', colorClass: 'green', trend: 'up', year: '2025' },
    { country: 'Libya', iso2: 'ly', value: 13.4, displayValue: '13.4%', colorClass: 'green', trend: 'up', year: '2025' },
    { country: 'Ireland', iso2: 'ie', value: 12.3, displayValue: '12.3%', colorClass: 'green', trend: 'up', year: '2025' },
    { country: 'Kyrgyz Republic', iso2: 'kg', value: 11.1, displayValue: '11.1%', colorClass: 'green', trend: 'up', year: '2025' },
    { country: 'Ethiopia', iso2: 'et', value: 9.8, displayValue: '9.8%', colorClass: 'green', trend: 'up', year: '2025' }
  ],
  inflation: [
    { country: 'Iran, Islamic Rep.', iso2: 'ir', value: 42.2, displayValue: '42.2%', colorClass: 'red', trend: 'up', year: '2025' },
    { country: 'Turkiye', iso2: 'tr', value: 34.9, displayValue: '34.9%', colorClass: 'red', trend: 'up', year: '2025' },
    { country: 'Burundi', iso2: 'bi', value: 34.1, displayValue: '34.1%', colorClass: 'red', trend: 'up', year: '2025' },
    { country: 'Haiti', iso2: 'ht', value: 28.6, displayValue: '28.6%', colorClass: 'red', trend: 'up', year: '2025' },
    { country: 'Malawi', iso2: 'mw', value: 28.4, displayValue: '28.4%', colorClass: 'red', trend: 'up', year: '2025' }
  ],
  unemployment: [
    { country: 'Eswatini', iso2: 'sz', value: 34.2, displayValue: '34.2%', colorClass: 'red', trend: 'up', year: '2025' },
    { country: 'South Africa', iso2: 'za', value: 32.4, displayValue: '32.4%', colorClass: 'red', trend: 'up', year: '2025' },
    { country: 'Djibouti', iso2: 'dj', value: 26.0, displayValue: '26.0%', colorClass: 'red', trend: 'up', year: '2025' },
    { country: 'Botswana', iso2: 'bw', value: 24.5, displayValue: '24.5%', colorClass: 'red', trend: 'up', year: '2025' },
    { country: 'Gabon', iso2: 'ga', value: 20.2, displayValue: '20.2%', colorClass: 'red', trend: 'up', year: '2025' }
  ]
};

// [DSA: Hash Cache]: ตัวแปรแคชสำหรับเก็บข้อมูลหน้า Dashboard TOP 5
let cachedTop5 = null;

// ==============================================================
// 6. REST API: GET /api/dashboard/top5 (ข้อมูล 5 อันดับแรกหน้าแรก)
// ==============================================================
app.get('/api/dashboard/top5', async (req, res) => {
  // หากมีแคชอยู่แล้ว ให้ส่งข้อมูลกลับทันที ไม่ต้องรอนาน (UX ไวระดับ 1ms)
  if (cachedTop5) {
    return res.json({
      status: 'success',
      data: cachedTop5
    });
  }

  try {
    // [ประยุกต์ใช้ DSA: Queue (FIFO)]:
    // นำ Queue มาใช้จัดคิวคำขอทั้ง 3 ตัวชี้วัดตามลำดับก่อน-หลังอย่างเป็นธรรม
    const requestQueue = new Queue();
    requestQueue.enqueue({ type: 'gdp', code: 'NY.GDP.MKTP.KD.ZG' });
    requestQueue.enqueue({ type: 'inflation', code: 'FP.CPI.TOTL.ZG' });
    requestQueue.enqueue({ type: 'unemployment', code: 'SL.UEM.TOTL.ZS' });

    const results = {};

    // ดึงงานออกจากคิวทีละตัวตามลำดับ FIFO
    while (!requestQueue.isEmpty()) {
      const task = requestQueue.dequeue();
      const rawData = await fetchIndicator(task.code);

      // [ประยุกต์ใช้ DSA: Bubble Sort]: เรียงลำดับจากค่ามากไปหาน้อย
      const sorted = bubbleSort(rawData);

      // ตัดเอาเฉพาะ 5 อันดับแรก พร้อมระบุสีสถานะ
      const top5 = sorted.slice(0, 5).map(item => ({
        ...item,
        colorClass: getIndicatorStatus(task.type, item.value).colorClass,
        trend: getIndicatorStatus(task.type, item.value).trend
      }));

      results[task.type] = top5;
    }

    // บันทึกผลลัพธ์ลงในแคช
    cachedTop5 = results;

    res.json({
      status: 'success',
      data: results
    });

  } catch (error) {
    console.error('API Error, using fallback data:', error.message);
    res.json({
      status: 'fallback',
      data: fallbackData
    });
  }
});

// ==============================================================
// 7. เชื่อมต่อ Route จัดการ Indicator (แยกโมดูลเพื่อความเป็นระเบียบ)
// ==============================================================
const indicatorRoutes = require('./routes/indicatorRoutes');
app.use('/api', indicatorRoutes);

// ส่ง index.html สำหรับเส้นทางทั่วไปเพื่อรองรับระบบ SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// เปิดการทำงานของเซิร์ฟเวอร์
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server is running at: http://localhost:${PORT}`);
  });
}

module.exports = app;