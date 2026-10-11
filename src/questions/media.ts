export function getQuestionVideoEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const videoId = parsed.searchParams.get('v')
        || parsed.pathname.match(/^\/(?:embed|shorts)\/([A-Za-z0-9_-]{6,})/)?.[1];
      return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : null;
    }

    if (host === 'youtu.be') {
      const videoId = parsed.pathname.split('/').filter(Boolean)[0];
      return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : null;
    }

    if (host === 'vimeo.com') {
      const videoId = parsed.pathname.match(/^\/(\d+)/)?.[1];
      return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
    }

    if (host === 'player.vimeo.com') {
      const videoId = parsed.pathname.match(/^\/video\/(\d+)/)?.[1];
      return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
    }

    if (host === 'dailymotion.com') {
      const videoId = parsed.pathname.match(/^\/video\/([A-Za-z0-9]+)/)?.[1];
      return videoId ? `https://www.dailymotion.com/embed/video/${videoId}` : null;
    }

    if (host === 'dai.ly') {
      const videoId = parsed.pathname.split('/').filter(Boolean)[0];
      return videoId ? `https://www.dailymotion.com/embed/video/${videoId}` : null;
    }

    return null;
  } catch {
    return null;
  }
}

export function questionVideoProviderLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    if (host.includes('youtube') || host === 'youtu.be') return 'YouTube';
    if (host.includes('vimeo')) return 'Vimeo';
    if (host.includes('dailymotion') || host === 'dai.ly') return 'Dailymotion';
    return 'Video';
  } catch {
    return 'Video';
  }
}
