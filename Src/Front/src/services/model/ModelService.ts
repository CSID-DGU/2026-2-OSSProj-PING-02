// 온디바이스 AI 모델 인터페이스
// - getLatest: GET /v1/models/latest (버전·크기·다운로드 URL)
// - startDownload: Kotlin 네이티브 모듈(DownloadManager/WorkManager)로 교체
//   화면을 벗어나도 계속 받아야 하므로 진행률은 콜백으로 전달

export interface ModelInfo {
  version: string;
  sizeBytes: number;
}

export interface DownloadProgress {
  receivedBytes: number;
  totalBytes: number;
}

export interface DownloadTask {
  // 다 받으면 resolve, 실패하면 reject (cancel 시 MODEL_DOWNLOAD_CANCELED로 reject)
  done: Promise<void>;
  cancel(): void;
}

export const MODEL_ERROR_CODE = {
  downloadFailed: "MODEL_DOWNLOAD_FAILED",
  canceled: "MODEL_DOWNLOAD_CANCELED",
} as const;

export interface ModelService {
  getLatest(): Promise<ModelInfo>;
  isInstalled(version: string): Promise<boolean>;
  startDownload(
    info: ModelInfo,
    onProgress: (progress: DownloadProgress) => void
  ): DownloadTask;
}
