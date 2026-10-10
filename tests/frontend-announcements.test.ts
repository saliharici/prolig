import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  changeAnnouncementState, createAnnouncement, fetchAnnouncement,
  fetchAnnouncements, updateAnnouncement
} from '../src/announcements/api';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);
afterEach(()=>fetchMock.mockReset());

describe('announcement frontend', () => {
  it('uses consolidated announcement routes', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok:true, json:async()=>({ announcements:[], counts:{active:0,archived:0,unread:0}, canPublish:true, audiences:['Tümü'] }) })
      .mockResolvedValueOnce({ ok:true, json:async()=>({ announcement:{id:1}, unread:0 }) })
      .mockResolvedValueOnce({ ok:true, json:async()=>({ announcement:{id:2}, unread:1 }) })
      .mockResolvedValueOnce({ ok:true, json:async()=>({ announcement:{id:2}, unread:1 }) })
      .mockResolvedValueOnce({ ok:true, json:async()=>({ announcement:{id:2}, unread:0 }) });

    await fetchAnnouncements('active');
    await fetchAnnouncement(1);
    await createAnnouncement({ title:'Teslim Takvimi', content:'Bilginize.', priority:'Yuksek', audience:'Yazarlar' });
    await updateAnnouncement(2,{ title:'Yeni Başlık', content:'Güncel içerik', priority:'Normal', audience:'Yazarlar' });
    await changeAnnouncementState(2,'archive');

    expect(fetchMock).toHaveBeenNthCalledWith(1,'/api/v1/announcements?box=active',{credentials:'include'});
    expect(fetchMock).toHaveBeenNthCalledWith(2,'/api/v1/announcements/1',{credentials:'include'});
    expect(fetchMock).toHaveBeenNthCalledWith(3,'/api/v1/announcements',expect.objectContaining({method:'POST'}));
    expect(fetchMock).toHaveBeenNthCalledWith(4,'/api/v1/announcements/2',expect.objectContaining({method:'PATCH'}));
    expect(fetchMock).toHaveBeenNthCalledWith(5,'/api/v1/announcements/2',expect.objectContaining({method:'PATCH'}));
  });

  it('exposes announcements, filters, publishing and archive without delete', () => {
    const app=fs.readFileSync(path.join(__dirname,'../src/DemoApp.tsx'),'utf8');
    const center=fs.readFileSync(path.join(__dirname,'../src/announcements/AnnouncementCenter.tsx'),'utf8');
    const model=fs.readFileSync(path.join(__dirname,'../src/demo/model.ts'),'utf8');
    const vercel=fs.readFileSync(path.join(__dirname,'../vercel.json'),'utf8');

    expect(model).toContain("announcements: 'Duyurular'");
    expect(app).toContain("{ id: 'announcements', icon: Megaphone }");
    expect(app).toContain('announcementUnreadCount');
    expect(app).toContain('<AnnouncementCenter onUnreadChange={setAnnouncementUnreadCount}');
    expect(center).toContain('Yeni Duyuru');
    expect(center).toContain('Tüm öncelikler');
    expect(center).toContain('Arşivden Çıkar');
    expect(center).toContain('Duyuruyu Yayınla');
    expect(center).not.toContain('deleteAnnouncement');
    expect(vercel).toContain('/api/v1/announcements/:id');
    expect(vercel).toContain('management?action=announcement&id=:id');
  });
});
