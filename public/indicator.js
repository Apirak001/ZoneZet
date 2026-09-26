// public/indicator.js
// จัดการหน้า GDP, INFLATION, UNEMPLOYMENT
// รองรับ: เลือกปี 2020-2025, ค้นหาประเทศ, แสดง Icon ลูกศร SVG สวยๆ, และระบบ COMPARISON AREA

// ตัวแปรเก็บรายการเปรียบเทียบในแต่ละหน้า
const comparisonData = {
  gdp: [],
  inflation: [],
  unemployment: []
};

/**
 * สร้าง SVG Icon ลูกศรขึ้น/ลง ที่คมชัดและสวยงาม
 * @param {string} trend - 'up' หรือ 'down'
 * @param {string} colorClass - 'green' หรือ 'red'
 */
function getTrendIcon(trend, colorClass) {
  const strokeColor = colorClass === 'green' ? '#00ff2e' : '#ff383b';

  if (trend === 'up') {
    // ลูกศรชี้ขึ้น (Upward Arrow) สไตล์โมเดิร์น
    return `
      <svg class="trend-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="${strokeColor}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="19" x2="12" y2="5"></line>
        <polyline points="5 12 12 5 19 12"></polyline>
      </svg>
    `;
  } else {
    // ลูกศรชี้ลง (Downward Arrow) สไตล์โมเดิร์น
    return `
      <svg class="trend-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="${strokeColor}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <polyline points="19 12 12 19 5 12"></polyline>
      </svg>
    `;
  }
}

/**
 * ฟังก์ชันหลักในการเตรียมการทำงานของหน้า Indicator
 * @param {string} pageType - 'gdp' | 'inflation' | 'unemployment'
 */
function initIndicatorPage(pageType) {
  const dataTable = document.querySelector('.data-table');
  const searchSelect = document.querySelector('.search-select');
  const searchInput = document.querySelector('.search-input');
  const searchBtn = document.querySelector('.search-btn');

  // ถ้าไม่มีองค์ประกอบของตารางในหน้านี้ ให้หยุดทำงาน
  if (!dataTable || !searchSelect || !searchInput || !searchBtn) return;

  // ฟังก์ชันดึงและแสดงข้อมูล
  const loadData = () => {
    const year = searchSelect.value || '2025';
    const search = searchInput.value.trim();

    dataTable.innerHTML = `
      <div class="data-row">
        <div class="col-country" style="opacity: 0.6; padding: 20px 0;">กำลังค้นหาและประมวลผลข้อมูล (${year})...</div>
      </div>
    `;

    const queryUrl = `/api/indicator-data?type=${pageType}&year=${encodeURIComponent(year)}&search=${encodeURIComponent(search)}`;

    fetch(queryUrl)
      .then(res => res.json())
      .then(result => {
        if (result.status === 'success' && result.data && result.data.length > 0) {
          renderTableRows(result.data);
        } else {
          dataTable.innerHTML = `
            <div class="data-row">
              <div class="col-country" style="color: #ff6b6b; padding: 20px 0;">ไม่พบข้อมูลประเทศที่ค้นหา</div>
            </div>
          `;
        }
      })
      .catch(err => {
        console.error("Fetch indicator error:", err);
        dataTable.innerHTML = `
          <div class="data-row">
            <div class="col-country" style="color: #ff6b6b; padding: 20px 0;">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>
          </div>
        `;
      });
  };

  // ฟังก์ชันเรนเดอร์แถวข้อมูลในตาราง
  const renderTableRows = (items) => {
    dataTable.innerHTML = '';
    items.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'data-row';

      const iconSvg = getTrendIcon(item.trend, item.colorClass);

      row.innerHTML = `
        <div class="col-no">${index + 1}</div>
        <div class="col-country">${item.country}</div>
        <div class="col-value ${item.colorClass}">
          ${iconSvg}
          <span>${item.displayValue}</span>
        </div>
        <div class="col-action">
          <button class="btn-add" type="button">ADD</button>
        </div>
      `;

      // เมื่อกดปุ่ม ADD ให้เพิ่มลงใน COMPARISON AREA
      row.querySelector('.btn-add').addEventListener('click', () => {
        addToComparison(pageType, item);
      });

      dataTable.appendChild(row);
    });
  };

  // เรนเดอร์รายการใน Comparison Area เดิม (ถ้ามี)
  renderComparisonList(pageType);

  // 1. กดค้นหาเมื่อคลิกปุ่มค้นหา
  searchBtn.onclick = () => loadData();

  // 2. กดค้นหาเมื่อกดปุ่ม Enter ในช่องค้นหา
  searchInput.onkeydown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      loadData();
    }
  };

  // 3. โหลดข้อมูลใหม่เมื่อเลือกปีใน Dropdown
  searchSelect.onchange = () => loadData();

  // โหลดข้อมูลอัตโนมัติรอบแรก
  loadData();
}

