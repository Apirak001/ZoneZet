/**
 * ==============================================================
 * Project: ZoneZet Economic Dashboard (Course 801201)
 * File: public/js/indicatorTable.js
 * Description: จัดการตารางข้อมูลตัวชี้วัดเศรษฐกิจ (GDP, Inflation, Unemployment)
 *              - ร้องขอข้อมูลจาก Backend (/api/indicator-data) ตามปีที่เลือก (2020-2025)
 *              - เรนเดอร์ตาราง แสดงลำดับ ธงชาติ ชื่อประเทศ ภูมิภาค ตัวเลข และ Icon แนวโน้ม
 *              - รองรับระบบค้นหาประเทศและภูมิภาคแบบ Interactive
 *              - จัดการพื้นที่เปรียบเทียบ (Comparison Area) ขวามือ: เพิ่ม, ลบ, แสดงผล
 * ==============================================================
 */

// ==========================================
// 1. ตัวแปร State เก็บข้อมูลเปรียบเทียบในแต่ละหน้า
// ==========================================
if (!window.comparisonData) {
  window.comparisonData = {
    gdp: [],
    inflation: [],
    unemployment: []
  };
}

// ==========================================
// 2. ฟังก์ชันจัดการ COMPARISON AREA (กล่องเปรียบเทียบด้านขวา)
// ==========================================

/**
 * เพิ่มประเทศลงใน COMPARISON AREA
 * @param {string} pageType - 'gdp' | 'inflation' | 'unemployment'
 * @param {object} item - ข้อมูลของประเทศที่ต้องการเพิ่ม
 */
function addToComparison(pageType, item) {
  const list = window.comparisonData[pageType] || [];

  // ตรวจสอบเพื่อไม่ให้เพิ่มประเทศเดิมซ้ำ
  const exists = list.some(x => x.country === item.country);
  if (exists) {
    if (window.showGlassAlert) window.showGlassAlert(`${item.country} มีอยู่ในรายการเปรียบเทียบแล้ว!`, 'warning');
    return;
  }

  list.push(item);
  window.comparisonData[pageType] = list;
  renderComparisonList(pageType, true);

  if (window.showGlassAlert) window.showGlassAlert(`เพิ่ม ${item.country} เข้าสู่รายการเปรียบเทียบแล้ว!`, 'success');
}

/**
 * ลบประเทศออกจาก COMPARISON AREA
 * @param {string} pageType - 'gdp' | 'inflation' | 'unemployment'
 * @param {number} index - ลำดับ Index ของรายการที่ต้องการลบ
 */
function removeFromComparison(pageType, index) {
  const compList = document.querySelector('.comp-list');
  if (compList) {
    const items = compList.querySelectorAll('.comp-item');
    if (items[index]) {
      items[index].style.animation = 'fadeSlideOutRight 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
      setTimeout(() => {
        const list = window.comparisonData[pageType] || [];
        list.splice(index, 1);
        window.comparisonData[pageType] = list;
        renderComparisonList(pageType);
      }, 250);
      return;
    }
  }

  const list = window.comparisonData[pageType] || [];
  list.splice(index, 1);
  window.comparisonData[pageType] = list;
  renderComparisonList(pageType);
}

/**
 * เรนเดอร์การแสดงผลในกล่อง COMPARISON AREA ด้านขวา
 * @param {string} pageType - 'gdp' | 'inflation' | 'unemployment'
 * @param {boolean} justAdded - รายการนี้เพิ่งถูกเพิ่มเข้ามาใหม่หรือไม่ (เพื่อแสดงแอนิเมชันเด้งเข้า)
 */
function renderComparisonList(pageType, justAdded = false) {
  const compList = document.querySelector('.comp-list');
  if (!compList) return;

  const list = window.comparisonData[pageType] || [];
  compList.innerHTML = '';

  // กรณีไม่มีข้อมูลในกล่อง
  if (list.length === 0) {
    compList.innerHTML = `
      <div style="color: rgba(255,255,255,0.45); font-size: 13px; text-align: center; padding: 25px 0; line-height: 1.6;">
        ยังไม่มีรายการเปรียบเทียบ<br>
        <span style="font-size: 11px; opacity: 0.7;">กดปุ่ม ADD ในตารางเพื่อเพิ่ม</span>
      </div>
    `;
    return;
  }

  // วนลูปสร้างรายการแต่ละแถวใน Comparison Area
  list.forEach((item, index) => {
    const compItem = document.createElement('div');
    compItem.className = 'comp-item';

    const iconSvg = typeof window.getTrendIcon === 'function' ? window.getTrendIcon(item.trend, item.colorClass) : '';

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

    if (justAdded && index === list.length - 1) {
      compItem.style.animation = 'fadeSlideInRight 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
    }

    compList.appendChild(compItem);
  });
}

// ==========================================
// 3. ฟังก์ชันหลักสำหรับเริ่มต้นตาราง Indicator (GDP, Inflation, Unemployment)
// ==========================================
/**
 * เริ่มต้นทำงานและผูก Event ทั้งหมดของหน้าตารางข้อมูล
 * @param {string} pageType - 'gdp' | 'inflation' | 'unemployment'
 */
