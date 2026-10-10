import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, History, RotateCcw, Save, ShieldCheck, SlidersHorizontal, XCircle } from 'lucide-react';
import type { ApiProject } from '../projects/types';
import type { Role } from '../demo/model';
import {
  createCompensationRule,
  deactivateCompensationRule,
  fetchCompensationRules
} from './api';
import type { CompensationRole, CompensationRule } from './types';
import './compensation.css';

const roleOptions: Array<{
  code: CompensationRole;
  label: string;
  unitLabel: string;
  explanation: string;
}> = [
  { code: 'YAZAR', label: 'Yazar', unitLabel: 'Onaylanan soru başına', explanation: 'Soru ONAYLANDI olduğunda yazar telifi oluşur.' },
  { code: 'EDITOR', label: 'Editör', unitLabel: 'Sonuçlandırılan soru başına', explanation: 'Soru inceleme süreci sonuçlandığında editör ücreti oluşur.' },
  { code: 'IL_KOORDINATORU', label: 'İl Koordinatörü', unitLabel: 'Tamamlanan proje başına', explanation: 'Proje tamamlandığında il koordinasyon ücreti oluşur.' },
  { code: 'BOLGE_KOORDINATORU', label: 'Bölge Koordinatörü', unitLabel: 'Tamamlanan proje başına', explanation: 'Proje tamamlandığında bölge koordinasyon ücreti oluşur.' },
  { code: 'GENEL_KOORDINATOR', label: 'Genel Koordinatör', unitLabel: 'Tamamlanan proje başına', explanation: 'İstenirse proje tamamlanmasında genel koordinasyon ücreti oluşturulur.' }
];

const roleLabel = (role: CompensationRole) =>
  roleOptions.find(item => item.code === role)?.label || role;

const unitLabel = (rule: CompensationRule) =>
  rule.unitType === 'QUESTION' ? 'Soru başına' : rule.unitType === 'PROJECT' ? 'Proje başına' : 'Dönem başına';

const money = (value: string) => {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 }).format(amount)
    : value;
};

const shortDate = (value: string) =>
  new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));

