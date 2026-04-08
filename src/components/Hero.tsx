import { useVariant } from "@/hooks/useVariant";
import HeroVariantA from "./HeroVariantA";
import HeroVariantB from "./HeroVariantB";
import HeroVariantC from "./HeroVariantC";

const Hero = () => {
  const variant = useVariant("hero", ["a", "b", "c"] as const);
  if (variant === "a") return <HeroVariantA />;
  if (variant === "b") return <HeroVariantB />;
  return <HeroVariantC />;
};

export default Hero;
