import { StatusBar } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { MalssiatProvider } from "@core";
import Router from "@routes/router";

function App() {
  return (
    <SafeAreaProvider>
      <MalssiatProvider>
        <StatusBar barStyle="dark-content" />
        <NavigationContainer>
          <Router />
        </NavigationContainer>
      </MalssiatProvider>
    </SafeAreaProvider>
  );
}

export default App;
