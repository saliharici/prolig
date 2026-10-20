import { useEffect, useState } from 'react';
import './private-geometry-workspace.css';

interface PrivateGeometryImage {
  assetId: number;
  sha256: string;
  width: number;
  height: number;
  createdAt: string;
}
interface PrivateGeometryListResponse {
  images: PrivateGeometryImage[];
  updatedAt: string;
}
interface PrivateGeometryReadResponse {
  pngBase64: string;
  width: number;
  height: number;
  contentType: 'image/png';
}
interface PrivateGeometryUploadResponse {
  receipt: string;
  linkedToQuestion: false;
}
interface PrivateGeometryBindResponse {
  linkedToQuestion: true;
  updatedAt: string;
}

async function privateAction<T>(
  questionId: number,
  action: string,
  details: Record<string, unknown> = {}
): Promise<T> {
  const response = await fetch('/api/v1/questions/' + questionId, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...details })
  });
  const content = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof content?.error === 'string' ? content.error : 'İşlem tamamlanamadı.';
    if (response.status === 404) throw new Error('Özel görseller bu test ortamında henüz etkin değil.');
    if (response.status === 409) throw new Error('Soru sürümü değişmiş veya işlem kilitli. Soruyu yeniden açın.');
    throw new Error(message);
  }
  return content as T;
}

/** Normalise via browser canvas; the server independently validates the PNG again. */
export async function convertSelectedImageToPngBase64(file: File): Promise<string> {
  if (file.type !== 'image/png' || file.size > 2 * 1024 * 1024 || file.size === 0) {
    throw new Error('Yalnızca 2 MB altındaki PNG dosyaları kullanılabilir.');
  }
  const bitmap = await createImageBitmap(file);
  try {
    if (!bitmap.width || !bitmap.height ||
        bitmap.width > 4096 || bitmap.height > 4096 ||
        bitmap.width * bitmap.height > 4_000_000) {
      throw new Error('Çizim çok büyük. Daha küçük bir PNG dosyası seçin.');
    }
    const scale = Math.min(1, 1024 / bitmap.width, 1024 / bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Tarayıcı görsel dönüştürmeyi desteklemiyor.');
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const png = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG dönüştürülemedi.')), 'image/png');
    });
    if (png.size > 512 * 1024) {
      throw new Error('Çizim 512 KB sınırını aşıyor. Boyutunu küçültün.');
    }
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('PNG okunamadı.'));
      reader.onload = () => {
        const result = reader.result;
        if (typeof result !== 'string' || !result.startsWith('data:image/png;base64,')) {
          reject(new Error('Geçersiz PNG verisi.'));
          return;
        }
        resolve(result.slice('data:image/png;base64,'.length));
      };
      reader.readAsDataURL(png);
    });
  } finally {
    bitmap.close();
  }
}

