import { createNativeStackNavigator } from "@react-navigation/native-stack";

// pages
import Splash from "@pages/auth/Splash";
import AccountStart from "@pages/auth/AccountStart";
import Login from "@pages/auth/Login";
import Signup from "@pages/auth/Signup";
import FindId from "@pages/auth/FindId";
import FindPassword from "@pages/auth/FindPassword";

export type RootStackParamList = {
  Splash: undefined;
  AccountStart: undefined;
  Login: undefined;
  Signup: undefined;
  FindId: undefined;
  FindPassword: undefined;
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
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Signup" component={Signup} />
      <Stack.Screen name="FindId" component={FindId} />
      <Stack.Screen name="FindPassword" component={FindPassword} />
    </Stack.Navigator>
  );
};

export default Router;
