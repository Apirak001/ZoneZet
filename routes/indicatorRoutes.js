// routes/indicatorRoutes.js
// จัดการ API สำหรับดึงข้อมูลรายชื่อประเทศ (GDP, Inflation, Unemployment)
// รองรับการเลือกปี 2020-2025 และค้นหาประเทศ

const express = require('express');
const router = express.Router();

// รหัสตัวชี้วัดของ World Bank
const INDICATOR_CODES = {
  gdp: 'NY.GDP.MKTP.KD.ZG',
  inflation: 'FP.CPI.TOTL.ZG',
  unemployment: 'SL.UEM.TOTL.ZS'
};

// ตัวแปร In-Memory Cache เก็บข้อมูลแยกตามประเภทและปี (เช่น gdp_2025)
const indicatorCache = {};

// ฟังก์ชัน Bubble Sort สำหรับเรียงลำดับจากค่ามากไปน้อย
function bubbleSort(arr) {
  let result = [...arr];
  for (let i = 0; i < result.length; i++) {
    for (let j = 0; j < result.length - 1; j++) {
      if (result[j].value < result[j + 1].value) {
        let temp = result[j];
        result[j] = result[j + 1];
        result[j + 1] = temp;
      }
    }
  }
  return result;
}

// ฟังก์ชันประเมินสถานะตัวเลข (ดี = เขียว / แย่ = แดง) และทิศทาง (up / down)
function getIndicatorStatus(type, value) {
  if (type === 'gdp') {
    // GDP: > 0 = ดี (เขียว, up), <= 0 = แย่ (แดง, down)
    const isGood = value > 0;
    return {
      colorClass: isGood ? 'green' : 'red',
      trend: isGood ? 'up' : 'down'
    };
  }

  if (type === 'inflation') {
      const trend = value >= 0 ? 'up' : 'down';
      const colorClass = value <= 4.0 ? 'green' : 'red';
      return { colorClass, trend };
    }

  if (type === 'unemployment') {
    // ว่างงาน: < 5% = ดี คนว่างงานต่ำ (เขียว, down), >= 5% = แย่ คนว่างงานสูง (แดง, up)
    const isGood = value < 5.0;
    return {
      colorClass: isGood ? 'green' : 'red',
      trend: isGood ? 'down' : 'up'
    };
  }

  return { colorClass: 'green', trend: 'up' };
}

// ฟังก์ชันดึงข้อมูลจาก World Bank API ตามปีที่ระบุ (มี Timeout ป้องกันหน้าเว็บค้าง)
async function fetchIndicatorFromWorldBank(indicatorCode, year) {
  const url = `https://api.worldbank.org/v2/country/all/indicator/${indicatorCode}?date=${year}&format=json&per_page=300`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000); // หากเกิน 6 วินาทีให้ยกเลิกทันที ไม่ให้รอนาน

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    const data = await response.json();

    let list = [];
    if (data && data[1]) {
      for (let item of data[1]) {
        // กรองเอาเฉพาะข้อมูลที่มีตัวเลข และไม่ใช่ชื่อภูมิภาค (Aggregates)
        if (item.value !== null && item.countryiso3code && !item.country.value.includes('&')) {
          list.push({
            country: item.country.value,
            countryCode: item.countryiso3code,
            value: parseFloat(item.value.toFixed(1)),
            displayValue: item.value.toFixed(1) + '%',
            year: String(year)
          });
        }
      }
    }
    return list;
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn(`[indicatorRoutes] Warning: World Bank API ช้าหรือไม่ตอบสนอง (${year}):`, err.message);
    return [];
  }
}

// Route: GET /api/indicator-data
router.get('/indicator-data', async (req, res) => {
  const type = (req.query.type || 'gdp').toLowerCase();
  const year = req.query.year || '2025';
  const search = (req.query.search || '').trim().toLowerCase();

  const code = INDICATOR_CODES[type] || INDICATOR_CODES.gdp;
  const cacheKey = `${type}_${year}`;

  try {
    let list;
    if (indicatorCache[cacheKey]) {
      list = indicatorCache[cacheKey];
    } else {
      const raw = await fetchIndicatorFromWorldBank(code, year);
      list = bubbleSort(raw);
      indicatorCache[cacheKey] = list;
    }

    // กรองค้นหาชื่อประเทศถ้ามีส่งคำค้นหามา
    let filtered = list;
    if (search) {
      filtered = list.filter(item =>
        item.country.toLowerCase().includes(search) ||
        (item.countryCode && item.countryCode.toLowerCase().includes(search))
      );
    }

    // ใส่ข้อมูลสถานะสีและทิศทางลูกศร
    const result = filtered.map((item, index) => {
      const status = getIndicatorStatus(type, item.value);
      return {
        no: index + 1,
        country: item.country,
        value: item.value,
        displayValue: item.displayValue,
        trend: status.trend,
        colorClass: status.colorClass,
        year: item.year
      };
    });

    res.json({
      status: 'success',
      type,
      year,
      total: result.length,
      data: result
    });

  } catch (error) {
    console.error('[indicatorRoutes] Error:', error.message);
    res.status(500).json({ status: 'error', message: 'ไม่สามารถดึงข้อมูลได้' });
  }
});

module.exports = router;
