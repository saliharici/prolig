import questionHandler from '../api/questions';
import { authenticate } from '../api/_auth';

// Mock request and response
const mockResponse = () => {
  const res: any = {};
  res.status = (code: number) => { res.statusCode = code; return res; };
  res.json = (data: any) => { res.data = data; return res; };
  res.setHeader = () => {};
  return res;
};

const mockRequest = (method: string, body: any, cookieStr: string = '') => ({
  method,
  body,
  headers: {
    cookie: cookieStr,
    origin: 'http://localhost:5173'
  }
});

async function run() {
  console.log('Testing GET without Auth...');
  const res1 = mockResponse();
  await questionHandler(mockRequest('GET', {}) as any, res1);
  console.log('GET /api/questions (No Auth):', res1.statusCode, res1.data);
  
  // Actually, to test with auth, we need a real token.
}
run();
