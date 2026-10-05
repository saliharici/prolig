const fs = require('fs');
let demo = fs.readFileSync('src/DemoApp.tsx', 'utf8');
demo = demo.replace("  { id: 'grades' as any, icon: GraduationCap as any }, = [\n  { id: 'overview', icon: LayoutDashboard },", "  { id: 'grades' as any, icon: GraduationCap as any },\n  { id: 'overview', icon: LayoutDashboard },");
fs.writeFileSync('src/DemoApp.tsx', demo, 'utf8');
