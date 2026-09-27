/**
 * ==============================================================
 * Project: ZoneZet Economic Dashboard (Course 801201)
 * File: public/js/comparisonModal.js
 * Description: จัดการระบบ Modal เปรียบเทียบข้อมูลแบบการ์ดปัด (Card Swipe Modal)
 *              - แสดงการ์ดข้อมูลประเทศสไตล์ Tinder / Flashcard
 *              - รองรับ Gesture ลากเมาส์ / สัมผัสหน้าจอ (Drag & Drop)
 *              - รองรับปุ่มลูกศรบนคีย์บอร์ด (Left = Skip, Right = Process)
 *              - เชื่อมต่อกับระบบบันทึก Record เมื่อปัดขวา
 * ==============================================================
 */

// ==========================================
// 1. ฟังก์ชันแสดง Modal การ์ดเปรียบเทียบ
// ==========================================
/**
 * เรนเดอร์หน้าต่าง Modal การ์ดเปรียบเทียบจากรายการใน Comparison Area
 * @param {string} pageType - 'gdp' | 'inflation' | 'unemployment'
 */
function renderComparisonModal(pageType) {
  const list = window.comparisonData ? window.comparisonData[pageType] : [];
  if (!list || list.length === 0) {
    if (window.showGlassAlert) window.showGlassAlert('ประมวลผลข้อมูลทั้งหมดเสร็จสิ้น!', 'success');
    closeComparisonModal(true);
    return;
  }

  const item = list[0];
  const title = pageType.toUpperCase();
  const isUp = item.trend === 'up';
  const colorHex = item.colorClass === 'green' ? '#00ff2e' : '#ff383b';
  const trendText = isUp ? 'GROWING' : 'DECLINING';

  // SVG Icon ขนาดใหญ่สำหรับการ์ด
  const iconSvg = isUp ?
    `<svg class="trend-icon up" viewBox="0 0 24 24" fill="none" stroke="${colorHex}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 17 12 11 6 17"></polyline><polyline points="18 9 12 3 6 9"></polyline></svg>` :
    `<svg class="trend-icon down" viewBox="0 0 24 24" fill="none" stroke="${colorHex}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 7 12 13 18 7"></polyline><polyline points="6 15 12 21 18 15"></polyline></svg>`;

  let overlay = document.querySelector('.comparison-modal-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'comparison-modal-overlay';
    document.body.appendChild(overlay);
  }

  // สร้างโครงสร้างหน้าต่างการ์ดพร้อมปุ่ม ซ้าย (Skip) และ ขวา (Save)
  overlay.innerHTML = `
    <!-- ปุ่มข้าม (Skip - ปัดซ้าย) -->
    <button class="btn-modal-action cancel" onclick="triggerSwipe('left')" title="ข้าม (Skip)">
      <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    </button>

    <!-- ตัวการ์ดเปรียบเทียบ -->
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

    <!-- ปุ่มเลือก/บันทึก (Save - ปัดขวา) -->
    <button class="btn-modal-action next" onclick="triggerSwipe('right')" title="ประมวลผลและบันทึก (Save)">
      <svg viewBox="0 0 24 24" width="28" height="28" stroke="none" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg>
    </button>
  `;

  overlay.classList.add('show');

  // เริ่มต้นระบบการลากการ์ด
  setTimeout(() => {
    const card = document.getElementById('compCard');
    if (card) card.style.transform = 'scale(1)';
    initCardDrag();

    // ตัวจับเวลาสั่นการ์ดเพื่อใบ้ผู้ใช้ (Swipe Hint)
    if (window.swipeHintTimer) clearInterval(window.swipeHintTimer);
    window.swipeHintTimer = setInterval(() => {
      const c = document.getElementById('compCard');
      if (!c) {
        clearInterval(window.swipeHintTimer);
        return;
      }
      c.style.animation = 'none';
      void c.offsetWidth; // Trigger reflow
      c.classList.add('hint-anim');
      setTimeout(() => {
        if (c) c.classList.remove('hint-anim');
      }, 2000);
    }, 3500);
  }, 10);
}

// ==========================================
// 2. ปิดหน้าต่าง Modal
// ==========================================
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

// ==========================================
// 3. จัดการการปัด (Swipe Actions)
// ==========================================
/**
 * ปัดซ้าย: ข้ามรายการนี้ไป ไม่บันทึกลง Record
 */
function skipComparison() {
  const type = window.currentComparisonType;
  if (!type || !window.comparisonData || !window.comparisonData[type]) return;

  const list = window.comparisonData[type];
  if (list.length > 0) {
    list.shift(); // ดึงรายการแรกออก
    if (window.renderComparisonList) window.renderComparisonList(type);
    closeComparisonModal(false);

    if (list.length > 0) {
      setTimeout(() => renderComparisonModal(type), 300);
    } else {
      setTimeout(() => {
        if (window.showGlassAlert) window.showGlassAlert('ประมวลผลข้อมูลทั้งหมดเสร็จสิ้น!', 'success');
        closeComparisonModal(true);
      }, 300);
    }
  }
}

/**
 * ปัดขวา: บันทึกรายการนี้ลง Record แล้วไปรายการถัดไป
 */
