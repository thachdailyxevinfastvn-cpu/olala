/**
 * Resilient & High-Speed Gemini Vision OCR Client
 * - Hỗ trợ danh sách API Keys tự động xoay vòng và fallback khi gặp rate-limit 429.
 * - Hỗ trợ Strict JSON Schema (responseSchema) để loại bỏ 100% lỗi parse markdown.
 * - Hỗ trợ tiến trình thời gian thực (Progress Callbacks).
 */

import { compressImageForOCR } from './compressor';
import {
  GeminiOCRConfig,
  JSONSchemaDefinition,
  ScanProgressInfo
} from './types';

export class GeminiOCRClient {
  private apiKeys: string[];
  private models: string[];
  private timeoutMs: number;
  private currentKeyIndex: number = 0;
  private config: GeminiOCRConfig;

  constructor(config: GeminiOCRConfig) {
    if (!config.apiKeys || config.apiKeys.length === 0) {
      throw new Error('[GeminiOCR] apiKeys list must not be empty.');
    }
    this.config = config;
    this.apiKeys = [...config.apiKeys];
    // Model ưu tiên thế hệ mới: gemini-3.6-flash, gemini-3.5-flash, gemini-flash-latest
    this.models = config.models || ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-flash-latest'];
    this.timeoutMs = config.timeoutMs || 8000;
    this.currentKeyIndex = Math.floor(Math.random() * this.apiKeys.length);
  }

  /**
   * Trích xuất dữ liệu từ tệp ảnh bằng Gemini Vision API
   * @param imageFile Tệp ảnh (File hoặc Blob)
   * @param prompt Câu lệnh yêu cầu AI phân tích
   * @param schema JSON Schema định nghĩa cấu trúc dữ liệu trả về (tùy chọn)
   * @param onProgress Callback thông báo tiến trình cho giao diện
   */
  async extractFromImage<T = any>(
    imageFile: File | Blob,
    prompt: string,
    schema?: JSONSchemaDefinition,
    onProgress?: (info: ScanProgressInfo) => void
  ): Promise<T> {
    const startTime = performance.now();

    // Bước 1: Nén ảnh
    onProgress?.({
      step: 'compressing',
      message: '🗜️ Đang nén tối ưu ảnh cho bộ đọc AI...'
    });

    const compressed = await compressImageForOCR(
      imageFile,
      this.config.compressOptions
    );

    onProgress?.({
      step: 'ai_analyzing',
      message: '🤖 AI Vision đang đọc & trích xuất dữ liệu...',
      originalSize: compressed.originalSizeStr,
      compressedSize: compressed.compressedSizeStr,
      elapsedMs: Math.round(performance.now() - startTime)
    });

    // Bước 2: Chuẩn bị Payload
    const generationConfig: Record<string, any> = {
      responseMimeType: 'application/json',
      temperature: 0.1 // Thấp để kết quả đọc số liệu chính xác tuyệt đối
    };

    if (schema) {
      generationConfig.responseSchema = schema;
    }

    const payload = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: compressed.mimeType,
                data: compressed.base64Data
              }
            }
          ]
        }
      ],
      generationConfig
    };

    // Bước 3: Gọi API với cơ chế Xoay vòng Keys & Fallback Models
    let lastError: any = null;
    const totalKeys = this.apiKeys.length;

    for (let keyAttempt = 0; keyAttempt < totalKeys; keyAttempt++) {
      const apiKey = this.apiKeys[this.currentKeyIndex];
      this.currentKeyIndex = (this.currentKeyIndex + 1) % totalKeys;

      for (const model of this.models) {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal
          });
          clearTimeout(timer);

          // Nếu gặp lỗi rate limit (429) hoặc server quá tải (503), thử ngay key khác
          if (!response.ok) {
            const errStatus = response.status;
            console.warn(`[GeminiOCR] Status ${errStatus} on model ${model} with key #${keyAttempt + 1}. Trying next...`);
            lastError = new Error(`HTTP Error ${errStatus}: ${response.statusText}`);
            continue;
          }

          const data = await response.json();
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

          if (!rawText) {
            console.warn(`[GeminiOCR] Empty text in response from ${model}`);
            continue;
          }

          onProgress?.({
            step: 'parsing',
            message: '📊 Đang định dạng dữ liệu trả về...',
            originalSize: compressed.originalSizeStr,
            compressedSize: compressed.compressedSizeStr,
            elapsedMs: Math.round(performance.now() - startTime)
          });

          // Bóc tách JSON an toàn
          const parsedData = this.parseCleanJson<T>(rawText);

          onProgress?.({
            step: 'done',
            message: '✅ Đã trích xuất dữ liệu thành công!',
            originalSize: compressed.originalSizeStr,
            compressedSize: compressed.compressedSizeStr,
            elapsedMs: Math.round(performance.now() - startTime)
          });

          return parsedData;
        } catch (fetchErr: any) {
          clearTimeout(timer);
          lastError = fetchErr;
          console.warn(`[GeminiOCR] Fetch error on model ${model}:`, fetchErr?.message || fetchErr);
        }
      }
    }

    onProgress?.({
      step: 'error',
      message: '❌ Không thể kết nối hoặc trích xuất số liệu từ AI.',
      originalSize: compressed.originalSizeStr,
      compressedSize: compressed.compressedSizeStr,
      elapsedMs: Math.round(performance.now() - startTime)
    });

    throw lastError || new Error('Tất cả các API Keys hoặc Models đều không thể phản hồi.');
  }

  /** Bóc tách JSON sạch sẽ phòng trường hợp AI vẫn kẹp markdown */
  private parseCleanJson<T>(rawText: string): T {
    let clean = rawText.trim();
    clean = clean.replace(/```json|```/g, '').trim();

    const firstSquare = clean.indexOf('[');
    const lastSquare = clean.lastIndexOf(']');
    const firstCurly = clean.indexOf('{');
    const lastCurly = clean.lastIndexOf('}');

    if (firstSquare !== -1 && lastSquare !== -1 && (firstCurly === -1 || firstSquare < firstCurly)) {
      clean = clean.substring(firstSquare, lastSquare + 1);
    } else if (firstCurly !== -1 && lastCurly !== -1) {
      clean = clean.substring(firstCurly, lastCurly + 1);
    }

    return JSON.parse(clean) as T;
  }
}
