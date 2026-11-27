import styled from "styled-components/native";
import { Input } from "@core/ui/field";
import { SearchIcon } from "@core/ui/icon";

// 06 친구 검색창 (시안: 높이 41 · 양옆 20 · 왼쪽 글자까지 17 · 오른쪽 돋보기 16)
// - 목록(E01·E05): 입력해서 찾기
// - 상세(E02·E03): onPress만 주면 입력하지 않고 눌러서 목록 검색으로 감
// 글자 (디자이너 확인): captionSearch 12/22
interface FriendSearchBarProps {
  value?: string;
  onChangeText?: (text: string) => void;
  onPress?: () => void;
  // 값이 바뀌면 입력칸에 포커스 (상세에서 검색창을 눌러 목록으로 왔을 때)
  focusKey?: number;
  // E04-1 시트 안: 양옆 여백 없이(시트가 20을 줌) 높이 51
  flush?: boolean;
}

const FriendSearchBar = ({
  value,
  onChangeText,
  onPress,
  focusKey,
  flush = false,
}: FriendSearchBarProps) => {
  if (onPress) {
    return (
      <SearchPress
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="친구 이름 검색"
        accessibilityHint="눌러서 친구 목록에서 찾아요"
      >
        <SearchInput
          size="small"
          editable={false}
          pointerEvents="none"
          placeholder="검색하기"
          importantForAccessibility="no-hide-descendants"
        />
        <SearchIconBox pointerEvents="none">
          <SearchIcon />
        </SearchIconBox>
      </SearchPress>
    );
  }

  return (
    <Search $flush={flush}>
      {/* focusKey가 바뀌면 입력칸을 새로 그려 autoFocus로 키보드를 올림 */}
      <SearchInput
        key={focusKey}
        autoFocus={!!focusKey}
        size="small"
        $flush={flush}
        value={value}
        onChangeText={onChangeText}
        placeholder="검색하기"
        accessibilityLabel="친구 이름 검색"
        returnKeyType="search"
      />
      <SearchIconBox pointerEvents="none">
        <SearchIcon />
      </SearchIconBox>
    </Search>
  );
};

const Search = styled.View<{ $flush?: boolean }>`
  margin: 0px ${({ $flush }) => ($flush ? 0 : 20)}px;
  justify-content: center;
`;

const SearchPress = styled.Pressable`
  margin: 0px 20px;
  justify-content: center;
`;

const SearchInput = styled(Input)<{ $flush?: boolean }>`
  height: ${({ $flush }) => ($flush ? 51 : 41)}px;
  padding-left: 16px;
  padding-right: 44px;
  border-radius: 10px;
  ${({ theme }) => theme.fonts.captionSearch};
`;

// 돋보기 16, 상자 오른쪽 안에서 약 19
const SearchIconBox = styled.View`
  position: absolute;
  right: 19px;
`;

export default FriendSearchBar;
