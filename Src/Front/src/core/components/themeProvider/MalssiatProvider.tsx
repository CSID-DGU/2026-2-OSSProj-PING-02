import type { PropsWithChildren } from "react";
import { ThemeProvider } from "styled-components/native";
import { theme } from "../../styles/theme";

const MalssiatProvider = ({ children }: PropsWithChildren) => {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
};

export default MalssiatProvider;
