const fs = require('fs');

let js = fs.readFileSync('public/indicator.js', 'utf8');

// Add global tracking object for record page years if it doesn't exist
if (!js.includes('window.recordSelectedYears')) {
  js = js.replace(
    /window\.initRecordPage = function\(\) \{/,
    `window.recordSelectedYears = { gdp: '2025', inflation: '2025', unemployment: '2025' };
window.initRecordPage = function() {`
  );
}

// Update the rendering loop in initRecordPage
js = js.replace(
  /categories\.forEach\(cat => \{[\s\S]*?const items = window\.processedRecords\[cat\.id\] \|\| \[\];[\s\S]*?let rowsHtml = '';[\s\S]*?if \(items\.length === 0\) \{/,
  `categories.forEach(cat => {
        const allItems = window.processedRecords[cat.id] || [];
        const currentYear = window.recordSelectedYears[cat.id] || '2025';
        const items = allItems.filter(i => i.year === currentYear);
        let rowsHtml = '';
        if (items.length === 0) {`
);

// Inject the dropdown HTML in the panel header
js = js.replace(
  /<div class="record-panel-custom-title">\$\{cat\.title\}<\/div>[\s\S]*?<button class="btn-history-custom"/,
  `<div class="record-panel-custom-title">\${cat.title}</div>
              <div style="display: flex; gap: 15px; align-items: center;">
                <div class="custom-select-wrapper record-year-select" style="min-width: 90px;" data-category="\${cat.id}">
                  <div class="custom-select-trigger" style="padding: 6px 12px; font-size: 14px; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;">
                    <span class="custom-select-text">\${currentYear}</span>
                    <div class="custom-select-arrow"></div>
                  </div>
                  <div class="custom-options" style="background: #2a2a2a; border-radius: 8px; overflow: hidden; margin-top: 4px;">
                    \${['2025', '2024', '2023', '2022', '2021', '2020'].map(y => 
                      \`<div class="custom-option \${y === currentYear ? 'selected' : ''}" data-value="\${y}">\${y}</div>\`
                    ).join('')}
                  </div>
                  <input type="hidden" class="search-select record-year-input" value="\${currentYear}">
                </div>
                <button class="btn-history-custom"`
);

// After generating the panels, bind the events
js = js.replace(
  /layout\.innerHTML \+= `([\s\S]*?)`;\s*\}\);/,
  `layout.innerHTML += \`$1\`;
      });
      
      // Initialize dropdowns and bind changes
      if (typeof window.initCustomSelects === 'function') window.initCustomSelects();
      
      layout.querySelectorAll('.record-year-select').forEach(wrapper => {
        const cat = wrapper.getAttribute('data-category');
        const hiddenInput = wrapper.querySelector('.record-year-input');
        if (hiddenInput) {
          hiddenInput.addEventListener('change', (e) => {
            window.recordSelectedYears[cat] = e.target.value;
            window.initRecordPage();
          });
        }
      });`
);

fs.writeFileSync('public/indicator.js', js, 'utf8');
console.log('Added year filter dropdown to record page panels');
