const fs = require('fs');
const path = require('path');
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.tsx')) {
      let content = fs.readFileSync(p, 'utf8');
      if (content.includes("fetch('$")) {
        content = content.replace(/fetch\('([^']+)'/g, "fetch(\\\");
        fs.writeFileSync(p, content);
      }
    }
  }
}
walk('./src');
