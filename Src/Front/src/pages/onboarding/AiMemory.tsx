import { useTheme } from "styled-components/native";
import { Button } from "@core/ui/button";
import { Card, CardDescription, CardTitle } from "@core/ui/card";
import { BackIcon } from "@core/ui/icon";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import Notice from "@components/onboarding/Notice";
import SkipButton from "@components/onboarding/SkipButton";
import { MEMORY_CATEGORIES } from "@constants/onboarding";
import { useOnboardingStep } from "@hooks/useOnboardingStep";
import { useOnboarding } from "@stores/OnboardingProvider";
import * as s from "./AiMemory_styled";

// 11 / AI 메모리 작성 · 기본 (선택 사항)
// 항목을 누르면 상세 작성 화면(AiMemoryEdit, Figma 없음 → 입력창 + 예시 칩 임시 구현)
const AiMemory = () => {
  const theme = useTheme();
  const { navigation, goNext } = useOnboardingStep("AiMemory");
  const { data } = useOnboarding();
  const written = MEMORY_CATEGORIES.filter(c => data.memory[c.value].trim());
  const anyWritten = written.length > 0;

  const openEdit = (category: (typeof MEMORY_CATEGORIES)[number]["value"]) =>
    navigation.navigate("AiMemoryEdit", { category });

  const handlePrimary = () => {
    if (anyWritten) goNext();
    else openEdit(MEMORY_CATEGORIES[0].value);
  };

  return (
    <AuthLayout
      centered
      gap={24}
      footer={
        <>
          {!anyWritten && (
            <SkipButton onPress={goNext}>지금은 건너뛰기</SkipButton>
          )}
          <Button variant="primary" fullWidth onPress={handlePrimary}>
            {anyWritten ? "다음" : "내용 작성하기"}
          </Button>
        </>
      }
    >
      <AuthIntro
        variant="onboarding"
        title={"내 상황을 조금\n알려주실래요?"}
        description="답장에 참고해도 되는 내용만 선택해서 적어요"
      />

      <s.Cards>
        {MEMORY_CATEGORIES.map(category => {
          const text = data.memory[category.value].trim();
          return (
            <Card
              key={category.value}
              onPress={() => openEdit(category.value)}
              accessibilityLabel={`${category.title}, ${
                text ? "작성함" : "아직 쓰지 않음"
              }`}
              accessibilityHint="눌러서 내용을 적거나 고쳐요"
            >
              <s.Row>
                <s.Texts>
                  <CardTitle>{category.title}</CardTitle>
                  <CardDescription numberOfLines={text ? 2 : undefined}>
                    {text || category.description}
                  </CardDescription>
                </s.Texts>
                {/* 오른쪽 화살표: 뒤로가기 아이콘을 뒤집어 씀 (UI 아이콘 세트에 오른쪽 화살표가 없음) */}
                <s.Chevron>
                  <BackIcon size={20} color={theme.colors.textBrand} />
                </s.Chevron>
              </s.Row>
            </Card>
          );
        })}
      </s.Cards>

      <Notice title="내 기기에서 언제든 관리해요">
        작성한 내용은 수정하거나 전부 삭제할 수 있어요
      </Notice>
    </AuthLayout>
  );
};

export default AiMemory;
