import { Image } from "expo-image";
import Svg, { Circle, Ellipse, Path, Rect } from "react-native-svg";

type PortalRole = "primary_healthcare" | "nurse" | "admin";

type PortalIllustrationProps = {
  role: PortalRole;
};

export default function PortalIllustration({ role }: PortalIllustrationProps) {
  const isDoctor = role === "primary_healthcare";
  const isNurse = role === "nurse";
  if (isDoctor) {
    return (
      <Image
        source={require("../assets/images/primary-health-worker.png")}
        style={{ width: "100%", height: "100%" }}
        contentFit="cover"
        contentPosition="center"
        accessibilityLabel="Primary healthcare worker"
      />
    );
  }
  if (isNurse) {
    return (
      <Image
        source={require("../assets/images/nursing-staff.png")}
        style={{ width: "100%", height: "100%" }}
        contentFit="cover"
        contentPosition="center"
        accessibilityLabel="Nurse caring for an older patient"
      />
    );
  }

  const clothing = isNurse ? "#258B78" : "#284D5A";
  const accessibilityLabel = isNurse ? "Nursing staff illustration" : "Healthcare administrator illustration";

  return (
    <Svg width="100%" height="100%" viewBox="0 0 120 96" accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      <Rect width="120" height="96" rx="16" fill={isNurse ? "#E3F1EE" : "#E8EEF1"} />
      <Circle cx="91" cy="23" r="14" fill={isNurse ? "#C9E5DD" : "#D4E0E6"} />
      <Path d="M10 96c2-21 18-33 42-33s40 12 42 33" fill={clothing} />
      <Path d="m41 62 11 12 11-12 10 6-9 28H40l-9-28z" fill={clothing} />
      <Path d="M47 48h12v16c0 6-12 6-12 0z" fill="#9A5D43" />
      <Ellipse cx="53" cy="37" rx="18" ry="22" fill="#9A5D43" />
      {isNurse ? (
        <Path d="M36 35c-2-19 8-27 19-26 10 1 17 9 16 23l-5-5-2-7c-9 5-17 6-28 4z" fill="#202D2D" />
      ) : (
        <Path d="M35 34c-2-15 6-25 18-26 14-1 21 9 20 24l-6-7-1-5c-9 5-18 6-27 5z" fill="#202D2D" />
      )}
      <Circle cx="35" cy="40" r="3" fill="#9A5D43" />
      <Circle cx="71" cy="40" r="3" fill="#9A5D43" />
      <Path d="M47 39h2m11 0h2" stroke="#292D2C" strokeWidth="2" strokeLinecap="round" />
      <Path d="M49 49c3 2 7 2 10 0" stroke="#603C34" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {isNurse ? (
        <>
          <Path d="M42 12c2-8 20-10 23 0l-2 7H44z" fill="#FFFFFF" />
          <Path d="M52 12h4m-2-2v4" stroke="#167663" strokeWidth="1.5" strokeLinecap="round" />
          <Path d="M63 67c8 5 11 12 11 21" stroke="#D8F2E9" strokeWidth="2.5" fill="none" />
          <Rect x="67" y="82" width="11" height="10" rx="3" fill="#FFFFFF" />
          <Path d="M71 85h3m-1.5-1.5v3" stroke="#167663" strokeWidth="1.2" strokeLinecap="round" />
        </>
      ) : (
        <>
          <Rect x="72" y="38" width="31" height="42" rx="5" fill="#FFFFFF" />
          <Rect x="78" y="46" width="19" height="3" rx="1.5" fill="#C9D8DC" />
          <Rect x="78" y="53" width="12" height="3" rx="1.5" fill="#C9D8DC" />
          <Path d="m78 69 6-7 5 4 6-9" fill="none" stroke="#258B78" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx="97" cy="68" r="8" fill="#DCEFE7" />
          <Circle cx="97" cy="68" r="3" fill="none" stroke="#258B78" strokeWidth="2" />
        </>
      )}
    </Svg>
  );
}
