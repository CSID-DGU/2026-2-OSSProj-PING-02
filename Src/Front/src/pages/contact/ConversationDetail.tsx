import { useRoute, type RouteProp } from "@react-navigation/native";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import type { RootStackParamList } from "@routes/router";

// 04 / 08 1:1 연락 상세 (다음 청크에서 구현)
const ConversationDetail = () => {
  const { params } = useRoute<RouteProp<RootStackParamList, "ConversationDetail">>();
  return (
    <AuthLayout title="연락">
      <AuthIntro title="연락 상세" description={params.conversationId} />
    </AuthLayout>
  );
};

export default ConversationDetail;
