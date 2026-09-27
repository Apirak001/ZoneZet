/**
 * ==============================================================
 * Project: ZoneZet Economic Dashboard (Course 801201)
 * File: public/js/uiComponents.js
 * Description: รวบรวมคอมโพเนนต์ส่วนติดต่อผู้ใช้ (UI Components & Helpers)
 *              - ระบบ Preloader หน้าจอโหลดเริ่มต้น
 *              - ฟังก์ชันสร้าง SVG Icon แสดงแนวโน้ม (Up / Down) สีเขียวและแดง
 *              - ป๊อปอัปแจ้งเตือนสไตล์กระจกฝ้า (Glassmorphism Alert)
 *              - กล่องเลือกปีแบบเคลื่อนไหว (Animated Custom Select Dropdown)
 * ==============================================================
 */

// ==========================================
// 1. ระบบ Preloader หน้าจอโหลดเริ่มต้น
// ==========================================
window.addEventListener('load', () => {
  setTimeout(() => {
    const preloader = document.getElementById('global-preloader');
    if (preloader) {
      preloader.classList.add('hidden');
      setTimeout(() => preloader.remove(), 600);
    }
  }, 1200); // หน่วงเวลาให้นุ่มนวลก่อนปิด Preloader
});

// ==========================================
// 2. ฟังก์ชันสร้าง SVG Icon ลูกศรแนวโน้ม (Trend Icon)
// ==========================================
/**
 * คืนค่าโค้ด SVG ลูกศรชี้ขึ้นหรือลงตามสถานะและสีที่กำหนด
 * @param {string} trend - 'up' (ขึ้น) หรือ 'down' (ลง)
 * @param {string} colorClass - 'green' (เขียว) หรือ 'red' (แดง)
 * @returns {string} โค้ด SVG ของลูกศร
 */
function getTrendIcon(trend, colorClass) {
  const strokeColor = colorClass === 'green' ? '#00ff2e' : '#ff383b';

  if (trend === 'up') {
    // ลูกศรชี้ขึ้น (Upward Arrow) เส้นหนาคมชัด
    return `
      <svg class="trend-icon up" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="${strokeColor}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="19" x2="12" y2="5"></line>
        <polyline points="5 12 12 5 19 12"></polyline>
      </svg>
    `;
  } else {
    // ลูกศรชี้ลง (Downward Arrow) เส้นหนาคมชัด
    return `
      <svg class="trend-icon down" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="${strokeColor}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <polyline points="19 12 12 19 5 12"></polyline>
      </svg>
    `;
  }
}

// ==========================================
// 3. ป๊อปอัปแจ้งเตือนสไตล์กระจกฝ้า (Glassmorphism Alert)
// ==========================================
/**
 * แสดงกล่องข้อความแจ้งเตือนโปร่งแสง สไตล์ Glassmorphism ด้านบนของหน้าจอ
 * @param {string} message - ข้อความที่ต้องการแจ้งเตือน
 * @param {string} type - 'success' (สำเร็จ/เขียว) หรือ 'warning' (เตือน/แดง)
 */
function showGlassAlert(message, type = 'success') {
  // ลบกล่องแจ้งเตือนอันเก่าออกก่อน (ถ้ามี)
  const existing = document.querySelector('.glass-alert');
  if (existing) existing.remove();

  const alert = document.createElement('div');
  alert.className = 'glass-alert ' + type;
  alert.textContent = message;

  // กำหนดสไตล์ Glassmorphism แบบกระจกฝ้าโปร่งแสง
  alert.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 14px 28px;
    border-radius: 16px;
    color: #ffffff;
    font-weight: 600;
    font-size: 14px;
    z-index: 99999;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    animation: cardEntrance 0.4s forwards;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  `;

  if (type === 'warning') {
    alert.style.background = 'rgba(255, 56, 59, 0.25)';
    alert.style.border = '1px solid rgba(255, 56, 59, 0.4)';
  } else {
    alert.style.background = 'rgba(0, 255, 46, 0.2)';
    alert.style.border = '1px solid rgba(0, 255, 46, 0.3)';
  }

  document.body.appendChild(alert);

  // ตั้งเวลาปิดอัตโนมัติหลังจาก 2.5 วินาที
  setTimeout(() => {
    if (alert.parentNode) alert.remove();
  }, 2500);
}

// ==========================================
// 4. ระบบ Custom Select Dropdown สไตล์โมเดิร์น
// ==========================================
/**
 * แปลง <select> ธรรมดาให้กลายเป็น Custom Dropdown ที่มีลูกเล่นแอนิเมชันเปิด/ปิดสวยงาม
 */
function initCustomSelects() {
  document.querySelectorAll('.custom-select-wrapper:not(.initialized)').forEach(wrapper => {
    wrapper.classList.add('initialized');

    const trigger = wrapper.querySelector('.custom-select-trigger');
    const options = wrapper.querySelector('.custom-options');
    const hiddenInput = wrapper.querySelector('.search-select');
    const textEl = wrapper.querySelector('.custom-select-text');

    if (!trigger || !options) return;

    // เปิด/ปิด Dropdown เมื่อคลิกที่ตัวเลือก
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = wrapper.classList.contains('open');

      // ปิดกล่องอื่นๆ ทั้งหมดก่อน
      document.querySelectorAll('.custom-select-wrapper.open').forEach(w => w.classList.remove('open'));

      if (!isOpen) wrapper.classList.add('open');
    });

    // ดักจับการเลือกตัวเลือกย่อย
    wrapper.querySelectorAll('.custom-option').forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();

        // สลับคลาส selected ให้ตัวเลือกใหม่
        wrapper.querySelectorAll('.custom-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');

        // แสดงข้อความปีที่เลือก
        if (textEl) textEl.textContent = opt.textContent;

        // อัปเดตค่าใน input ที่ซ่อนอยู่ และส่ง event change
        if (hiddenInput) {
          hiddenInput.value = opt.dataset.value;
          hiddenInput.dispatchEvent(new Event('change'));
        }

        // ปิดเมนูตัวเลือก
        wrapper.classList.remove('open');
      });
    });
  });

  // ปิด Dropdown เมื่อคลิกที่ว่างนอกพื้นที่
  document.addEventListener('click', () => {
    document.querySelectorAll('.custom-select-wrapper.open').forEach(w => w.classList.remove('open'));
  });
}

// ส่งออกฟังก์ชันเข้าสู่ window ให้ทุกไฟล์เรียกใช้งานได้
window.getTrendIcon = getTrendIcon;
window.showGlassAlert = showGlassAlert;
window.initCustomSelects = initCustomSelects;
