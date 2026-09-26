const fs = require('fs');
let c = fs.readFileSync('routes/indicatorRoutes.js', 'utf8');

c = c.replace(
  /if \(type === 'inflation'\) \{[\s\S]*?return \{ colorClass: 'red', trend: 'down' \};\s*\}\s*\}/,
  `if (type === 'inflation') {
      const trend = value >= 0 ? 'up' : 'down';
      const colorClass = value <= 4.0 ? 'green' : 'red';
      return { colorClass, trend };
    }`
);

fs.writeFileSync('routes/indicatorRoutes.js', c, 'utf8');
console.log('Fixed inflation logic in routes');
