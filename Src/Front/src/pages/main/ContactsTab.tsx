import TabScreen from "@components/main/TabScreen";
import Notice from "@components/onboarding/Notice";

// 04 / 07 연락 목록 (다음 청크에서 구현)
const ContactsTab = ({ title }: { title: string }) => (
  <TabScreen title={title}>
    <Notice align="center" title="연락 목록을 준비하고 있어요" />
  </TabScreen>
);

export default ContactsTab;
