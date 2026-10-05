const fs = require('fs');
let demo = fs.readFileSync('src/DemoApp.tsx', 'utf8');

if (!demo.includes('GraduationCap')) {
  demo = demo.replace(/import \{([^}]+)\} from 'lucide-react';/, "import { GraduationCap, $1 } from 'lucide-react';");
}

demo = demo.replace(
  /const sections: \{ id: Section; icon: typeof LayoutDashboard \}../g,
  "const sections: { id: Section; icon: typeof LayoutDashboard }[] = [\n  { id: 'grades' as any, icon: GraduationCap as any },"
);

const gradesView = `
          {section === 'grades' && <>
            <div className="page-heading">
              <div>
                <div className="eyebrow">EĞİTİM KADEMELERİ</div>
                <h1>Sınıflar ve Kademeler</h1>
                <p>İlkokul, Ortaokul, Lise ve Mezun kademelerindeki içerik ve yazar dağılımını inceleyin.</p>
              </div>
              <span className="heading-chip"><GraduationCap size={16} /> 4 Kademe</span>
            </div>
            
            <div className="stats-grid">
              {['İlkokul', 'Ortaokul', 'Lise', 'Mezun'].map(lvl => {
                const authorsCount = data.authors.filter(a => a.levels?.includes(lvl)).length;
                const projectsCount = data.projects.filter(p => p.level === lvl).length;
                const questionsCount = data.questions.filter(q => q.level === lvl).length;
                
                return (
                  <div key={lvl} className="panel stat-card">
                    <div className="stat-top">
                      <strong>{lvl}</strong>
                      <div className="stat-icon" style={{background: '#eff6ff', color: '#3b82f6'}}><GraduationCap size={18} /></div>
                    </div>
                    <div style={{marginTop: '15px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b'}}>
                      <div><strong style={{color: '#0f172a', fontSize: '14px'}}>{authorsCount}</strong> Yazar</div>
                      <div><strong style={{color: '#0f172a', fontSize: '14px'}}>{projectsCount}</strong> Proje</div>
                      <div><strong style={{color: '#0f172a', fontSize: '14px'}}>{questionsCount}</strong> Soru</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>}
`;

demo = demo.replace(/\{section === 'authors' && <>/, gradesView + "\n          {section === 'authors' && <>");

// We need to match the actual text in the file which may have Turkish encoding chars
demo = demo.replace(/<th>YAZAR<\/th><th>BRAN(.)?<\/th><th>(.)?L<\/th>/, "<th>YAZAR</th><th>BRANŞ</th><th>KADEME</th><th>İL</th>");
demo = demo.replace(/<td>\{author\.subject\}<\/td><td>\{author\.province\}<\/td>/, "<td>{author.subject}</td><td><div style={{display: 'flex', gap: '4px', flexWrap: 'wrap'}}>{author.levels?.map(l => <span key={l} style={{background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', color: '#334155', border: '1px solid #e2e8f0'}}>{l}</span>)}</div></td><td>{author.province}</td>");

fs.writeFileSync('src/DemoApp.tsx', demo, 'utf8');
console.log('DemoApp.tsx updated with grades.');