function initIndicatorPage(pageType) {
  const dataTable = document.querySelector('.data-table');
  const searchSelect = document.querySelector('.search-select');
  const searchInput = document.querySelector('.search-input');
  const searchBtn = document.querySelector('.search-btn');

  // หากไม่มีตารางในหน้านี้ แสดงว่าไม่ใช่หน้าตารางข้อมูล
  if (!dataTable || !searchSelect || !searchInput || !searchBtn) return;

  // เริ่มต้น Custom Dropdown
  if (typeof window.initCustomSelects === 'function') window.initCustomSelects();

  /**
   * ฟังก์ชันดึงข้อมูลจากเซิร์ฟเวอร์ตามเงื่อนไข (ปี, คำค้นหา)
   */
  const loadData = () => {
    const year = searchSelect.value || '2025';
    const search = searchInput.value.trim();

    // แสดงสถานะระหว่างโหลดข้อมูล
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
        console.error("[IndicatorTable] Fetch Error:", err);
        dataTable.innerHTML = `
          <div class="data-row">
            <div class="col-country" style="color: #ff6b6b; padding: 20px 0;">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>
          </div>
        `;
      });
  };

  /**
   * ฟังก์ชันเรนเดอร์แถวข้อมูลทั้งหมดลงในตาราง
   * @param {Array} items - รายการข้อมูลประเทศ
   */
  const renderTableRows = (items) => {
    dataTable.innerHTML = '';

    items.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'data-row';
      row.style.animation = 'fadeSlideUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) backwards';
      row.style.animationDelay = `${index * 0.025}s`;

      const iconSvg = typeof window.getTrendIcon === 'function' ? window.getTrendIcon(item.trend, item.colorClass) : '';

      row.innerHTML = `
        <div class="col-no">${index + 1}</div>
        <div class="col-country">
          <img src="https://flagcdn.com/${(item.iso2 || 'xx').toLowerCase()}.svg" alt="" class="country-flag" onerror="this.style.display='none'">
          <span>${item.country}</span>
        </div>
        <div class="col-region">${item.region || 'Other'}</div>
        <div class="col-value ${item.colorClass}">
          ${iconSvg}
          <span>${item.displayValue}</span>
        </div>
        <div class="col-action">
          <button class="btn-add" type="button" title="เพิ่มลงในรายการเปรียบเทียบ">
            <img src="img/button_add.png" alt="ADD">
          </button>
        </div>
      `;

      // เมื่อคลิกปุ่ม ADD ให้ส่งข้อมูลเข้า Comparison Area
      row.querySelector('.btn-add').addEventListener('click', () => {
        addToComparison(pageType, item);
      });

      dataTable.appendChild(row);
    });
  };

  // เรนเดอร์รายการที่เคยเพิ่มไว้ใน Comparison Area เดิม (ถ้ามี)
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

  // 3. โหลดข้อมูลใหม่ทันทีเมื่อเปลี่ยนปีใน Dropdown
  searchSelect.addEventListener('change', () => loadData());

  // 4. ปุ่มกากบาทล้างข้อความในช่องค้นหา (Clear Button)
  if (!document.querySelector('.clear-btn')) {
    const clearBtn = document.createElement('button');
    clearBtn.className = 'clear-btn';
    clearBtn.innerHTML = '✕';
    clearBtn.title = 'ล้างข้อความ';

    const wrapper = document.createElement('div');
    wrapper.className = 'search-input-wrapper';
    searchInput.parentNode.insertBefore(wrapper, searchInput);
    wrapper.appendChild(searchInput);
    wrapper.appendChild(clearBtn);

    clearBtn.onclick = () => {
      searchInput.value = '';
      clearBtn.classList.remove('visible');
      searchInput.focus();
      loadData();
    };

    searchInput.addEventListener('input', () => {
      clearBtn.classList.toggle('visible', searchInput.value.length > 0);
    });
  }

  // 5. ผูกปุ่ม COMPARE กับ Modal การ์ดเปรียบเทียบ
  const btnCompare = document.querySelector('.btn-compare');
  if (btnCompare) {
    btnCompare.onclick = () => {
      const list = window.comparisonData[pageType] || [];
      if (list.length === 0) {
        if (window.showGlassAlert) window.showGlassAlert('ไม่มีข้อมูลในรายการเปรียบเทียบ กรุณาเพิ่มข้อมูลก่อนเริ่ม', 'warning');
        return;
      }
      window.currentComparisonType = pageType;
      if (typeof window.renderComparisonModal === 'function') {
        window.renderComparisonModal(pageType);
      }
    };
  }

  // โหลดข้อมูลเริ่มต้นทันทีเมื่อเปิดหน้า
  loadData();
}

// ==========================================
// 4. ตรวจจับหน้าปัจจุบันและเริ่มทำงานอัตโนมัติ
// ==========================================
function detectCurrentIndicatorPage() {
  const path = window.location.pathname.toLowerCase();
  const title = document.title.toLowerCase();
  const headerValue = document.querySelector('.data-header .col-value')?.textContent.toLowerCase() || '';

  if (path.includes('gdp') || title.includes('gdp') || headerValue.includes('gdp')) return 'gdp';
  if (path.includes('inflation') || title.includes('inflation') || headerValue.includes('inflation')) return 'inflation';
  if (path.includes('unemployment') || title.includes('unemployment') || headerValue.includes('unemployment')) return 'unemployment';
  return null;
}

// ตรวจสอบและเริ่มต้นทำงานเมื่อ DOM พร้อม
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname.toLowerCase();
  if (path.includes('record.html')) {
    if (typeof window.initRecordPage === 'function') window.initRecordPage();
    return;
  }

  const page = detectCurrentIndicatorPage();
  if (page) {
    initIndicatorPage(page);
  }
});

// ส่งออกฟังก์ชันเข้าสู่ window เพื่อให้ระบบ SPA ใน navigationRouter.js เรียกใช้งานได้
window.initIndicatorPage = initIndicatorPage;
window.detectCurrentIndicatorPage = detectCurrentIndicatorPage;
window.addToComparison = addToComparison;
window.removeFromComparison = removeFromComparison;
window.renderComparisonList = renderComparisonList;
