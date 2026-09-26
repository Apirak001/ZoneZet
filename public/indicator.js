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

  // เริ่มต้น Custom Dropdown
  if (typeof window.initCustomSelects === 'function') window.initCustomSelects();

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
          <button class="btn-add" type="button"><img src="img/button_add.png" alt="ADD"></button>
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
  searchSelect.addEventListener('change', () => loadData());

  // 4. ปุ่ม Clear ในช่องค้นหา
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

  // 5. ผูกปุ่ม COMPARE กับฟังก์ชัน startComparisonProcess
  const btnCompare = document.querySelector('.btn-compare');
  if (btnCompare) {
    btnCompare.onclick = () => startComparisonProcess(pageType);
  }

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
    showGlassAlert(`${item.country} มีอยู่ในรายการเปรียบเทียบแล้ว!`, 'warning');
    return;
  }

  list.push(item);
  comparisonData[pageType] = list;
  renderComparisonList(pageType);
  showGlassAlert('เพิ่ม ' + item.country + ' เข้าสู่รายการเปรียบเทียบแล้ว!', 'success');
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


/**
 * แจ้งเตือนแบบ Glassmorphism popup
 */
function showGlassAlert(message, type = 'success') {
  const existing = document.querySelector('.glass-alert');
  if (existing) existing.remove();
  const alert = document.createElement('div');
  alert.className = 'glass-alert ' + type;
  alert.textContent = message;
  alert.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);padding:14px 28px;border-radius:16px;color:#fff;font-weight:600;font-size:14px;z-index:99999;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);animation:cardEntrance 0.4s forwards;';
  alert.style.background = type === 'warning' ? 'rgba(255,107,107,0.25)' : 'rgba(0,255,46,0.2)';
  alert.style.border = type === 'warning' ? '1px solid rgba(255,107,107,0.4)' : '1px solid rgba(0,255,46,0.3)';
  document.body.appendChild(alert);
  setTimeout(() => alert.remove(), 2500);
}

/**
 * เริ่มกระบวนการเปรียบเทียบ - แสดง Modal การ์ด
 */
function startComparisonProcess(pageType) {
    const list = comparisonData[pageType] || [];
    if (list.length === 0) {
      showGlassAlert('ไม่มีข้อมูลในรายการเปรียบเทียบ กรุณาเพิ่มข้อมูลก่อนเริ่ม', 'warning');
      return;
    }
    window.currentComparisonType = pageType;
    renderComparisonModal(pageType);
  }

  /**
   * แสดง Modal การ์ดเปรียบเทียบ (Tinder-style)
   */
  function renderComparisonModal(pageType) {
  const list = comparisonData[pageType] || [];
    if (list.length === 0) {
      showGlassAlert('ประมวลผลข้อมูลทั้งหมดเสร็จสิ้น!', 'success');
      closeComparisonModal(true);
      return;
    }
  
    const item = list[0];
  const title = pageType.toUpperCase();
  const isUp = item.trend === 'up';
  const colorHex = item.colorClass === 'green' ? '#00ff2e' : '#ff383b';
  const trendText = isUp ? 'GROWING' : 'DECLINING';

  const iconSvg = isUp ?
    `<svg viewBox="0 0 24 24" fill="none" stroke="${colorHex}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 17 12 11 6 17"></polyline><polyline points="18 9 12 3 6 9"></polyline></svg>` :
    `<svg viewBox="0 0 24 24" fill="none" stroke="${colorHex}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 7 12 13 18 7"></polyline><polyline points="6 15 12 21 18 15"></polyline></svg>`;

  let overlay = document.querySelector('.comparison-modal-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'comparison-modal-overlay';
    document.body.appendChild(overlay);
  }

  overlay.innerHTML = `
    <button class="btn-modal-action cancel" onclick="triggerSwipe('left')" title="ข้าม (Skip)">
      <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    </button>
    <div class="comparison-card" id="compCard">
      <button class="btn-card-close" onclick="cancelComparison()" title="ปิดหน้าต่าง">
        <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
      <h1 class="comp-modal-title">${title}</h1>
      <h3 class="comp-modal-country">${item.country}</h3>
      <div class="comp-modal-trend-text">${trendText}</div>
      <div class="comp-modal-icon">${iconSvg}</div>
      <p class="comp-modal-value" style="color: ${colorHex}">${item.displayValue}</p>
    </div>
    <button class="btn-modal-action next" onclick="triggerSwipe('right')" title="ประมวลผล (Process)">
      <svg viewBox="0 0 24 24" width="28" height="28" stroke="none" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg>
    </button>
  `;

  overlay.classList.add('show');

  setTimeout(() => {
    const card = document.getElementById('compCard');
    if (card) card.style.transform = 'scale(1)';
    initCardDrag();
  }, 10);
}

/**
 * ปิด Modal เปรียบเทียบ
 */
function closeComparisonModal(fullClose = true) {
  const overlay = document.querySelector('.comparison-modal-overlay');
  if (overlay) {
    if (fullClose) {
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 300);
    } else {
      const card = document.getElementById('compCard');
      if (card) card.remove();
    }
  }
}

