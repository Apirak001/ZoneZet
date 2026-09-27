const fs = require('fs');

let js = fs.readFileSync('public/indicator.js', 'utf8');

js = js.replace(
  /const iconSvg = isUp \?[\s\S]*?`<svg viewBox="0 0 24 24" fill="none" stroke="\$\{colorHex\}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">/g,
  `const iconSvg = isUp ?
    \`<svg class="trend-icon up" viewBox="0 0 24 24" fill="none" stroke="\${colorHex}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">\``
);

js = js.replace(
  / :[\s\S]*?`<svg viewBox="0 0 24 24" fill="none" stroke="\$\{colorHex\}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">/g,
  ` :
    \`<svg class="trend-icon down" viewBox="0 0 24 24" fill="none" stroke="\${colorHex}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">\``
);

fs.writeFileSync('public/indicator.js', js, 'utf8');
console.log('Added animation classes to modal icon');
