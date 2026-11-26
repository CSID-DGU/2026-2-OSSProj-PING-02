import AuthLayout from "@components/auth/AuthLayout";
import Notice from "@components/onboarding/Notice";

// 알림 센터 (앱바 🔔). 시안·기능이 정해지지 않아 자리만
// TODO(디자이너 공유): 06 알림 Screens(17~21)를 모아 보는 화면인지 확인 후 구현
const Notifications = () => (
  <AuthLayout title="알림" centered>
    <Notice align="center" title="알림 센터를 준비하고 있어요">
      놓친 연락·다시 알려 드릴 연락을 이곳에 모아 보여 드릴게요.
    </Notice>
  </AuthLayout>
);

export default Notifications;
