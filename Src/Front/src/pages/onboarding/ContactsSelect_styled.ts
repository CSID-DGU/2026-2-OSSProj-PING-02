import { StyleSheet } from "react-native";
import styled from "styled-components/native";
import { Input } from "@core/ui/field";

// Figma 03 온보딩 08·09 (720px ÷2)
export const { listContent } = StyleSheet.create({
  listContent: {
    paddingBottom: 20,
  },
});

// 08: 연락처 책 66×82 자리 (그림 100dp는 위아래로 겹쳐 그림, 07과 같음)
export const Book = styled.View`
  height: 82px;
  justify-content: center;
  overflow: visible;
`;

// 08: 책 아래 22 → 진행 막대 폭 206 (AuthLayout gap 24에서 2를 뺌)
export const Bar = styled.View`
  align-self: center;
  width: 206px;
  margin-top: -2px;
`;

// 09: 제목·설명 (본문 여백 20) → 21 → 검색창 → 10 → 전체 선택 줄
export const Header = styled.View`
  padding: 56px 20px 0px;
  gap: 21px;
`;

export const Controls = styled.View`
  gap: 10px;
  margin-bottom: 6px;
`;

export const Search = styled.View`
  justify-content: center;
`;

// 검색창 높이 51 · 오른쪽 돋보기
// TODO(Figma 스타일 확인): 검색 글자 약 14 → bodyMedium 14/20
export const SearchInput = styled(Input)`
  height: 51px;
  padding-left: 16px;
  padding-right: 44px;
  border-radius: 12px;
  ${({ theme }) => theme.fonts.bodyMedium};
`;

export const SearchIconBox = styled.View`
  position: absolute;
  right: 20px;
`;

// 전체 선택 줄: 양옆 26(본문 20 + 6) · 높이 40 · 모서리 12 · 바탕 stateSelectedBg(seed100)
// 체크까지 20 → 12 → "전체 선택" … 연락처 수 → 오른쪽 16
export const AllRow = styled.Pressable`
  height: 40px;
  margin: 0px 6px;
  flex-direction: row;
  align-items: center;
  padding: 0px 16px 0px 20px;
  border-radius: 12px;
  background-color: ${({ theme }) => theme.colors.stateSelectedBg};
`;

export const AllLabel = styled.Text`
  flex: 1;
  ${({ theme }) => theme.fonts.bodyCompact};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

export const AllCount = styled.Text`
  ${({ theme }) => theme.fonts.captionRegular};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

export const CheckSlot = styled.View`
  margin-right: 12px;
`;

// 줄 높이 72: 체크(왼쪽 29) → 12 → 아바타 44 → 12 → 이름 / 번호
export const Row = styled.Pressable`
  height: 72px;
  flex-direction: row;
  align-items: center;
  padding: 0px 20px 0px 29px;
`;

export const Texts = styled.View`
  flex: 1;
  margin-left: 12px;
  gap: 4px;
`;

export const Name = styled.Text`
  ${({ theme }) => theme.fonts.titleSection};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

export const Phone = styled.Text`
  ${({ theme }) => theme.fonts.captionDense};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

// TODO(Figma 스타일 확인): 검색 결과 없음 한 줄 (시안 없음, 팀 확정 문구) → bodySmall 13/19
export const NoResult = styled.Text`
  padding: 24px 20px;
  text-align: center;
  ${({ theme }) => theme.fonts.bodySmall};
  color: ${({ theme }) => theme.colors.textSecondary};
`;
