import { StatusBar } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { MalssiatProvider } from "@core";
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
            <NavigationContainer>
              <Router />
            </NavigationContainer>
          </OnboardingProvider>
        </SessionProvider>
      </MalssiatProvider>
    </SafeAreaProvider>
  );
}

export default App;
