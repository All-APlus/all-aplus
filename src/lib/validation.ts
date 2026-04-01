// 입력 검증 유틸리티

const MAX_MESSAGE_LENGTH = 10_000;
const MAX_TOPIC_LENGTH = 200;

/** 채팅 메시지 검증 */
export function validateMessage(message: string): { valid: boolean; error?: string } {
  if (!message || typeof message !== 'string') {
    return { valid: false, error: '메시지가 비어있습니다' };
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return { valid: false, error: `메시지는 ${MAX_MESSAGE_LENGTH}자 이하로 입력해주세요` };
  }
  return { valid: true };
}

/** 주제/제목 검증 */
export function validateTopic(topic: string): string {
  if (!topic || typeof topic !== 'string') return '';
  return topic.trim().slice(0, MAX_TOPIC_LENGTH);
}

/** 사용자 메시지를 시스템 프롬프트 인젝션으로부터 방어 */
export function wrapUserMessage(message: string): string {
  return `<user_message>\n${message}\n</user_message>`;
}

/** YouTube URL 화이트리스트 검증 */
export function validateYouTubeUrl(url: string): { valid: boolean; error?: string } {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL이 비어있습니다' };
  }

  try {
    const parsed = new URL(url);
    const allowedHosts = ['www.youtube.com', 'youtube.com', 'youtu.be', 'm.youtube.com'];
    if (!allowedHosts.includes(parsed.hostname)) {
      return { valid: false, error: 'YouTube URL만 허용됩니다' };
    }
    return { valid: true };
  } catch {
    // URL 파싱 실패 → 11자리 video ID 직접 입력일 수 있음
    if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) {
      return { valid: true };
    }
    return { valid: false, error: '유효한 URL 형식이 아닙니다' };
  }
}

/** 파일명 sanitization (경로 탈출 방지) */
export function sanitizeFileName(name: string): string {
  return name
    .replace(/[/\\:*?"<>|]/g, '_')
    .replace(/\.\./g, '_')
    .slice(0, 255);
}

/** UUID 형식 검증 */
export function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}
