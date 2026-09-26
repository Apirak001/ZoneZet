const fs = require('fs');
let c = fs.readFileSync('public/indicator.js', 'utf8');

c = c.replace(
  /trigger\.addEventListener\('click', \(e\) => \{\s*e\.stopPropagation\(\);\s*document\.querySelectorAll\('\.custom-select-wrapper\.open'\)\.forEach\(w => w\.classList\.remove\('open'\)\);\s*wrapper\.classList\.toggle\('open'\);\s*\}\);/,
  `trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = wrapper.classList.contains('open');
        document.querySelectorAll('.custom-select-wrapper.open').forEach(w => w.classList.remove('open'));
        if (!isOpen) wrapper.classList.add('open');
      });`
);

fs.writeFileSync('public/indicator.js', c, 'utf8');
console.log('Fixed dropdown open/close toggle');
