import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { permissions, roleLabels, type Role, type Section } from '../src/demo/model';
import { permittedExperienceLinks, PublisherDesignPreview, PublisherRoleWelcome, roleExperiences } from '../src/ux/PublisherExperience';

describe('UX-01 visual contract (no backend writes)', () => {
  const realRoles = Object.keys(permissions) as Role[];
  it('preserves all existing real role presentations, including both coordinators', () => {
    expect(Object.keys(roleExperiences).sort()).toEqual(realRoles.sort());
    expect(roleExperiences.BOLGE_KOORDINATORU.label).toBe('Bölge Koordinatörü');
    expect(roleExperiences.IL_KOORDINATORU.label).toBe('İl Koordinatörü');
    expect('BRANS_KOORDINATORU' in permissions).toBe(false);
    expect('SUPER_ADMIN' in permissions).toBe(false);
  });
  it('filters every role shortcut against its existing permission list', () => {
    for (const role of realRoles) {
      const links = permittedExperienceLinks(role, permissions[role]);
      expect(links.every(link => permissions[role].includes(link.section))).toBe(true);
      expect(roleLabels[role]).toBeTruthy();
    }
    const yazarRestricted: Section[] = ['overview'];
    expect(permittedExperienceLinks('YAZAR', yazarRestricted)).toEqual([]);
  });
  it('renders all design tabs as representative preview, not a live administrator workspace', () => {
    const html = renderToStaticMarkup(createElement(PublisherDesignPreview, {onBack: () => undefined}));
    expect(html).toContain('Süper Admin');
    expect(html).toContain('Branş Koordinatörü');
    expect(html).toContain('Bölge Koordinatörü');
    expect(html).toContain('GÖRSEL PROTOTİP');
    expect(html).toContain('Gerçek');
  });
  it('renders a real user greeting with only permitted quick navigation', () => {
    const html = renderToStaticMarkup(createElement(PublisherRoleWelcome, {
      role: 'YAZAR', fullName:'Örnek Yazar',
      allowed: ['overview','questions'], onNavigate: () => undefined
    }));
    expect(html).toContain('Sorularım');
    expect(html).not.toContain('Görevlerim');
    expect(html).not.toContain('Telif ve ödemeler');
  });
});
