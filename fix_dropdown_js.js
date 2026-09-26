const fs = require('fs');
let c = fs.readFileSync('public/indicator.js', 'utf8');

// Also fix multiple event listeners by checking .initialized
c = c.replace(
  /document\.querySelectorAll\('\.custom-select-wrapper'\)\.forEach\(wrapper => \{/g,
  `document.querySelectorAll('.custom-select-wrapper:not(.initialized)').forEach(wrapper => {
    wrapper.classList.add('initialized');`
);

// Change .custom-options.open to .custom-select-wrapper.open
c = c.replace(
  /document\.querySelectorAll\('\.custom-options\.open'\)\.forEach\(o => o\.classList\.remove\('open'\)\);/g,
  `document.querySelectorAll('.custom-select-wrapper.open').forEach(w => w.classList.remove('open'));`
);

// Change options.classList.toggle('open') to wrapper.classList.toggle('open')
c = c.replace(
  /options\.classList\.toggle\('open'\);/g,
  `wrapper.classList.toggle('open');`
);

// Change options.classList.remove('open') to wrapper.classList.remove('open')
c = c.replace(
  /options\.classList\.remove\('open'\);/g,
  `wrapper.classList.remove('open');`
);

fs.writeFileSync('public/indicator.js', c, 'utf8');
console.log('Fixed dropdown JS logic');
