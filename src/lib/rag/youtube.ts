import { YoutubeTranscript } from 'youtube-transcript';

export interface YouTubeResult {
  videoId: string;
  title: string;
  text: string;
}

const VIDEO_ID_RE = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i;

export function extractVideoId(url: string): string | null {
  if (url.length === 11 && /^[a-zA-Z0-9_-]+$/.test(url)) return url;
  const match = url.match(VIDEO_ID_RE);
  return match?.[1] ?? null;
}

export async function fetchYouTubeTranscript(url: string): Promise<YouTubeResult> {
  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error('유효한 YouTube URL이 아닙니다');
  }

  const segments = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'ko' })
    .catch(() => YoutubeTranscript.fetchTranscript(videoId));

  if (!segments || segments.length === 0) {
    throw new Error('자막을 찾을 수 없습니다. 자막이 있는 영상인지 확인해주세요.');
  }

  const text = segments.map((s) => s.text).join(' ');
  const title = `YouTube: ${videoId}`;

  return { videoId, title, text };
}
