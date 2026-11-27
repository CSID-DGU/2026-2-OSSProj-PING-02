import { useState } from "react";
import styled from "styled-components/native";
import { Button } from "@core/ui/button";
import { ChoiceGroup } from "@core/ui/choice";
import { TextArea } from "@core/ui/field";
import { useToast } from "@core/ui/toast";
import { RELATION_OPTIONS } from "@constants/contact";
import { services, type ContactRelation, type Conversation } from "@services";

// 05 연락 D03 관계 탭 (시안 ÷2): "관계 종류" pill 칩(친구·가족·직장·기타) → "관계 설명"(300자) → 저장하기
// 저장하면 토스트 "관계 정보를 저장했어요". D01 관계 필터·꼭 챙길 연락(직장)에도 반영
// TODO(06 친구): 친구 정보(person)의 관계·메모로 옮기기
interface RelationTabProps {
  conversation: Conversation;
  onSaved: () => void;
}

const OPTIONS = RELATION_OPTIONS.filter(
  (o): o is { value: ContactRelation; label: string } => o.value !== "all"
);

const RelationTab = ({ conversation, onSaved }: RelationTabProps) => {
  const toast = useToast();
  const [relation, setRelation] = useState<ContactRelation | undefined>(
    conversation.relation
  );
  const [note, setNote] = useState(conversation.relationNote ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!relation) return;
    setSaving(true);
    try {
      await services.conversation.saveRelation(conversation.id, {
        relation,
        note: note.trim(),
      });
      toast.show("관계 정보를 저장했어요");
      onSaved();
    } catch {
      toast.show("저장하지 못했어요. 다시 시도해 주세요");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Wrapper>
      <Title accessibilityRole="header">관계 종류</Title>
      <Chips>
        <ChoiceGroup
          shape="pill"
          options={OPTIONS}
          value={relation}
          onChange={setRelation}
        />
      </Chips>
      <Title accessibilityRole="header" $top={14}>
        관계 설명
      </Title>
      <Box>
        <TextArea
          accessibilityLabel="관계 설명"
          value={note}
          onChangeText={setNote}
          maxLength={300}
          minHeight={123}
        />
      </Box>
      <Actions>
        <Button
          fullWidth
          typo="labelButtonCompact"
          disabled={!relation || saving}
          accessibilityHint={relation ? undefined : "관계 종류를 고르면 누를 수 있어요"}
          onPress={save}
        >
          저장하기
        </Button>
      </Actions>
    </Wrapper>
  );
};

const Wrapper = styled.View`
  padding-top: 18px;
`;

const Title = styled.Text<{ $top?: number }>`
  margin-top: ${({ $top }) => $top ?? 0}px;
  padding-left: 26px;
  ${({ theme }) => theme.fonts.titleHomeSection};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Chips = styled.View`
  margin-top: 12px;
  padding: 0px 26px;
`;

const Box = styled.View`
  margin-top: 12px;
  padding: 0px 16px;
`;

const Actions = styled.View`
  margin-top: 11px;
  padding: 0px 20px;
`;

export default RelationTab;
