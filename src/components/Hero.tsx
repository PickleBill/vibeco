import { useVariant } from "@/hooks/useVariant";
import HeroVariantA from "./HeroVariantA";
import HeroVariantC from "./HeroVariantC";

const Hero = () => {
  const variant = useVariant("hero", ["a", "c"] as const);
  return variant === "a" ? <HeroVariantA /> : <HeroVariantC />;
};

export default Hero;
