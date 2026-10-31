import { useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Building2, ClipboardCheck, FileCheck2, Layers3, Palette, PenLine, ShieldCheck, Wallet } from 'lucide-react';
import type { Role, Section } from '../demo/model';

/* UX-only presentation. This module never authenticates, grants rights or writes data. */
type Link = { section: Section; label: string };
type Experience = { label: string; eyebrow: string; headline: string; copy: string; links: Link[] };
export const roleExperiences: Record<Role, Experience> = {
 GENEL_KOORDINATOR: { label:'Genel Koordinatör',eyebrow:'YAYIN OPERASYONLARI',headline:'Yayının bütün resmi, tek çalışma masasında.',copy:'Projeler, editoryal kararlar, üretim takvimi ve telif süreçleri birlikte ilerler.',links:[{section:'projects',label:'Yayın projeleri'},{section:'questions',label:'Editör kuyruğu'},{section:'reports',label:'Raporlar'}]},
 BOLGE_KOORDINATORU: {label:'Bölge Koordinatörü',eyebrow:'BÖLGE OPERASYONLARI',headline:'Bölgenizdeki yayın akışını yönetin.',copy:'Sorumlu olduğunuz yazar, proje ve görevlerin güncel durumuna ulaşın.',links:[{section:'projects',label:'Projeler'},{section:'tasks',label:'Görevler'},{section:'authors',label:'Yazar ağı'}]},
 BRANS_KOORDINATORU: {label:'Branş Koordinatörü',eyebrow:'BÖLGE VE BRANŞ KOORDİNASYONU',headline:'Sorumluluklarınız tanımlı, erişiminiz kontrollü.',copy:'Branş Koordinatörü erişimi bölgeniz ve atanmış branşlarınızla sınırlıdır. Üretim modülleri yetki entegrasyonu tamamlanınca açılacaktır.',links:[]},
 IL_KOORDINATORU: {label:'İl Koordinatörü',eyebrow:'MEVCUT ROL · GEÇİŞ PLANI',headline:'Koordinasyon işleri, düzenli bir akışta.',copy:'Mevcut İl rolü korunur. Branş Koordinatörü önerisi tasarım galerisinde incelenir.',links:[{section:'projects',label:'Projeler'},{section:'tasks',label:'Görevler'},{section:'questions',label:'Soru havuzu'}]},
 EDITOR: {label:'Editör',eyebrow:'EDİTORYAL MASA',headline:'Her soru, yayın niteliğine bir adım daha yakın.',copy:'Değerlendirme, revizyon ve içerik kontrolünü editoryal sırayla takip edin.',links:[{section:'questions',label:'İnceleme kuyruğu'},{section:'projects',label:'Proje dosyaları'},{section:'messages',label:'Mesajlar'}]},
 YAZAR: {label:'Yazar',eyebrow:'YAZAR ÇALIŞMA MASASI',headline:'Fikrinizden yayına, üretiminiz bir arada.',copy:'Soru taslaklarınızı hazırlayın, revizyonları ve teslimlerinizi takip edin.',links:[{section:'questions',label:'Sorularım'},{section:'tasks',label:'Görevlerim'},{section:'messages',label:'Mesajlar'}]},
 MUHASEBE: {label:'Muhasebe',eyebrow:'MALİ OPERASYONLAR',headline:'Telif süreçlerinde açık ve izlenebilir görünüm.',copy:'Tahakkuk, ödeme ve finansal raporların yetkili kayıtlarını kendi çalışma alanınızda izleyin.',links:[{section:'payments',label:'Telif ve ödemeler'},{section:'reports',label:'Raporlar'},{section:'projects',label:'Proje bağlamı'}]}
};
export function permittedExperienceLinks(role: Role, allowed: readonly Section[]): Link[] {
 return roleExperiences[role].links.filter(link => allowed.includes(link.section));
}
export function PublisherRoleWelcome({role,fullName,allowed,onNavigate}:{role:Role;fullName:string;allowed:readonly Section[];onNavigate:(id:Section)=>void}) {
 const info=roleExperiences[role], links=permittedExperienceLinks(role,allowed);
 return <section className="ux01-role-welcome" aria-labelledby="ux01-role-title">
   <div className="ux01-role-copy"><span className="ux01-overline"><BookOpen size={16}/> PRO-LİG / {info.eyebrow}</span>
     <p>Hoş geldiniz, {fullName.trim().split(/\s+/)[0] || 'Değerli kullanıcı'}.</p>
     <h1 id="ux01-role-title">{info.headline}</h1><p className="ux01-role-desc">{info.copy}</p>
   </div>
   <div className="ux01-role-actions"><div className="ux01-role-action-heading"><span>ÇALIŞMA KISAYOLLARI</span><span>{info.label}</span></div>
     {links.map((link,i)=><button key={link.section} className={'ux01-role-link'+(i===0?' primary':'')} type="button" onClick={()=>onNavigate(link.section)}>{link.label}<ArrowUpRight size={17}/></button>)}
     <small><ShieldCheck size={14}/> Kısayollar mevcut oturum yetkisine göre gösterilir.</small>
   </div>
 </section>;
}

