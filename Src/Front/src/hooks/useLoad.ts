import { useCallback, useEffect, useState } from "react";

export type LoadState<T> =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; data: T };

// 화면에 들어올 때 한 번 불러오기 (로딩 / 오류 / 준비). retry로 다시 시도
// load는 useCallback으로 감싸서 넘김 (바뀌면 다시 불러옴)
export const useLoad = <T>(load: () => Promise<T>) => {
  const [state, setState] = useState<LoadState<T>>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setState({ status: "loading" });
    load()
      .then(data => alive && setState({ status: "ready", data }))
      .catch(() => alive && setState({ status: "error" }));
    return () => {
      alive = false;
    };
  }, [load, attempt]);

  const retry = useCallback(() => setAttempt(a => a + 1), []);
  return { state, retry };
};
