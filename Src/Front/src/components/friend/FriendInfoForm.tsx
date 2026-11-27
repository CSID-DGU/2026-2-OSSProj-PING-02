import { useEffect, useRef, useState } from "react";
import styled from "styled-components/native";
import { Checkbox } from "@core/ui/checkbox";
import { ChoiceGroup } from "@core/ui/choice";
import { Input, TextArea } from "@core/ui/field";
import { RELATION_LABEL } from "@constants/friend";
import type { FriendDetail, FriendInfoPatch, FriendRelation } from "@services";

// 06 친구 E03 상세 기본 정보 (720px ÷2, 양옆 21)
// 이름(입력) → "이 친구의 연락을 분석해요"(체크) → 관계(pill 칩 4개) → 관계 설명(300자) → 전화번호
// - 자동 저장: 입력을 멈추고 잠시 뒤(SAVE_DELAY) 바꾼 칸만 저장, 화면을 떠날 때도 남은 것을 저장
// - 이름을 다 지우면 저장하지 않음 (예전 이름 유지)
// - 전화번호는 기기 연락처에서 온 값이라 보기만 (팀 확정)
// TODO(디자이너 공유): 시안이 "전화번호" 제목에서 잘려 있어 그 아래는 시안을 받은 뒤
// TODO(Figma 스타일 확인): 칸 제목 약 13 → bodySmall 13/19
const SAVE_DELAY = 600;

const RELATION_OPTIONS = (
  Object.keys(RELATION_LABEL) as FriendRelation[]
).map(value => ({ value, label: RELATION_LABEL[value] }));

interface FriendInfoFormProps {
  detail: FriendDetail;
  onSave: (patch: FriendInfoPatch) => Promise<void>;
  onToggleAnalysis: (on: boolean) => void;
}

const FriendInfoForm = ({ detail, onSave, onToggleAnalysis }: FriendInfoFormProps) => {
  const { person, accounts, analysisOff } = detail;
  const [name, setName] = useState(person.displayName);
  const [relation, setRelation] = useState<FriendRelation | undefined>(person.relation);
  const [memo, setMemo] = useState(person.memo ?? "");

  // 마지막으로 저장한 값과 비교해서 바뀐 칸만 보냄
  const saved = useRef({
    name: person.displayName,
    relation: person.relation,
    memo: person.memo ?? "",
  });
  const latest = useRef({ name, relation, memo });
  latest.current = { name, relation, memo };
  const saveRef = useRef(onSave);
  saveRef.current = onSave;

  const flush = useRef(() => {
    const now = latest.current;
    const before = saved.current;
    const patch: FriendInfoPatch = {};
    if (now.name.trim() && now.name.trim() !== before.name) {
      patch.displayName = now.name.trim();
    }
    if (now.relation && now.relation !== before.relation) patch.relation = now.relation;
    if (now.memo !== before.memo) patch.memo = now.memo;
    if (Object.keys(patch).length === 0) return;
    saved.current = {
      name: patch.displayName ?? before.name,
      relation: now.relation ?? before.relation,
      memo: now.memo,
    };
    saveRef.current(patch).catch(() => {
      // 저장하지 못하면 다음 입력 때 다시 보냄
      saved.current = before;
    });
  }).current;

  useEffect(() => {
    const timer = setTimeout(flush, SAVE_DELAY);
    return () => clearTimeout(timer);
  }, [name, relation, memo, flush]);

  // 화면을 떠날 때 남은 변경 저장
  useEffect(() => flush, [flush]);

  const analysisOn = accounts.length > 0 && analysisOff.length === 0;

  return (
    <Form>
      <Field>
        <FieldLabel>이름</FieldLabel>
        <Input
          value={name}
          onChangeText={setName}
          accessibilityLabel="이름"
          returnKeyType="done"
        />
      </Field>

      <CheckLine>
        <Checkbox
          checked={analysisOn}
          onChange={onToggleAnalysis}
          label="이 친구의 연락을 분석해요"
        />
      </CheckLine>

      <Field>
        <FieldLabel>관계</FieldLabel>
        <ChoiceGroup
          shape="pill"
          options={RELATION_OPTIONS}
          value={relation}
          onChange={setRelation}
        />
      </Field>

      <Field>
        <FieldLabel>관계 설명</FieldLabel>
        <TextArea
          value={memo}
          onChangeText={setMemo}
          maxLength={300}
          minHeight={123}
          accessibilityLabel="관계 설명"
        />
      </Field>

      <Field>
        <FieldLabel>전화번호</FieldLabel>
        <Input
          value={person.phone ?? ""}
          placeholder="전화번호가 없어요"
          state="disabled"
          accessibilityLabel={`전화번호, ${person.phone ?? "없음"}`}
        />
      </Field>
    </Form>
  );
};

// 하위 탭 아래 약 14 · 칸 사이 약 14
const Form = styled.View`
  padding: 14px 21px 24px;
  gap: 14px;
`;

// 칸 제목 → 6 → 입력
const Field = styled.View`
  gap: 6px;
`;

const FieldLabel = styled.Text`
  ${({ theme }) => theme.fonts.bodySmall};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const CheckLine = styled.View`
  margin-top: -1px;
`;

export default FriendInfoForm;
