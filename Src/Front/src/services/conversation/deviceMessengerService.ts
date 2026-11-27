import { LINKED_APP_OPTIONS } from "@constants/onboarding";
import type { MessengerNative } from "@native/Messenger";
import { ServiceError } from "../common";
import {
  CONVERSATION_ERROR_CODE,
  type MessengerService,
} from "./ConversationService";
import { parseConversationKey } from "./deviceConversationService";
import type { MessengerApp } from "./types";

// 복사하고 메신저 열기 (#69). Kotlin Messenger 모듈로 클립보드·앱 열기
// 앱 여는 순서
// 1. 대화방에서 왔으면 그 알림을 보낸 앱으로, 알림에 담긴 동작이 남아 있으면 그 대화방을 바로 염
// 2. 대화방 동작이 없으면 그 앱의 첫 화면
// 3. 대화방을 모르면(친구에게 첫마디) 문자는 기기의 기본 문자 앱, 나머지는 연동 앱 패키지(LINKED_APP_OPTIONS)
// 알림 바로 답장(RemoteInput)은 정책 확인 전이라 아직 없음 → 바로 보내기 버튼은 숨겨짐

const DEFAULT_PACKAGES = Object.fromEntries(
  LINKED_APP_OPTIONS.map(o => [o.value, o.packageName])
) as Record<MessengerApp, string>;

const roomOf = (conversationId: string) => {
  try {
    return parseConversationKey(conversationId);
  } catch {
    return null; // mock 대화 id 등 기기 대화방 키가 아님
  }
};

export const createDeviceMessengerService = (
  native: MessengerNative
): MessengerService => {
  const launch = async (packageName: string) => {
    try {
      await native.openApp(packageName);
    } catch {
      throw new ServiceError(
        CONVERSATION_ERROR_CODE.appNotInstalled,
        "앱을 열 수 없습니다."
      );
    }
  };

  const defaultPackage = async (app: MessengerApp) => {
    if (app === "SMS") {
      const sms = await native.getDefaultSmsPackage().catch(() => null);
      if (sms) return sms;
    }
    return DEFAULT_PACKAGES[app];
  };

  return {
    async copyText(text) {
      try {
        await native.copyText(text);
      } catch {
        throw new ServiceError(
          CONVERSATION_ERROR_CODE.copyFailed,
          "복사하지 못했습니다."
        );
      }
    },

    async openApp(app, conversationId) {
      const room = conversationId ? roomOf(conversationId) : null;
      if (room) {
        const opened = await native
          .openConversation(room.packageName, room.conversationId)
          .catch(() => false);
        if (opened) return;
        try {
          return await launch(room.packageName);
        } catch {
          // 그 앱이 지워졌으면 아래에서 같은 종류의 기본 앱을 열어 봄
        }
      }
      await launch(await defaultPackage(app));
    },

    async canReplyDirectly() {
      return false;
    },

    async sendReply() {
      throw new ServiceError(
        CONVERSATION_ERROR_CODE.replyUnavailable,
        "여기서 바로 보낼 수 없습니다."
      );
    },
  };
};
