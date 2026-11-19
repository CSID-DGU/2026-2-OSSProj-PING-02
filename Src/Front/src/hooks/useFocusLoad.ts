import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import type { LoadState } from "./useLoad";

// 화면에 올 때마다 다시 불러오기 (다른 화면에서 바꾼 내용 반영)
// 처음에만 로딩 화면, 다시 불러올 때는 이전 내용을 그대로 보여 줌
// load는 useCallback으로 감싸서 넘김
export const useFocusLoad = <T>(load: () => Promise<T>) => {
  const [state, setState] = useState<LoadState<T>>({ status: "loading" });
  const loadedOnce = useRef(false);

  const run = useCallback(async () => {
    if (!loadedOnce.current) setState({ status: "loading" });
    try {
      const data = await load();
      loadedOnce.current = true;
      setState({ status: "ready", data });
    } catch {
      if (!loadedOnce.current) setState({ status: "error" });
    }
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      run();
    }, [run])
  );

  const retry = useCallback(() => {
    loadedOnce.current = false;
    run();
  }, [run]);

  return { state, retry, reload: run };
};
