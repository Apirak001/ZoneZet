// public/script.js
// ไฟล์นี้เป็นหัวใจหลักในการจัดการระบบหน้าเว็บ (Single Page Application - SPA) 
// รวมถึงการทำงานของแบนเนอร์ภาพเลื่อน (Carousel) และการดึงข้อมูลแผงควบคุม (Dashboard)

document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 1. ระบบ SPA (Single Page Application) นำทางโดยไม่เปลี่ยนหน้า
    // ==========================================
    const navLinks = document.querySelectorAll('.nav-item'); // ปุ่มเมนูด้านซ้าย
    const mainContent = document.querySelector('.main-content'); // พื้นที่เนื้อหาหลัก
    const floatingActive = document.querySelector('.floating-active'); // แถบไฮไลต์สีม่วงที่เลื่อนตามเมนู

    // ฟังก์ชันเลื่อนแถบไฮไลต์สีม่วงไปหาเมนูที่ผู้ใช้คลิก
    const updateFloatingActive = (activeItem) => {
        if (!floatingActive || !activeItem) return;
        floatingActive.style.top = activeItem.offsetTop + 'px';
        floatingActive.style.height = activeItem.offsetHeight + 'px';
    };

    // ตั้งค่าแถบไฮไลต์เริ่มต้นให้กับเมนูแรกที่ถูกเลือก
    const initialActive = document.querySelector('.nav-item.active');
    if (initialActive) updateFloatingActive(initialActive);

    // ดักจับการย่อ/ขยายหน้าจอ เพื่อปรับตำแหน่งแถบไฮไลต์ให้ตรงเสมอ
    window.addEventListener('resize', () => {
        const currentActive = document.querySelector('.nav-item.active');
        if(currentActive) updateFloatingActive(currentActive);
    });

    // ดักจับการคลิกเมนูทุกปุ่ม
    navLinks.forEach(link => {
        link.addEventListener('click', async (e) => {
            const url = link.getAttribute('href');
            // ตรวจสอบว่าลิงก์นั้นไม่ใช่หน้าที่กำลังใช้งานอยู่ และเป็นลิงก์จริงๆ
            if (url && !link.classList.contains('active') && !url.startsWith('#')) {
                e.preventDefault(); // ป้องกันไม่ให้หน้าเว็บกระตุกหรือรีเฟรช
                
                // ลบสถานะ 'active' จากเมนูเดิม และเพิ่มให้เมนูใหม่ที่คลิก
                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                link.classList.add('active');
                updateFloatingActive(link); // เลื่อนแถบสีม่วงตามไป

                // แสดงแอนิเมชันจางหาย (Fade-out) สำหรับเนื้อหาเก่า
                mainContent.classList.add('fade-out');
                mainContent.classList.remove('fade-in');

                try {
                    // เรียกไปขอไฟล์ HTML ของหน้าใหม่ผ่านระบบ Fetch
                    const response = await fetch(url);
                    const html = await response.text();
                    
                    // แปลงข้อความ HTML ที่ได้มา ให้เป็นโครงสร้าง (DOM) ที่เบราว์เซอร์เข้าใจ
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    const newMain = doc.querySelector('.main-content');

                    // รอเวลาสักนิดให้แอนิเมชัน Fade-out ทำงานเสร็จ ค่อยเปลี่ยนเนื้อหา
                    setTimeout(() => {
                        if(newMain) {
                            mainContent.innerHTML = newMain.innerHTML;
                            mainContent.className = newMain.className; 
                        }
                        
                        // ตรวจสอบว่าโหลดหน้าอะไรมา เพื่อรันสคริปต์ให้ตรงกับหน้านั้นๆ
                        if(url === 'index.html' || url === '' || url === '/' || url.includes('index.html')) {
                            // หน้าแรก (Home) ให้โหลดระบบภาพเลื่อนและข้อมูลอันดับ 1-5
                            initCarousel();
                            loadDashboard();
                        } else if (url.includes('gdp.html')) {
                            // หน้า GDP ให้รันระบบตัวชี้วัด (ค้นหาตาราง) โหมด gdp
                            if (window.initIndicatorPage) window.initIndicatorPage('gdp');
                        } else if (url.includes('inflation.html')) {
                            // หน้า INFLATION
                            if (window.initIndicatorPage) window.initIndicatorPage('inflation');
                        } else if (url.includes('unemployment.html')) {
                            // หน้า UNEMPLOYMENT
                            if (window.initIndicatorPage) window.initIndicatorPage('unemployment');
                        } else if (url.includes('record.html')) {
                            // หน้า RECORD
                            if (window.initRecordPage) window.initRecordPage();
                        }

                        // แสดงแอนิเมชันปรากฏตัว (Fade-in) สำหรับเนื้อหาใหม่
                        mainContent.classList.remove('fade-out');
                        mainContent.classList.add('fade-in');
                        
                        // เปลี่ยน URL บนช่องที่อยู่ด้านบนสุด (Address Bar) ให้ตรงกับเนื้อหา
                        history.pushState({}, '', url);
                    }, 300);

                } catch (err) {
                    console.error("Error loading page:", err);
                    // หากเกิดข้อผิดพลาดในการโหลดแบบนุ่มนวล ให้บังคับรีเฟรชหน้าไปที่ URL นั้นเลย
                    window.location.href = url;
                }
            } else if (url && link.classList.contains('active')) {
                // ถ้ากดเมนูซ้ำหน้าเดิม ไม่ต้องทำอะไร
                e.preventDefault(); 
            }
        });
    });

    // ดักจับกรณีที่ผู้ใช้กดปุ่ม "ย้อนกลับ" หรือ "ไปข้างหน้า" บนเบราว์เซอร์
    window.addEventListener('popstate', () => {
        window.location.reload(); // รีเฟรชหน้าเพื่อความชัวร์ว่าข้อมูลถูกต้อง
    });


    // ==========================================
    // 2. ระบบแบนเนอร์ภาพเลื่อน (Carousel) สำหรับหน้า HOME
    // ==========================================
    let autoPlayInterval; // ตัวแปรเก็บสถานะการเล่นอัตโนมัติ
    const initCarousel = () => {
        const track = document.getElementById('carouselTrack'); // พื้นที่เก็บภาพทั้งหมด
        const prevBtn = document.getElementById('prevBtn'); // ปุ่มถอยหลัง
        const nextBtn = document.getElementById('nextBtn'); // ปุ่มไปข้างหน้า
        
        // เคลียร์ระบบเล่นอัตโนมัติเก่าทิ้งเพื่อป้องกันการซ้อนทับกัน
        if(autoPlayInterval) clearInterval(autoPlayInterval);

        // ตรวจสอบว่าหน้าปัจจุบันมีกล่องภาพเลื่อนจริงๆ ค่อยทำงาน
        if (track && prevBtn && nextBtn) {
            let currentIndex = 0; // ตำแหน่งภาพปัจจุบัน
            const slides = track.querySelectorAll('.carousel-slide'); // ภาพทั้งหมด
            const totalSlides = slides.length;

            // แสดงภาพแรกทันทีเมื่อโหลดเสร็จ
            if(totalSlides > 0) slides[currentIndex].classList.add('active');

            // ฟังก์ชันซ่อนภาพอื่น และแสดงภาพที่เลือก
            const updateCarousel = () => {
                slides.forEach(slide => slide.classList.remove('active'));
                if(slides[currentIndex]) slides[currentIndex].classList.add('active');
            };

            // ฟังก์ชันเลื่อนภาพถัดไป
            const nextSlide = () => {
                // ถ้ารูปหมดแล้วให้วนกลับไปรูปที่ 0
                currentIndex = (currentIndex < totalSlides - 1) ? currentIndex + 1 : 0;
                updateCarousel();
            };

            // สั่งให้ภาพเลื่อนอัตโนมัติทุกๆ 5 วินาที
            autoPlayInterval = setInterval(nextSlide, 5000);

            // ฟังก์ชันตั้งเวลาใหม่เมื่อผู้ใช้กดปุ่ม (ภาพจะได้ไม่เลื่อนซ้อนจังหวะผู้ใช้กด)
            const resetAutoPlay = () => {
                clearInterval(autoPlayInterval);
                autoPlayInterval = setInterval(nextSlide, 5000);
            };

            // เมื่อกดปุ่มย้อนกลับ
            prevBtn.addEventListener('click', () => {
                // ถ้าอยู่รูปแรกแล้ว ให้วนไปรูปสุดท้าย
                currentIndex = (currentIndex > 0) ? currentIndex - 1 : totalSlides - 1;
                updateCarousel();
                resetAutoPlay();
            });

            // เมื่อกดปุ่มไปข้างหน้า
            nextBtn.addEventListener('click', () => {
                nextSlide();
                resetAutoPlay();
            });
        }
    };


    // ==========================================
    // 3. ระบบแสดงผลข้อมูลอันดับ 1-5 บนหน้า Dashboard (หน้า HOME)
    // ==========================================
    const loadDashboard = () => {
        // ตรวจสอบว่ามีกล่องการ์ดสำหรับใส่ข้อมูลหรือไม่ (กันไว้กรณีไม่ใช่หน้า HOME)
        if (!document.getElementById('card-gdp')) return;
        
        // ส่งคำร้องขอ (Fetch API) ไปดึงข้อมูลสถิติ 5 อันดับแรกจากเซิร์ฟเวอร์
        fetch('/api/dashboard/top5')
        .then(res => res.json()) // แปลงข้อมูลให้เป็น Object JSON
        .then(result => {
            const data = result.data;
            if (data) {
                // ส่งข้อมูลแต่ละหมวดให้ฟังก์ชัน renderCard ไปวาดขึ้นหน้าจอ
                renderCard('card-gdp', 'GDP TOP 5', data.gdp);
                renderCard('card-inflation', 'INFLATION TOP 5', data.inflation);
                renderCard('card-unemployment', 'UNEMPLOYMENT TOP 5', data.unemployment);
            }
        })
        .catch(err => {
            console.error('โหลดข้อมูลหน้า Dashboard ไม่สำเร็จ:', err);
            // ถ้าเซิร์ฟเวอร์ล่มหรือ API ไม่ตอบสนอง จะแสดงข้อมูลจำลองเพื่อไม่ให้หน้าเว็บว่างเปล่า
            renderCard('card-gdp', 'GDP TOP 5 (2025)', [{country: "รอเชื่อมต่อ API", displayValue: "-", colorClass: ""}]);
            renderCard('card-inflation', 'INFLATION TOP 5 (2025)', [{country: "รอเชื่อมต่อ API", displayValue: "-", colorClass: ""}]);
            renderCard('card-unemployment', 'UNEMPLOYMENT TOP 5 (2025)', [{country: "รอเชื่อมต่อ API", displayValue: "-", colorClass: ""}]);
        });
    };

    // ฟังก์ชันวาดการ์ดแสดงผล 5 อันดับ (ใช้ร่วมกันทั้ง GDP, INFLATION, UNEMPLOYMENT)
    const renderCard = (cardId, title, items) => {
        const card = document.getElementById(cardId);
        if (!card || !items) return;

        // วาดส่วนหัวของการ์ด (Title)
        card.innerHTML = `<h2 class="card-title">${title}</h2>`;

        // วนลูปสร้างแถวตามจำนวนข้อมูลที่มี
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const row = document.createElement('div');
            row.className = 'card-row';
            
            // วาดชื่อประเทศ และค่าตัวเลข (พร้อมสีตามแนวโน้ม)
            row.innerHTML = `
            <span class="country">${item.country}</span>
            <span class="value ${item.colorClass || ''}">${item.displayValue}</span>
            `;
            card.appendChild(row); // แปะลงในการ์ด
        }
    };

    // เริ่มต้นระบบแบนเนอร์และแผงข้อมูลทันทีในหน้าแรก
    initCarousel();
    loadDashboard();

});
