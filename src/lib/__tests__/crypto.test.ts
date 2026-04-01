import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { encrypt, decrypt, createKeyHint } from '@/lib/crypto';

const VALID_KEY_HEX = 'a'.repeat(64); // 32바이트 hex

describe('crypto', () => {
  beforeEach(() => {
    process.env.ENCRYPTION_KEY = VALID_KEY_HEX;
  });

  afterEach(() => {
    delete process.env.ENCRYPTION_KEY;
  });

  describe('encrypt', () => {
    it('평문을 iv:authTag:ciphertext 형식의 hex 문자열로 반환한다', () => {
      const result = encrypt('hello');
      const parts = result.split(':');
      expect(parts).toHaveLength(3);
      // iv: 12바이트 = 24 hex chars
      expect(parts[0]).toHaveLength(24);
      // authTag: 16바이트 = 32 hex chars
      expect(parts[1]).toHaveLength(32);
      // ciphertext: 비어있지 않음
      expect(parts[2].length).toBeGreaterThan(0);
    });

    it('같은 평문을 두 번 암호화하면 서로 다른 결과가 나온다 (랜덤 IV)', () => {
      const a = encrypt('same text');
      const b = encrypt('same text');
      expect(a).not.toBe(b);
    });

    it('빈 문자열도 암호화할 수 있다', () => {
      const result = encrypt('');
      expect(result.split(':')).toHaveLength(3);
    });

    it('ENCRYPTION_KEY 환경변수가 없으면 에러를 던진다', () => {
      delete process.env.ENCRYPTION_KEY;
      expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY');
    });
  });

  describe('decrypt', () => {
    it('암호화한 값을 복호화하면 원래 평문을 반환한다', () => {
      const plaintext = 'sk-test-api-key-12345';
      const encrypted = encrypt(plaintext);
      expect(decrypt(encrypted)).toBe(plaintext);
    });

    it('한글 문자열도 암복호화가 정확히 동작한다', () => {
      const plaintext = '테스트 API 키 값입니다';
      expect(decrypt(encrypt(plaintext))).toBe(plaintext);
    });

    it('특수문자가 포함된 문자열도 암복호화가 정확히 동작한다', () => {
      const plaintext = 'key:with:colons:and!special@chars';
      expect(decrypt(encrypt(plaintext))).toBe(plaintext);
    });

    it('긴 문자열도 암복호화가 정확히 동작한다', () => {
      const plaintext = 'x'.repeat(1000);
      expect(decrypt(encrypt(plaintext))).toBe(plaintext);
    });

    it('잘못된 형식의 암호문은 에러를 던진다', () => {
      expect(() => decrypt('invalid')).toThrow();
    });
  });

  describe('createKeyHint', () => {
    it('8자 초과 키는 앞4자...뒤4자 형식을 반환한다', () => {
      expect(createKeyHint('sk-abcdefghij1234')).toBe('sk-a...1234');
    });

    it('정확히 8자인 키는 ****를 반환한다', () => {
      expect(createKeyHint('12345678')).toBe('****');
    });

    it('8자 미만인 키는 ****를 반환한다', () => {
      expect(createKeyHint('short')).toBe('****');
    });

    it('빈 문자열은 ****를 반환한다', () => {
      expect(createKeyHint('')).toBe('****');
    });

    it('9자 키는 앞4자...뒤4자를 반환한다', () => {
      const result = createKeyHint('123456789');
      expect(result).toBe('1234...6789');
    });
  });
});
