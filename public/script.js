// public/script.js

document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 1. ระบบ Sidebar อนิเมชั่นเลื่อนแถบ & เปลี่ยนหน้าแบบไม่รีโหลด (SPA)
    // ==========================================
    const sidebarNav = document.querySelector('.sidebar-nav');
    const navLinks = document.querySelectorAll('.nav-item');
    const mainContent = document.querySelector('.main-content');
    
    // สร้างแถบแก้วใสที่เลื่อนได้ (Floating Active)
    const floatingActive = document.createElement('div');
    floatingActive.className = 'floating-active';
    if(sidebarNav) sidebarNav.appendChild(floatingActive);

    const updateFloatingActive = (targetEl) => {
        if (!targetEl || !sidebarNav) return;
        const rect = targetEl.getBoundingClientRect();
        const navRect = sidebarNav.getBoundingClientRect();
        floatingActive.style.top = (rect.top - navRect.top) + 'px';
        floatingActive.style.height = rect.height + 'px';
    };

    // ตั้งค่าเริ่มต้นตำแหน่งแถบแอคทีฟ
    const initialActive = document.querySelector('.nav-item.active');
    setTimeout(() => {
        if(initialActive) updateFloatingActive(initialActive);
    }, 50);

    // อัปเดตเมื่อเปลี่ยนขนาดหน้าจอ
    window.addEventListener('resize', () => {
        const active = document.querySelector('.nav-item.active');
        if(active) updateFloatingActive(active);
    });

    // ฟังก์ชันโหลดหน้าเว็บใหม่เมื่อกดคลิกเมนู
    navLinks.forEach(link => {
        link.addEventListener('click', async (e) => {
            const url = link.getAttribute('href');
            if (url && !link.classList.contains('active') && !url.startsWith('#')) {
                e.preventDefault(); 
                
                // เลื่อนแถบแอคทีฟไปที่เมนูใหม่
                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                link.classList.add('active');
                updateFloatingActive(link);

                // เฟดออก
                mainContent.classList.add('fade-out');
                mainContent.classList.remove('fade-in');

                try {
                    const response = await fetch(url);
                    const html = await response.text();
                    
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    const newMain = doc.querySelector('.main-content');

                    setTimeout(() => {
                        if(newMain) {
                            mainContent.innerHTML = newMain.innerHTML;
                            mainContent.className = newMain.className; 
                        }
                        
                        // รีสตาร์ทสคริปต์ต่างๆ ตามหน้าที่เปิด
                        if(url === 'index.html' || url === '' || url === '/' || url.includes('index.html')) {
                            initCarousel();
                            loadDashboard();
                        } else if (url.includes('gdp.html')) {
                            if (window.initIndicatorPage) window.initIndicatorPage('gdp');
                        } else if (url.includes('inflation.html')) {
                            if (window.initIndicatorPage) window.initIndicatorPage('inflation');
                        } else if (url.includes('unemployment.html')) {
                            if (window.initIndicatorPage) window.initIndicatorPage('unemployment');
                        }

                        // เฟดเข้า
                        mainContent.classList.remove('fade-out');
                        mainContent.classList.add('fade-in');
                        
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

    window.addEventListener('popstate', () => {
        window.location.reload(); 
    });


    // ==========================================
    // 2. ระบบ Carousel อนิเมชั่นเลื่อนรูป (หน้า HOME)
    // ==========================================
    let autoPlayInterval;
    const initCarousel = () => {
        const track = document.getElementById('carouselTrack');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        
        if(autoPlayInterval) clearInterval(autoPlayInterval);

        if (track && prevBtn && nextBtn) {
            let currentIndex = 0;
            const slides = track.querySelectorAll('.carousel-slide');
            const totalSlides = slides.length;

            if(totalSlides > 0) slides[currentIndex].classList.add('active');

            const updateCarousel = () => {
                slides.forEach(slide => slide.classList.remove('active'));
                if(slides[currentIndex]) slides[currentIndex].classList.add('active');
            };

            const nextSlide = () => {
                currentIndex = (currentIndex < totalSlides - 1) ? currentIndex + 1 : 0;
                updateCarousel();
            };

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
    // 3. ระบบ API ดึงข้อมูลหลังบ้านมาใส่การ์ด (หน้า HOME)
    // ==========================================
    const loadDashboard = () => {
        // เช็คก่อนว่าหน้าปัจจุบันมีการ์ดให้ใส่ข้อมูลไหม
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
            console.error('โหลดข้อมูลไม่สำเร็จ:', err);
            // กรณีไม่มี API หรือ error จะขึ้นข้อความแจ้งเตือนที่หน้าเว็บ
            renderCard('card-gdp', 'GDP TOP 5 (2025)', [{country: "รอเชื่อมต่อ API", displayValue: "-", colorClass: ""}]);
            renderCard('card-inflation', 'INFLATION TOP 5 (2025)', [{country: "รอเชื่อมต่อ API", displayValue: "-", colorClass: ""}]);
            renderCard('card-unemployment', 'UNEMPLOYMENT TOP 5 (2025)', [{country: "รอเชื่อมต่อ API", displayValue: "-", colorClass: ""}]);
        });
    };

    const renderCard = (cardId, title, items) => {
        const card = document.getElementById(cardId);
        if (!card || !items) return;

        // ใส่หัวข้อการ์ด
        card.innerHTML = `<h2 class="card-title">${title}</h2>`;

        // วนลูปสร้างแต่ละแถว
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const row = document.createElement('div');
            row.className = 'card-row';
            row.innerHTML = `
            <span class="country">${item.country}</span>
            <span class="value ${item.colorClass || ''}">${item.displayValue}</span>
            `;
            card.appendChild(row);
        }
    };

    // เริ่มต้นทำงานหน้า Home (หากเป็นหน้าแรก)
    initCarousel();
    loadDashboard();

});