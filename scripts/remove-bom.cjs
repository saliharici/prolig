const fs = require('fs');

function writeWithoutBOM(filePath, content) {
    fs.writeFileSync(filePath, content, 'utf8');
}

const mainContent = `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthGate } from './auth/AuthGate';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthGate />
  </StrictMode>,
);
`;
writeWithoutBOM('src/main.tsx', mainContent);

const apiContent = fs.readFileSync('src/auth/api.ts', 'utf8').replace(/^\uFEFF/, '');
writeWithoutBOM('src/auth/api.ts', apiContent);

const authGateContent = fs.readFileSync('src/auth/AuthGate.tsx', 'utf8').replace(/^\uFEFF/, '');
writeWithoutBOM('src/auth/AuthGate.tsx', authGateContent);

const loginScreenContent = fs.readFileSync('src/auth/LoginScreen.tsx', 'utf8').replace(/^\uFEFF/, '');
writeWithoutBOM('src/auth/LoginScreen.tsx', loginScreenContent);

const authTypesContent = fs.readFileSync('src/auth/types.ts', 'utf8').replace(/^\uFEFF/, '');
writeWithoutBOM('src/auth/types.ts', authTypesContent);

const testsContent = fs.readFileSync('tests/frontend-auth.test.ts', 'utf8').replace(/^\uFEFF/, '');
writeWithoutBOM('tests/frontend-auth.test.ts', testsContent);

console.log('Removed BOMs.');
