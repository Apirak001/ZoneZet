/**
 * ==============================================================
 * Project: ZoneZet Economic Dashboard (Course 801201)
 * File: public/js/recordManager.js
 * Description: จัดการระบบบันทึกและประวัติข้อมูลเศรษฐกิจ (Record Manager)
 *              - จัดเก็บข้อมูลประเทศที่ผ่านการคัดเลือกจากการ์ดเปรียบเทียบ
 *              - แสดงผลแยกตามหมวดหมู่ (GDP Growth, Inflation, Unemployment)
 *              - ฟิลเตอร์ข้อมูลตามปีที่เลือก (2020 - 2025)
 *              - ระบบลบข้อมูลรายตัว (Delete Record Item)
 *              - ระบบกู้คืนข้อมูลย้อนหลังด้วยโครงสร้าง Stack (Undo / Rollback History)
 * ==============================================================
 */

// โครงสร้างเก็บข้อมูลที่ผ่านการประมวลผลแล้ว (In-Memory Session)
if (!window.processedRecords) {
  window.processedRecords = { gdp: [], inflation: [], unemployment: [] };
}

// โครงสร้าง Stack สำหรับบันทึกประวัติการลบ เพื่อรองรับการ Rollback/Undo
if (!window.deletedRecords) {
  window.deletedRecords = { gdp: [], inflation: [], unemployment: [] };
}

// ตัวแปรเก็บปีที่เลือกดูในแต่ละหมวดของหน้า Record
window.recordSelectedYears = { gdp: '2025', inflation: '2025', unemployment: '2025' };

// ==========================================
// 1. ฟังก์ชันบันทึกข้อมูลลง Record
// ==========================================
/**
 * บันทึกหรืออัปเดตข้อมูลประเทศที่ผ่านการคัดเลือกจากการ์ดเปรียบเทียบ
 * @param {string} pageType - 'gdp' | 'inflation' | 'unemployment'
 * @param {object} item - ข้อมูลของประเทศ
 */
function saveProcessedRecord(pageType, item) {
  if (!window.processedRecords[pageType]) {
    window.processedRecords[pageType] = [];
  }

  // ป้องกันการบันทึกซ้ำซ้อนในประเทศและปีเดียวกัน
  const existsIndex = window.processedRecords[pageType].findIndex(
    x => x.country === item.country && x.year === item.year
  );

  if (existsIndex >= 0) {
    window.processedRecords[pageType][existsIndex] = item;
  } else {
    window.processedRecords[pageType].push(item);
  }
}