export function PrivateGeometryWorkspace({
  questionId,
  expectedUpdatedAt,
  disabled,
  onRevisionChange
}: {
  questionId: number;
  expectedUpdatedAt: string;
  disabled: boolean;
  onRevisionChange: (updatedAt: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [images, setImages] = useState<PrivateGeometryImage[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [preview, setPreview] = useState('');
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState('Yalnızca kayıtlı taslak sorularda kullanılabilir.');
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    let alive = true;
    setPreview('');
    setActive(null);
    setImages([]);
    privateAction<PrivateGeometryListResponse>(questionId, 'geometryList').then(result => {
      if (alive) {
        setImages(result.images);
        setAvailable(true);
        setNotice(result.images.length ? 'Özel çizimler güvenli depoda kayıtlı.' : 'Henüz yüklenmiş özel çizim yok.');
      }
    }).catch(err => {
      if (alive) {
        setAvailable(false);
        setNotice(err instanceof Error ? err.message : 'Özel çizim listesi yüklenemedi.');
      }
    });
    return () => { alive = false; };
  }, [questionId]);

  const upload = async () => {
    if (!file || working || disabled || !available || !expectedUpdatedAt) return;
    setWorking(true);
    setNotice('PNG güvenli biçime dönüştürülüyor…');
    try {
      const pngBase64 = await convertSelectedImageToPngBase64(file);
      setNotice('Dosya özel depolamaya yükleniyor…');
      const uploaded = await privateAction<PrivateGeometryUploadResponse>(questionId, 'geometryUpload', {
        pngBase64, expectedUpdatedAt
      });
      if (uploaded.linkedToQuestion !== false || typeof uploaded.receipt !== 'string') {
        throw new Error('Güvenli yükleme makbuzu alınamadı.');
      }
      setNotice('Dosya soru kaydına bağlanıyor…');
      const bound = await privateAction<PrivateGeometryBindResponse>(questionId, 'geometryBind', {
        receipt: uploaded.receipt, expectedUpdatedAt
      });
      if (bound.linkedToQuestion !== true || typeof bound.updatedAt !== 'string') {
        throw new Error('Görselin soru kaydı doğrulanamadı.');
      }
      onRevisionChange(bound.updatedAt);
      const result = await privateAction<PrivateGeometryListResponse>(questionId, 'geometryList');
      setImages(result.images);
      setFile(null);
      setPreview('');
      setActive(null);
      setNotice('Görsel soruya kaydedildi. Seçerek güvenli önizlemesini açabilirsiniz.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Görsel kaydedilemedi.');
    } finally {
      setWorking(false);
    }
  };

  const read = async (assetId: number) => {
    if (working || disabled) return;
    setWorking(true);
    setNotice('Kayıtlı dosya yetki kontrolüyle okunuyor…');
    try {
      const result = await privateAction<PrivateGeometryReadResponse>(questionId, 'geometryRead', { assetId });
      if (result.contentType !== 'image/png' ||
          typeof result.pngBase64 !== 'string' || result.pngBase64.length > 750_000) {
        throw new Error('Özel PNG yanıtı geçersiz.');
      }
      setActive(assetId);
      setPreview('data:image/png;base64,' + result.pngBase64);
      setNotice('Görsel yalnızca bu yetkili oturum üzerinden görüntüleniyor.');
    } catch (error) {
      setPreview('');
      setActive(null);
      setNotice(error instanceof Error ? error.message : 'Görsel okunamadı.');
    } finally {
      setWorking(false);
    }
  };

  return <section className="p3-private-geometry" aria-label="Özel çizim yükleme ve görüntüleme">
    <h4>Özel çizimler</h4>
    <p>PNG çiziminizi yalnızca bu soruya, özel depolama alanında kaydedin. Dosya bağlantısı herkese açılmaz.</p>
    <label>PNG dosyası seç
      <input aria-label="Özel PNG çizimi" type="file" accept="image/png" disabled={working || disabled || !available}
        onChange={event => setFile(event.target.files?.[0] ?? null)} />
    </label>
    <button type="button" disabled={!file || working || disabled || !available || images.length >= 30}
      onClick={() => void upload()}>{working ? 'İşleniyor…' : 'Görseli yükle ve soruya bağla'}</button>
    <div role="status" aria-live="polite" className="p3-private-message">{notice}</div>
    <div className="p3-private-geometry-list">
      <strong>Kayıtlı özel çizimler ({images.length})</strong>
      {images.map((image, i) => <button type="button" key={image.assetId} disabled={working || disabled}
        onClick={() => void read(image.assetId)} aria-pressed={active === image.assetId}>
        {i + 1}. PNG · {image.width} × {image.height} · Görüntüle
      </button>)}
    </div>
    {preview && <figure className="p3-private-geometry-preview">
      <img src={preview} alt="Bu soruya kayıtlı özel çizim" />
      <figcaption>Yetki kontrollü özel çizim önizlemesi</figcaption>
    </figure>}
  </section>;
}
