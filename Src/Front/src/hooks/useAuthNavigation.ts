import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@routes/router";

// popTo 같은 native-stack 전용 메서드까지 타입이 잡히는 navigation
export const useAuthNavigation = () =>
  useNavigation<NativeStackNavigationProp<RootStackParamList>>();
