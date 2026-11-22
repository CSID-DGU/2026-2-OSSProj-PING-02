import { StatusBar } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { MalssiatProvider } from "@core";
import { ToastProvider } from "@core/ui/toast";
import Router from "@routes/router";
import { SessionProvider } from "@stores/SessionProvider";
import { OnboardingProvider } from "@stores/OnboardingProvider";

function App() {
  return (
    <SafeAreaProvider>
      <MalssiatProvider>
        <SessionProvider>
          <OnboardingProvider>
            <StatusBar barStyle="dark-content" />
            {/* 토스트는 화면 이동과 상관없이 떠 있도록 내비게이션 바깥에 */}
            <ToastProvider>
              <NavigationContainer>
                <Router />
              </NavigationContainer>
            </ToastProvider>
          </OnboardingProvider>
        </SessionProvider>
      </MalssiatProvider>
    </SafeAreaProvider>
  );
}

export default App;
