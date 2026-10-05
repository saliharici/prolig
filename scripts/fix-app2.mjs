import fs from 'fs';

let appContent = fs.readFileSync('src/App.tsx', 'utf8');
appContent = appContent.replace(/export function App\(\) \{[\s\S]*?export default App;/g, `export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<UserRole>('YAZAR');
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Not auth');
      })
      .then(data => {
        setIsAuthenticated(true);
        setUserRole(data.user.role as UserRole);
      })
      .catch(() => {
        setIsAuthenticated(false);
      })
      .finally(() => setIsChecking(false));
  }, []);

  const handleLogin = (role: UserRole) => {
    setUserRole(role);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setIsAuthenticated(false);
  };

  if (isChecking) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">Yükleniyor...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage onLogin={handleLogin} />} />
        <Route path="/dashboard/*" element={isAuthenticated ? <DashboardApp userRole={userRole} onLogout={handleLogout} /> : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
export default App;`);
fs.writeFileSync('src/App.tsx', appContent, 'utf8');

let qvContent = fs.readFileSync('src/components/QuestionsView.tsx', 'utf8');
qvContent = qvContent.replace('Yapay Zekadan Analiz Al', 'Yapay Zeka Analizi (Ön İzleme)');
fs.writeFileSync('src/components/QuestionsView.tsx', qvContent, 'utf8');

let indexContent = fs.readFileSync('index.html', 'utf8');
indexContent = indexContent.replace(/PRO LÃ°G/g, 'PRO LİG').replace(/KarmasÄ±/g, 'Karması');
fs.writeFileSync('index.html', indexContent, 'utf8');
