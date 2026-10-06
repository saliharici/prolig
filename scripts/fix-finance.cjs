const fs = require('fs');
let content = fs.readFileSync('src/DemoApp.tsx', 'utf8');

// Update FinanceOverview props
content = content.replace(
  'function FinanceOverview({ data, onNavigate }: { data: DemoData; onNavigate: (section: Section) => void }) {',
  'function FinanceOverview({ data, onNavigate, currentUser }: { data: DemoData; onNavigate: (section: Section) => void; currentUser: AuthUser }) {'
);

// Update where it's called
content = content.replace(
  /<FinanceOverview data=\{data\} onNavigate=\{navigate\} \/>/g,
  '<FinanceOverview data={data} onNavigate={navigate} currentUser={currentUser} />'
);

fs.writeFileSync('src/DemoApp.tsx', content, 'utf8');
console.log('Fixed FinanceOverview scope');
