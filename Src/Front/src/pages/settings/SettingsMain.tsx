import { useState } from "react";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Dialog } from "@core/ui/dialog";
import { Header } from "@core/ui/header";
import { useToast } from "@core/ui/toast";
import NotificationBell from "@components/main/NotificationBell";
import ProfileCard from "@components/settings/ProfileCard";
import {
  SettingsDivider,
  SettingsMenuGroup,
} from "@components/settings/SettingsMenu";
import WithdrawSheet from "@components/settings/WithdrawSheet";
import {
  SETTINGS_COPY,
  SETTINGS_SECTIONS,
  type SettingsMenuItem,
} from "@constants/settings";
import {
  getRootNavigation,
  useAuthNavigation,
} from "@hooks/useAuthNavigation";
import { AUTH_ERROR_CODE, services } from "@services";
import { clearLocalAccountData } from "@services/account/clearLocalData";
import { ServiceError } from "@services/common";
import { useOnboarding } from "@stores/OnboardingProvider";
import { useSession } from "@stores/SessionProvider";
import * as s from "./SettingsMain_styled";

// 08 설정 H01 설정 메인 + H08 로그아웃·회원 탈퇴 (Figma "08 설정 · 개인정보 · 계정")
// - 메뉴: 화면이 생긴 것만 누를 수 있음 (H02~H07은 이어서 작업)
// - 로그아웃: 확인 팝업 → 서버 세션 종료 → 스플래시
// - 회원 탈퇴: 확인 팝업("탈퇴 진행하기") → 비밀번호 시트 → DELETE /users/me → 기기 데이터 삭제 → 스플래시
type Popup = "none" | "logout" | "withdrawConfirm" | "withdrawSheet";

// 아직 화면이 없는 메뉴 (H02~H07). 화면을 만들면 여기서 빼고 handleMenu에 이동을 추가
const NOT_READY = new Set<SettingsMenuItem["key"]>([
  "profile",
  "contacts",
  "linkedApps",
  "replyGuide",
  "notifications",
  "storedData",
]);

const SettingsMain = () => {
  const insets = useSafeAreaInsets();
  const navigation = useAuthNavigation();
  const toast = useToast();
  const { session, signOut } = useSession();
  const { data } = useOnboarding();
  const [popup, setPopup] = useState<Popup>("none");

  const user = session.status === "signedIn" ? session.user : null;

  const goToSplash = () =>
    // 탭 안 스택이 아니라 맨 바깥 스택을 초기화해야 로그인 흐름으로 돌아감
    getRootNavigation(navigation).reset({
      index: 0,
      routes: [{ name: "Splash" }],
    });

  const handleMenu = (item: SettingsMenuItem) => {
    if (item.key === "logout") setPopup("logout");
    if (item.key === "withdraw") setPopup("withdrawConfirm");
  };

  const handleLogout = async () => {
    setPopup("none");
    await signOut().catch(() => {});
    goToSplash();
  };

  const handleWithdraw = async (password: string) => {
    try {
      await services.auth.deleteAccount(password);
    } catch (error) {
      if (
        error instanceof ServiceError &&
        error.code === AUTH_ERROR_CODE.invalidCredentials
      ) {
        return "wrongPassword" as const;
      }
      toast.show(SETTINGS_COPY.withdrawFailed, { icon: "error" });
      return "failed" as const;
    }
    if (user) await clearLocalAccountData(services, user.id);
    setPopup("none");
    // 서버에서 계정과 세션이 지워졌으므로 로그아웃 요청 없이 이 기기 토큰만 지움
    services.tokens.set(null);
    goToSplash();
    return "done" as const;
  };

  return (
    <s.Screen $top={insets.top}>
      <Header
        title="설정"
        titleAlign="center"
        // 시안 H01에 뒤로가기가 있음: 탭 첫 화면이라 홈 탭으로 (안드로이드 뒤로가기와 같음)
        onBack={() => navigation.navigate("Home", { screen: "home" })}
        right={<NotificationBell />}
      />
      <ScrollView contentContainerStyle={s.content}>
        {user && (
          <ProfileCard
            name={user.name}
            loginId={user.loginId}
            birthdate={user.birthdate}
            linkedApps={data.linkedApps}
          />
        )}
        {SETTINGS_SECTIONS.map((section, index) => (
          <s.Block key={section.title}>
            {index > 0 && <SettingsDivider />}
            <SettingsMenuGroup
              section={section}
              onPress={handleMenu}
              isEnabled={item => !NOT_READY.has(item.key)}
            />
          </s.Block>
        ))}
      </ScrollView>

      {/* H08 / 로그아웃 */}
      <Dialog
        visible={popup === "logout"}
        icon={null}
        showCloseIcon
        title={SETTINGS_COPY.logoutTitle}
        confirmLabel={SETTINGS_COPY.logoutConfirm}
        onConfirm={handleLogout}
        closeLabel="취소"
        onClose={() => setPopup("none")}
      />

      {/* H08 / 회원 탈퇴1: 노란 버튼은 "계속해서 사용하기"(닫기), 아래 글자 버튼이 탈퇴 진행 */}
      <Dialog
        visible={popup === "withdrawConfirm"}
        icon={null}
        showCloseIcon
        title={SETTINGS_COPY.withdrawTitle}
        confirmLabel={SETTINGS_COPY.withdrawKeep}
        onConfirm={() => setPopup("none")}
        closeLabel={SETTINGS_COPY.withdrawProceed}
        onClose={() => setPopup("withdrawSheet")}
        onDismiss={() => setPopup("none")}
      />

      {/* H08 / 회원 탈퇴2 */}
      <WithdrawSheet
        visible={popup === "withdrawSheet"}
        onClose={() => setPopup("none")}
        onWithdraw={handleWithdraw}
      />
    </s.Screen>
  );
};

export default SettingsMain;
