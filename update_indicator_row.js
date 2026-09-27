const fs = require('fs');

let js = fs.readFileSync('public/indicator.js', 'utf8');

js = js.replace(
  /<div class="col-no">.*?\n\s*<div class="col-country">.*?<\/div>\n\s*<div class="col-value/g,
  match => match.replace(
    /<div class="col-country">\$\{item\.country\}<\/div>/,
    `<div class="col-country">
            <img src="https://flagcdn.com/\${(item.iso2 || '').toLowerCase()}.svg" alt="Flag" class="country-flag" onerror="this.style.display='none'">
            <span>\${item.country}</span>
          </div>
          <div class="col-region">\${item.region || 'Unknown'}</div>`
  )
);

fs.writeFileSync('public/indicator.js', js, 'utf8');
console.log('Updated indicator.js rendering logic');
