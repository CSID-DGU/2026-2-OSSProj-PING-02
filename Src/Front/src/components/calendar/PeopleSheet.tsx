import { useEffect, useState } from "react";
import { ActivityIndicator, Image } from "react-native";
import styled, { useTheme } from "styled-components/native";
import { AvatarDefaultIcon, CheckIcon, SearchIcon } from "@core/ui/icon";
import { BottomSheet, BottomSheetActions } from "@core/ui/sheet";
import { formatRelative } from "@constants/contact";
import { LINKED_APP_OPTIONS } from "@constants/onboarding";
import { services, type ConversationSummary, type EventPerson } from "@services";

// 인원 설정 시트 (Figma 07 캘린더 Bottom Sheet/인원 설정, 05 연락 D03 인원설정(전체인원·검색중·검색완료및선택))
// 검색칸 · 1:1 연락 목록(체크 · 아바타 · 이름 · 최근 메시지 · 받은 때 · 앱 로고) · 선택하기 / 취소
// 목록은 기기 알림으로 만든 실제 연락(services.conversation, 1:1만). 이름으로 검색
// TODO(#77 머지 뒤): 이름 앞 "!"(꼭 챙길 연락) 표시는 #77의 isMustCare로
interface PeopleSheetProps {
  visible: boolean;
  selected: EventPerson[];
  onClose: () => void;
  onConfirm: (people: EventPerson[]) => void;
}

const APP_LOGO = Object.fromEntries(
  LINKED_APP_OPTIONS.map(o => [o.value, o.icon])
) as Record<string, number>;

type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; items: ConversationSummary[] };

const PeopleSheet = ({
  visible,
  selected,
  onClose,
  onConfirm,
}: PeopleSheetProps) => {
  const theme = useTheme();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<EventPerson[]>(selected);

  // 열 때마다 지금 고른 인원으로 시작, 연락 목록을 새로 읽음
  useEffect(() => {
    if (!visible) return;
    setPicked(selected);
    setQuery("");
    let alive = true;
    setState({ status: "loading" });
    services.conversation
      .list()
      .then(
        items =>
          alive &&
          setState({
            status: "ready",
            items: items.filter(i => i.conversation.kind === "direct"),
          })
      )
      .catch(() => alive && setState({ status: "error" }));
    return () => {
      alive = false;
    };
    // selected는 열 때의 값만 씀
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const toggle = (person: EventPerson) =>
    setPicked(list =>
      list.some(p => p.id === person.id)
        ? list.filter(p => p.id !== person.id)
        : [...list, person]
    );

  const items =
    state.status === "ready"
      ? state.items.filter(i =>
          i.conversation.title.includes(query.trim())
        )
      : [];

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="인원 설정"
      footer={
        <BottomSheetActions
          confirmLabel="선택하기"
          onConfirm={() => onConfirm(picked)}
          onCancel={onClose}
        />
      }
    >
      <Search>
        <SearchInput
          value={query}
          onChangeText={setQuery}
          placeholder="검색하기"
          placeholderTextColor={theme.colors.textTertiary}
          accessibilityLabel="인원 검색"
        />
        <SearchIcon size={22} />
      </Search>

      {state.status === "loading" && (
        <Center>
          <ActivityIndicator
            color={theme.colors.brandBrown}
            accessibilityLabel="연락을 불러오는 중"
          />
        </Center>
      )}
      {/* TODO(Figma 문구 확인): 시안에 없는 오류·빈 상태 문구 */}
      {state.status === "error" && (
        <Empty>연락을 불러오지 못했어요. 잠시 뒤에 다시 열어 주세요.</Empty>
      )}
      {state.status === "ready" && items.length === 0 && (
        <Empty>{query.trim() ? "찾는 사람이 없어요." : "아직 모인 연락이 없어요."}</Empty>
      )}

      {items.map(({ conversation, lastMessage, analysis }) => {
        const person = { id: conversation.id, name: conversation.title };
        const checked = picked.some(p => p.id === person.id);
        const summary =
          analysis.status === "done" && analysis.summary
            ? analysis.summary
            : lastMessage.text;
        return (
          <Row
            key={conversation.id}
            onPress={() => toggle(person)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
            accessibilityLabel={`${conversation.title}, ${summary}`}
          >
            <Box $checked={checked}>
              {checked && <CheckIcon size={16} color={theme.colors.textOnDark} />}
            </Box>
            <Avatar>
              <AvatarDefaultIcon size={44} color={theme.colors.iconSubtle} />
            </Avatar>
            <Texts>
              <NameRow>
                <Name numberOfLines={1}>{conversation.title}</Name>
                <Time>{formatRelative(conversation.lastMessageAt)}</Time>
              </NameRow>
              <NameRow>
                <Summary numberOfLines={1}>{summary}</Summary>
                <Logo source={APP_LOGO[conversation.app]} accessible={false} />
              </NameRow>
            </Texts>
          </Row>
        );
      })}
    </BottomSheet>
  );
};

// 검색칸 (시안: 높이 52 · 모서리 10 · 오른쪽 돋보기)
const Search = styled.View`
  flex-direction: row;
  align-items: center;
  height: 52px;
  margin-bottom: 8px;
  padding: 0px 16px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.borderDefault};
`;

const SearchInput = styled.TextInput`
  flex: 1;
  padding: 0px;
  ${({ theme }) => theme.fonts.bodyLarge};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Center = styled.View`
  padding: 24px 0px;
  align-items: center;
`;

const Empty = styled.Text`
  padding: 24px 0px;
  text-align: center;
  ${({ theme }) => theme.fonts.bodySmall};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

// 한 줄: 시안 간격 약 76 (아바타 44 + 위아래)
const Row = styled.Pressable`
  flex-direction: row;
  align-items: center;
  min-height: 76px;
  gap: 12px;
  padding: 0px 4px 0px 12px;
`;

// TODO(디자이너 공유): 체크 칸은 공통 Checkbox(라벨이 붙은 줄)와 모양이 달라 줄 안에 그림
const Box = styled.View<{ $checked: boolean }>`
  width: 20px;
  height: 20px;
  border-radius: 4px;
  justify-content: center;
  align-items: center;
  border: 1px solid
    ${({ theme, $checked }) =>
      $checked ? theme.colors.brandSeed : theme.colors.borderDefault};
  background-color: ${({ theme, $checked }) =>
    $checked ? theme.colors.brandSeed : theme.colors.surfaceDefault};
`;

const Avatar = styled.View`
  width: 44px;
  height: 44px;
  border-radius: 22px;
  background-color: ${({ theme }) => theme.colors.surfaceSeed};
`;

const Texts = styled.View`
  flex: 1;
  gap: 4px;
`;

const NameRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
`;

const Name = styled.Text`
  flex: 1;
  ${({ theme }) => theme.fonts.titleSection};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Time = styled.Text`
  ${({ theme }) => theme.fonts.captionHero};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Summary = styled.Text`
  flex: 1;
  ${({ theme }) => theme.fonts.captionSmall};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Logo = styled(Image)`
  width: 17px;
  height: 17px;
  border-radius: 4px;
`;

export default PeopleSheet;
