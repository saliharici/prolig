const fs = require('fs');
let demo = fs.readFileSync('src/DemoApp.tsx', 'utf8');

if (!demo.includes('GraduationCap')) {
  demo = demo.replace(/import \{([^}]+)\} from 'lucide-react';/, "import { GraduationCap,  } from 'lucide-react';");
}

demo = demo.replace(
  /const sections: \{ id: Section; icon: React.FC<any> \}../g,
  "const sections: { id: Section; icon: React.FC<any> }[] = [\n  { id: 'grades', icon: GraduationCap },\n  { id: 'overview', icon: LayoutDashboard },"
);
// Wait, the regex might be tricky if it's already there or the format differs.
