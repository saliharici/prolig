import React, { useState, useEffect } from 'react';
import { PlusCircle, Edit3, CheckCircle, XCircle, RotateCcw, Pencil } from 'lucide-react';
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
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: newContent,
          objectiveCode: newObjective,
          grade: newGrade,
          difficulty: newDifficulty,
          // Geçici mock authorId, pool sisteminde projectId zorunlu değil
          authorId: 1
        })
      });
      if (res.ok) {
        setShowForm(false);
        setNewContent('');
        fetchQuestions();
      }
    } catch (err) {
      console.error(err);
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
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Soru Metni</label>
            <textarea
              required
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none h-32"
              placeholder="Sorunuzun metnini buraya yazın..."
            />
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

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Yükleniyor...</div>
        ) : questions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Henüz hiç soru eklenmemiş.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {questions.map((q, index) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                key={q.id} 
                className="p-6 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium 
                      ${q.status === 'ONAYLANDI' ? 'bg-green-100 text-green-700' : 
                        q.status === 'REDDEDILDI' ? 'bg-red-100 text-red-700' : 
                        'bg-yellow-100 text-yellow-700'}`}
                    >
                      {q.status}
                    </span>
                    <span className="text-xs text-gray-400">{new Date(q.createdAt).toLocaleDateString('tr-TR')}</span>
                  </div>
                  
                  {/* EDITÖR AKSİYONLARI */}
                  {userRole !== 'YAZAR' && (
                    <div className="flex items-center gap-2">
                      {q.status === 'ONAYLANDI' ? (
                        <button 
                          onClick={() => handleUpdateStatus(q.id, 'TASLAK')} 
                          className="px-3 py-1.5 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 hover:text-slate-700 rounded-lg flex items-center gap-1.5 transition-colors" 
                          title="Onayı Geri Al"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Geri Al
                        </button>
                      ) : (
                        <>
                          <button onClick={() => startEditing(q)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Soruyu Düzenle">
                            <Pencil className="w-5 h-5" />
                          </button>
                          <button onClick={() => handleUpdateStatus(q.id, 'ONAYLANDI')} className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Onayla">
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button onClick={() => handleUpdateStatus(q.id, 'REVIZYON')} className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg" title="Revizyon İste">
                            <Edit3 className="w-5 h-5" />
                          </button>
                          <button onClick={() => handleUpdateStatus(q.id, 'REDDEDILDI')} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Reddet">
                            <XCircle className="w-5 h-5" />
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
