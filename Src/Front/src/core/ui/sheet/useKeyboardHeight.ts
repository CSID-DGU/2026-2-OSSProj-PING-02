import { useEffect, useState } from "react";
import { Keyboard } from "react-native";

// Modal 창은 adjustResize로 줄어들지 않아서 키보드 높이를 직접 읽어 내용을 올림 (#60)
// BottomSheet(아래 시트)와 Dialog(가운데 팝업)가 같이 씀
// 열려 있는 동안 키보드 높이 (안드로이드는 Did 이벤트만 옴)
export const useKeyboardHeight = (active: boolean) => {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (!active) {
      setHeight(0);
      return;
    }
    const show = Keyboard.addListener("keyboardDidShow", (e) =>
      setHeight(e.endCoordinates.height)
    );
    const hide = Keyboard.addListener("keyboardDidHide", () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [active]);
  return height;
};
