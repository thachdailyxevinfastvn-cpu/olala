/**
 * Gemini OCR & Intelligent Image Compressor Package
 * Trọn gói module nén ảnh thông minh & OCR Gemini tốc độ cao
 */

export * from './types';
export * from './compressor';
export * from './gemini-client';

import { GeminiOCRClient } from './gemini-client';
import { GeminiOCRConfig } from './types';

/**
 * Hàm khởi tạo nhanh một instance GeminiOCRClient
 * @param config Cấu hình API keys, models, timeout, options
 */
export function createGeminiOCRClient(config: GeminiOCRConfig): GeminiOCRClient {
  return new GeminiOCRClient(config);
}
