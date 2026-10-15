import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PublishingPresentationConcept } from '../src/presentation/PublishingPresentationConcept';

describe('isolated publishing-group presentation concept', () => {
  it('renders PRO-LİG corporate pitch, three navigation screens, and explicit non-affiliation disclaimer', () => {
    const html = renderToStaticMarkup(<PublishingPresentationConcept />);
    expect(html).toContain('PRO-LİG');
    expect(html).toContain('Kurumsal bakış');
    expect(html).toContain('Yönetim kokpiti');
    expect(html).toContain('Editoryal masa');
    expect(html).toContain('görünmeyen emeği');
    expect(html).toContain('Temsili veriler');
    expect(html).toContain('resmî sitesi değildir');
    expect(html).toContain('İşler Yayın Grubu ile kurumsal bağlantı iddiası taşımaz');
  });
  it('uses only static sample content and does not embed production customer records or credentials', () => {
    const html = renderToStaticMarkup(<PublishingPresentationConcept />);
    expect(html).toContain('YAYIN DOSYASI / 001');
    expect(html).toContain('gerçek kullanıcı');
    expect(html).not.toContain('DATABASE_URL');
    expect(html).not.toContain('neondb_owner');
    expect(html).not.toContain('Bearer ');
  });
});