function nextComparison() {
  const type = window.currentComparisonType;
  if (!type || !window.comparisonData || !window.comparisonData[type]) return;

  const list = window.comparisonData[type];
  if (list.length > 0) {
    const item = list.shift(); // ดึงข้อมูลรายการนี้ออกมา

    // บันทึกลงใน Record Page
    if (window.saveProcessedRecord) window.saveProcessedRecord(type, item);

    if (window.renderComparisonList) window.renderComparisonList(type);
    closeComparisonModal(false);

    if (list.length > 0) {
      setTimeout(() => renderComparisonModal(type), 300);
    } else {
      setTimeout(() => {
        if (window.showGlassAlert) window.showGlassAlert('ประมวลผลข้อมูลทั้งหมดเสร็จสิ้น!', 'success');
        closeComparisonModal(true);
      }, 300);
    }
  }
}

/**
 * กดยกเลิก/ปิด Modal
 */
function cancelComparison() {
  closeComparisonModal(true);
}

/**
 * แอนิเมชันสั่งปัดการ์ดไปทางซ้ายหรือขวา
 * @param {string} direction - 'left' หรือ 'right'
 */
function triggerSwipe(direction) {
  const card = document.getElementById('compCard');
  const overlay = document.querySelector('.comparison-modal-overlay');
  if (!card || !overlay) return;

  if (direction === 'left') {
    card.style.animation = 'swipeLeftAnim 0.5s forwards';
    const btnCancel = document.querySelector('.btn-modal-action.cancel');
    if (btnCancel) btnCancel.style.animation = 'absorbBounce 0.5s forwards';
    setTimeout(() => {
      skipComparison();
    }, 500);
  } else if (direction === 'right') {
    card.style.animation = 'swipeRightAnim 0.5s forwards';
    const btnNext = document.querySelector('.btn-modal-action.next');
    if (btnNext) btnNext.style.animation = 'absorbBounce 0.5s forwards';
    setTimeout(() => {
      nextComparison();
    }, 500);
  }
}

// ==========================================
// 4. ระบบ Drag & Drop ลากการ์ดด้วยเมาส์หรือนิ้วสัมผัส
// ==========================================
function initCardDrag() {
  const card = document.getElementById('compCard');
  if (!card) return;

  let startX = 0;
  let currentX = 0;
  let isDragging = false;

  const startDrag = (e) => {
    if (window.swipeHintTimer) {
      clearInterval(window.swipeHintTimer);
      window.swipeHintTimer = null;
    }
    card.classList.remove('hint-anim');
    isDragging = true;
    startX = e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;

    // ปิด Animation เดิมเพื่อไม่ให้ฝืนการขยับของเมาส์
    card.style.animation = 'none';
    card.style.transition = 'none';
    card.style.cursor = 'grabbing';
  };

  const moveDrag = (e) => {
    if (!isDragging) return;
    const x = e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;
    currentX = x - startX;

    // คำนวณองศาเอียงตามระยะที่ลาก
    const rotate = currentX * 0.08;

    requestAnimationFrame(() => {
      if (isDragging) {
        card.style.transform = `translateX(${currentX}px) rotate(${rotate}deg) scale(1.05)`;
      }
    });
  };

  const endDrag = () => {
    if (!isDragging) return;
    isDragging = false;
    card.style.cursor = 'grab';

    // ถ้าลากเกินระยะที่กำหนด ให้ปัดอัตโนมัติ
    if (currentX > 100) {
      triggerSwipe('right');
    } else if (currentX < -100) {
      triggerSwipe('left');
    } else {
      // ถ้าระยะไม่ถึง ให้เด้งกลับตรงกลางอย่างนุ่มนวล
      card.style.transition = 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
      card.style.transform = 'translateX(0) rotate(0deg) scale(1)';
      currentX = 0;
    }
  };

  card.style.cursor = 'grab';
  card.addEventListener('mousedown', startDrag);
  document.addEventListener('mousemove', moveDrag);
  document.addEventListener('mouseup', endDrag);

  card.addEventListener('touchstart', startDrag, { passive: true });
  document.addEventListener('touchmove', moveDrag, { passive: true });
  document.addEventListener('touchend', endDrag);
}

// ==========================================
// 5. รองรับการควบคุมด้วยปุ่มลูกศรคีย์บอร์ด
// ==========================================
if (!window.hasSwipeKeyboard) {
  window.hasSwipeKeyboard = true;
  document.addEventListener('keydown', (e) => {
    const overlay = document.querySelector('.comparison-modal-overlay');
    if (!overlay) return;

    if (e.key === 'ArrowLeft') {
      triggerSwipe('left');
    } else if (e.key === 'ArrowRight') {
      triggerSwipe('right');
    }
  });
}

// ส่งออกฟังก์ชันเข้าสู่ window
window.renderComparisonModal = renderComparisonModal;
window.closeComparisonModal = closeComparisonModal;
window.skipComparison = skipComparison;
window.nextComparison = nextComparison;
window.cancelComparison = cancelComparison;
window.triggerSwipe = triggerSwipe;
window.initCardDrag = initCardDrag;
