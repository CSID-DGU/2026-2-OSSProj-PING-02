import styled from "styled-components/native";
import {
  AvatarIcon,
  BirthdayIcon,
  EditIcon,
  PhoneIcon,
} from "@core/ui/icon";
import SeedGradientBox from "@components/main/SeedGradientBox";
import { APP_LABEL, APP_LOGO_SMALL } from "@constants/contact";
import type { MessengerApp } from "@services";

// 05 연락 D03 위 프로필 카드 (시안 ÷2): 좌우 16 · 모서리 28 · 홈 카드와 같은 그라데이션
// 아바타 44 → 15 → 이름(titleProfile 16/26) + 관계 칩 / 전화번호 / 생일, 오른쪽 위 ✏️ · 아래 메신저 로고
// 단체방(D05)은 전화번호·생일 줄 없이 방 이름 + 관계 칩 + 로고
// - 관계가 없으면 칩을 숨김, 전화번호가 없으면 "전화번호가 없어요"(디자이너 확인), 생일이 없으면 "?"(시안)
// - ✏️(친구 정보 수정)은 D06 친구 설정이라 06 친구 이슈에서. 지금은 모양만 (누를 수 없음)
interface ProfileCardProps {
  name: string;
  relationLabel?: string;
  apps: MessengerApp[];
  // 1:1만. undefined면 줄을 그리지 않음
  contact?: { phone: string | null; birthday: string | null };
}

// "MM-DD" → "MM.DD" (연도는 받지 않음, 팀 확정)
export const formatBirthday = (birthday: string) => birthday.replace("-", ".");

const ProfileCard = ({
  name,
  relationLabel,
  apps,
  contact,
}: ProfileCardProps) => {
  const phone = contact?.phone ?? "전화번호가 없어요";
  const birthday = contact?.birthday ? formatBirthday(contact.birthday) : "?";
  const label = [
    name,
    relationLabel,
    contact ? phone : null,
    contact ? `생일 ${contact.birthday ? birthday : "모름"}` : null,
    apps.map(a => APP_LABEL[a]).join(", "),
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <SeedGradientBox id="contactProfile" radius={28} style={CARD}>
      <Row accessible accessibilityLabel={label}>
        <Avatar>
          <AvatarIcon size={44} />
        </Avatar>
        <Info>
          <NameRow>
            <Name numberOfLines={1}>{name}</Name>
            {relationLabel && (
              <Chip>
                {/* TODO(Figma 스타일 확인): 가장 가까운 captionRegular 12/17 */}
                <ChipText>{relationLabel}</ChipText>
              </Chip>
            )}
          </NameRow>
          {contact && (
            <>
              <Line>
                <LineIcon>
                  <PhoneIcon />
                </LineIcon>
                <LineText numberOfLines={1}>{phone}</LineText>
              </Line>
              <Line>
                <LineIcon>
                  <BirthdayIcon />
                </LineIcon>
                <LineText>{birthday}</LineText>
              </Line>
            </>
          )}
        </Info>
        <Side>
          {/* TODO(06 친구): 누르면 D06 친구 설정. 지금은 모양만 */}
          <EditIcon />
          <Logos>
            {apps.map(app => (
              <Logo key={app} source={APP_LOGO_SMALL[app]} accessible={false} />
            ))}
          </Logos>
        </Side>
      </Row>
    </SeedGradientBox>
  );
};

const CARD = { marginHorizontal: 16 };

const Row = styled.View`
  flex-direction: row;
  align-items: flex-start;
  padding: 22px 24px 18px;
`;

const Avatar = styled.View`
  width: 44px;
  height: 44px;
  border-radius: 22px;
  background-color: ${({ theme }) => theme.colors.surfaceSeed};
`;

const Info = styled.View`
  flex: 1;
  margin-left: 15px;
`;

const NameRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 16px;
`;

const Name = styled.Text`
  flex-shrink: 1;
  ${({ theme }) => theme.fonts.titleProfile};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Chip = styled.View`
  height: 29px;
  padding: 0px 10px;
  border-radius: 14.5px;
  justify-content: center;
  background-color: ${({ theme }) => theme.colors.surfaceDefault};
`;

const ChipText = styled.Text`
  ${({ theme }) => theme.fonts.captionRegular};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Line = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 6px;
  padding-left: 4px;
`;

const LineIcon = styled.View`
  width: 10px;
  align-items: center;
`;

// TODO(Figma 스타일 확인): 전화번호·생일 줄은 가장 가까운 captionRegular 12/17
const LineText = styled.Text`
  flex-shrink: 1;
  ${({ theme }) => theme.fonts.captionRegular};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Side = styled.View`
  align-items: flex-end;
  gap: 8px;
  padding-top: 3px;
`;

const Logos = styled.View`
  flex-direction: row;
`;

const Logo = styled.Image`
  width: 17px;
  height: 17px;
`;

export default ProfileCard;
