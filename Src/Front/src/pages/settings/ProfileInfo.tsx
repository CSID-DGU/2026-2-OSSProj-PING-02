import { useCallback, useState } from "react";
import { BackHandler } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import styled from "styled-components/native";
import { Button } from "@core/ui/button";
import { Dialog } from "@core/ui/dialog";
import { TextField } from "@core/ui/field";
import { useToast } from "@core/ui/toast";
import {
  BirthdateField,
  checkEmail,
  composeEmail,
  EmailField,
  fromBirthdate,
  GenderField,
  splitEmail,
  toBirthdate,
  type BirthValue,
  type EmailValue,
} from "@components/auth/ProfileInputs";
import ProfileCard from "@components/settings/ProfileCard";
import SettingsLayout from "@components/settings/SettingsLayout";
import {
  AUTH_ERROR,
  getAuthErrorMessage,
  getInvalidFields,
  type Gender,
} from "@constants/auth";
import {
  formatKoreanDate,
  GENDER_LABEL,
  PROFILE_COPY as C,
  SETTINGS_COPY,
} from "@constants/settings";
import { useAuthNavigation } from "@hooks/useAuthNavigation";
import { AUTH_ERROR_CODE, services, type AuthUser } from "@services";
import { ServiceError } from "@services/common";
import { useOnboarding } from "@stores/OnboardingProvider";
import { useSession } from "@stores/SessionProvider";

// 08 설정 H02 내 정보 (Figma 507:13428 보기 → 507:13996 비밀번호 확인 팝업 → 507:14401 수정)
// - 보기: 이름·아이디·비밀번호(재설정 →)·이메일·생년월일·성별 + "수정하기"
// - 수정하기: 비밀번호 확인 팝업(POST /users/me/password/verify) → 이메일·생년월일·성별 수정 → 저장(PATCH /users/me)
//   틀리면 팝업에 빨간 안내 + "비밀번호 재설정" 버튼. 카카오 계정은 비밀번호가 없어 팝업 없이 바로 수정
// - 수정 중 뒤로가기(화면·안드로이드)는 보기로 돌아감
type Mode = "view" | "edit";

const isKakao = (user: AuthUser) => user.provider === "KAKAO";

