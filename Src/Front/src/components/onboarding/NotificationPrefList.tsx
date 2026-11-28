import styled from "styled-components/native";
import { StyleSheet } from "react-native";
import SwitchLine from "./SwitchLine";
import type { NotificationPref } from "@constants/onboarding";

// 받을 알림 스위치 목록: "전체 알림" 상자 + 항목 줄 (Figma 03 온보딩 06, 08 설정 H06 같은 모양)
// - 전체 알림은 항목이 모두 켜져 있으면 켜짐, 누르면 모두 켜기·끄기
// - 온보딩 06(6개)과 설정 H06(재연결 제안 포함 7개)이 같이 씀 (#60)
export interface NotificationPrefOption {
  value: NotificationPref;
  title: string;
  description: string;
}

interface NotificationPrefListProps {
  options: NotificationPrefOption[];
  selected: NotificationPref[];
  onChange: (next: NotificationPref[]) => void;
}

const NotificationPrefList = ({
  options,
  selected,
  onChange,
}: NotificationPrefListProps) => {
  const all = options.map((o) => o.value);
  const allOn = all.every((v) => selected.includes(v));
  const setOne = (value: NotificationPref, on: boolean) =>
    onChange(
      on
        ? [...selected.filter((v) => v !== value), value]
        : selected.filter((v) => v !== value)
    );

  return (
    <Options>
      <AllBox>
        <SwitchLine
          box
          label="전체 알림"
          value={allOn}
          // 목록에 없는 값(온보딩에 없는 설정 항목 등)은 그대로 둠
          onValueChange={(on) =>
            onChange(
              on
                ? [...new Set([...selected, ...all])]
                : selected.filter((v) => !all.includes(v))
            )
          }
        />
      </AllBox>
      {options.map((option) => (
        <SwitchLine
          key={option.value}
          label={option.title}
          description={option.description}
          value={selected.includes(option.value)}
          onValueChange={(on) => setOne(option.value, on)}
          style={styles.line}
        />
      ))}
    </Options>
  );
};

// Figma 06 (2x PNG ÷ 2)
// - 전체 알림 상자: 화면 양옆 30dp(본문 여백 20 + 10), 높이 48
// - 항목: 글자는 본문 여백에서 13dp 안쪽, 스위치 오른쪽 끝은 5dp 안쪽
// - 항목 사이(위 → 위) 72dp = 제목 20 + 3 + 설명 12 + 위아래 18.5
const Options = styled.View``;

// 상자 아래 → 첫 항목 제목까지 약 17 (항목 위 여백 18.5가 맡음)
const AllBox = styled.View`
  padding: 0px 10px;
`;

const styles = StyleSheet.create({
  line: {
    paddingLeft: 13,
    paddingRight: 5,
    paddingVertical: 18.5,
  },
});

export default NotificationPrefList;
