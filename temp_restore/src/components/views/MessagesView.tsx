import React, { useState, useEffect } from 'react';
import { Mail, Send, User, Clock, CheckCheck } from 'lucide-react';

export const MessagesView: React.FC = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const fetchMessages = () => {
    fetch('/api/messages')
      .then(res => res.json())
      .then(data => {
        setMessages(data || []);
        if (data && data.length > 0 && !selectedMessage) {
          setSelectedMessage(data[0]);
        }
        setLoading(false);
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedMessage) return;

    setSending(true);
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: 1, // Coordinator
          recipient_id: selectedMessage.sender_id || 2,
          subject: `Ynt: ${selectedMessage.subject}`,
          body: replyText,
        }),
      });
      setReplyText('');
      fetchMessages();
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Mesajlaşma ve İletişim</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Zümre başkanları, yazarlar ve yayın koordinatörleri arasındaki resmi yazışmalar
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 rounded-xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden min-h-[500px]">
        {/* Message Inbox List (5 cols) */}
        <div className="border-r border-slate-100 md:col-span-5 flex flex-col">
          <div className="p-3 border-b border-slate-100 bg-slate-50/50">
            <span className="text-xs font-bold text-slate-700">Gelen Kutusu ({messages.length})</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400">Mesajlar yükleniyor...</div>
            ) : messages.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">Gelen mesaj bulunmuyor.</div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  onClick={() => setSelectedMessage(m)}
                  className={`p-3.5 cursor-pointer transition-colors ${
                    selectedMessage?.id === m.id ? 'bg-blue-50/80' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {m.sender_name || 'Yayın Koordinatörü'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {m.created_at ? m.created_at.split(' ')[0] : 'Bugün'}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-blue-700 mt-0.5 truncate">{m.subject}</p>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{m.body}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Message Detail / Thread (7 cols) */}
        <div className="md:col-span-7 flex flex-col justify-between p-5">
          {selectedMessage ? (
            <>
              <div>
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-base font-bold text-slate-900">{selectedMessage.subject}</h3>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-xs">
                        {selectedMessage.sender_name ? selectedMessage.sender_name[0] : 'K'}
                      </div>
                      <span className="font-semibold text-slate-800">
                        {selectedMessage.sender_name || 'Koordinasyon Ekibi'}
                      </span>
                    </div>
                    <span>{selectedMessage.created_at || '2026-09-18'}</span>
                  </div>
                </div>

                <div className="py-4 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                  {selectedMessage.body}
                </div>
              </div>

              {/* Reply Box */}
              <form onSubmit={handleSendReply} className="pt-4 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Yanıt Yaz</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Yanıtınızı buraya yazın..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="flex-1 h-9 rounded-lg border border-slate-200 px-3 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                  />
                  <button
                    type="submit"
                    disabled={sending || !replyText.trim()}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Gönder</span>
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-slate-400">
              Görüntülemek için bir mesaj seçin.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
