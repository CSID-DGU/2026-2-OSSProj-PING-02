import { useState } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import styled from "styled-components/native";

import { Button } from "@core/ui/button";
import { Field, TextField } from "@core/ui/field";
import { Header } from "@core/ui/header";
import { Checkbox } from "@core/ui/checkbox";
import { ChoiceGroup } from "@core/ui/choice";
import { Dialog, DialogHighlight } from "@core/ui/dialog";
import { Select } from "@core/ui/select";
import { Card, CardTitle, CardDescription, CardMeta } from "@core/ui/card";

// 공통 컴포넌트 확인용 임시 화면 (개발용)

const Screen = styled(SafeAreaView)`
  flex: 1;
  background-color: ${({ theme }) => theme.colors.backgroundBase};
`;

const Content = styled.ScrollView`
  flex: 1;
`;

const Section = styled.View`
  padding: 24px 20px 48px 20px;
  gap: 16px;
`;

const SectionTitle = styled.Text`
  ${({ theme }) => theme.fonts.titleSection};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-top: 16px;
`;

const AppBarPreview = styled.View`
  margin: 0px -20px;
  border-top-width: 1px;
  border-bottom-width: 1px;
  border-color: ${({ theme }) => theme.colors.borderDefault};
`;

// 버튼들을 가로로 나란히 놓는 줄
const Row = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
`;

const toOptions = (labels: string[]) =>
  labels.map((label) => ({ label, value: label }));

const GENDERS = toOptions(["여성", "남성", "기타"]);
const TONES = toOptions(["짧게", "다정하게", "공손하게"]);

// Select 테스트용 선택지

const YEARS = Array.from({ length: 2012 - 1950 + 1 }, (_, i) => {
  const y = String(2012 - i);
  return { label: `${y}년`, value: y };
});

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const m = String(i + 1).padStart(2, "0");
  return { label: `${m}월`, value: m };
});

const DAYS = Array.from({ length: 31 }, (_, i) => {
  const d = String(i + 1).padStart(2, "0");
  return { label: `${d}일`, value: d };
});

const DOMAINS = ["gmail.com", "naver.com", "daum.net", "kakao.com"].map(
  (d) => ({ label: d, value: d })
);

// Card 테스트용 답장 후보
const REPLIES = [
  "답이 늦어서 미안해. 요즘 조금 정신이 없었어.",
  "연락 고마워! 이번 주말은 어려운데 다음에 보자.",
  "잘 지내고 있어. 너는 어떻게 지내?",
];

const Playground = () => {
  const [email, setEmail] = useState("");
  const [checkA, setCheckA] = useState(false);
  const [checkB, setCheckB] = useState(true);
  const [gender, setGender] = useState<string>();
  const [tone, setTone] = useState("다정하게");
  const [resultOpen, setResultOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [year, setYear] = useState<string>();
  const [month, setMonth] = useState<string>();
  const [day, setDay] = useState<string>();
  const [domain, setDomain] = useState<string>("gmail.com");
  const [replyIndex, setReplyIndex] = useState(0);

  return (
    <Screen>
      <Header
        title="컴포넌트 테스트"
        titleAlign="center"
        onBack={() => console.log("뒤로가기 눌림")}
        divider
      />

      <Content>
        <Section>
          {/* ───────── Header ───────── */}
          <SectionTitle>Header - 왼쪽 정렬 (로그인 화면용)</SectionTitle>
          <AppBarPreview>
            <Header
              title="로그인"
              onBack={() => console.log("뒤로가기 눌림")}
            />
          </AppBarPreview>

          {/* ───────── TextField ───────── */}
          <SectionTitle>TextField</SectionTitle>
          <TextField
            label="이메일"
            placeholder="이메일을 입력해주세요"
            value={email}
            onChangeText={setEmail}
            helper="로그인에 사용할 이메일이에요"
          />
          <TextField
            label="비밀번호"
            placeholder="비밀번호를 입력해주세요"
            secureTextEntry
            error="비밀번호가 올바르지 않아요"
          />
          <TextField
            label="이메일 (비활성)"
            placeholder="이메일을 입력해주세요"
            disabled
          />

          {/* ───────── Checkbox ───────── */}
          <SectionTitle>Checkbox</SectionTitle>
          <Checkbox
            checked={checkA}
            onChange={setCheckA}
            label="직접 입력할게요"
          />
          <Checkbox
            checked={checkB}
            onChange={setCheckB}
            label="이용약관에 동의해요"
          />
          <Checkbox
            checked={false}
            onChange={() => {}}
            disabled
            label="비활성 (unchecked)"
          />
          <Checkbox
            checked
            onChange={() => {}}
            disabled
            label="비활성 (checked)"
          />

          {/* ───────── ChoiceGroup ───────── */}
          <SectionTitle>ChoiceGroup - option (성별)</SectionTitle>
          <ChoiceGroup options={GENDERS} value={gender} onChange={setGender} />

          <SectionTitle>ChoiceGroup - chip (톤)</SectionTitle>
          <ChoiceGroup
            shape="chip"
            options={TONES}
            value={tone}
            onChange={setTone}
          />
          <ChoiceGroup
            shape="chip"
            options={toOptions(["비활성"])}
            onChange={() => {}}
            disabled
          />

          {/* ───────── Select ───────── */}
          <SectionTitle>Select - 생년월일</SectionTitle>

          <Row>
            <Select
              options={YEARS}
              value={year}
              onChange={setYear}
              placeholder="YYYY"
              sheetTitle="태어난 해"
              flex={1.4}
            />

            <Select
              options={MONTHS}
              value={month}
              onChange={setMonth}
              placeholder="MM"
              sheetTitle="태어난 달"
            />

            <Select
              options={DAYS}
              value={day}
              onChange={setDay}
              placeholder="DD"
              sheetTitle="태어난 날"
            />
          </Row>

          <SectionTitle>Select - 이메일 도메인 / 상태</SectionTitle>

          {/* 라벨·오류 문구는 Field로 감쌈 */}
          <Field label="이메일 도메인">
            <Row>
              <Select
                placeholder="도메인 선택"
                options={DOMAINS}
                value={domain}
                onChange={setDomain}
              />
            </Row>
          </Field>

          <Field label="에러 상태" helper="도메인을 선택해주세요" state="error">
            <Row>
              <Select
                options={DOMAINS}
                onChange={() => {}}
                placeholder="선택해주세요"
                error
              />
            </Row>
          </Field>

          <Field label="비활성 상태" state="disabled">
            <Row>
              <Select
                options={DOMAINS}
                onChange={() => {}}
                placeholder="선택해주세요"
                disabled
              />
            </Row>
          </Field>

          {/* ───────── Card ───────── */}

          <SectionTitle>Card - default (연락 요약, 누를 수 있음)</SectionTitle>

          <Card onPress={() => console.log("민지 카드 눌림")}>
            <CardTitle>민지 · 오늘</CardTitle>
            <CardDescription>이번 주말에 시간 괜찮아?</CardDescription>
            <CardMeta>카카오톡 · 1:1</CardMeta>
          </Card>

          <SectionTitle>Card - highlight (꼭 챙길 연락)</SectionTitle>

          <Card
            variant="highlight"
            onPress={() => console.log("준호 카드 눌림")}
          >
            <CardTitle>준호 결혼식</CardTitle>
            <CardDescription>
              11월 2일 (일) 오후 1시 · 강남 ○○웨딩홀
            </CardDescription>
            <CardMeta>경조사 · 3일 남음</CardMeta>
          </Card>

          <SectionTitle>Card - selected (답장 후보 고르기)</SectionTitle>

          {REPLIES.map((text, i) => (
            <Card
              key={text}
              variant={replyIndex === i ? "selected" : "default"}
              onPress={() => setReplyIndex(i)}
            >
              <CardDescription style={styles.noMarginTop}>
                {text}
              </CardDescription>
            </Card>
          ))}

          <SectionTitle>Card - 누를 수 없는 카드</SectionTitle>

          <Card>
            <CardTitle>안내</CardTitle>
            <CardDescription>
              메시지 원문은 이 기기 안에만 저장돼요.
            </CardDescription>
          </Card>

          {/* ───────── Dialog ───────── */}
          <SectionTitle>Dialog</SectionTitle>

          <Button
            variant="secondary"
            fullWidth
            onPress={() => setResultOpen(true)}
          >
            결과 팝업 열기
          </Button>

          <Button
            variant="secondary"
            fullWidth
            onPress={() => setConfirmOpen(true)}
          >
            확인 팝업 열기
          </Button>

          {/* 결과 안내형 (Figma: 아이디 찾기 완료) */}
          <Dialog
            visible={resultOpen}
            onClose={() => setResultOpen(false)}
            title="아이디를 찾았어요"
            description="회원님의 아이디는 아래와 같아요."
            confirmLabel="로그인"
            onConfirm={() => setResultOpen(false)}
          >
            <DialogHighlight>mals****</DialogHighlight>
          </Dialog>

          {/* 확인형 (바로 보내기 전 확인) */}
          <Dialog
            visible={confirmOpen}
            onClose={() => setConfirmOpen(false)}
            icon={null}
            title="이 답장을 보낼까요?"
            description="보낸 메시지는 취소할 수 없어요."
            confirmLabel="보내기"
            onConfirm={() => {
              console.log("전송!");
              setConfirmOpen(false);
            }}
            closeLabel="취소"
            dismissOnBackdrop={false}
          />

          {/* ───────── Button ───────── */}
          <SectionTitle>Button</SectionTitle>
          <Button variant="primary" fullWidth>
            primary 버튼
          </Button>
          <Button variant="secondary" fullWidth>
            secondary 버튼
          </Button>
          <Button variant="primary" fullWidth disabled>
            disabled 버튼
          </Button>
          <Button variant="text">텍스트 버튼</Button>
        </Section>
      </Content>
    </Screen>
  );
};

const styles = StyleSheet.create({
  noMarginTop: { marginTop: 0 },
});

export default Playground;
