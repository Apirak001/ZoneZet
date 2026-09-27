/**
 * ==============================================================
 * Project: ZoneZet Economic Dashboard (Course 801201)
 * File: routes/indicatorRoutes.js
 * Description: จัดการ API สำหรับดึงข้อมูลตัวชี้วัดเศรษฐกิจรายประเทศ
 *              - GDP Growth (รหัส NY.GDP.MKTP.KD.ZG)
 *              - Inflation (รหัส FP.CPI.TOTL.ZG)
 *              - Unemployment (รหัส SL.UEM.TOTL.ZS)
 *              - รองรับการเลือกปี 2020 - 2025 และค้นหาชื่อประเทศ/ภูมิภาค
 *              - กรองกลุ่มทวีป/ภูมิภาครวม (Aggregates เช่น South Asia, World) ออก
 *              - เกลี่ยและจัดระเบียบชื่อภูมิภาคให้กระชับ ชัดเจน มีเพียง 1 ภูมิภาคต่อประเทศ
 *              - เรียงลำดับข้อมูลด้วย Bubble Sort
 *              - จัดเก็บ Cache ในหน่วยความจำเพื่อความรวดเร็ว
 * ==============================================================
 */

const express = require('express');
const router = express.Router();

// ==========================================
// 1. รหัสตัวชี้วัดทางการของ World Bank API
// ==========================================
const INDICATOR_CODES = {
  gdp: 'NY.GDP.MKTP.KD.ZG',           // อัตราการเติบโตทางเศรษฐกิจ (GDP annual %)
  inflation: 'FP.CPI.TOTL.ZG',        // อัตราเงินเฟ้อ (Inflation, consumer prices annual %)
  unemployment: 'SL.UEM.TOTL.ZS'      // อัตราการว่างงาน (Unemployment, total % of total labor force)
};

// ตัวแปร In-Memory Cache เก็บข้อมูลแยกตามประเภทและปี (เช่น gdp_2025)
const indicatorCache = {};

// ตัวแปร Cache เก็บข้อมูลรายชื่อประเทศและภูมิภาคทางการจาก World Bank
let countryMetadataCache = null;

// ==========================================
// 2. รายชื่อกลุ่มรวบยอด (Aggregates) ที่ต้องคัดทิ้ง
// ==========================================
// ป้องกันไม่ให้กลุ่มภูมิภาค เช่น 'South Asia', 'World', 'Arab World' หลุดเข้ามาเป็นชื่อประเทศ
const EXCLUDED_ENTITIES = new Set([
  'South Asia',
  'East Asia & Pacific',
  'Europe & Central Asia',
  'Latin America & Caribbean',
  'Middle East & North Africa',
  'Sub-Saharan Africa',
  'North America',
  'World',
  'Arab World',
  'Euro area',
  'European Union',
  'OECD members',
  'Least developed countries: UN classification',
  'Low & middle income',
  'Middle income',
  'High income',
  'Low income',
  'Lower middle income',
  'Upper middle income',
  'IDA & IBRD total',
  'IBRD only',
  'IDA total',
  'IDA blend',
  'IDA only',
  'Fragile and conflict affected situations',
  'Small states',
  'Other small states',
  'Pacific island small states',
  'Caribbean small states',
  'Central Europe and the Baltics',
  'Heavily indebted poor countries (HIPC)',
  'South Asia (IDA & IBRD)',
  'South Asia (IFC classification)',
  'South Asia (IDA-eligible countries)',
  'Middle East, North Africa, Afghanistan & Pakistan',
  'Africa Western and Central',
  'Africa Eastern and Southern',
  'SAS', 'EAS', 'ECS', 'LCN', 'MEA', 'SSF', 'NAC', 'WLD'
]);

// ==========================================
// 3. ฟังก์ชันเกลี่ยและจัดระเบียบภูมิภาคให้มีเพียง 1 เดียวและตรงเป๊ะ
// ==========================================
/**
 * แปลงชื่อกลุ่มภูมิภาคผสมของ World Bank ให้เป็นภูมิภาคเดี่ยวที่กระชับและเข้าใจง่าย
 * @param {string} countryName - ชื่อประเทศ
 * @param {string} rawRegion - ชื่อภูมิภาคดิบจาก World Bank API
 * @returns {string} ชื่อภูมิภาคที่กระชับและถูกต้อง
 */
