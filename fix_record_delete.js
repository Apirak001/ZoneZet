const fs = require('fs');

let js = fs.readFileSync('public/indicator.js', 'utf8');

js = js.replace(
  /const items = allItems\.filter\(i => i\.year === currentYear\);\s*let rowsHtml = '';\s*if \(items\.length === 0\) \{\s*rowsHtml = '.*?';\s*\} else \{\s*items\.forEach\(\(item, index\) => \{/g,
  `const items = allItems.filter(i => i.year === currentYear);
          let rowsHtml = '';
          if (items.length === 0) {
          rowsHtml = '<div style="color: rgba(255,255,255,0.5); text-align: center; margin-top: 20px;">ไม่มีข้อมูลที่บันทึกไว้ในหน้านี้</div>';
        } else {
          let displayIndex = 0;
          allItems.forEach((item, globalIndex) => {
            if (item.year !== currentYear) return;
            const index = displayIndex++;`
);

fs.writeFileSync('public/indicator.js', js, 'utf8');
console.log('Fixed delete indexing in filtered record view');
