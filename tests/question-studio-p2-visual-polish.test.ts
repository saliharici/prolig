import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const guided = readFileSync('src/questions/GuidedQuestionStudio.tsx', 'utf8');
const app = readFileSync('src/DemoApp.tsx', 'utf8');

describe('P2 question studio visual acceptance follow-up', () => {
  it('draws general-pool author branch from the verified authenticated profile', () => {
    expect(app).toContain("currentUser.authorProfile?.branch?.name || ''");
    expect(app).not.toContain("(currentUser as any).branchName || ''");
    expect(guided).toContain("projects.find(p => p.id === v.projectId)?.branch.name || branchName");
  });

  it('provides distinct Turkish editor placeholders rather than repeating the question-stem prompt', () => {
    expect(guided).toContain("content: 'Sorunun yönergesini ve içeriğini yazın...'");
    expect(guided).toContain("explanation: 'Cevabın gerekçesini ve çözüm adımlarını yazın...'");
    expect(guided).toContain("modelAnswer: 'Beklenen örnek cevabı ve çözüm yaklaşımını yazın...'");
    expect(guided).toContain("scoringRubric: 'Puan dağılımını ve puanlama anahtarını yazın...'");
    expect(guided).toContain("evaluationCriteria: 'Yanıtın değerlendirileceği ölçütleri yazın...'");
    expect(guided).toContain('placeholder={editorHints[field]}');
  });
});