/**
 * ประมวลผลการ์ดถัดไป (เมื่อปัดขวา/กดหัวใจ)
 */
window.skipComparison = function() {
  const type = window.currentComparisonType;
  if (!type || !comparisonData[type]) return;
  const list = comparisonData[type];
  if (list.length > 0) {
    list.shift(); // ลบอันบนสุดทิ้ง (ข้าม)
    renderComparisonList(type); // อัปเดต UI หน้าจอ
    closeComparisonModal(false);
    if (list.length > 0) {
      setTimeout(() => renderComparisonModal(type), 300);
    } else {
      setTimeout(() => {
        showGlassAlert('ประมวลผลข้อมูลทั้งหมดเสร็จสิ้น!', 'success');
        closeComparisonModal(true);
      }, 300);
    }
  }
};

window.nextComparison = function() {
  const type = window.currentComparisonType;
  if (!type || !comparisonData[type]) return;
  const list = comparisonData[type];
  if (list.length > 0) {
    const item = list.shift(); // ดึงอันบนสุดออกมา
    if (window.saveProcessedRecord) window.saveProcessedRecord(type, item); // บันทึกลง Record
    renderComparisonList(type); // อัปเดต UI หน้าจอ ลบออกจาก Comparison Area
    closeComparisonModal(false);
    if (list.length > 0) {
      setTimeout(() => renderComparisonModal(type), 300);
    } else {
      setTimeout(() => {
        showGlassAlert('ประมวลผลข้อมูลทั้งหมดเสร็จสิ้น!', 'success');
        closeComparisonModal(true);
      }, 300);
    }
  }
};
// Custom Select Dropdown สวยๆ
window.initCustomSelects = function() {
  document.querySelectorAll('.custom-select-wrapper:not(.initialized)').forEach(wrapper => {
    wrapper.classList.add('initialized');
    const trigger = wrapper.querySelector('.custom-select-trigger');
    const options = wrapper.querySelector('.custom-options');
    const hiddenInput = wrapper.querySelector('.search-select');
    const textEl = wrapper.querySelector('.custom-select-text');
    
    if (!trigger || !options) return;
    
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = wrapper.classList.contains('open');
        document.querySelectorAll('.custom-select-wrapper.open').forEach(w => w.classList.remove('open'));
        if (!isOpen) wrapper.classList.add('open');
      });
    
    wrapper.querySelectorAll('.custom-option').forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        wrapper.querySelectorAll('.custom-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        if (textEl) textEl.textContent = opt.textContent;
        if (hiddenInput) {
          hiddenInput.value = opt.dataset.value;
          hiddenInput.dispatchEvent(new Event('change'));
        }
        wrapper.classList.remove('open');
      });
    });
  });
  
  document.addEventListener('click', () => {
    document.querySelectorAll('.custom-select-wrapper.open').forEach(w => w.classList.remove('open'));
  });
};

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
  const path = window.location.pathname.toLowerCase();
  if (path.includes('record.html')) {
    if (window.initRecordPage) window.initRecordPage();
    return;
  }
  const page = detectCurrentIndicatorPage();
  if (page) {
    initIndicatorPage(page);
  }
});

// ให้ window สามารถเข้าถึงฟังก์ชันนี้ได้ เพื่อรองรับตอนกดเปลี่ยนหน้าผ่าน SPA
window.initIndicatorPage = initIndicatorPage;
window.detectCurrentIndicatorPage = detectCurrentIndicatorPage;


// --- DRAG AND SWIPE LOGIC ---
window.triggerSwipe = function(direction) {
  const card = document.getElementById('compCard');
  const overlay = document.querySelector('.comparison-modal-overlay');
  if(!card || !overlay) return;
  
  if (direction === 'left') {
      card.style.animation = 'swipeLeftAnim 0.5s forwards';
      const btnCancel = document.querySelector('.btn-modal-action.cancel');
      if (btnCancel) btnCancel.style.animation = 'absorbBounce 0.5s forwards';
      setTimeout(() => {
        window.skipComparison();
      }, 500);
  } else if (direction === 'right') {
    card.style.animation = 'swipeRightAnim 0.5s forwards';
    const btn = document.querySelector('.btn-modal-action.next');
    if (btn) {
      btn.style.animation = 'absorbBounce 0.5s forwards';
    }
    setTimeout(() => { window.nextComparison(); }, 500);
  }
};

window.cancelComparison = function() {
  closeComparisonModal(true);
};

