import React, { useState, useEffect } from 'react';
import { PlusCircle, Edit3, CheckCircle, XCircle, RotateCcw, Pencil, Bold, Italic, Underline, List, ListOrdered, Image as ImageIcon, Sigma, Link, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { PageBanner } from './PageBanner';

interface Question {
  id: number;
  content: string;
  imageUrl: string | null;
  status: string;
  editorNote: string | null;
  objectiveCode?: string | null;
  grade?: string | null;
  difficulty?: string | null;
  createdAt: string;
}

interface QuestionsViewProps {
  userRole: string;
  userEmail: string;
}

export function QuestionsView({ userRole, userEmail }: QuestionsViewProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newObjective, setNewObjective] = useState('');
  const [newGrade, setNewGrade] = useState('8. Sınıf');
  const [newDifficulty, setNewDifficulty] = useState('Orta');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editObjective, setEditObjective] = useState('');
  const [editGrade, setEditGrade] = useState('');
  const [editDifficulty, setEditDifficulty] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);

  const handleAIGenerate = async () => {
    if (!newObjective) {
      alert("Lütfen önce bir Kazanım Kodu girin (Örn: M.8.1.2) ki yapay zeka doğru soruyu üretebilsin.");
      return;
    }

    setIsGenerating(true);
    
    // Kullanıcının Google Gemini (AI Studio) için verdiği API anahtarı
    // Güvenlik gereği (GitHub Push Protection) doğrudan koda yazılmamıştır. Vercel .env'den okunur.
    const apiKey = (import.meta.env.VITE_GEMINI_API_KEY || '').trim(); 

    if (!apiKey) {
      alert("API anahtarı bulunamadı! Lütfen Vercel panelinden VITE_GEMINI_API_KEY değişkenini ekleyin.");
      setIsGenerating(false);
      return;
    }
    
    const prompt = `Sen profesyonel bir soru yazarı ve eğitim uzmanısın. Lütfen aşağıdaki kriterlere uygun, MEB (Milli Eğitim Bakanlığı) müfredatına ve LGS/YKS tarzına uygun yeni nesil bir çoktan seçmeli soru üret.
    
Kriterler:
- Sınıf: ${newGrade}
- Kazanım Kodu: ${newObjective}
- Zorluk Derecesi: ${newDifficulty}

Lütfen sadece sorunun metnini, ardından A, B, C, D şıklarını (alt alta) ve en sonda doğru cevabı kısa bir açıklama ile ver. Markdown formatını kullanabilirsin.`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) {
        let errorMsg = "Bilinmeyen bir hata oluştu.";
        try {
          const errorData = await response.json();
          errorMsg = errorData.error?.message || JSON.stringify(errorData);
        } catch(e) {}
        throw new Error(`Google API Hatası: ${response.status} - ${errorMsg}`);
      }

      const data = await response.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (generatedText) {
        setNewContent(generatedText);
      } else {
        alert("Soru üretilemedi, lütfen tekrar deneyin.");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Yapay zeka ile iletişimde bir hata oluştu.");
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [userRole, userEmail]);

  const fetchQuestions = async () => {
    try {
      const res = await fetch(`/api/questions?role=${userRole}&email=${userEmail}`);
      const data = await res.json();
      setQuestions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // API call denemesi
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: newContent,
          objectiveCode: newObjective,
          grade: newGrade,
          difficulty: newDifficulty,
          authorId: 1
        })
      });

      if (res.ok) {
        setShowForm(false);
        setNewContent('');
        fetchQuestions();
      } else {
        throw new Error('API Bulunamadı - Mock Kullanılacak');
      }
    } catch (err) {
      // Frontend-only demo modülü için mock veri ekleme (API yoksa çalışır)
      console.log('Mock Soru Ekleniyor...');
      const newQuestion: Question = {
        id: Math.floor(Math.random() * 1000) + 100,
        content: newContent,
        imageUrl: null,
        status: 'BEKLEMEDE',
        editorNote: null,
        objectiveCode: newObjective,
        grade: newGrade,
        difficulty: newDifficulty,
        createdAt: new Date().toISOString()
      };
      
      setQuestions(prev => [newQuestion, ...prev]);
      setShowForm(false);
      setNewContent('');
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/questions/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) fetchQuestions();
    } catch (err) {
      console.error(err);
    }
  };

  const startEditing = (q: Question) => {
    setEditingId(q.id);
    setEditContent(q.content);
    setEditObjective(q.objectiveCode || '');
    setEditGrade(q.grade || '8. Sınıf');
    setEditDifficulty(q.difficulty || 'Orta');
  };

  const handleUpdateContent = async (id: number) => {
    try {
      const res = await fetch(`/api/questions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: editContent,
          objectiveCode: editObjective,
          grade: editGrade,
          difficulty: editDifficulty
        })
      });
      if (res.ok) {
        setEditingId(null);
        fetchQuestions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="p-6 md:p-8 max-w-7xl mx-auto"
    >
      <PageBanner
        title={
          <><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">Soru ve İçerik</span> Havuzu</>
        }
        description={userRole === 'YAZAR' ? 'Sisteme eklediğiniz soru ve içerikleri buradan yönetin, yayınevine gönderin.' : 'Tüm yazarlardan gelen soru ve içerikleri inceleyip onaylayın.'}
        badge={
          <>
            <span className="relative flex h-2 w-2 mr-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            İÇERİK YÖNETİMİ
          </>
        }
        actions={
          userRole === 'YAZAR' && (
            <button 
              onClick={() => setShowForm(!showForm)}
              className="px-6 py-3 bg-white text-slate-900 rounded-xl font-bold text-sm hover:bg-slate-100 hover:scale-105 transition-all shadow-lg flex items-center gap-2"
            >
              <PlusCircle className="w-5 h-5" />
              {showForm ? 'Formu Kapat' : 'Yeni Soru/İçerik Ekle'}
            </button>
          )
        }
      />

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Yeni Soru Girişi</h3>
          <div className="mb-6">
            <label className="block text-sm font-bold text-slate-700 mb-2">Soru Metni / İçerik Editörü</label>
            <div className="border border-slate-200 rounded-xl overflow-hidden focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-500 transition-all bg-white">
              {/* Toolbar */}
              <div className="flex items-center gap-1 p-2 border-b border-slate-100 bg-slate-50/50 flex-wrap">
                <button type="button" className="p-1.5 text-slate-500 hover:bg-white hover:text-slate-800 rounded-lg hover:shadow-sm transition-all" title="Kalın"><Bold className="w-4 h-4" /></button>
                <button type="button" className="p-1.5 text-slate-500 hover:bg-white hover:text-slate-800 rounded-lg hover:shadow-sm transition-all" title="İtalik"><Italic className="w-4 h-4" /></button>
                <button type="button" className="p-1.5 text-slate-500 hover:bg-white hover:text-slate-800 rounded-lg hover:shadow-sm transition-all" title="Altı Çizili"><Underline className="w-4 h-4" /></button>
                <div className="w-px h-4 bg-slate-200 mx-1"></div>
                <button type="button" className="p-1.5 text-slate-500 hover:bg-white hover:text-slate-800 rounded-lg hover:shadow-sm transition-all" title="Madde İşaretleri"><List className="w-4 h-4" /></button>
                <button type="button" className="p-1.5 text-slate-500 hover:bg-white hover:text-slate-800 rounded-lg hover:shadow-sm transition-all" title="Numaralandırma"><ListOrdered className="w-4 h-4" /></button>
                <div className="w-px h-4 bg-slate-200 mx-1"></div>
                <button type="button" className="p-1.5 text-slate-500 hover:bg-white hover:text-slate-800 rounded-lg hover:shadow-sm transition-all" title="Görsel Ekle"><ImageIcon className="w-4 h-4" /></button>
                <button type="button" className="p-1.5 text-slate-500 hover:bg-white hover:text-slate-800 rounded-lg hover:shadow-sm transition-all" title="Matematik Formülü (LaTeX)"><Sigma className="w-4 h-4" /></button>
                <button type="button" className="p-1.5 text-slate-500 hover:bg-white hover:text-slate-800 rounded-lg hover:shadow-sm transition-all" title="Bağlantı"><Link className="w-4 h-4" /></button>
                
                <div className="flex-1"></div>
                
                <button 
                  type="button" 
                  onClick={handleAIGenerate}
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg hover:shadow-md transition-all text-xs font-bold disabled:opacity-70 disabled:cursor-not-allowed" 
                  title="Yapay Zeka ile Soru Üret (API Entegreli)"
                >
                  {isGenerating ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  {isGenerating ? 'Üretiliyor...' : 'Yapay Zeka ile Üret'}
                </button>
              </div>
              
              <textarea
                required
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="w-full px-4 py-3 focus:outline-none resize-none h-40 text-slate-700 leading-relaxed"
                placeholder="Matematik, Fen formüllerini veya düz metinleri buraya yazın..."
              />
              <div className="bg-slate-50/50 px-3 py-1.5 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-medium">
                <span>{newContent.length} Karakter</span>
                <span>Pro Lig Editör v2.0</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Sınıf</label>
              <select value={newGrade} onChange={e => setNewGrade(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden">
                <option>5. Sınıf</option>
                <option>6. Sınıf</option>
                <option>7. Sınıf</option>
                <option>8. Sınıf</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Kazanım Kodu</label>
              <input type="text" placeholder="Örn: M.8.1.2" value={newObjective} onChange={e => setNewObjective(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Zorluk</label>
              <select value={newDifficulty} onChange={e => setNewDifficulty(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden">
                <option>Kolay</option>
                <option>Orta</option>
                <option>Zor</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg">İptal</button>
            <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Kaydet ve Onaya Gönder</button>
          </div>
        </form>
      )}

      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center items-center">
            <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          </div>
        ) : questions.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Pencil className="w-8 h-8 text-slate-300" />
            </div>
            <p className="font-medium text-sm">Henüz hiç soru eklenmemiş.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100/80">
            {questions.map((q, index) => (
              <motion.div 
                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
                key={q.id} 
                className="p-6 hover:bg-slate-50/80 transition-all border-b border-slate-100 last:border-0 group relative overflow-hidden"
              >
                {/* Sol vurgu çizgisi */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 opacity-0 group-hover:opacity-100 transition-opacity ${
                  q.status === 'ONAYLANDI' ? 'bg-emerald-500' : 
                  q.status === 'REDDEDILDI' ? 'bg-rose-500' : 
                  'bg-amber-500'
                }`} />

                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase shadow-sm border
                      ${q.status === 'ONAYLANDI' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-emerald-500/10' : 
                        q.status === 'REDDEDILDI' ? 'bg-rose-50 text-rose-700 border-rose-200 shadow-rose-500/10' : 
                        'bg-amber-50 text-amber-700 border-amber-200 shadow-amber-500/10'}`}
                    >
                      {q.status}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      {new Date(q.createdAt).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                  
                  {/* EDITÖR AKSİYONLARI */}
                  {userRole !== 'YAZAR' && (
                    <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                      {q.status === 'ONAYLANDI' ? (
                        <button 
                          onClick={() => handleUpdateStatus(q.id, 'TASLAK')} 
                          className="px-3 py-1.5 text-xs font-bold text-slate-500 bg-white border border-slate-200 shadow-sm hover:bg-slate-50 hover:text-slate-800 rounded-lg flex items-center gap-1.5 transition-all hover:shadow-md" 
                          title="Onayı Geri Al"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Geri Al
                        </button>
                      ) : (
                        <>
                          <button onClick={() => startEditing(q)} className="p-2 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl transition-colors" title="Soruyu Düzenle">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleUpdateStatus(q.id, 'ONAYLANDI')} className="p-2 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors" title="Onayla">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleUpdateStatus(q.id, 'REVIZYON')} className="p-2 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded-xl transition-colors" title="Revizyon İste">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleUpdateStatus(q.id, 'REDDEDILDI')} className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors" title="Reddet">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                
                {editingId === q.id ? (
                  <div className="mt-2 space-y-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y min-h-[100px]"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Kazanım Kodu</label>
                        <input type="text" value={editObjective} onChange={(e) => setEditObjective(e.target.value)} className="w-full p-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Sınıf</label>
                        <select value={editGrade} onChange={(e) => setEditGrade(e.target.value)} className="w-full p-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500">
                          <option>5. Sınıf</option>
                          <option>6. Sınıf</option>
                          <option>7. Sınıf</option>
                          <option>8. Sınıf</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Zorluk</label>
                        <select value={editDifficulty} onChange={(e) => setEditDifficulty(e.target.value)} className="w-full p-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500">
                          <option>Kolay</option>
                          <option>Orta</option>
                          <option>Zor</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button onClick={() => setEditingId(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">İptal</button>
                      <button onClick={() => handleUpdateContent(q.id)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Kaydet</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{q.content}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {q.grade && <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md border border-slate-200">{q.grade}</span>}
                      {q.objectiveCode && <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-md border border-indigo-100">{q.objectiveCode}</span>}
                      {q.difficulty && <span className="px-2 py-1 bg-orange-50 text-orange-700 text-xs rounded-md border border-orange-100">{q.difficulty}</span>}
                    </div>
                  </>
                )}
                {q.editorNote && (
                  <div className="mt-4 p-3 bg-red-50 text-red-800 text-sm rounded-lg border border-red-100">
                    <span className="font-semibold">Editör Notu:</span> {q.editorNote}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
