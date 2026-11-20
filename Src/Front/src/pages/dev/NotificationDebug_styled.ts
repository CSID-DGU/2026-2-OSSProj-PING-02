import { SafeAreaView } from "react-native-safe-area-context";
import styled from "styled-components/native";

export const Screen = styled(SafeAreaView)`
  flex: 1;
  background-color: ${({ theme }) => theme.colors.backgroundBase};
`;

export const Content = styled.ScrollView`
  flex: 1;
`;

export const Section = styled.View`
  padding: 24px 20px 48px 20px;
  gap: 12px;
`;

export const SectionTitle = styled.Text`
  ${({ theme }) => theme.fonts.titleSection};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-top: 16px;
`;

export const Description = styled.Text`
  ${({ theme }) => theme.fonts.bodySmall};
  color: ${({ theme }) => theme.colors.textTertiary};
`;

export const StatusText = styled.Text<{ $ok: boolean }>`
  ${({ theme }) => theme.fonts.bodyMedium};
  color: ${({ theme, $ok }) =>
    $ok ? theme.colors.feedbackSuccessText : theme.colors.feedbackDangerText};
`;

export const Row = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
`;

export const AppList = styled.View`
  gap: 14px;
`;
