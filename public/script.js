// public/script.js
// ดึงข้อมูลจาก API หลังบ้านมาแสดงผลในการ์ด 3 ใบ

// ดึงข้อมูลทันทีที่โครงสร้างหน้าเว็บพร้อม (ไม่ต้องรอโหลดรูปภาพ)
document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
});

function loadDashboard() {
  fetch('/api/dashboard/top5')
    .then(res => res.json())
    .then(result => {
      const data = result.data;
      if (data) {
        renderCard('card-gdp', 'GDP TOP 5 (2025)', data.gdp);
        renderCard('card-inflation', 'INFLATION TOP 5 (2025)', data.inflation);
        renderCard('card-unemployment', 'UNEMPLOYMENT TOP 5 (2025)', data.unemployment);
      }
    })
    .catch(err => {
      console.error('โหลดข้อมูลไม่สำเร็จ:', err);
    });
}

// ฟังก์ชันสร้างแถวข้อมูลใส่ในการ์ด
function renderCard(cardId, title, items) {
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
      <span class="value ${item.colorClass}">${item.displayValue}</span>
    `;
    card.appendChild(row);
  }
}