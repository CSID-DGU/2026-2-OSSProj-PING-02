import {
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { AppParamList } from "@routes/types";

// popTo 같은 native-stack 전용 메서드까지 타입이 잡히는 navigation
// 탭 안 상세 화면(TabStackParamList)과 Root 화면 이름을 모두 쓸 수 있음
export const useAuthNavigation = () =>
  useNavigation<NativeStackNavigationProp<AppParamList>>();

// 맨 바깥(Root) 스택의 navigation: 탭 안에서 로그아웃처럼 앱 전체를 바꿀 때
// (같은 navigation 타입으로 돌려줌: reset의 화면 이름 자동완성 유지)
export const getRootNavigation = <T extends NavigationProp<ParamListBase>>(
  navigation: T
): T => {
  let current: NavigationProp<ParamListBase> = navigation;
  for (
    let parent = current.getParent();
    parent;
    parent = current.getParent()
  ) {
    current = parent;
  }
  return current as T;
};
