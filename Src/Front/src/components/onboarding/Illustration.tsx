import { Image } from "react-native";
import styled from "styled-components/native";
import type { OnboardingImage } from "@constants/onboardingImages";

// 온보딩 장식 그림: 크기는 Figma에서 잰 값 그대로, 스크린리더에서는 숨김
interface IllustrationProps {
  image: OnboardingImage;
}

const Illustration = ({ image }: IllustrationProps) => (
  <Wrapper
    accessible={false}
    importantForAccessibility="no-hide-descendants"
    accessibilityElementsHidden
  >
    <Image
      source={image.source}
      style={{ width: image.width, height: image.height }}
      resizeMode="contain"
    />
  </Wrapper>
);

const Wrapper = styled.View`
  align-items: center;
`;

export default Illustration;