window.initCardDrag = function() {
  const card = document.getElementById('compCard');
  if(!card) return;
  let startX = 0;
  let currentX = 0;
  let isDragging = false;
  
  const startDrag = (e) => {
    isDragging = true;
    startX = e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;
    
    // สำคัญมาก: ต้องปิด animation เดิมที่ติดมาตอนเปิดการ์ด ไม่งั้นมันจะงัดกับเมาส์
    card.style.animation = 'none';
    card.style.transition = 'none';
    card.style.cursor = 'grabbing';
  };
  
  const moveDrag = (e) => {
    if(!isDragging) return;
    const x = e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;
    currentX = x - startX;
    
    // คำนวณองศาหมุน
    const rotate = currentX * 0.08;
    
    // ใช้ requestAnimationFrame ช่วยเพิ่มเฟรมเรตให้สมูท
    requestAnimationFrame(() => {
      if(isDragging) {
        card.style.transform = `translateX(${currentX}px) rotate(${rotate}deg) scale(1.05)`;
      }
    });
  };
  
  const endDrag = (e) => {
    if(!isDragging) return;
    isDragging = false;
    card.style.cursor = 'grab';
    
    if(currentX > 100) {
      triggerSwipe('right');
    } else if (currentX < -100) {
      triggerSwipe('left');
    } else {
      // แรงเฉื่อยเด้งๆ (Bouncy Spring)
      card.style.transition = 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
      card.style.transform = 'translateX(0) rotate(0deg) scale(1)';
      currentX = 0;
    }
  };
  
  card.style.cursor = 'grab';
  card.addEventListener('mousedown', startDrag);
  document.addEventListener('mousemove', moveDrag);
  document.addEventListener('mouseup', endDrag);
  
  card.addEventListener('touchstart', startDrag, {passive: true});
  document.addEventListener('touchmove', moveDrag, {passive: true});
  document.addEventListener('touchend', endDrag);
};

// --- RECORD LOGIC ---
localStorage.removeItem('zonezet_processed_records');
if (!window.processedRecords) {
  window.processedRecords = { gdp: [], inflation: [], unemployment: [] };
}
window.saveProcessedRecord = function(pageType, item) {
  if (!window.processedRecords[pageType]) window.processedRecords[pageType] = [];
  const exists = window.processedRecords[pageType].findIndex(x => x.country === item.country);
  if (exists >= 0) {
    window.processedRecords[pageType][exists] = item;
  } else {
    window.processedRecords[pageType].push(item);
  }
};
window.initRecordPage = function() {
    const layout = document.querySelector('.record-layout');
    if (!layout) return;
    
    // Inject custom styles for the new record panel if not already present
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
          padding: 5px 20px 15px 20px;
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
          padding: 15px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
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
      const items = window.processedRecords[cat.id] || [];
      let rowsHtml = '';
      if (items.length === 0) {
        rowsHtml = '<div style="color: rgba(255,255,255,0.5); text-align: center; margin-top: 20px;">ยังไม่มีข้อมูลประมวลผล</div>';
      } else {
        items.forEach((item, index) => {
          const iconSvg = getTrendIcon(item.trend, item.colorClass);
          rowsHtml += `
            <div class="record-custom-item">
              <div class="record-custom-country">${item.country}</div>
              <div class="record-custom-right">
                <div class="record-custom-val ${item.colorClass}">
                  ${iconSvg}
                  ${item.displayValue}
                </div>
                <button class="btn-delete-custom" type="button" title="Delete" onclick="window.deleteRecordItem('${cat.id}', ${index})">
                  <!-- รูปถังขยะ -->
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
            <button class="btn-history-custom" type="button" title="History" onclick="window.undoDeleteRecord('${cat.id}')">
              <!-- รูปนาฬิกา -->
              <img src="img/Rollback.png" alt="History">
            </button>
          </div>
          <div class="record-panel-custom-body">
            ${rowsHtml}
          </div>
        </div>
      `;
    });
  };

// --- RECORD DELETE & UNDO LOGIC ---
if (!window.deletedRecords) {
  window.deletedRecords = { gdp: [], inflation: [], unemployment: [] };
}

window.deleteRecordItem = function(type, index) {
  if (!window.deletedRecords) window.deletedRecords = { gdp: [], inflation: [], unemployment: [] };
  if (!window.deletedRecords[type]) window.deletedRecords[type] = [];
  
  const removedItem = window.processedRecords[type].splice(index, 1)[0];
  window.deletedRecords[type].push({ item: removedItem, index: index });
  
  if (window.showGlassAlert) window.showGlassAlert('ลบข้อมูลเรียบร้อยแล้ว', 'success');
  window.initRecordPage();
};

window.undoDeleteRecord = function(type) {
  if (!window.deletedRecords || !window.deletedRecords[type] || window.deletedRecords[type].length === 0) {
    if (window.showGlassAlert) window.showGlassAlert('ไม่มีประวัติการลบให้เรียกคืน', 'warning');
    return;
  }
  
  const lastDeleted = window.deletedRecords[type].pop();
  
  const currentLen = window.processedRecords[type].length;
  const insertIndex = Math.min(lastDeleted.index, currentLen);
  window.processedRecords[type].splice(insertIndex, 0, lastDeleted.item);
  
  if (window.showGlassAlert) window.showGlassAlert('เรียกคืนข้อมูลสำเร็จ!', 'success');
  window.initRecordPage();
};
