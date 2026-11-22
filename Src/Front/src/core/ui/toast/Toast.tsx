import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AccessibilityInfo, Animated, StyleSheet } from "react-native";
import styled from "styled-components/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CheckIcon } from "../icon";

// Figma: 05 연락 Screens(11.22) Toast/토스트에셋, D04 "붙여넣기 성공!"
// 높이 52dp · 모서리 10dp · 좌우 14dp · 체크 원 20dp · 진한 갈색 배경 + 흰 글씨
// 시안 갈색(#4F3832)은 토큰에 없어 가장 가까운 actionPrimaryBg(brown700 #4D3932) 사용
export type ToastIcon = "success" | "none";

export interface ToastProps {
  message: string;
  icon?: ToastIcon;
}

// 화면 어디에든 직접 놓을 수 있는 토스트 모양 (보통은 useToast().show 사용)
export const Toast = ({ message, icon = "success" }: ToastProps) => (
  <Box accessibilityRole="alert" accessibilityLiveRegion="polite">
    {icon === "success" && (
      <IconCircle importantForAccessibility="no-hide-descendants">
        <CheckIcon size={14} />
      </IconCircle>
    )}
    <Message numberOfLines={2}>{message}</Message>
  </Box>
);

export interface ShowToastOptions {
  icon?: ToastIcon;
  duration?: number; // ms, 기본 2500
  // 화면 아래(안전 영역 위)에서 띄울 거리. 기본은 하단 탭바 위
  bottom?: number;
}

interface ToastContextValue {
  show: (message: string, options?: ShowToastOptions) => void;
  hide: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// 하단 탭바(64dp + 구분선) 위로 약 12dp 띄움 (시안 D04)
export const TOAST_DEFAULT_BOTTOM = 76;
const DEFAULT_DURATION = 2500;

interface Current {
  id: number;
  message: string;
  icon: ToastIcon;
  bottom: number;
}

// 앱 최상단에 한 번 두면 어느 화면에서나 useToast()로 띄움
export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState<Current | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const hide = useCallback(() => {
    clearTimer();
    Animated.timing(opacity, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setCurrent(null));
  }, [opacity]);

  const show = useCallback(
    (message: string, options: ShowToastOptions = {}) => {
      clearTimer();
      seq.current += 1;
      setCurrent({
        id: seq.current,
        message,
        icon: options.icon ?? "success",
        bottom: options.bottom ?? TOAST_DEFAULT_BOTTOM,
      });
      opacity.setValue(0);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
      // 스크린리더 사용자에게도 바로 읽어 줌
      AccessibilityInfo.announceForAccessibility(message);
      timer.current = setTimeout(hide, options.duration ?? DEFAULT_DURATION);
    },
    [hide, opacity]
  );

  useEffect(() => clearTimer, []);

  const value = useMemo(() => ({ show, hide }), [show, hide]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {current && (
        <Overlay
          key={current.id}
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { paddingBottom: insets.bottom + current.bottom, opacity },
          ]}
        >
          <Toast message={current.message} icon={current.icon} />
        </Overlay>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast는 ToastProvider 안에서 써야 해요");
  return ctx;
};

const Overlay = styled(Animated.View)`
  justify-content: flex-end;
  padding: 0px 18px;
`;

const Box = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 10px;
  min-height: 52px;
  padding: 12px 14px;
  border-radius: 10px;
  background-color: ${({ theme }) => theme.colors.actionPrimaryBg};
  /* 시안: 아래로 퍼지는 옅은 그림자 */
  shadow-color: ${({ theme }) => theme.colors.textPrimary};
  shadow-offset: 0px 4px;
  shadow-opacity: 0.16;
  shadow-radius: 8px;
  elevation: 6;
`;

// 체크 원: 시안의 옅은 갈색 원(#7A6560)은 토큰에 없어 brandBrown(brown600)으로
const IconCircle = styled.View`
  justify-content: center;
  align-items: center;
  width: 20px;
  height: 20px;
  border-radius: 10px;
  background-color: ${({ theme }) => theme.colors.brandBrown};
`;

const Message = styled.Text`
  flex-shrink: 1;
  ${({ theme }) => theme.fonts.bodyLarge};
  color: ${({ theme }) => theme.colors.textOnDark};
`;

export default Toast;