/**
 * เพิ่มประเทศลงใน COMPARISON AREA
 */
function addToComparison(pageType, item) {
  const list = comparisonData[pageType] || [];

  // ป้องกันการเพิ่มประเทศซ้ำ
  const exists = list.some(x => x.country === item.country);
  if (exists) {
    alert(`${item.country} อยู่ในรายการเปรียบเทียบแล้ว`);
    return;
  }

  list.push(item);
  comparisonData[pageType] = list;
  renderComparisonList(pageType);
}

/**
 * ลบประเทศออกจาก COMPARISON AREA
 */
function removeFromComparison(pageType, index) {
  const list = comparisonData[pageType] || [];
  list.splice(index, 1);
  comparisonData[pageType] = list;
  renderComparisonList(pageType);
}

/**
 * เรนเดอร์การแสดงผลในกล่อง COMPARISON AREA
 */
function renderComparisonList(pageType) {
  const compList = document.querySelector('.comp-list');
  if (!compList) return;

  const list = comparisonData[pageType] || [];
  compList.innerHTML = '';

  if (list.length === 0) {
    compList.innerHTML = `
      <div style="color: rgba(255,255,255,0.45); font-size: 13px; text-align: center; padding: 25px 0; line-height: 1.6;">
        ยังไม่มีรายการเปรียบเทียบ<br>
        <span style="font-size: 11px; opacity: 0.7;">กดปุ่ม ADD ในตารางเพื่อเพิ่ม</span>
      </div>
    `;
    return;
  }

  list.forEach((item, index) => {
    const compItem = document.createElement('div');
    compItem.className = 'comp-item';

    const iconSvg = getTrendIcon(item.trend, item.colorClass);

    compItem.innerHTML = `
      <span style="font-weight: 500;">${item.country}</span>
      <div style="display: flex; align-items: center; gap: 6px; margin-left: auto;">
        <span class="${item.colorClass}" style="display: flex; align-items: center; gap: 4px; font-weight: bold; font-size: 13px;">
          ${iconSvg}
          <span>${item.displayValue}</span>
        </span>
        <button class="btn-remove-comp" title="ลบออก" type="button">✕</button>
      </div>
    `;

    // ผูก Event ปุ่มลบ
    compItem.querySelector('.btn-remove-comp').addEventListener('click', () => {
      removeFromComparison(pageType, index);
    });

    compList.appendChild(compItem);
  });
}

// ฟังก์ชันตรวจจับว่าปัจจุบันอยู่หน้าไหน
function detectCurrentIndicatorPage() {
  const path = window.location.pathname.toLowerCase();
  const title = document.title.toLowerCase();
  const headerValue = document.querySelector('.data-header .col-value')?.textContent.toLowerCase() || '';

  if (path.includes('gdp') || title.includes('gdp') || headerValue.includes('gdp')) {
    return 'gdp';
  }
  if (path.includes('inflation') || title.includes('inflation') || headerValue.includes('inflation')) {
    return 'inflation';
  }
  if (path.includes('unemployment') || title.includes('unemployment') || headerValue.includes('unemployment')) {
    return 'unemployment';
  }
  return null;
}

// ตรวจสอบและเริ่มต้นทำงานเมื่อโหลดหน้าเว็บ
document.addEventListener('DOMContentLoaded', () => {
  const page = detectCurrentIndicatorPage();
  if (page) {
    initIndicatorPage(page);
  }
});

// ให้ window สามารถเข้าถึงฟังก์ชันนี้ได้ เพื่อรองรับตอนกดเปลี่ยนหน้าผ่าน SPA
window.initIndicatorPage = initIndicatorPage;
window.detectCurrentIndicatorPage = detectCurrentIndicatorPage;
