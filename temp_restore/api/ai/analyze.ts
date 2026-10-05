import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
const cookie = require('cookie');;

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authorize request
  const cookies = cookie.parse(req.headers.cookie || '');
  if (!cookies.auth_token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    jwt.verify(cookies.auth_token, JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  const { content } = req.body;
  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'Content is required and must be a string' });
  }

  if (content.length > 2000) {
    return res.status(413).json({ error: 'Payload Too Large: Content exceeds 2000 characters' });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'AI capabilities are not configured on the server.' });
  }

  try {
    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Sen profesyonel bir eğitim içerik editörüsün. Soru: "${content}"\nLütfen bu soruyu akademik doğruluk, dilbilgisi ve pedagojik açıdan değerlendir. Yanıtını kısa ve öz tut, doğrudan geliştirilmesi gereken yönü veya olumlu yanını söyle.`
          }]
        }]
      })
    });

    if (!aiResponse.ok) {
      return res.status(aiResponse.status).json({ error: 'Failed to generate AI content' });
    }

    const data = await aiResponse.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Analiz yapılamadı.";
    
    return res.status(200).json({ text: generatedText });
  } catch (error) {
    console.error('AI Error:', error);
    return res.status(500).json({ error: 'Failed to process AI request' });
  }
}
