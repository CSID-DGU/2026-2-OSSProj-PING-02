import { useEffect, useRef } from "react";
import { AppState } from "react-native";

// 앱이 뒤에 있다가 다시 앞으로 왔을 때 실행 (예: 설정 화면에서 돌아왔을 때 권한 다시 확인)
export const useAppForeground = (onForeground: () => void) => {
  const callbackRef = useRef(onForeground);

  useEffect(() => {
    callbackRef.current = onForeground;
  }, [onForeground]);

  useEffect(() => {
    let prev = AppState.currentState;
    const sub = AppState.addEventListener("change", next => {
      if (prev !== "active" && next === "active") {
        callbackRef.current();
      }
      prev = next;
    });
    return () => sub.remove();
  }, []);
};
