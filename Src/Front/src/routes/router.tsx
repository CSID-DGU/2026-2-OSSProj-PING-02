import { createNativeStackNavigator } from "@react-navigation/native-stack";

// pages
import Splash from "@pages/auth/Splash";
import AccountStart from "@pages/auth/AccountStart";
import Playground from "@pages/dev/Playground";

export type RootStackParamList = {
  Splash: undefined;
  AccountStart: undefined;
  Playground: undefined;
};

// useNavigation()에서 화면 이름 자동완성
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

const Stack = createNativeStackNavigator<RootStackParamList>();

const Router = () => {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{ headerShown: false }}
    >
      {/* Auth */}
      <Stack.Screen name="Splash" component={Splash} />
      <Stack.Screen name="AccountStart" component={AccountStart} />

      {/* Dev (개발용 테스트 화면) */}
      <Stack.Screen name="Playground" component={Playground} />
    </Stack.Navigator>
  );
};

export default Router;