const ProfileInfo = () => {
  const navigation = useAuthNavigation();
  const toast = useToast();
  const { session, updateUser } = useSession();
  const { data } = useOnboarding();
  const user = session.status === "signedIn" ? session.user : null;

  const [mode, setMode] = useState<Mode>("view");
  // 비밀번호 확인 팝업
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmError, setConfirmError] = useState<string>();
  const [wrongPassword, setWrongPassword] = useState(false);
  const [checking, setChecking] = useState(false);
  // 수정 값
  const [email, setEmail] = useState<EmailValue>(splitEmail(user?.email));
  const [birth, setBirth] = useState<BirthValue>(
    fromBirthdate(user?.birthdate)
  );
  const [gender, setGender] = useState<Gender | undefined>(
    user?.gender === "OTHER" ? undefined : user?.gender
  );
  const [errors, setErrors] = useState<{ email?: string; birth?: string }>({});
  const [saving, setSaving] = useState(false);

  // 수정 중에는 안드로이드 뒤로가기도 보기로 (화면 뒤로가기와 같게)
  useFocusEffect(
    useCallback(() => {
      if (mode !== "edit") return;
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        setMode("view");
        return true;
      });
      return () => sub.remove();
    }, [mode])
  );

  if (!user) return null;

  const startEdit = () => {
    setEmail(splitEmail(user.email));
    setBirth(fromBirthdate(user.birthdate));
    setGender(user.gender === "OTHER" ? undefined : user.gender);
    setErrors({});
    setMode("edit");
  };

  const openConfirm = () => {
    if (isKakao(user)) {
      startEdit();
      return;
    }
    setPassword("");
    setConfirmError(undefined);
    setWrongPassword(false);
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (checking) return;
    if (!password) {
      setConfirmError(AUTH_ERROR.passwordRequired);
      return;
    }
    setChecking(true);
    try {
      await services.auth.verifyPassword(password);
      setConfirmOpen(false);
      startEdit();
    } catch (error) {
      const wrong =
        error instanceof ServiceError &&
        error.code === AUTH_ERROR_CODE.invalidCredentials;
      setWrongPassword(wrong);
      setConfirmError(
        wrong ? SETTINGS_COPY.passwordMismatch : getAuthErrorMessage(error)
      );
    } finally {
      setChecking(false);
    }
  };

  const handleSave = async () => {
    if (saving) return;
    const emailCheck = checkEmail(email);
    const birthdate = toBirthdate(birth);
    const nextErrors = {
      email:
        emailCheck === "required"
          ? AUTH_ERROR.emailRequired
          : emailCheck === "invalid"
          ? AUTH_ERROR.emailInvalid
          : undefined,
      birth: birthdate ? undefined : AUTH_ERROR.birthRequired,
    };
    setErrors(nextErrors);
    if (nextErrors.email || nextErrors.birth) return;

    setSaving(true);
    try {
      const nextEmail = composeEmail(email);
      // 바꾼 항목만 보냄 (Doc/API_목록.md 4.8-2)
      const updated = await services.auth.updateProfile({
        password,
        email: nextEmail !== user.email ? nextEmail : undefined,
        birthdate: birthdate !== user.birthdate ? birthdate : undefined,
        gender: gender && gender !== user.gender ? gender : undefined,
      });
      // 응답에 없는 값(가입일 등)은 지금 값을 유지
      updateUser({ ...user, ...updated });
      setMode("view");
      toast.show(C.saved);
    } catch (error) {
      const fields = getInvalidFields(error);
      if (
        error instanceof ServiceError &&
        error.code === AUTH_ERROR_CODE.invalidEmailFormat
      ) {
        setErrors({ email: AUTH_ERROR.emailInvalid });
      } else if (fields.includes("email") || fields.includes("birthdate")) {
        setErrors({
          email: fields.includes("email") ? AUTH_ERROR.emailInvalid : undefined,
          birth: fields.includes("birthdate")
            ? AUTH_ERROR.checkInput
            : undefined,
        });
      } else {
        toast.show(
          error instanceof ServiceError &&
            error.code === AUTH_ERROR_CODE.invalidCredentials
            ? C.saveFailed
            : getAuthErrorMessage(error),
          { icon: "error" }
        );
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsLayout
      title={C.title}
      gap={12}
      onBack={mode === "edit" ? () => setMode("view") : undefined}
    >
      <ProfileCard
        name={user.name}
        loginId={user.loginId}
        birthdate={user.birthdate}
        linkedApps={data.linkedApps}
      />

      {mode === "view" ? (
        <Fields>
          <InfoField label={C.name} value={user.name} />
          <InfoField label={C.loginId} value={user.loginId} />
          {!isKakao(user) && (
            <PasswordRow>
              <InfoLabel>{C.password}</InfoLabel>
              <Chip
                onPress={() => navigation.navigate("SettingsPassword")}
                accessibilityRole="button"
                accessibilityLabel={`${C.password} ${C.resetChip}`}
                // 보이는 높이 28, 터치 영역 48dp
                hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
              >
                <ChipText>{C.resetChip}</ChipText>
              </Chip>
            </PasswordRow>
          )}
          <InfoField label={C.email} value={user.email ?? "-"} />
          <InfoField
            label={C.birthdate}
            value={formatKoreanDate(user.birthdate)}
          />
          <InfoField
            label={C.gender}
            value={user.gender ? GENDER_LABEL[user.gender] : "-"}
          />
          <Action>
            <Button variant="secondary" fullWidth onPress={openConfirm}>
              {C.edit}
            </Button>
          </Action>
        </Fields>
      ) : (
        <EditFields>
          <EmailField
            value={email}
            onChange={(next) => {
              setEmail(next);
              setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            error={errors.email}
          />
          <BirthdateField
            value={birth}
            onChange={(next) => {
              setBirth(next);
              setErrors((prev) => ({ ...prev, birth: undefined }));
            }}
            error={errors.birth}
          />
          <GenderField value={gender} onChange={setGender} />
          <EditAction>
            <Button
              variant="primary"
              fullWidth
              onPress={handleSave}
              disabled={saving}
              accessibilityState={{ busy: saving, disabled: saving }}
            >
              {C.save}
            </Button>
          </EditAction>
        </EditFields>
      )}

      {/* H02 / 내 정보_수정하기 버튼 누른 후: 비밀번호 확인 */}
      <Dialog
        visible={confirmOpen}
        icon={null}
        showCloseIcon
        title={C.confirmTitle}
        confirmLabel={C.confirmSubmit}
        onConfirm={handleConfirm}
        // 틀렸을 때만 "비밀번호 재설정" (시안 507:14205)
        closeVariant={wrongPassword ? "secondary" : "none"}
        closeLabel={C.goReset}
        onClose={() => {
          setConfirmOpen(false);
          navigation.navigate("SettingsPassword");
        }}
        onDismiss={() => setConfirmOpen(false)}
      >
        <DialogField>
          <TextField
            label={C.confirmLabel}
            placeholder={C.passwordPlaceholder}
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setConfirmError(undefined);
              setWrongPassword(false);
            }}
            error={confirmError}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="password"
            onSubmitEditing={handleConfirm}
          />
        </DialogField>
      </Dialog>
    </SettingsLayout>
  );
};

// 보기 칸: 라벨(13 Medium) + 흰 칸(높이 52, 좌우 14)에 값(15)
const InfoField = ({ label, value }: { label: string; value: string }) => (
  <InfoBox accessible accessibilityLabel={`${label} ${value}`}>
    <InfoLabel>{label}</InfoLabel>
    <ValueBox>
      <Value numberOfLines={1}>{value}</Value>
    </ValueBox>
  </InfoBox>
);

// 시안 Form / Fields: 좌우 10, 칸 사이 14
const Fields = styled.View`
  gap: 14px;
  padding: 0px 10px;
`;

const EditFields = styled.View`
  gap: 14px;
`;

const InfoBox = styled.View`
  gap: 6px;
`;

const InfoLabel = styled.Text`
  ${({ theme }) => theme.fonts.labelForm};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const ValueBox = styled.View`
  justify-content: center;
  height: 52px;
  padding: 0px 14px;
  border-radius: 8px;
  background-color: ${({ theme }) => theme.colors.surfaceDefault};
`;

const Value = styled.Text`
  ${({ theme }) => theme.fonts.bodyLarge};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const PasswordRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  height: 28px;
`;

// "재설정" 작은 노란 버튼 (모서리 5, 좌우 12·위아래 3, 12 Regular 브라운)
const Chip = styled.TouchableOpacity`
  padding: 3px 12px;
  border-radius: 5px;
  background-color: ${({ theme }) => theme.colors.brandSeed};
`;

const ChipText = styled.Text`
  ${({ theme }) => theme.fonts.labelChip};
  color: ${({ theme }) => theme.colors.textBrand};
`;

// 시안 Form / Actions: 폭 320 (칸보다 양옆 6 넓게)
const Action = styled.View`
  margin: 0px -6px;
`;

// 수정: 칸은 카드 폭 그대로, 버튼은 양옆 4 안쪽 (시안 507:14401)
const EditAction = styled.View`
  margin: 0px 4px;
`;

const DialogField = styled.View`
  align-self: stretch;
`;

export default ProfileInfo;
