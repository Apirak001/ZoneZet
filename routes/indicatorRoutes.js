// routes/indicatorRoutes.js
// จัดการ API สำหรับดึงข้อมูลรายชื่อประเทศ (GDP, Inflation, Unemployment)
// รองรับ: เลือกปี 2020-2025, ค้นหาประเทศ, และกรองกลุ่มภูมิภาค (Aggregates) ออกด้วย API ทางการของ World Bank

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

// เก็บ Cache รายชื่อประเทศและภูมิภาคทางการจาก World Bank
let countryMetadataCache = null;

// ฟังก์ชันดึงรายชื่อประเทศและภูมิภาคจริงจาก World Bank (คัดกลุ่ม Aggregates ทิ้ง)
async function getCountryMetadata() {
  if (countryMetadataCache) return countryMetadataCache;

  try {
    const res = await fetch('https://api.worldbank.org/v2/country?format=json&per_page=350');
    const data = await res.json();
    const map = {};

    if (data && data[1]) {
      data[1].forEach(c => {
        // คัดกรองเฉพาะ "ประเทศจริง" เท่านั้น
        // กลุ่มภูมิภาค/ทวีป เช่น Arab World, Caribbean small states, World จะมี region.value เป็น 'Aggregates'
        if (c.region && c.region.value !== 'Aggregates') {
          map[c.id] = {
            name: c.name,
            iso2: c.iso2Code ? c.iso2Code.toLowerCase() : '',
            region: c.region.value.trim()
          };
        }
      });
    }

    countryMetadataCache = map;
    return countryMetadataCache;
  } catch (err) {
    console.error('[indicatorRoutes] ไม่สามารถโหลด Metadata ประเทศได้:', err.message);
    return {};
  }
}

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
    // เงินเฟ้อ: 1% - 4% = ดี (เขียว, up), > 4% = แย่ เงินเฟ้อพุ่ง (แดง, up), < 1% = แย่ เงินฝืด (แดง, down)
    if (value >= 1.0 && value <= 4.0) {
      return { colorClass: 'green', trend: 'up' };
    } else if (value > 4.0) {
      return { colorClass: 'red', trend: 'up' };
    } else {
      return { colorClass: 'red', trend: 'down' };
    }
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

// ฟังก์ชันดึงข้อมูลจาก World Bank API ตามปีที่ระบุ (เชื่อมข้อมูลภูมิภาคและตัด Aggregates ออก)
async function fetchIndicatorFromWorldBank(indicatorCode, year) {
  const [countryMap, rawResponse] = await Promise.all([
    getCountryMetadata(),
    fetch(`https://api.worldbank.org/v2/country/all/indicator/${indicatorCode}?date=${year}&format=json&per_page=300`)
      .then(res => res.json())
      .catch(() => null)
  ]);

  let list = [];
  if (rawResponse && rawResponse[1]) {
    for (let item of rawResponse[1]) {
      const code = item.countryiso3code || (item.country && item.country.id);

      // ต้องมีตัวเลข และต้องเป็นประเทศจริงที่มีใน countryMap (ไม่เอา Aggregates)
      if (item.value !== null && countryMap[code]) {
        list.push({
          country: countryMap[code].name,
          countryCode: code,
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

    // กรองค้นหาตามชื่อประเทศ รหัสประเทศ หรือชื่อภูมิภาค
    let filtered = list;
    if (search) {
      filtered = list.filter(item =>
        item.country.toLowerCase().includes(search) ||
        (item.countryCode && item.countryCode.toLowerCase().includes(search)) ||
        (item.region && item.region.toLowerCase().includes(search))
      );
    }

    // ใส่ข้อมูลสถานะสีและทิศทางลูกศร
    const result = filtered.map((item, index) => {
      const status = getIndicatorStatus(type, item.value);
      return {
        no: index + 1,
        country: item.country,
        countryCode: item.countryCode,
        iso2: item.iso2,
        region: item.region,
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
