/**
 * Types definition for Gemini OCR & Image Compressor Package
 */

export type ScanStep = 'idle' | 'compressing' | 'ai_analyzing' | 'parsing' | 'done' | 'error';

export interface ScanProgressInfo {
  step: ScanStep;
  message: string;
  originalSize?: string;
  compressedSize?: string;
  elapsedMs?: number;
}

export interface CompressOptions {
  /** Chiều rộng tối ưu cho văn bản OCR (mặc định 1080px) */
  targetWidth?: number;
  /** Chất lượng nén JPEG từ 0.1 đến 1.0 (mặc định 0.82) */
  quality?: number;
  /** Tự động tăng độ tương phản nhẹ cho text mờ (mặc định true) */
  enhanceContrast?: boolean;
}

export interface CompressedImageResult {
  base64Data: string;
  mimeType: string;
  width: number;
  height: number;
  originalSizeStr: string;
  compressedSizeStr: string;
  originalBytes: number;
  compressedBytes: number;
  compressionRatio: string;
  durationMs: number;
}

export interface GeminiOCRConfig {
  /** Danh sách API Keys miễn phí để xoay vòng (Round-Robin) */
  apiKeys: string[];
  /** Key trả phí dự phòng (Chỉ kích hoạt khi TẤT CẢ key miễn phí đều bị giới hạn/quá tải) */
  paidKey?: string;
  /** Danh sách models ưu tiên thử nghiệm */
  models?: string[];
  /** Thời gian timeout cho mỗi request tính bằng mili-giây */
  timeoutMs?: number;
  /** Tùy chọn nén ảnh */
  compressOptions?: CompressOptions;
}

export interface JSONSchemaDefinition {
  type: 'object' | 'array' | 'string' | 'number' | 'integer' | 'boolean';
  description?: string;
  properties?: Record<string, JSONSchemaDefinition>;
  items?: JSONSchemaDefinition;
  required?: string[];
}
