import { delay, ServiceError } from "../common";
import {
  MODEL_ERROR_CODE,
  type ModelInfo,
  type ModelService,
} from "./ModelService";

interface MockModelOptions {
  // 0~1. 지정하면 첫 시도가 이 지점에서 실패 (재시도 화면 확인용)
  failFirstAttemptAt?: number;
  durationMs?: number;
}

const MOCK_MODEL: ModelInfo = {
  version: "0.1.0-mock",
  sizeBytes: 1.2 * 1024 * 1024 * 1024,
};

const TICK_MS = 200;

export const createMockModelService = ({
  failFirstAttemptAt,
  durationMs = 12000,
}: MockModelOptions = {}): ModelService => {
  let installed: string | null = null;
  let attempts = 0;

  return {
    async getLatest() {
      await delay(500);
      return MOCK_MODEL;
    },

    async isInstalled(version) {
      return installed === version;
    },

    startDownload(info, onProgress) {
      attempts += 1;
      const failAt = attempts === 1 ? failFirstAttemptAt : undefined;
      const step = info.sizeBytes / (durationMs / TICK_MS);
      let received = 0;
      let timer: ReturnType<typeof setInterval> | undefined;
      let rejectTask: (error: Error) => void = () => {};

      const done = new Promise<void>((resolve, reject) => {
        rejectTask = reject;
        timer = setInterval(() => {
          received = Math.min(received + step, info.sizeBytes);
          onProgress({ receivedBytes: received, totalBytes: info.sizeBytes });

          if (failAt !== undefined && received / info.sizeBytes >= failAt) {
            clearInterval(timer);
            reject(
              new ServiceError(
                MODEL_ERROR_CODE.downloadFailed,
                "네트워크 연결이 끊겼습니다."
              )
            );
            return;
          }
          if (received >= info.sizeBytes) {
            clearInterval(timer);
            installed = info.version;
            resolve();
          }
        }, TICK_MS);
      });

      return {
        done,
        cancel() {
          clearInterval(timer);
          rejectTask(
            new ServiceError(MODEL_ERROR_CODE.canceled, "다운로드를 취소했습니다.")
          );
        },
      };
    },
  };
};
