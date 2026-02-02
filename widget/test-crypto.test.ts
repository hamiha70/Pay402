// Quick test: Does jsdom support the browser APIs we need?
import { describe, it, expect } from 'vitest';

describe('Browser API Support in jsdom', () => {
  it('should support atob()', () => {
    const result = atob('aGVsbG8='); // "hello" in base64
    expect(result).toBe('hello');
  });

  it('should support btoa()', () => {
    const result = btoa('hello');
    expect(result).toBe('aGVsbG8=');
  });

  it('should support Uint8Array', () => {
    const arr = new Uint8Array([1, 2, 3]);
    expect(arr.length).toBe(3);
    expect(arr[0]).toBe(1);
  });

  it('should support crypto.subtle.digest', async () => {
    const encoder = new TextEncoder();
    const data = encoder.encode('test');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // SHA-256 of "test"
    expect(hashHex).toBe('9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08');
  });
});