export function CompensationRulesPanel({
  projects,
  currentRole
}: {
  projects: ApiProject[];
  currentRole: Role;
}) {
  const [rules, setRules] = useState<CompensationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [roleCode, setRoleCode] = useState<CompensationRole>('YAZAR');
  const [scope, setScope] = useState<'general' | 'project'>('general');
  const [projectId, setProjectId] = useState('');
  const [unitPrice, setUnitPrice] = useState('');

  const canManage = currentRole === 'GENEL_KOORDINATOR';

  const loadRules = async () => {
    setLoading(true);
    setError('');
    try {
      setRules(await fetchCompensationRules(true));
    } catch (err: any) {
      setError(err?.message || 'Ücret tarifeleri yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const activeRules = useMemo(
    () => rules.filter(rule => rule.isActive).sort((a, b) => {
      if (a.projectId === null && b.projectId !== null) return -1;
      if (a.projectId !== null && b.projectId === null) return 1;
      return roleLabel(a.roleCode).localeCompare(roleLabel(b.roleCode), 'tr-TR');
    }),
    [rules]
  );

  const history = useMemo(
    () => rules.filter(rule => !rule.isActive).slice(0, 12),
    [rules]
  );

  const selectedRole = roleOptions.find(item => item.code === roleCode)!;

  const submitRule = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canManage || saving) return;

    const normalizedPrice = unitPrice.trim().replace(',', '.');
    if (!/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(normalizedPrice) || Number(normalizedPrice) <= 0) {
      setError('Geçerli ve sıfırdan büyük bir ücret girin.');
      return;
    }
    if (scope === 'project' && !projectId) {
      setError('Proje özel tarifesi için proje seçin.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await createCompensationRule({
        roleCode,
        unitPrice: normalizedPrice,
        projectId: scope === 'project' ? Number(projectId) : null
      });
      setNotice('Ücret tarifesi kaydedildi. Yeni tarife yalnız sonraki kazanımlara uygulanacaktır.');
      setUnitPrice('');
      await loadRules();
    } catch (err: any) {
      setError(err?.message || 'Ücret tarifesi kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (rule: CompensationRule) => {
    if (!canManage || saving) return;
    setSaving(true);
    setError('');
    try {
      await deactivateCompensationRule(rule.id);
      setNotice('Tarife pasifleştirildi. Geçmiş kazanımlar değişmedi.');
      await loadRules();
    } catch (err: any) {
      setError(err?.message || 'Tarife pasifleştirilemedi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="compensation-rules-panel">
      <section className="panel compensation-policy-card">
        <div className="compensation-policy-icon"><ShieldCheck size={20}/></div>
        <div>
          <span className="panel-kicker">ÜCRET POLİTİKASI</span>
          <h2>Tarifeyi Genel Koordinatör belirler</h2>
          <p>Tarife değiştiğinde eski ücretler geriye dönük değişmez. Her kazanım, hak edildiği andaki birim ücretle snapshot olarak saklanır.</p>
        </div>
      </section>

      {canManage && <section className="panel compensation-rule-editor">
        <div className="panel-head">
          <div><span className="panel-kicker">YENİ TARİFE / TARİFE GÜNCELLEME</span><h2>Ücret belirle</h2></div>
          <SlidersHorizontal size={18}/>
        </div>
        <form onSubmit={submitRule} className="compensation-rule-form">
          <label>Rol
            <select value={roleCode} onChange={event => setRoleCode(event.target.value as CompensationRole)}>
              {roleOptions.map(item => <option key={item.code} value={item.code}>{item.label}</option>)}
            </select>
          </label>
          <label>Kapsam
            <select value={scope} onChange={event => setScope(event.target.value as 'general' | 'project')}>
              <option value="general">Genel tarife · tüm projeler</option>
              <option value="project">Proje özel tarifesi</option>
            </select>
          </label>
          {scope === 'project' && <label>Proje
            <select value={projectId} onChange={event => setProjectId(event.target.value)}>
              <option value="">Proje seçin</option>
              {projects.filter(project => project.status !== 'Arsiv').map(project => (
                <option key={project.id} value={project.id}>{project.code} · {project.title}</option>
              ))}
            </select>
          </label>}
          <label>{selectedRole.unitLabel}
            <div className="compensation-money-input">
              <input
                inputMode="decimal"
                value={unitPrice}
                onChange={event => setUnitPrice(event.target.value)}
                placeholder="0,00"
                aria-label={`${selectedRole.label} birim ücreti`}
              />
              <span>TL</span>
            </div>
          </label>
          <div className="compensation-rule-help">
            <strong>{selectedRole.label}</strong>
            <span>{selectedRole.explanation}</span>
          </div>
          <button className="primary-button compensation-save-button" type="submit" disabled={saving}>
            {saving ? <RotateCcw size={15} className="spin"/> : <Save size={15}/>}
            Tarifeyi Kaydet
          </button>
        </form>
      </section>}

      {error && <div className="compensation-alert error"><XCircle size={16}/><span>{error}</span><button onClick={loadRules}>Tekrar Dene</button></div>}
      {notice && <div className="compensation-alert success"><CheckCircle2 size={16}/><span>{notice}</span></div>}

      <section className="panel compensation-rule-list">
        <div className="panel-head">
          <div><span className="panel-kicker">AKTİF TARİFELER</span><h2>Geçerli ücretler</h2></div>
          <button className="text-button" onClick={loadRules}><RotateCcw size={14}/> Yenile</button>
        </div>
        {loading ? <div className="compensation-state"><RotateCcw size={18} className="spin"/> Tarifeler yükleniyor...</div> : <div className="table-wrap">
          <table className="compensation-table">
            <thead><tr><th>ROL</th><th>KAPSAM</th><th>BİRİM</th><th>ÜCRET</th><th>BAŞLANGIÇ</th><th>OLUŞTURAN</th>{canManage && <th>İŞLEM</th>}</tr></thead>
            <tbody>{activeRules.map(rule => <tr key={rule.id}>
              <td><strong>{roleLabel(rule.roleCode)}</strong></td>
              <td>{rule.project ? <span className="compensation-project-scope"><strong>{rule.project.code}</strong><small>{rule.project.title}</small></span> : <span className="compensation-default-scope">Genel tarife</span>}</td>
              <td>{unitLabel(rule)}</td>
              <td><strong className="compensation-price">{money(rule.unitPrice)}</strong></td>
              <td>{shortDate(rule.validFrom)}</td>
              <td>{rule.createdBy.fullName}</td>
              {canManage && <td><button className="compensation-deactivate" onClick={() => deactivate(rule)} disabled={saving}>Pasifleştir</button></td>}
            </tr>)}</tbody>
          </table>
          {!activeRules.length && <div className="compensation-state">Henüz aktif ücret tarifesi tanımlanmadı.</div>}
        </div>}
      </section>

      <section className="panel compensation-history">
        <div className="panel-head">
          <div><span className="panel-kicker">TARİFE GEÇMİŞİ</span><h2>Değişiklik tarihçesi</h2></div>
          <History size={18}/>
        </div>
        <div className="compensation-history-list">
          {history.map(rule => <div key={rule.id}>
            <span><strong>{roleLabel(rule.roleCode)}</strong><small>{rule.project ? `${rule.project.code} · ${rule.project.title}` : 'Genel tarife'}</small></span>
            <span><strong>{money(rule.unitPrice)}</strong><small>{unitLabel(rule)}</small></span>
            <span><strong>{shortDate(rule.validFrom)}</strong><small>{rule.validTo ? `${shortDate(rule.validTo)} tarihinde sona erdi` : 'Pasif'}</small></span>
          </div>)}
          {!history.length && <div className="compensation-state compact">Henüz tarife değişiklik geçmişi yok.</div>}
        </div>
      </section>
    </div>
  );
}
