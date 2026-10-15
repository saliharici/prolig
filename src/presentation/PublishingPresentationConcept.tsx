import { useState } from 'react';
import {
  ArrowRight, ArrowUpRight, BarChart3, BookOpen, CheckCircle2,
  ChevronRight, Clock3, FileCheck2, FileText, Layers3,
  LayoutDashboard, PenLine, RotateCcw, ShieldCheck, Users
} from 'lucide-react';
import './publishing-presentation-concept.css';

type Screen = 'intro' | 'dashboard' | 'editorial';
type StatusFilter = 'Tümü' | 'İncelemede' | 'Revizyonda';
type QuestionKind = 'mcq' | 'boolean' | 'open';
type SampleDecision = 'review' | 'revise' | 'approved';

const pages: { id: Screen; number: string; title: string; sub: string }[] = [
  { id: 'intro', number: '01', title: 'Kurumsal bakış', sub: 'Ürün hikâyesi' },
  { id: 'dashboard', number: '02', title: 'Yönetim kokpiti', sub: 'Yayın operasyonu' },
  { id: 'editorial', number: '03', title: 'Editoryal masa', sub: 'Soru ve onay akışı' }
];

const projects = [
  { name: '8. Sınıf Matematik Soru Bankası', code: 'YAYIN / 001', stage: 'İncelemede', owner: 'Editör masası', progress: 76, total: '120 soru' },
  { name: 'TYT Matematik Yeni Nesil', code: 'YAYIN / 002', stage: 'Revizyonda', owner: 'Yazar ekibi', progress: 52, total: '240 soru' },
  { name: '11. Sınıf Fizik Kazanım Serisi', code: 'YAYIN / 003', stage: 'İncelemede', owner: 'Editör masası', progress: 83, total: '90 soru' },
  { name: 'LGS Deneme Hazırlık', code: 'YAYIN / 004', stage: 'Üretimde', owner: 'Yazar ekibi', progress: 39, total: '160 soru' }
];

const questions: Record<QuestionKind, { badge: string; title: string; statement: string; answerLabel: string; answer: string; note: string; detail: string }> = {
  mcq: {
    badge: 'ÇOKTAN SEÇMELİ / 4 ŞIK',
    title: 'Soru dosyası 001',
    statement: 'Bir dikdörtgenin kısa kenarı 4 cm, uzun kenarı ise kısa kenarının iki katıdır. Çevresi kaç santimetredir?',
    answerLabel: 'Doğru yanıt',
    answer: 'C — 24 cm',
    note: 'Çeldiricilerin güçlendirilmesi ve kazanım eşleşmesinin son kez kontrol edilmesi önerilir.',
    detail: 'A) 16     B) 20     C) 24     D) 32'
  },
  boolean: {
    badge: 'DOĞRU / YANLIŞ',
    title: 'Soru dosyası 002',
    statement: '8 sayısı asal bir sayıdır.',
    answerLabel: 'Cevap anahtarı',
    answer: 'Yanlış',
    note: 'Gerekçe matematiksel olarak açık. Açıklama metninin öğrencinin seviyesine uygunluğu kontrol edilecek.',
    detail: 'Gerekçe: 8 sayısının 1 ve 8 dışında bölenleri de vardır.'
  },
  open: {
    badge: 'KLASİK / AÇIK UÇLU',
    title: 'Soru dosyası 003',
    statement: 'Bir doğal sayının asal olup olmadığını nasıl belirleriz? 12 sayısı üzerinden gerekçelendiriniz.',
    answerLabel: 'Model cevap',
    answer: '12 asal değildir.',
    note: 'Model cevap ve puanlama anahtarı hazır; değerlendirme ölçütlerinin tutarlılığı incelenecek.',
    detail: 'Puanlama: tanım 4 puan · bölenler 4 puan · sonuç 2 puan'
  }
};