function normalizeRegion(countryName, rawRegion) {
  if (!rawRegion) return 'Other';
  const cName = (countryName || '').trim();
  const region = rawRegion.trim();

  // 1. แยกกลุ่ม Central Asia ออกจาก Europe (เดิม World Bank จัดเป็น 'Europe & Central Asia')
  const centralAsianCountries = [
    'Kazakhstan', 'Kyrgyz Republic', 'Kyrgyzstan', 'Tajikistan',
    'Turkmenistan', 'Uzbekistan'
  ];
  if (centralAsianCountries.some(c => cName.includes(c))) {
    return 'Central Asia';
  }

  // 2. แยกกลุ่ม North Africa ออกจาก Middle East (เดิม World Bank จัดรวมยาวมาก)
  const northAfricanCountries = [
    'Egypt, Arab Rep.', 'Egypt', 'Libya', 'Algeria', 'Morocco', 'Tunisia'
  ];
  if (northAfricanCountries.some(c => cName.includes(c))) {
    return 'North Africa';
  }

  // 3. จัดการกลุ่ม Middle East, North Africa, Afghanistan & Pakistan
  if (region.includes('Middle East') || region.includes('North Africa')) {
    if (cName.includes('Afghanistan') || cName.includes('Pakistan')) return 'South Asia';
    return 'Middle East';
  }

  // 4. กลุ่มยุโรป (Europe)
  if (region.includes('Europe')) {
    return 'Europe';
  }

  // 5. กลุ่มละตินอเมริกาและแคริบเบียน (Latin America & Caribbean)
  if (region.includes('Latin America') || region.includes('Caribbean')) {
    const caribbeanIslands = [
      'Bahamas', 'Barbados', 'Cuba', 'Dominican Republic',
      'Haiti', 'Jamaica', 'Trinidad and Tobago', 'Puerto Rico'
    ];
    if (caribbeanIslands.some(c => cName.includes(c))) return 'Caribbean';
    return 'Latin America';
  }

  // 6. กลุ่มเอเชียตะวันออกและแปซิฟิก (East Asia & Pacific)
  if (region.includes('East Asia') || region.includes('Pacific')) {
    const oceaniaCountries = [
      'Australia', 'New Zealand', 'Fiji', 'Papua New Guinea',
      'Samoa', 'Tonga', 'Vanuatu', 'Solomon Islands'
    ];
    if (oceaniaCountries.some(c => cName.includes(c))) return 'Oceania';
    return 'East Asia';
  }

  // 7. แอฟริกาใต้สะฮารา (Sub-Saharan Africa)
  if (region.includes('Sub-Saharan') || region.includes('Africa')) {
    return 'Sub-Saharan Africa';
  }

  // 8. เอเชียใต้ (South Asia) เช่น India, Sri Lanka, Bangladesh, Nepal
  if (region.includes('South Asia')) {
    return 'South Asia';
  }

  // 9. อเมริกาเหนือ (North America) เช่น United States, Canada
  if (region.includes('North America')) {
    return 'North America';
  }

  return region;
}

// ==========================================
// 4. ฟังก์ชันดึงรายชื่อประเทศจริงจาก World Bank (ตัดกลุ่ม Aggregates ทิ้ง)
// ==========================================
async function getCountryMetadata() {
  if (countryMetadataCache) return countryMetadataCache;

  try {
    const res = await fetch('https://api.worldbank.org/v2/country?format=json&per_page=350');
    const data = await res.json();
    const map = {};

    if (data && data[1]) {
      data[1].forEach(c => {
        const name = c.name ? c.name.trim() : '';
        const id = c.id ? c.id.trim() : '';
        const capital = c.capitalCity ? c.capitalCity.trim() : '';
        const regionVal = (c.region && c.region.value) ? c.region.value.trim() : '';

        /**
         * กรองเฉพาะ "ประเทศจริง" เท่านั้น:
         * 1. region.value ต้องไม่เป็น 'Aggregates'
         * 2. ต้องมีเมืองหลวง (capitalCity ไม่ว่าง) ซึ่ง World Bank ใส่เฉพาะประเทศจริง
         * 3. ไม่อยู่ในรายชื่อ EXCLUDED_ENTITIES (เช่น 'South Asia', 'World')
         */
        if (
          regionVal !== 'Aggregates' &&
          regionVal !== '' &&
          capital !== '' &&
          !EXCLUDED_ENTITIES.has(name) &&
          !EXCLUDED_ENTITIES.has(id)
        ) {
          map[id] = {
            name: name,
            iso2: c.iso2Code ? c.iso2Code.toLowerCase() : '',
            region: normalizeRegion(name, regionVal)
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

// ==========================================
// 5. อัลกอริทึม Bubble Sort (เรียงจากค่ามากไปหาน้อย)
// ==========================================
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

// ==========================================
// 6. ฟังก์ชันประเมินสถานะตัวเลข (ดี = เขียว / แย่ = แดง) และทิศทางลูกศร
// ==========================================
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
    // เงินเฟ้อ: 1% - 4% = พอดีต่อเศรษฐกิจ (เขียว, up), > 4% = สินค้าแพง (แดง, up), < 1% = เงินฝืด (แดง, down)
    if (value >= 1.0 && value <= 4.0) {
      return { colorClass: 'green', trend: 'up' };
    } else if (value > 4.0) {
      return { colorClass: 'red', trend: 'up' };
    } else {
      return { colorClass: 'red', trend: 'down' };
    }
  }

  if (type === 'unemployment') {
    // อัตราการว่างงาน: < 5% = ดี คนมีงานทำ (เขียว, down), >= 5% = แย่ คนตกงานสูง (แดง, up)
    const isGood = value < 5.0;
    return {
      colorClass: isGood ? 'green' : 'red',
      trend: isGood ? 'down' : 'up'
    };
  }

  return { colorClass: 'green', trend: 'up' };
}

// ==========================================
// 7. ฟังก์ชันดึงข้อมูลจาก World Bank API ตามปีที่เลือก
// ==========================================
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

      // ต้องมีตัวเลข และต้องเป็นประเทศจริงที่ผ่านการคัดกรองใน countryMap เท่านั้น
      if (item.value !== null && countryMap[code] && !EXCLUDED_ENTITIES.has(countryMap[code].name)) {
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

// ==========================================
// 8. REST API Route: GET /api/indicator-data
// ==========================================
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

    // กำหนดสถานะสีและทิศทางลูกศรให้กับข้อมูลแต่ละรายการ
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
