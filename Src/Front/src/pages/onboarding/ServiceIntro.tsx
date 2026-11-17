import { useCallback, useRef, useState } from "react";
import {
  BackHandler,
  FlatList,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Button } from "@core/ui/button";
import { Dialog } from "@core/ui/dialog";
import AuthLayout from "@components/auth/AuthLayout";
import { INTRO_PAGES } from "@components/onboarding/IntroPages";
import { useAndroidBack } from "@hooks/useAndroidBack";
import { useOnboardingStep } from "@hooks/useOnboardingStep";
import * as s from "./ServiceIntro_styled";

const PAGE_KEYS = INTRO_PAGES.map((_, i) => `intro-${i + 1}`);

// 02-1 ~ 02-5 서비스 소개 (로그인 다음, 온보딩 첫 화면)
// 옆으로 밀거나 "다음"으로 넘김. 뒤로가기: 이전 쪽 → 첫 쪽이면 "잠시 쉬어 가기" 안내
const ServiceIntro = () => {
  const { goNext } = useOnboardingStep("ServiceIntro");
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<string>>(null);
  const [page, setPage] = useState(0);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const last = INTRO_PAGES.length - 1;

  const goToPage = useCallback((next: number) => {
    setPage(next);
    listRef.current?.scrollToIndex({ index: next, animated: true });
  }, []);

  const handleNext = () => {
    if (page < last) goToPage(page + 1);
    else goNext();
  };

  const handleBack = useCallback(() => {
    if (page > 0) goToPage(page - 1);
    else setLeaveOpen(true);
    return true;
  }, [page, goToPage]);
  useAndroidBack(handleBack);

  // 손으로 넘겼을 때 현재 쪽 맞추기
  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  return (
    <AuthLayout
      scrollable={false}
      footer={
        <Button
          variant="primary"
          fullWidth
          onPress={handleNext}
          accessibilityHint={
            page < last ? "다음 소개로 넘어가요" : "개인정보 처리 안내로 넘어가요"
          }
        >
          다음
        </Button>
      }
    >
      {/* Figma 02: 위쪽 점 5개 (현재 seed300, 나머지 seed100) */}
      <s.Dots
        accessible
        accessibilityLabel={`서비스 소개 ${INTRO_PAGES.length}쪽 중 ${page + 1}쪽`}
        accessibilityLiveRegion="polite"
      >
        {INTRO_PAGES.map((_, i) => (
          <s.Dot key={PAGE_KEYS[i]} $active={i === page} />
        ))}
      </s.Dots>

      <FlatList
        ref={listRef}
        data={PAGE_KEYS}
        keyExtractor={key => key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        renderItem={({ index }) => {
          const Page = INTRO_PAGES[index];
          return (
            <s.Page
              style={{ width }}
              // 지금 보이는 쪽만 스크린리더가 읽도록
              importantForAccessibility={
                index === page ? "auto" : "no-hide-descendants"
              }
              accessibilityElementsHidden={index !== page}
            >
              <Page />
            </s.Page>
          );
        }}
      />

      {/* Dialog는 닫기 버튼·뒤로가기·바깥 누르기가 모두 onClose라서,
          앱 종료는 confirm에만 두고 onClose는 팝업만 닫게 함 */}
      <Dialog
        visible={leaveOpen}
        icon={null}
        title="여기서 잠시 쉬어 갈까요?"
        description="지금 앱을 닫아도 다음에 열면 이 단계부터 이어서 할 수 있어요."
        confirmLabel="쉬어 갈게요 (앱 닫기)"
        onConfirm={() => BackHandler.exitApp()}
        closeLabel="계속할게요"
        onClose={() => setLeaveOpen(false)}
      />
    </AuthLayout>
  );
};

export default ServiceIntro;
