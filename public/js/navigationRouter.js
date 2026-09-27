/**
 * ==============================================================
 * Project: ZoneZet Economic Dashboard (Course 801201)
 * File: public/js/navigationRouter.js
 * Description: ระบบเราเตอร์และนำทางหลักของเว็บ (SPA Router & Navigation)
 *              - สลับหน้าแบบ Single Page Application (SPA) โหลดเนื้อหาโดยไม่รีเฟรชหน้าจอ
 *              - แถบไฮไลต์นำทาง Floating Active บน Sidebar ตามเมนูที่เลือก
 *              - ระบบแบนเนอร์ภาพเลื่อนอัตโนมัติ (Carousel Auto-play & Controls) บนหน้า HOME
 *              - โหลดและแสดงข้อมูลสถิติ 5 อันดับแรก (TOP 5) บนหน้า HOME Dashboard
 * ==============================================================
 */

document.addEventListener('DOMContentLoaded', () => {

  // ==========================================
  // 1. ระบบ SPA (Single Page Application)
  // ==========================================
  const navLinks = document.querySelectorAll('.nav-item');             // ปุ่มเมนูด้านซ้าย
  const mainContent = document.querySelector('.main-content');          // พื้นที่แสดงเนื้อหาหลัก
  const floatingActive = document.querySelector('.floating-active');    // แถบไฮไลต์สีม่วงเลื่อนตามเมนู

  // ฟังก์ชันเลื่อนแถบสีม่วงไปยังตำแหน่งเมนูที่เลือก
  const updateFloatingActive = (activeItem) => {
    if (!floatingActive || !activeItem) return;
    floatingActive.style.top = activeItem.offsetTop + 'px';
    floatingActive.style.height = activeItem.offsetHeight + 'px';
  };

  // กำหนดตำแหน่งเริ่มต้นให้ตรงกับเมนูที่มีคลาส active
  const initialActive = document.querySelector('.nav-item.active');
  if (initialActive) updateFloatingActive(initialActive);

  // ปรับตำแหน่งแถบสีม่วงเมื่อหน้าจอเปลี่ยนขนาด
  window.addEventListener('resize', () => {
    const currentActive = document.querySelector('.nav-item.active');
    if (currentActive) updateFloatingActive(currentActive);
  });

  // ผูก Event ให้กับปุ่มเมนูทุกปุ่ม
  navLinks.forEach(link => {
    link.addEventListener('click', async (e) => {
      const url = link.getAttribute('href');

      if (url && !link.classList.contains('active') && !url.startsWith('#')) {
        e.preventDefault(); // ป้องกันการรีเฟรชหน้าเว็บ

        // อัปเดตสถานะเมนูที่ถูกเลือก
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        link.classList.add('active');
        updateFloatingActive(link);

        // แอนิเมชัน Fade-out เนื้อหาเดิม
        mainContent.classList.add('fade-out');
        mainContent.classList.remove('fade-in');

        try {
          // ดึงไฟล์ HTML ของหน้าที่ต้องการมาแสดง
          const response = await fetch(url);
          const html = await response.text();

          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          const newMain = doc.querySelector('.main-content');

          setTimeout(() => {
            if (newMain) {
              mainContent.innerHTML = newMain.innerHTML;
              mainContent.className = newMain.className;
            }

            // ตรวจสอบและเริ่มต้นฟังก์ชันตามหน้าเว็บที่โหลดมา
            if (url === 'index.html' || url === '' || url === '/' || url.includes('index.html')) {
              initCarousel();
              loadDashboard();
            } else if (url.includes('gdp.html')) {
              if (window.initIndicatorPage) window.initIndicatorPage('gdp');
            } else if (url.includes('inflation.html')) {
              if (window.initIndicatorPage) window.initIndicatorPage('inflation');
            } else if (url.includes('unemployment.html')) {
              if (window.initIndicatorPage) window.initIndicatorPage('unemployment');
            } else if (url.includes('record.html')) {
              if (window.initRecordPage) window.initRecordPage();
            }

            // แอนิเมชัน Fade-in เนื้อหาใหม่
            mainContent.classList.remove('fade-out');
            mainContent.classList.add('fade-in');

            // อัปเดตที่อยู่ URL บนเบราว์เซอร์
            history.pushState({}, '', url);
          }, 300);

        } catch (err) {
          console.error("Error loading page:", err);
          window.location.href = url;
        }
      } else if (url && link.classList.contains('active')) {
        e.preventDefault();
      }
    });
  });

  // รองรับปุ่ม Back / Forward บนเบราว์เซอร์
  window.addEventListener('popstate', () => {
    window.location.reload();
  });

  // ==========================================
  // 2. ระบบ Carousel แบนเนอร์ภาพเลื่อนอัตโนมัติ (หน้า HOME)
  // ==========================================
  let autoPlayInterval;

  const initCarousel = () => {
    const track = document.getElementById('carouselTrack');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (autoPlayInterval) clearInterval(autoPlayInterval);

    if (track && prevBtn && nextBtn) {
      let currentIndex = 0;
      const slides = track.querySelectorAll('.carousel-slide');
      const totalSlides = slides.length;

      if (totalSlides > 0) slides[currentIndex].classList.add('active');

      const updateCarousel = () => {
        slides.forEach(slide => slide.classList.remove('active'));
        if (slides[currentIndex]) slides[currentIndex].classList.add('active');
      };

      const nextSlide = () => {
        currentIndex = (currentIndex < totalSlides - 1) ? currentIndex + 1 : 0;
        updateCarousel();
      };

      // เลื่อนภาพอัตโนมัติทุกๆ 5 วินาที
      autoPlayInterval = setInterval(nextSlide, 5000);

      const resetAutoPlay = () => {
        clearInterval(autoPlayInterval);
        autoPlayInterval = setInterval(nextSlide, 5000);
      };

      prevBtn.addEventListener('click', () => {
        currentIndex = (currentIndex > 0) ? currentIndex - 1 : totalSlides - 1;
        updateCarousel();
        resetAutoPlay();
      });

      nextBtn.addEventListener('click', () => {
        nextSlide();
        resetAutoPlay();
      });
    }
  };

  // ==========================================
  // 3. ระบบแสดงข้อมูล TOP 5 บนหน้า Dashboard (หน้า HOME)
  // ==========================================
  const loadDashboard = () => {
    if (!document.getElementById('card-gdp')) return;

    fetch('/api/dashboard/top5')
      .then(res => res.json())
      .then(result => {
        const data = result.data;
        if (data) {
          renderCard('card-gdp', 'GDP TOP 5', data.gdp);
          renderCard('card-inflation', 'INFLATION TOP 5', data.inflation);
          renderCard('card-unemployment', 'UNEMPLOYMENT TOP 5', data.unemployment);
        }
      })
      .catch(err => {
        console.error('โหลดข้อมูลหน้า Dashboard ไม่สำเร็จ:', err);
        renderCard('card-gdp', 'GDP TOP 5 (2025)', [{ country: "รอเชื่อมต่อ API", displayValue: "-", colorClass: "" }]);
        renderCard('card-inflation', 'INFLATION TOP 5 (2025)', [{ country: "รอเชื่อมต่อ API", displayValue: "-", colorClass: "" }]);
        renderCard('card-unemployment', 'UNEMPLOYMENT TOP 5 (2025)', [{ country: "รอเชื่อมต่อ API", displayValue: "-", colorClass: "" }]);
      });
  };

  /**
   * เรนเดอร์ข้อมูลแต่ละการ์ด (GDP, Inflation, Unemployment)
   */
  const renderCard = (cardId, title, items) => {
    const card = document.getElementById(cardId);
    if (!card || !items) return;

    card.innerHTML = `<h2 class="card-title">${title}</h2>`;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const row = document.createElement('div');
      row.className = 'card-row';

      const iconSvg = typeof window.getTrendIcon === 'function' ? window.getTrendIcon(item.trend, item.colorClass) : '';

      row.innerHTML = `
        <span class="country" style="display: flex; align-items: center; gap: 8px;">
          <img src="https://flagcdn.com/${(item.iso2 || 'xx').toLowerCase()}.svg" alt="" class="country-flag" onerror="this.style.display='none'">
          ${item.country}
        </span>
        <span class="value ${item.colorClass || ''}" style="display: flex; align-items: center; gap: 4px;">
          ${iconSvg}
          ${item.displayValue}
        </span>
      `;
      card.appendChild(row);
    }
  };

  // เรียกใช้ฟังก์ชันเริ่มต้นเมื่อเปิดหน้าแรก
  initCarousel();
  loadDashboard();
});
