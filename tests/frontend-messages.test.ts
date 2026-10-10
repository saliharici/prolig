import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  changeMessageState, fetchMessage, fetchMessageRecipients, fetchMessages, sendMessage
} from '../src/messages/api';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);
afterEach(()=>fetchMock.mockReset());

describe('message center frontend', () => {
  it('uses consolidated message routes', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async()=>({ messages: [], counts: { inbox:0, unread:0, archived:0, sent:0 } }) })
      .mockResolvedValueOnce({ ok: true, json: async()=>({ message: { id:1 }, counts: { inbox:1, unread:0, archived:0, sent:0 } }) })
      .mockResolvedValueOnce({ ok: true, json: async()=>({ recipients: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async()=>({ message: { id:2 }, counts: { inbox:0, unread:0, archived:0, sent:1 } }) })
      .mockResolvedValueOnce({ ok: true, json: async()=>({ message: { id:1 }, counts: { inbox:0, unread:0, archived:1, sent:0 } }) });

    await fetchMessages('inbox');
    await fetchMessage(1);
    await fetchMessageRecipients();
    await sendMessage({ receiverId: 2, subject: 'Teslim', body: 'Bilginize.' });
    await changeMessageState(1, 'archive');

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/v1/messages?box=inbox', { credentials:'include' });
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/v1/messages/1', { credentials:'include' });
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/v1/messages/recipients', { credentials:'include' });
    expect(fetchMock).toHaveBeenNthCalledWith(4, '/api/v1/messages', expect.objectContaining({ method:'POST' }));
    expect(fetchMock).toHaveBeenNthCalledWith(5, '/api/v1/messages/1', expect.objectContaining({ method:'PATCH' }));
  });

  it('exposes inbox sent archive reply unread badge and no delete UI', () => {
    const app=fs.readFileSync(path.join(__dirname,'../src/DemoApp.tsx'),'utf8');
    const center=fs.readFileSync(path.join(__dirname,'../src/messages/MessageCenter.tsx'),'utf8');
    const model=fs.readFileSync(path.join(__dirname,'../src/demo/model.ts'),'utf8');
    const vercel=fs.readFileSync(path.join(__dirname,'../vercel.json'),'utf8');

    expect(model).toContain("messages: 'Mesajlar'");
    expect(app).toContain("{ id: 'messages', icon: MessageSquareText }");
    expect(app).toContain('messageUnreadCount');
    expect(app).toContain("<MessageCenter onUnreadChange={setMessageUnreadCount}");
    expect(center).toContain('Gelen Kutusu');
    expect(center).toContain('Gönderilenler');
    expect(center).toContain('Arşiv');
    expect(center).toContain('Yanıtla');
    expect(center).toContain('Okunmadı İşaretle');
    expect(center).not.toContain('deleteMessage');
    expect(vercel).toContain('/api/v1/messages/recipients');
    expect(vercel).toContain('management?action=messageRecipients');
  });
});
