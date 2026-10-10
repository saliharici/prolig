import { useEffect, useState } from 'react';
import { RotateCcw, Plus, CalendarDays } from 'lucide-react';
import { actOnPaymentPeriod, createPaymentPeriod, fetchPaymentPeriods } from './api';
import { approvePayment, payPayment, cancelPayment } from '../payments/api';
import type { PaymentPeriod, PaymentPeriodStatus } from './types';
import { roleLabels } from '../demo/model';
import './compensation.css';

const earningLabels: Record<string, string> = { QUESTION_AUTHOR: 'Soru telifi', QUESTION_EDITOR: 'Editör incelemesi', PROJECT_PROVINCE_COORDINATOR: 'İl koordinasyonu', PROJECT_REGION_COORDINATOR: 'Bölge koordinasyonu', PROJECT_GENERAL_COORDINATOR: 'Genel koordinasyon' };
const labels: Record<PaymentPeriodStatus, string> = { TASLAK: 'Taslak', HAZIR: 'Hazır', ONAYLANDI: 'Ödeme sürecinde', KAPANDI: 'Kapandı', IPTAL: 'İptal' };
const money = (value: string) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(value));
const date = (value: string) => new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));

export function PaymentPeriodsPanel({ currentRole, onPaymentsChanged }: { currentRole: string; onPaymentsChanged: () => void }) {
  const [periods, setPeriods] = useState<PaymentPeriod[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [expandedPayment, setExpandedPayment] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [form, setForm] = useState({ name: '', code: '', startDate: '', endDate: '' });
  const canManage = currentRole === 'MUHASEBE';
  const selected = periods.find(period => period.id === selectedId);

  const load = async () => {
    setLoading(true);
    try { setPeriods(await fetchPaymentPeriods()); }
    finally { setLoading(false); }
  };
  useEffect(() => { load().catch(err => setError(err.message)); }, []);

  const execute = async (task: () => Promise<void>, message: string) => {
    setBusy(true); setError(''); setNotice('');
    try {
      await task();
      setNotice(message); setReason('');
      onPaymentsChanged();
      await load();
    } catch (err: any) {
      setError(err.message || 'İşlem tamamlanamadı.');
      if (err.status === 409) await load().catch(() => {});
    } finally { setBusy(false); }
  };

  return <section className="panel compensation-entry-workbench payment-period-panel">
    <div className="compensation-entry-head">
      <div><span className="panel-kicker">DÖNEMSEL ÖDEME</span><h2>Ödeme Dönemleri</h2><p>Kazanımları hazırlayın, hak sahibi başına ödeme oluşturun ve tamamlanan dönemi kapatın.</p></div>
      <div className="period-actions">
        <button className="secondary-button" disabled={busy || loading} onClick={() => { setError(''); load().catch(err => setError(err.message)); }}><RotateCcw size={15}/> Yenile</button>
        {canManage && <button className="primary-button" disabled={busy} onClick={() => setShowCreate(!showCreate)}><Plus size={15}/> Yeni dönem</button>}
      </div>
    </div>
    {error && <div role="alert" className="compensation-alert error">{error}</div>}
    {notice && <div role="status" className="compensation-alert">{notice}</div>}
    {canManage && showCreate && <form className="period-create" onSubmit={event => { event.preventDefault(); execute(async () => { await createPaymentPeriod(form); setShowCreate(false); }, 'Ödeme dönemi oluşturuldu.'); }}>
      <label>Dönem adı<input required maxLength={120} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Ekim 2026 Telif Dönemi"/></label>
      <label>Dönem kodu<input required maxLength={40} pattern="[A-Za-z0-9]([A-Za-z0-9_]|-){2,39}" value={form.code} onChange={event => setForm({ ...form, code: event.target.value })} placeholder="2026-10"/></label>
      <label>Başlangıç<input required type="date" value={form.startDate} onChange={event => setForm({ ...form, startDate: event.target.value })}/></label>
      <label>Bitiş<input required type="date" min={form.startDate} value={form.endDate} onChange={event => setForm({ ...form, endDate: event.target.value })}/></label>
      <button className="primary-button" disabled={busy}>Dönemi oluştur</button>
      <small>Türkiye saatiyle başlangıç ve bitiş günlerinin tamamı kapsanır.</small>
    </form>}
    {loading && <div className="compensation-state"><RotateCcw size={18} className="spin"/> Dönemler yükleniyor...</div>}
    {!loading && <div className="table-wrap"><table className="compensation-entry-table"><thead><tr><th>DÖNEM</th><th>TARİHLER</th><th>DURUM</th><th>KAZANIM / KİŞİ</th><th>TOPLAM</th><th>ÖDENEN</th><th>BEKLEYEN</th><th>İŞLEM</th></tr></thead><tbody>
      {periods.map(period => <tr key={period.id} className={selectedId === period.id ? 'period-selected' : ''}>
        <td><strong>{period.name}</strong><small>{period.code}</small></td><td>{period.startDate} – {period.endDate}</td><td>{labels[period.status]}</td><td>{period.entryCount} / {period.beneficiaryCount}</td><td>{money(period.totalAmount)}</td><td>{money(period.paidAmount)}</td><td>{money(period.outstandingAmount)}</td>
        <td><button className="text-button" onClick={() => { setSelectedId(period.id); setExpandedPayment(null); setReason(''); }}>Dönemi incele</button></td>
      </tr>)}
    </tbody></table>{!periods.length && <div className="compensation-state"><CalendarDays size={20}/> Henüz ödeme dönemi yok.</div>}</div>}
    {selected && <div className="period-detail">
      <div className="compensation-entry-head"><div><span className="panel-kicker">{selected.code} · {labels[selected.status]}</span><h3>{selected.name}</h3><p>{selected.entryCount} kazanım · {selected.beneficiaryCount} hak sahibi · {money(selected.totalAmount)}</p></div></div>
      {canManage && <div className="period-actions">
        {selected.status === 'TASLAK' && <button className="primary-button" disabled={busy} onClick={() => execute(() => actOnPaymentPeriod(selected.id, 'prepare'), 'Uygun kazanımlar döneme ayrıldı.')}>Dönemi hazırla</button>}
        {selected.status === 'HAZIR' && <button className="primary-button" disabled={busy} onClick={() => execute(() => actOnPaymentPeriod(selected.id, 'settle'), 'Hak sahibi başına ödeme kayıtları oluşturuldu.')}>Ödeme paketini oluştur</button>}
        {selected.status === 'ONAYLANDI' && <button className="primary-button" disabled={busy || selected.payments.some(payment => !['Odendi', 'Iptal'].includes(payment.status))} onClick={() => execute(() => actOnPaymentPeriod(selected.id, 'close'), 'Ödeme dönemi kapatıldı.')}>Dönemi kapat</button>}
      </div>}
      {selected.status === 'TASLAK' && <p className="panel-sub">Hazırlama, bu tarihlerde hak edilmiş ve başka döneme ayrılmamış kazanımları seçer.</p>}
      {selected.status === 'HAZIR' && <p className="panel-sub">Paket, ayrılmış kazanımları kullanır. Sonradan doğan kazanımlar sonraki ödeme dönemine alınabilir.</p>}
      {canManage && !['KAPANDI', 'IPTAL'].includes(selected.status) && <div className="period-cancel"><label>İptal gerekçesi<input maxLength={500} value={reason} onChange={event => setReason(event.target.value)} placeholder="Ödenmemiş kayıtlar için gerekçe"/></label>{['TASLAK', 'HAZIR'].includes(selected.status) && <button className="secondary-button" disabled={busy || reason.trim().length < 3} onClick={() => execute(() => actOnPaymentPeriod(selected.id, 'cancel', reason), 'Dönem iptal edildi; kazanımlar yeniden ödeme bekliyor.')}>Dönemi iptal et</button>}</div>}
      {selected.payments.length > 0 && <>
        <p className="panel-sub">“Ödendi” işlemini banka veya muhasebe ödemesi tamamlandıktan sonra kullanın. İptal edilen ödemelerin kazanımları yeni bir döneme alınabilir.</p>
        <div className="table-wrap"><table className="compensation-entry-table"><thead><tr><th>HAK SAHİBİ</th><th>TUTAR</th><th>DURUM</th><th>ÖDEME TARİHİ</th><th>İŞLEM</th></tr></thead><tbody>{selected.payments.map(payment => <tr key={payment.id}>
          <td><strong>{payment.beneficiary?.fullName || payment.author?.fullName}</strong><button className="text-button" onClick={() => setExpandedPayment(expandedPayment === payment.id ? null : payment.id)}>Ödeme #{payment.id} · {payment.entries?.length || 0} kazanım</button></td><td>{money(payment.amount)}</td><td>{payment.status === 'Odendi' ? 'Ödendi' : payment.status === 'Onaylandi' ? 'Onaylandı' : payment.status === 'Iptal' ? 'İptal' : 'Bekliyor'}</td><td>{payment.paymentDate ? date(payment.paymentDate) : '—'}</td><td><div className="period-actions">
            {canManage && selected.status === 'ONAYLANDI' && payment.status === 'Bekliyor' && <button disabled={busy} onClick={() => execute(() => approvePayment(payment.id), 'Ödeme onaylandı.')}>Onayla</button>}
            {canManage && selected.status === 'ONAYLANDI' && payment.status === 'Onaylandi' && <button disabled={busy} onClick={() => execute(() => payPayment(payment.id), 'Ödeme ve bağlı kazanımlar ödendi olarak kaydedildi.')}>Ödendi işaretle</button>}
            {canManage && selected.status === 'ONAYLANDI' && ['Bekliyor', 'Onaylandi'].includes(payment.status) && <button disabled={busy || reason.trim().length < 3} onClick={() => execute(() => cancelPayment(payment.id, reason), 'Ödeme iptal edildi; kazanımlar serbest bırakıldı.')}>İptal et</button>}
          </div></td>
        </tr>)}</tbody></table></div>
        {expandedPayment && <div className="table-wrap"><h4>Ödeme #{expandedPayment} kazanım dökümü</h4><table className="compensation-entry-table"><thead><tr><th>KAYNAK</th><th>ROL / TÜR</th><th>ADET</th><th>BİRİM ÜCRET</th><th>TUTAR</th></tr></thead><tbody>{selected.payments.find(payment => payment.id === expandedPayment)?.entries?.map(entry => <tr key={entry.id}><td>{entry.questionId ? `Soru #${entry.questionId}` : entry.project?.code || `Kazanım #${entry.id}`}<small>{entry.project?.title}</small></td><td>{roleLabels[entry.roleCode as keyof typeof roleLabels]}<small>{earningLabels[entry.earningType]}</small></td><td>{entry.quantity}</td><td>{money(entry.unitPrice)}</td><td>{money(entry.amount)}</td></tr>)}</tbody></table></div>}
      </>}
    </div>}
    <p className="panel-sub">Son 100 ödeme dönemi gösterilir. Hazır dönemlerdeki tutarlar ayrılan kazanımlardan hesaplanır.</p>
  </section>;
}
