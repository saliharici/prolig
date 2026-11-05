import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../../_lib/prisma.js';
import { getCurrentUser } from '../../_lib/current-user.js';
import { buildQuestionReadScope } from '../../_lib/question-access.js';
import { reviewRateAllowed, reviewStoredQuestion } from '../../_lib/ai-editor.js';

/** RELEASE-08: advisory-only. No mutation endpoints, no auto approval. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }); }
  // Preview-only in v1, with a second independent server feature flag.
  if (process.env.VERCEL_ENV === 'production' || process.env.AI_REVIEW_ENABLED !== 'true')
    return res.status(404).json({ error: 'AI inceleme bu ortamda kapalı.' });
  if (!req.headers['content-type']?.toLowerCase().startsWith('application/json'))
    return res.status(415).json({ error: 'JSON gerekli.' });
  const id = typeof req.query.id === 'string' && /^[1-9]\d{0,9}$/.test(req.query.id)
    ? Number(req.query.id) : null;
  if (!id || !Number.isSafeInteger(id)) return res.status(400).json({ error: 'Geçersiz soru kimliği.' });
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      Object.keys(body).some(key => key !== 'expectedUpdatedAt') ||
      typeof body.expectedUpdatedAt !== 'string' || Number.isNaN(Date.parse(body.expectedUpdatedAt))) {
    return res.status(400).json({ error: 'Kayıtlı soru sürümü gerekli.' });
  }
  try {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: 'Oturum gerekli.' });
    if (!['GENEL_KOORDINATOR','BOLGE_KOORDINATORU','IL_KOORDINATORU','BRANS_KOORDINATORU','EDITOR','YAZAR'].includes(user.role.code))
      return res.status(403).json({ error: 'Yetkisiz işlem.' });
    const question = await prisma.question.findFirst({
      where: { AND: [{ id }, buildQuestionReadScope(user)] },
      select: { id: true, updatedAt: true, content: true, options: true,
        correctAnswer: true, explanation: true, questionType: true, grade: true,
        objectiveCode: true, difficulty: true, booleanAnswer: true, modelAnswer: true,
        scoringRubric: true, evaluationCriteria: true }
    });
    if (!question) return res.status(404).json({ error: 'Soru bulunamadı veya kapsam dışı.' });
    if (question.updatedAt.toISOString() !== new Date(body.expectedUpdatedAt).toISOString())
      return res.status(409).json({ error: 'Soru başka bir işlemde güncellenmiş. Yeniden açın.' });
    if (!reviewRateAllowed(user.id)) {
      res.setHeader('Retry-After', '3600');
      return res.status(429).json({ error: 'Saatlik AI inceleme sınırına ulaşıldı.' });
    }
    const report = await reviewStoredQuestion(question, question.updatedAt);
    return res.status(200).json({ report });
  } catch (error) {
    // Never log supplied question content, secrets, or provider error bodies.
    const cause = error instanceof Error ? error.message : '';
    if (cause === 'AI_PROVIDER_NOT_CONFIGURED')
      return res.status(503).json({ error: 'AI sağlayıcısı henüz yapılandırılmadı.' });
    if (cause === 'INVALID_AI_REVIEW_OUTPUT' || cause === 'EMPTY_AI_RESPONSE' ||
        error instanceof SyntaxError)
      return res.status(502).json({ error: 'AI yanıtı doğrulanamadı; soru değiştirilmedi.' });
    if (error instanceof Error && error.name === 'AbortError')
      return res.status(504).json({ error: 'AI incelemesi zaman aşımına uğradı.' });
    return res.status(502).json({ error: 'AI incelemesi tamamlanamadı; soru değiştirilmedi.' });
  }
}
