import styled from "styled-components/native";
import { AvatarDefaultIcon } from "@core/ui/icon";

// 06 친구 프로필 사진 (기본 아바타 44, 안쪽 바탕 surfaceSeed)
// dot: 확인할 연락이 있는 친구 (시안: 지름 10, 아바타 왼쪽에서 30·위 0)
// TODO(디자이너 공유): 점 색 시안 #B3261E는 토큰에 없어 가장 가까운 feedbackDangerText(#B94747)로
// TODO(공통 컴포넌트): 05 연락 줄에도 같은 아바타가 들어가면 @core/ui로 옮김
interface FriendAvatarProps {
  dot?: boolean;
}

const FriendAvatar = ({ dot = false }: FriendAvatarProps) => (
  <Wrapper importantForAccessibility="no-hide-descendants">
    <Inner />
    <AvatarDefaultIcon size={44} />
    {dot && <Dot />}
  </Wrapper>
);

const Wrapper = styled.View`
  width: 44px;
  height: 44px;
`;

// 원 테두리 안쪽만 칠함 (테두리 두께 2.75 → 안쪽 지름 약 39)
const Inner = styled.View`
  position: absolute;
  top: 2px;
  left: 2px;
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background-color: ${({ theme }) => theme.colors.surfaceSeed};
`;

const Dot = styled.View`
  position: absolute;
  top: 0px;
  left: 30px;
  width: 10px;
  height: 10px;
  border-radius: 5px;
  background-color: ${({ theme }) => theme.colors.feedbackDangerText};
`;

export default FriendAvatar;
