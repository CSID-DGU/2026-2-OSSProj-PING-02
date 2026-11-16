import { useCallback } from "react";
import { BackHandler } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

// 화면이 보일 때만 안드로이드 뒤로가기를 가로챔
// handler가 true를 돌려주면 기본 동작(이전 화면으로)을 막음
// (Dialog·Select 시트가 열려 있으면 Modal의 onRequestClose가 먼저 받음)
export const useAndroidBack = (handler: () => boolean) => {
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", handler);
      return () => sub.remove();
    }, [handler])
  );
};
