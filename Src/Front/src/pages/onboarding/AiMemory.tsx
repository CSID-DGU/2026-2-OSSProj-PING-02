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
  const isWritten = (c: (typeof MEMORY_CATEGORIES)[number]) =>
    !!data.memory[c.value].trim();
  const anyWritten = MEMORY_CATEGORIES.some(isWritten);
  // "내용 작성하기"는 아직 안 쓴 첫 항목을 엶
  const firstUnwritten = MEMORY_CATEGORIES.find(c => !isWritten(c));

  const openEdit = (category: (typeof MEMORY_CATEGORIES)[number]["value"]) =>
    navigation.navigate("AiMemoryEdit", { category });

  // - 하나도 안 씀: 건너뛰기 + "‘요즘 나의 상태’부터 쓰기"
  // - 일부만 씀  : "‘…’도 쓰기"(텍스트) + 다음
  // - 모두 씀    : 다음
  // TODO(Figma 문구 확인): 시안은 "내용 작성하기"인데 어느 항목인지 모호해 항목 이름을 넣음
  const footer = !anyWritten ? (
    <>
      <Button
        variant="primary"
        fullWidth
        onPress={() => openEdit(MEMORY_CATEGORIES[0].value)}
      >
        {`‘${MEMORY_CATEGORIES[0].title}’부터 쓰기`}
      </Button>
      <SkipButton onPress={goNext}>지금은 건너뛰기</SkipButton>
    </>
  ) : (
    <>
      <Button variant="primary" fullWidth onPress={goNext}>
        다음
      </Button>
      {firstUnwritten && (
        <SkipButton onPress={() => openEdit(firstUnwritten.value)}>
          {`‘${firstUnwritten.title}’도 쓰기`}
        </SkipButton>
      )}
    </>
  );

  return (
    <AuthLayout backOnly centered gap={24} footer={footer}>
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
                  <s.TitleRow>
                    <CardTitle>{category.title}</CardTitle>
                    {/* 작성 여부: 색만이 아니라 글자로 표시 */}
                    {text && (
                      <s.WrittenBadge>
                        <s.WrittenText>작성함</s.WrittenText>
                      </s.WrittenBadge>
                    )}
                  </s.TitleRow>
                  {/* 작성했으면 내용 첫 줄 미리보기, 아니면 항목 설명 */}
                  <CardDescription numberOfLines={1}>
                    {text ? text.split("\n")[0] : category.description}
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
