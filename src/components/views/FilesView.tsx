import React, { useState, useEffect } from 'react';
import { FolderArchive, FileText, Download, Upload, Search, FileCode } from 'lucide-react';

export const FilesView: React.FC = () => {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/files')
      .then(res => res.json())
      .then(data => {
        setFiles(data || []);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Kurumsal Dosyalar ve Şablonlar</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Soru yazım kılavuzları, Word / LaTeX şablonları, telif sözleşmesi örnekleri
          </p>
        </div>

        <button
          onClick={() => alert('Dosya yükleme penceresi açıldı. Şablon dosyanızı seçebilirsiniz.')}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors"
        >
          <Upload className="h-4 w-4" />
          <span>Yeni Dosya Yükle</span>
        </button>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Dosya Adı</th>
                <th className="py-3 px-4">Dosya Türü</th>
                <th className="py-3 px-4">Boyut</th>
                <th className="py-3 px-4">Yükleme Tarihi</th>
                <th className="py-3 px-4 text-right">İndir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-slate-400">
                    Dosyalar yükleniyor...
                  </td>
                </tr>
              ) : files.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-slate-400">
                    Kayıtlı dosya bulunmuyor.
                  </td>
                </tr>
              ) : (
                files.map((file) => (
                  <tr key={file.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                          <FileText className="h-4 w-4" />
                        </div>
                        <span className="font-bold text-slate-800">{file.file_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                        {file.file_type || 'PDF'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">{file.file_size || '2.4 MB'}</td>
                    <td className="py-3 px-4 text-slate-500">{file.created_at ? file.created_at.split(' ')[0] : '2026-08'}</td>
                    <td className="py-3 px-4 text-right">
                      <a
                        href={file.file_url || '#'}
                        download
                        onClick={(e) => {
                          e.preventDefault();
                          alert(`${file.file_name} indiriliyor.`);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                      >
                        <Download className="h-3 w-3" />
                        <span>İndir</span>
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