// ==========================================
// 2. ฟังก์ชันเรนเดอร์หน้า RECORD
// ==========================================
function initRecordPage() {
  const layout = document.querySelector('.record-layout');
  if (!layout) return;

  // เพิ่ม Style เฉพาะของหน้า Record เข้าสู่ Head หากยังไม่มี
  if (!document.getElementById('record-panel-styles')) {
    const style = document.createElement('style');
    style.id = 'record-panel-styles';
    style.innerHTML = `
      .record-panel-custom {
        flex: 1;
        display: flex;
        flex-direction: column;
        background: #202020;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 10px 20px rgba(0,0,0,0.5);
        height: 100%;
      }
      .record-panel-custom-header {
        background: #6D5482;
        padding: 15px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .record-panel-custom-title {
        color: white;
        font-size: 22px;
        font-weight: 800;
        text-transform: uppercase;
      }
      .btn-history-custom {
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s;
      }
      .btn-history-custom:hover { transform: scale(1.1); }
      .btn-history-custom img {
        width: 28px;
        height: 28px;
        object-fit: contain;
      }
      .record-panel-custom-body {
        flex: 1;
        overflow-y: auto;
        padding: 5px 0 15px 0;
        overflow-x: hidden;
        display: flex;
        flex-direction: column;
      }
      .record-panel-custom-body::-webkit-scrollbar {
        width: 8px;
      }
      .record-panel-custom-body::-webkit-scrollbar-track {
        background: transparent;
      }
      .record-panel-custom-body::-webkit-scrollbar-thumb {
        background: white;
        border-radius: 10px;
      }
      .record-custom-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        margin-bottom: 2px;
      }
      .record-custom-item:hover {
        background: rgba(255, 255, 255, 0.08);
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
      }
      .record-custom-item:last-child {
        border-bottom: none;
      }
      .record-custom-country {
        color: white;
        font-size: 18px;
        font-weight: 500;
      }
      .record-custom-right {
        display: flex;
        align-items: center;
        gap: 15px;
      }
      .record-custom-val {
        font-size: 18px;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .record-custom-val.green { color: #00ff2e; }
      .record-custom-val.red { color: #ff383b; }
      .btn-delete-custom {
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s;
      }
      .btn-delete-custom:hover { transform: scale(1.1); }
      .btn-delete-custom img {
        width: 22px;
        height: 22px;
        object-fit: contain;
      }
    `;
    document.head.appendChild(style);
  }

  layout.innerHTML = '';

  const categories = [
    { id: 'gdp', title: 'GDP GROWTH' },
    { id: 'inflation', title: 'INFLATION' },
    { id: 'unemployment', title: 'UNEMPLOYMENT' }
  ];

  categories.forEach(cat => {
    const allItems = window.processedRecords[cat.id] || [];
    const currentYear = window.recordSelectedYears[cat.id] || '2025';
    const items = allItems.filter(i => i.year === currentYear);

    let rowsHtml = '';
    if (items.length === 0) {
      rowsHtml = '<div style="color: rgba(255,255,255,0.5); text-align: center; margin-top: 20px;">ไม่มีข้อมูลที่บันทึกไว้ในปีนี้</div>';
    } else {
      let displayIndex = 0;
      allItems.forEach((item, globalIndex) => {
        if (item.year !== currentYear) return;
        const index = displayIndex++;
        const iconSvg = typeof window.getTrendIcon === 'function' ? window.getTrendIcon(item.trend, item.colorClass) : '';

        rowsHtml += `
          <div class="record-custom-item" style="animation: fadeSlideUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) backwards; animation-delay: ${index * 0.04}s;">
            <div class="record-custom-country">${item.country}</div>
            <div class="record-custom-right">
              <div class="record-custom-val ${item.colorClass}">
                ${iconSvg}
                ${item.displayValue}
              </div>
              <button class="btn-delete-custom" type="button" title="Delete" onclick="deleteRecordItem('${cat.id}', ${globalIndex})">
                <img src="img/Remove.png" alt="Delete">
              </button>
            </div>
          </div>
        `;
      });
    }

    layout.innerHTML += `
      <div class="record-panel-custom">
        <div class="record-panel-custom-header">
          <div class="record-panel-custom-title">${cat.title}</div>
          <div style="display: flex; gap: 15px; align-items: center;">
            <!-- Dropdown เลือกปี -->
            <div class="custom-select-wrapper record-year-select" style="min-width: 90px;" data-category="${cat.id}">
              <div class="custom-select-trigger" style="padding: 6px 12px; font-size: 14px; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;">
                <span class="custom-select-text">${currentYear}</span>
                <div class="custom-select-arrow"></div>
              </div>
              <div class="custom-options" style="background: #2a2a2a; border-radius: 8px; overflow: hidden; margin-top: 4px;">
                ${['2025', '2024', '2023', '2022', '2021', '2020'].map(y =>
                  `<div class="custom-option ${y === currentYear ? 'selected' : ''}" data-value="${y}">${y}</div>`
                ).join('')}
              </div>
              <input type="hidden" class="search-select record-year-input" value="${currentYear}">
            </div>

            <!-- ปุ่ม Rollback / Undo ประวัติ -->
            <button class="btn-history-custom" type="button" title="เรียกคืนข้อมูล (Rollback)" onclick="undoDeleteRecord('${cat.id}')">
              <img src="img/Rollback.png" alt="History">
            </button>
          </div>
        </div>
        <div class="record-panel-custom-body">
          ${rowsHtml}
        </div>
      </div>
    `;
  });

  // ผูก Custom Dropdown หลังเรนเดอร์เสร็จ
  if (typeof window.initCustomSelects === 'function') window.initCustomSelects();

  layout.querySelectorAll('.record-year-select').forEach(wrapper => {
    const cat = wrapper.getAttribute('data-category');
    const hiddenInput = wrapper.querySelector('.record-year-input');
    if (hiddenInput) {
      hiddenInput.addEventListener('change', (e) => {
        window.recordSelectedYears[cat] = e.target.value;
        initRecordPage();
      });
    }
  });
}

// ==========================================
// 3. ฟังก์ชันลบข้อมูลและเรียกคืน (Delete & Undo)
// ==========================================
/**
 * ลบข้อมูลประเทศในหน้า Record พร้อมเก็บลง Stack สำรองไว้สำหรับกู้คืน
 */
function deleteRecordItem(type, index) {
  if (!window.deletedRecords[type]) window.deletedRecords[type] = [];

  const removedItem = window.processedRecords[type].splice(index, 1)[0];
  window.deletedRecords[type].push({ item: removedItem, index: index });

  if (window.showGlassAlert) window.showGlassAlert('ลบข้อมูลเรียบร้อยแล้ว', 'success');
  initRecordPage();
}

/**
 * เรียกคืนข้อมูลที่เพิ่งถูกลบรายการล่าสุด (Stack LIFO)
 */
function undoDeleteRecord(type) {
  if (!window.deletedRecords || !window.deletedRecords[type] || window.deletedRecords[type].length === 0) {
    if (window.showGlassAlert) window.showGlassAlert('ไม่มีประวัติการลบให้เรียกคืน', 'warning');
    return;
  }

  const lastDeleted = window.deletedRecords[type].pop();
  const currentLen = window.processedRecords[type].length;
  const insertIndex = Math.min(lastDeleted.index, currentLen);

  window.processedRecords[type].splice(insertIndex, 0, lastDeleted.item);

  if (window.showGlassAlert) window.showGlassAlert('เรียกคืนข้อมูลสำเร็จ!', 'success');
  initRecordPage();
}

// ส่งออกฟังก์ชันเข้าสู่ window
window.saveProcessedRecord = saveProcessedRecord;
window.initRecordPage = initRecordPage;
window.deleteRecordItem = deleteRecordItem;
window.undoDeleteRecord = undoDeleteRecord;
