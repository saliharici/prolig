import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Send,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { submitMembershipApplication } from './api';
import { PROVINCES } from './provinces';

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  provinceId: string;
  districtName: string;
  institutionName: string;
  requestedRole: 'YAZAR' | 'EDITOR';
  requestedBranch: string;
  motivation: string;
};

export function MembershipApplicationScreen({
  onBack
}: {
  onBack: () => void;
}) {
  const [form, setForm] = useState<FormState>({
    fullName: '',
    email: '',
    phone: '',
    provinceId: '',
    districtName: '',
    institutionName: '',
    requestedRole: 'YAZAR',
    requestedBranch: '',
    motivation: ''
  });

  const [status, setStatus] =
    useState<'idle' | 'sending' | 'done'>('idle');

  const [error, setError] = useState('');

  const change = <K extends keyof FormState>(
    key: K,
    value: FormState[K]
  ) => {
    setForm((previous) => ({
      ...previous,
      [key]: value
    }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.provinceId) {
      setError('Lütfen ilinizi seçin.');
      return;
    }

    setStatus('sending');
    setError('');

    try {
      await submitMembershipApplication({
        ...form,
        provinceId: Number(form.provinceId)
      });

      setStatus('done');
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Başvuru gönderilemedi. Lütfen tekrar deneyin.'
      );
      setStatus('idle');
    }
  };

  if (status === 'done') {
    return (
      <div className="membership-page membership-success-page">
        <div className="membership-success">
          <div className="membership-success-icon">
            <CheckCircle2 size={28} />
          </div>

          <div className="public-overline">BAŞVURU ALINDI</div>

          <h1>Başvurunuz başarıyla alındı</h1>

          <p>
            Başvurunuz yetkili koordinatörlerin değerlendirme ekranına
            iletilmiştir. Değerlendirme sonucunda uygun rol ve çalışma
            kapsamı ayrıca tanımlanır.
          </p>

          <div className="membership-success-note">
            Başvuru göndermek doğrudan kullanıcı hesabı oluşturmaz.
          </div>

          <button
            type="button"
            className="public-primary-button membership-success-action"
            onClick={onBack}
          >
            Ana sayfaya dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="membership-page">
      <div className="membership-container">
        <button
          type="button"
          className="membership-back"
          onClick={onBack}
        >
          <ArrowLeft size={15} />
          Geri
        </button>

        <header className="membership-header">
          <div className="public-overline">PRO-LİG ÜYELİK</div>

          <h1>Üyelik Başvurusu</h1>

          <p>
            Başvurunuz doğrudan hesap oluşturmaz. Yetkili
            koordinatörlerin değerlendirmesinin ardından uygun rol ve
            çalışma kapsamı tanımlanır.
          </p>
        </header>

        <div className="membership-layout">
          <div className="membership-card">
            <form className="membership-form" onSubmit={submit}>
              <section className="membership-section">
                <div className="membership-section-heading">
                  <span>01</span>

                  <div>
                    <h2>Kişisel Bilgiler</h2>
                    <p>
                      Size ulaşabilmemiz için temel iletişim bilgilerinizi
                      paylaşın.
                    </p>
                  </div>
                </div>

                <div className="membership-grid">
                  <label className="membership-field">
                    <span className="membership-label">
                      Ad Soyad <em>*</em>
                    </span>

                    <input
                      className="membership-control"
                      required
                      autoComplete="name"
                      value={form.fullName}
                      onChange={(event) =>
                        change('fullName', event.target.value)
                      }
                      placeholder="Adınız ve soyadınız"
                    />
                  </label>

                  <label className="membership-field">
                    <span className="membership-label">
                      E-posta <em>*</em>
                    </span>

                    <input
                      className="membership-control"
                      required
                      type="email"
                      autoComplete="email"
                      value={form.email}
                      onChange={(event) =>
                        change('email', event.target.value)
                      }
                      placeholder="ornek@kurum.com"
                    />
                  </label>

                  <label className="membership-field">
                    <span className="membership-label">Telefon</span>

                    <input
                      className="membership-control"
                      type="tel"
                      autoComplete="tel"
                      value={form.phone}
                      onChange={(event) =>
                        change('phone', event.target.value)
                      }
                      placeholder="05xx xxx xx xx"
                    />
                  </label>

                  <label className="membership-field">
                    <span className="membership-label">
                      İl <em>*</em>
                    </span>

                    <select
                      className="membership-control membership-select"
                      required
                      value={form.provinceId}
                      onChange={(event) =>
                        change('provinceId', event.target.value)
                      }
                    >
                      <option value="" disabled>
                        İl seçiniz
                      </option>

                      {PROVINCES.map(([id, name]) => (
                        <option key={id} value={String(id)}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>

              <section className="membership-section">
                <div className="membership-section-heading">
                  <span>02</span>

                  <div>
                    <h2>Kurum ve Görev Bilgileri</h2>
                    <p>
                      Başvurunuzun doğru kapsamda değerlendirilmesine
                      yardımcı olun.
                    </p>
                  </div>
                </div>

                <div className="membership-grid">
                  <label className="membership-field">
                    <span className="membership-label">İlçe</span>

                    <input
                      className="membership-control"
                      value={form.districtName}
                      onChange={(event) =>
                        change('districtName', event.target.value)
                      }
                      placeholder="İlçe adını yazın"
                    />
                  </label>

                  <label className="membership-field">
                    <span className="membership-label">
                      Kurum / Okul
                    </span>

                    <input
                      className="membership-control"
                      value={form.institutionName}
                      onChange={(event) =>
                        change('institutionName', event.target.value)
                      }
                      placeholder="Çalıştığınız kurum"
                    />
                  </label>

                  <label className="membership-field">
                    <span className="membership-label">
                      Talep edilen görev <em>*</em>
                    </span>

                    <select
                      className="membership-control membership-select"
                      required
                      value={form.requestedRole}
                      onChange={(event) =>
                        change(
                          'requestedRole',
                          event.target.value as 'YAZAR' | 'EDITOR'
                        )
                      }
                    >
                      <option value="YAZAR">Yazar</option>
                      <option value="EDITOR">Editör</option>
                    </select>
                  </label>

                  <label className="membership-field">
                    <span className="membership-label">
                      Branş <em>*</em>
                    </span>

                    <input
                      className="membership-control"
                      required
                      value={form.requestedBranch}
                      onChange={(event) =>
                        change('requestedBranch', event.target.value)
                      }
                      placeholder="Örn. Matematik"
                    />
                  </label>
                </div>
              </section>

              <section className="membership-section">
                <div className="membership-section-heading">
                  <span>03</span>

                  <div>
                    <h2>Başvuru Notu</h2>
                    <p>
                      Deneyiminiz veya katkı sunmak istediğiniz alan
                      hakkında kısaca bilgi verin.
                    </p>
                  </div>
                </div>

                <label className="membership-field">
                  <span className="membership-label">
                    Kısa açıklama
                  </span>

                  <textarea
                    className="membership-control membership-textarea"
                    value={form.motivation}
                    onChange={(event) =>
                      change('motivation', event.target.value)
                    }
                    rows={5}
                    placeholder="Başvuru amacınızı ve ilgili deneyiminizi kısaca paylaşın."
                  />
                </label>
              </section>

              {error && (
                <div className="membership-error" role="alert">
                  <AlertCircle size={17} />
                  <span>{error}</span>
                </div>
              )}

              <div className="membership-submit">
                <p>
                  <ShieldCheck size={14} />
                  <span>
                    <strong>*</strong> ile işaretlenen alanlar zorunludur.
                  </span>
                </p>

                <button
                  className="public-primary-button"
                  disabled={status === 'sending'}
                  type="submit"
                >
                  {status === 'sending'
                    ? 'Gönderiliyor...'
                    : 'Başvuruyu Gönder'}

                  <Send size={15} />
                </button>
              </div>
            </form>
          </div>

          <aside className="membership-aside">
            <div className="membership-process-icon">
              <ClipboardCheck size={21} />
            </div>

            <div className="public-overline">
              DEĞERLENDİRME SÜRECİ
            </div>

            <h2>Başvurunuz nasıl ilerler?</h2>

            <ol className="membership-process">
              <li>
                <span>1</span>
                <div>
                  <strong>Başvurunuzu gönderin</strong>
                  <p>
                    İletişim ve görev bilgilerinizi eksiksiz paylaşın.
                  </p>
                </div>
              </li>

              <li>
                <span>2</span>
                <div>
                  <strong>Kapsam değerlendirilir</strong>
                  <p>
                    Koordinatörler branş, bölge ve çalışma kapsamını
                    inceler.
                  </p>
                </div>
              </li>

              <li>
                <span>3</span>
                <div>
                  <strong>Rolünüz tanımlanır</strong>
                  <p>
                    Uygun görülürse rol ve çalışma kapsamı hesabınıza
                    atanır.
                  </p>
                </div>
              </li>
            </ol>

            <div className="membership-process-note">
              <UserCheck size={16} />
              <p>
                Başvuru göndermek doğrudan kullanıcı hesabı oluşturmaz.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}