const ids=['SUPER_ADMIN','GENEL_KOORDINATOR','BOLGE_KOORDINATORU','BRANS_KOORDINATORU','EDITOR','YAZAR','MUHASEBE'] as const;
type PreviewRole=typeof ids[number];
type Model={name:string;eyebrow:string;title:string;intro:string;stats:[string,string,string][];rows:[string,string,string][]};
const models:Record<PreviewRole,Model>={
 SUPER_ADMIN:{name:'Süper Admin',eyebrow:'KURUMSAL YAPILANDIRMA',title:'Yayınevi kimliğini yönetin.',intro:'Yayınevi kayıt ve tema yönetimi için yalnızca görsel tasarım. Gerçek yönetici yetkisi yoktur.',stats:[['Yayınevi profili','01','Temsili kayıt'],['Tema seçeneği','03','Görsel örnek'],['Yönetim kapsamı','—','Henüz uygulanmadı']],rows:[['Örnek Yayıncılık','Yayınevi profili','Tasarım'],['PRO-LİG Bordo','Kurumsal tema','Önerilen'],['Kum ve Mürekkep','İkincil tema','Önizleme']]},
 GENEL_KOORDINATOR:{name:'Genel Koordinatör',eyebrow:'YAYIN YÖNETİMİ',title:'Bütün yayın süreci bir bakışta.',intro:'Proje, içerik onayı, takvim ve telif için ortak operasyon masası.',stats:[['Yayın dosyası','08','Örnek değer'],['İnceleme sırası','24','Örnek değer'],['Yaklaşan teslim','06','Örnek değer']],rows:[['8. Sınıf Matematik','Editoryal süreç','İncelemede'],['Türkçe Soru Bankası','Baskı hazırlığı','Planlandı'],['Fen Bilimleri','Yazar üretimi','Devam ediyor']]},
 BOLGE_KOORDINATORU:{name:'Bölge Koordinatörü',eyebrow:'BÖLGE KOORDİNASYONU',title:'Bölgesel üretimi birlikte yürütün.',intro:'Bölge Koordinatörü mevcut rol olarak korunur.',stats:[['Takip edilen iş','12','Örnek değer'],['Yazar ekibi','18','Örnek değer'],['Teslim','04','Örnek değer']],rows:[['Yazar dağılımı','Ekip koordinasyonu','Takipte'],['Teslim planı','Haftalık görünüm','Planlandı'],['Proje kontrolü','İçerik takvimi','Devam ediyor']]},
 BRANS_KOORDINATORU:{name:'Branş Koordinatörü',eyebrow:'ÖNERİLEN ROL · PROTOTİP',title:'Branşın yayın standardı, aynı masada.',intro:'İl Koordinatörü yerine önerilen rolün yalnız arayüz taslağıdır; gerçek rol veya hak tanımlanmadı.',stats:[['Branş projeleri','05','Örnek değer'],['Yazar havuzu','14','Örnek değer'],['Soru kontrolü','32','Örnek değer']],rows:[['Matematik','Kazanım uyumu','İncelemede'],['Fen Bilimleri','Soru dağılımı','Planlandı'],['Türkçe','Editoryal uyum','Devam ediyor']]},
 EDITOR:{name:'Editör',eyebrow:'EDİTORYAL DEĞERLENDİRME',title:'İçeriği titizlikle yayına hazırlayın.',intro:'Gelen sorular, revizyon notları ve yayın ölçütleri için sade masa.',stats:[['Karar bekleyen','18','Örnek değer'],['Revizyondaki','07','Örnek değer'],['Yayına hazır','42','Örnek değer']],rows:[['Matematik · 101','Kazanım kontrolü','İncelemede'],['Türkçe · 204','Editör notu','Revizyon'],['Fen · 312','Son kontrol','Onaylandı']]},
 YAZAR:{name:'Yazar',eyebrow:'İÇERİK ÜRETİMİ',title:'Sorunuzu geliştirin, süreci izleyin.',intro:'Soru taslağı, editör geri bildirimi ve görev takip masası.',stats:[['Taslak','09','Örnek değer'],['Revizyon','03','Örnek değer'],['Onaylı','26','Örnek değer']],rows:[['Geometri · 012','Görsel kontrol','Taslak'],['Cebir · 034','Editör notu','Revizyon'],['Problemler · 018','Yayın süreci','Onaylandı']]},
 MUHASEBE:{name:'Muhasebe',eyebrow:'TELİF VE ÖDEMELER',title:'Finansal süreçleri anlaşılır kılın.',intro:'Tahakkuk, ödeme hazırlığı ve mali raporlar için kurum içi görünüm.',stats:[['Telif dönemi','10/26','Örnek dönem'],['İşlem sırası','12','Örnek değer'],['Mutabakat','—','Henüz bağlanmadı']],rows:[['Yazar telifleri','Dönem özeti','Kontrolde'],['Editör ücretleri','Hesaplama','Taslak'],['Ödeme raporu','Mutabakat','Planlandı']]}
};
export function PublisherDesignPreview({onBack}:{onBack:()=>void}) {
 const [role,setRole]=useState<PreviewRole>('GENEL_KOORDINATOR'), model=models[role];
 return <div className="ux01-design-preview publisher-theme">
   <a className="ux01-skip" href="#ux01-design-content">Ana içeriğe geç</a>
   <header className="ux01-design-header"><img src="/brand/prolig-logo-primary.png" alt="PRO-LİG"/><span>UX-01 / Tasarım Laboratuvarı</span><button onClick={onBack} type="button"><ArrowLeft size={16}/> Ana sayfaya dön</button></header>
   <main id="ux01-design-content" className="ux01-design-content">
     <div className="ux01-design-intro"><div><span className="ux01-eyebrow">PRO-LİG / YAYINCILIK DENEYİMİ</span><h1>Her rol için <em>ortak bir tasarım dili.</em></h1><p>Yayınevi, koordinasyon, içerik ve telif ekranlarını bordo ve kâğıt tonlarında inceleyin. Bütün rakamlar temsilidir; gerçek işlem yapılmaz.</p></div><div className="ux01-prototype-label"><Layers3 size={24}/><strong>GÖRSEL PROTOTİP</strong><small>Veri ve yetki bağlantısı yok</small></div></div>
     <div className="ux01-role-tabs" role="group" aria-label="Panel rolü seçimi">{ids.map(id=><button key={id} type="button" onClick={()=>setRole(id)} aria-pressed={role===id} className={role===id?'active':''}>{models[id].name}</button>)}</div>
     <div className="ux01-example-window">
       <aside className="ux01-example-sidebar"><div className="ux01-example-brand"><BookOpen size={24}/> PRO-LİG</div><small>ÇALIŞMA ALANI</small><span className="active"><Layers3 size={16}/> Genel Bakış</span><span><BookOpen size={16}/> Yayın projeleri</span><span><ClipboardCheck size={16}/> İş akışı</span><span><Wallet size={16}/> Telif ve ödemeler</span><footer><ShieldCheck size={16}/> {model.name}</footer></aside>
       <div className="ux01-example-body"><div className="ux01-example-top"><span>PRO-LİG / {model.eyebrow}</span><span>ÖRNEK GÖRÜNÜM · 2026</span></div>
         <section className="ux01-example-hero"><span className="ux01-eyebrow">{model.name.toLocaleUpperCase('tr-TR')} MASASI</span><h2>{model.title}</h2><p>{model.intro}</p><b aria-hidden="true">P / 01</b></section>
         <div className="ux01-example-stats">{model.stats.map(([label,value,note])=><article key={label}><small>{label}</small><strong>{value}</strong><span>{note}</span></article>)}</div>
         <div className="ux01-example-panels"><section className="ux01-example-list"><span className="ux01-eyebrow">OPERASYON DOSYASI / ÖRNEK</span><h3>{role==='SUPER_ADMIN'?'Yayınevi ve tema düzeni':'Öncelikli çalışma dosyaları'}</h3>{model.rows.map(([title,sub,status],i)=><div className="ux01-example-row" key={title}><b>{String(i+1).padStart(2,'0')}</b><span><strong>{title}</strong><small>{sub}</small></span><em>{status}</em><ArrowRight size={15}/></div>)}</section>
           <aside className="ux01-example-aside"><span className="ux01-eyebrow">{role==='SUPER_ADMIN'?'KURUMSAL KİMLİK':'YAYIN AKIŞI'}</span>{role==='SUPER_ADMIN'?<><Palette size={30}/><h3>Yayınevi tema prototipi</h3><p>Logo, renk ve kurumsal bilgiler için gelecekteki ayarlar taslağı. Kaydetme işlemi yoktur.</p><div className="ux01-swatches"><i/><i/><i/><i/></div><small><Building2 size={14}/> Yeni yayınevi · sadece tasarım</small></>:<><FileCheck2 size={30}/><h3>Üretimden yayına ortak iz.</h3><p>Proje, soru ve görev kartları ortak dilde sunulur. Gerçek sistemdeki rol kontrolleri değişmemiştir.</p><div className="ux01-mini-process"><PenLine size={16}/> Üretim → Kontrol → Yayın</div></>}</aside>
         </div>
       </div>
     </div>
     <p className="ux01-preview-disclaimer"><ShieldCheck size={16}/> Süper Admin ve Branş Koordinatörü yalnızca görsel prototiptir. İl Koordinatörü ve Bölge Koordinatörü mevcut backend rol ve yetkileri korunur.</p>
   </main>
 </div>;
}