function Brand() {
  return (
    <span className="pitch-brand" aria-label="PRO-LİG sunum konsepti">
      <span className="pitch-brand-mark" aria-hidden="true"><span /><span /><span /></span>
      <span className="pitch-brand-word"><strong>PRO-LİG</strong><small>YAYIN VE İÇERİK YÖNETİMİ</small></span>
    </span>
  );
}

export function PublishingPresentationConcept() {
  const [active, setActive] = useState<Screen>('intro');
  const [filter, setFilter] = useState<StatusFilter>('Tümü');
  const [kind, setKind] = useState<QuestionKind>('mcq');
  const [decision, setDecision] = useState<SampleDecision>('review');

  const navigate = (next: Screen) => {
    setActive(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const visibleProjects = projects.filter(project => filter === 'Tümü' || project.stage === filter);
  const currentQuestion = questions[kind];

  return (
    <div className="pitch-root">
      <a className="pitch-skip" href="#pitch-content">İçeriğe geç</a>
      <div className="pitch-ribbon">
        <span className="pitch-ribbon-left"><span className="pitch-live-dot" /> PRO-LİG / SUNUM KONSEPTİ</span>
        <span>Bağımsız tasarım çalışması <span className="pitch-ribbon-sep">·</span> Temsili veriler <span className="pitch-ribbon-sep">·</span> İşler Yayın Grubu'nun resmî sitesi değildir</span>
      </div>

      <header className="pitch-header">
        <div className="pitch-header-inner">
          <Brand />
          <nav className="pitch-nav" aria-label="Sunum ekranları">
            {pages.map(page => (
              <button key={page.id} type="button" className={active === page.id ? 'active' : ''} onClick={() => navigate(page.id)}
                aria-current={active === page.id ? 'page' : undefined}>
                <span>{page.number}</span>{page.title}
              </button>
            ))}
          </nav>
          <span className="pitch-header-end"><span className="pitch-header-end-line" /> TASARIM ÖNERİSİ · 2026</span>
        </div>
      </header>

      <main id="pitch-content" className="pitch-main">
        {active === 'intro' && <>
          <section className="pitch-hero">
            <div className="pitch-hero-text">
              <span className="pitch-kicker"><span className="pitch-kicker-line" /> BİR YAYININ ARKASINDAKİ SİSTEM</span>
              <h1>Yayın sürecinin <em>görünmeyen emeği,</em> artık görünür.</h1>
              <p>Bir fikrin yayın dosyasına dönüşmesi; yazarın, editörün ve koordinatörün aynı üretim ritminde buluşmasıyla mümkün. PRO-LİG bu yolculuğu tek bir zeminde yönetir.</p>
              <div className="pitch-hero-buttons">
                <button className="pitch-btn-primary" type="button" onClick={() => navigate('dashboard')}>Yönetim kokpitini keşfet <ArrowUpRight size={17}/></button>
                <button className="pitch-btn-soft" type="button" onClick={() => navigate('editorial')}>Editoryal süreci gör <ArrowRight size={17}/></button>
              </div>
              <div className="pitch-hero-seal"><ShieldCheck size={17}/><span>İçerik kalitesi, izlenebilir süreç, kurumsal güven.</span></div>
            </div>
            <div className="pitch-art" aria-label="Temsili bir yayın dosyasının editoryal aşamaları">
              <div className="pitch-art-overline"><span>YAYIN DOSYASI / 001</span><span>PRO-LİG · EDITION</span></div>
              <div className="pitch-cover">
                <div className="pitch-cover-top"><span>KURUMSAL YAYINCILIK</span><span>01 / 03</span></div>
                <div className="pitch-cover-center"><small>8. SINIF / MATEMATİK</small><strong>İyi bir yayın,<br/><i>iyi bir süreçle</i><br/>başlar.</strong><span className="pitch-cover-rule"/></div>
                <div className="pitch-cover-bottom"><span>PLANLAMA</span><span>ÜRETİM</span><span>EDİTÖRYAL ONAY</span></div>
              </div>
              <div className="pitch-floating-note"><span className="pitch-note-symbol"><CheckCircle2 size={21}/></span><div><small>EDİTÖR MASASI</small><strong>İçerik kontrol altında</strong><span>Her aşama izlenebilir.</span></div></div>
              <div className="pitch-art-caption">01 — Temsili yayın çalışması; gerçek kullanıcı veya yayın verisi içermez.</div>
            </div>
          </section>
          <section className="pitch-competencies" aria-label="Platformun temel değerleri">
            <div className="pitch-section-heading"><span>TEK PLATFORM / ÜÇ DİSİPLİN</span><h2>Yayın üretiminde <em>ortak bir dil.</em></h2></div>
            <div className="pitch-competencies-grid">
              <article><span className="pitch-no">01 / PLANLAMA</span><Layers3 size={27}/><h3>Her projenin bir yol haritası.</h3><p>Yayın kapsamı, sorumluluklar ve teslim tarihleri aynı dosyada buluşur.</p></article>
              <article><span className="pitch-no">02 / İÇERİK</span><BookOpen size={27}/><h3>Her sorunun bir üretim öyküsü.</h3><p>Yazar, editör ve revizyon kayıtları içerikten ayrılmadan ilerler.</p></article>
              <article><span className="pitch-no">03 / YÖNETİM</span><BarChart3 size={27}/><h3>Her kararın bir karşılığı.</h3><p>Üretim göstergeleri, raporlama ve telif süreçleri izlenebilir olur.</p></article>
            </div>
          </section>
        </>}

        {active === 'dashboard' && <>
          <section className="pitch-workspace-heading">
            <div><span className="pitch-kicker"><span className="pitch-kicker-line" /> YÖNETİCİ GÖRÜNÜMÜ / TEMSİLİ</span><h1>Yayın yönetimi, <em>tek bakışta.</em></h1><p>Bir yayın grubunun operasyonel ritmini, önceliklerini ve bekleyen kararlarını gösteren kokpit.</p></div>
            <span className="pitch-design-tag"><LayoutDashboard size={17}/> YÖNETİM KOKPİTİ · KONSEPT</span>
          </section>
          <section className="pitch-workspace">
            <aside className="pitch-workspace-aside" aria-label="Temsili uygulama menüsü">
              <div className="pitch-aside-heading"><span className="pitch-aside-avatar">P</span><div><strong>PRO-LİG</strong><small>Genel koordinasyon</small></div></div>
              <p>ÇALIŞMA ALANI</p>
              <span className="pitch-side-link selected"><LayoutDashboard size={17}/> Genel görünüm</span>
              <span className="pitch-side-link"><Layers3 size={17}/> Yayın projeleri</span>
              <span className="pitch-side-link"><PenLine size={17}/> Soru stüdyosu</span>
              <span className="pitch-side-link"><FileCheck2 size={17}/> Editör masası <i>16</i></span>
              <p>YÖNETİM</p>
              <span className="pitch-side-link"><Users size={17}/> Yazar ağı</span>
              <span className="pitch-side-link"><BarChart3 size={17}/> Telif ve raporlar</span>
              <div className="pitch-aside-foot">Ürün görünümü / temsili arayüz</div>
            </aside>
            <div className="pitch-workspace-body">
              <div className="pitch-welcome-row"><div><small>GENEL KOORDİNASYON / GÖSTERGE PANELİ</small><h2>Bugün nerede duruyoruz?</h2></div><span className="pitch-sample-label">ÖRNEK RAKAMLAR</span></div>
              <div className="pitch-kpis">
                <div><span>AKTİF YAYIN DOSYASI</span><strong>12</strong><small><Layers3 size={15}/> 4 farklı yayın serisi</small></div>
                <div><span>EDİTÖRDE BEKLEYEN</span><strong>146</strong><small><Clock3 size={15}/> İnceleme kuyruğu</small></div>
                <div><span>REVİZYON BEKLEYEN</span><strong>38</strong><small><PenLine size={15}/> Yazara dönüş gerekli</small></div>
                <div><span>TAMAMLANAN İŞ ORANI</span><strong>%82</strong><small><CheckCircle2 size={15}/> Örnek ilerleme göstergesi</small></div>
              </div>
              <div className="pitch-panel-grid">
                <section className="pitch-panel pitch-table-panel">
                  <div className="pitch-panel-header"><div><small>YAYIN OPERASYONU</small><h3>Üretimdeki yayınlar</h3></div><FileText size={19}/></div>
                  <div className="pitch-filters" role="group" aria-label="Yayın durumu filtresi">
                    {(['Tümü','İncelemede','Revizyonda'] as StatusFilter[]).map(status => (
                      <button type="button" key={status} className={filter===status?'selected':''} onClick={()=>setFilter(status)}
                        aria-pressed={filter===status}>{status}</button>
                    ))}
                  </div>
                  <div className="pitch-projects">
                    {visibleProjects.map(project => <article key={project.code} className="pitch-project-row">
                      <div><small>{project.code} · {project.total}</small><strong>{project.name}</strong><span>{project.owner}</span></div>
                      <div className="pitch-project-progress"><span className={'pitch-status '+(project.stage === 'Revizyonda'?'revise':project.stage==='Üretimde'?'create':'')}>{project.stage}</span><div className="pitch-progress-track"><i style={{width:project.progress+'%'}}/></div><small>%{project.progress}</small></div>
                    </article>)}
                  </div>
                </section>
                <section className="pitch-panel pitch-focus-panel">
                  <div className="pitch-panel-header"><div><small>ÖNCELİKLİ KARARLAR</small><h3>Bugün masanızda</h3></div><Clock3 size={19}/></div>
                  <ol className="pitch-action-list">
                    <li><span>01</span><div><strong>Yayıma hazırlık kontrolü</strong><small>Matematik · Son editör kontrolü</small></div><ChevronRight size={17}/></li>
                    <li><span>02</span><div><strong>Revizyon takibi</strong><small>Fizik · Geri dönen sorular</small></div><ChevronRight size={17}/></li>
                    <li><span>03</span><div><strong>Telif dönem özeti</strong><small>Ödeme öncesi rapor incelemesi</small></div><ChevronRight size={17}/></li>
                  </ol>
                  <div className="pitch-insight"><span>YÖNETİM NOTU</span><p>Veriyi yalnız göstermek değil, hangi kararın sırada olduğunu anlaşılır kılmak.</p></div>
                  <button type="button" className="pitch-panel-link" onClick={()=>navigate('editorial')}>Editör masasını incele <ArrowRight size={16}/></button>
                </section>
              </div>
            </div>
          </section>
        </>}

        {active === 'editorial' && <>
          <section className="pitch-workspace-heading">
            <div><span className="pitch-kicker"><span className="pitch-kicker-line" /> YAZAR / EDİTÖR / YAYIN SÜRECİ</span><h1>Bir sorudan <em>yayın kararına.</em></h1><p>Hazırlama, değerlendirme, revizyon ve onay aynı editoryal dosyanın parçaları olarak ilerler.</p></div>
            <span className="pitch-design-tag"><PenLine size={17}/> EDİTÖRYAL MASA · KONSEPT</span>
          </section>
          <section className="pitch-editor-layout">
            <div className="pitch-editor-guide">
              <span className="pitch-pane-eyebrow">YAYIN İŞ AKIŞI / 01</span>
              <h2>Beş adımda<br/>nitelikli içerik.</h2>
              <ol className="pitch-steps">
                {['Tür ve bilgiler','Soru kökü','Cevap yapısı','Çözüm ve değerlendirme','Önizleme ve kayıt'].map((label,i)=><li key={label} className={i===4?'current':''}><span>{String(i+1).padStart(2,'0')}</span>{label}</li>)}
              </ol>
              <div className="pitch-guide-note"><ShieldCheck size={19}/><p>Üretimden incelemeye kadar her aşama kayıt altında.</p></div>
            </div>
            <div className="pitch-question-pane">
              <div className="pitch-pane-top"><span className="pitch-pane-eyebrow">İÇERİK ÖNİZLEMESİ</span><span className="pitch-sample-label">TEMSİLİ SORU</span></div>
              <h2>Soru üretim stüdyosu</h2>
              <p className="pitch-question-subtitle">Bir soru türü seçerek editörün göreceği dosyayı inceleyin.</p>
              <div className="pitch-question-type-tabs" role="group" aria-label="Örnek soru türü">
                <button type="button" aria-pressed={kind==='mcq'} onClick={()=>{setKind('mcq');setDecision('review')}} className={kind==='mcq'?'active':''}>Çoktan seçmeli</button>
                <button type="button" aria-pressed={kind==='boolean'} onClick={()=>{setKind('boolean');setDecision('review')}} className={kind==='boolean'?'active':''}>Doğru / Yanlış</button>
                <button type="button" aria-pressed={kind==='open'} onClick={()=>{setKind('open');setDecision('review')}} className={kind==='open'?'active':''}>Klasik</button>
              </div>
              <div className="pitch-question-paper">
                <div className="pitch-question-paper-top"><span>{currentQuestion.badge}</span><span>{currentQuestion.title}</span></div>
                <span className="pitch-question-index">MATEMATİK / 8. SINIF · ÖRNEK</span>
                <h3>{currentQuestion.statement}</h3>
                <p className="pitch-question-options">{currentQuestion.detail}</p>
                <div className="pitch-question-answer"><small>{currentQuestion.answerLabel}</small><strong>{currentQuestion.answer}</strong></div>
              </div>
              <div className="pitch-question-caption">Bu örnek sorular canlı Soru Havuzu'na bağlı değildir; hiçbir işlem kaydedilmez.</div>
            </div>
            <aside className="pitch-review-pane">
              <span className="pitch-pane-eyebrow">EDİTÖR DEĞERLENDİRMESİ / 02</span>
              <h2>Kalite bir karardır.</h2>
              <p>Yalnızca sorunun sonucunu değil, verilen kararın gerekçesini de yönetin.</p>
              <div className="pitch-review-card"><span className="pitch-review-avatar">E</span><div><strong>Editör masası</strong><small>Temsili kontrol kaydı</small></div><span className="pitch-review-dot"/></div>
              <div className="pitch-feedback">
                <small>{decision==='review'?'EDİTÖR DEĞERLENDİRMESİ':decision==='revise'?'REVİZYON ÖRNEĞİ':'ONAY ÖRNEĞİ'}</small>
                <p>{decision==='review'?currentQuestion.note:decision==='revise'?'Örnek işlem: soru yazara revizyon için geri gönderilir. Gerekçe ve durum geçmişte izlenebilir.':'Örnek işlem: gerekli kontroller tamamlanınca içerik onaylanır ve üretim raporuna yansır.'}</p>
              </div>
              <div className="pitch-review-actions">
                <button type="button" className={decision==='revise'?'active':''} onClick={()=>setDecision('revise')}><RotateCcw size={15}/> Revizyon örneği</button>
                <button type="button" className={decision==='approved'?'active':''} onClick={()=>setDecision('approved')}><CheckCircle2 size={15}/> Onay örneği</button>
              </div>
              <div className="pitch-review-disclaimer">Bu düğmeler yalnızca sunum örneğini değiştirir. Gerçek soru onayı veya telif kaydı oluşturmaz.</div>
            </aside>
          </section>
          <section className="pitch-bottom-message"><span>PRO-LİG / EDİTORYAL DİSİPLİN</span><p>“İçeriğin kalitesi kadar, ona nasıl ulaştığınız da önemlidir.”</p></section>
        </>}
      </main>

      <footer className="pitch-footer">
        <span>PRO-LİG <i>/</i> YAYIN ÜRETİMİ VE YÖNETİM PLATFORMU</span>
        <span>Bağımsız sunum konsepti · İşler Yayın Grubu ile kurumsal bağlantı iddiası taşımaz.</span>
        <span>EKRAN {String(pages.findIndex(page=>page.id===active)+1).padStart(2,'0')} / 03</span>
      </footer>
    </div>
  );
}
