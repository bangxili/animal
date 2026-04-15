// Cute cartoon pet SVG icons for feature buttons

// 1. Border Collie Doctor - for 宠物问诊
export function BorderCollieDoctor({ size = 90 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background bubble */}
      <circle cx="60" cy="60" r="58" fill="#EEF6FF" />
      {/* Left ear (black) */}
      <ellipse cx="30" cy="46" rx="16" ry="24" fill="#2D2D2D" transform="rotate(-12 30 46)" />
      {/* Right ear (white/cream) */}
      <ellipse cx="90" cy="46" rx="16" ry="24" fill="#EFEFEF" transform="rotate(12 90 46)" />
      {/* Head */}
      <circle cx="60" cy="70" r="42" fill="#F8F8F8" />
      {/* Black patch left side */}
      <path d="M18 70 Q22 40 60 52 Q32 56 22 85 Z" fill="#2D2D2D" />
      {/* Snout area */}
      <ellipse cx="60" cy="80" rx="18" ry="13" fill="#F2E0D0" />
      {/* Left eye */}
      <circle cx="44" cy="63" r="9" fill="white" />
      <circle cx="45" cy="64" r="6" fill="#222" />
      <circle cx="47" cy="62" r="2" fill="white" />
      {/* Right eye */}
      <circle cx="76" cy="63" r="9" fill="white" />
      <circle cx="77" cy="64" r="6" fill="#1A1A1A" />
      <circle cx="79" cy="62" r="2" fill="white" />
      {/* Nose */}
      <ellipse cx="60" cy="77" rx="7" ry="5" fill="#FF9EB4" />
      <ellipse cx="60" cy="78" rx="3.5" ry="2.5" fill="#FF6B8B" />
      {/* Mouth */}
      <path d="M53 83 Q60 89 67 83" stroke="#FF6B8B" fill="none" strokeWidth="1.5" strokeLinecap="round" />
      {/* Cheek blush */}
      <ellipse cx="32" cy="76" rx="8" ry="5" fill="#FFB3C6" opacity="0.45" />
      <ellipse cx="88" cy="76" rx="8" ry="5" fill="#FFB3C6" opacity="0.45" />
      {/* Doctor hat */}
      <rect x="41" y="28" width="38" height="13" rx="4" fill="white" stroke="#D0E4FF" strokeWidth="1.5" />
      <rect x="52" y="18" width="16" height="13" rx="3" fill="white" stroke="#D0E4FF" strokeWidth="1.5" />
      {/* Red cross on hat */}
      <rect x="59" y="21" width="2.5" height="8" fill="#FF4D6A" rx="1" />
      <rect x="55.5" y="24.5" width="9" height="2.5" fill="#FF4D6A" rx="1" />
      {/* Stethoscope */}
      <path d="M40 98 Q40 110 52 110 Q64 110 64 100" stroke="#5B8DEF" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="37" cy="96" r="5" fill="#5B8DEF" />
      <circle cx="67" cy="98" r="4" fill="#5B8DEF" />
    </svg>
  );
}

// 2. Orange Tabby Cat - for 每日大小便
export function OrangeCatAnalyst({ size = 90 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background bubble */}
      <circle cx="60" cy="60" r="58" fill="#FFF5E6" />
      {/* Left ear */}
      <polygon points="25,48 20,24 42,40" fill="#FF9933" />
      <polygon points="28,46 24,30 40,42" fill="#FFB366" />
      {/* Right ear */}
      <polygon points="95,48 100,24 78,40" fill="#FF9933" />
      <polygon points="92,46 96,30 80,42" fill="#FFB366" />
      {/* Head */}
      <circle cx="60" cy="68" r="42" fill="#FFA94D" />
      {/* Tabby stripes */}
      <path d="M38 50 Q45 46 52 50" stroke="#E07B00" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M68 50 Q75 46 82 50" stroke="#E07B00" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M50 40 Q60 37 70 40" stroke="#E07B00" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Snout area */}
      <ellipse cx="60" cy="80" rx="18" ry="12" fill="#FFCB99" />
      {/* Left eye */}
      <circle cx="44" cy="64" r="9.5" fill="#7ECE8A" />
      <ellipse cx="44" cy="64" rx="5" ry="8" fill="#222" />
      <circle cx="46" cy="62" r="2" fill="white" />
      <circle cx="44" cy="64" r="9.5" fill="none" stroke="#5AAB66" strokeWidth="1.5" />
      {/* Right eye */}
      <circle cx="76" cy="64" r="9.5" fill="#7ECE8A" />
      <ellipse cx="76" cy="64" rx="5" ry="8" fill="#222" />
      <circle cx="78" cy="62" r="2" fill="white" />
      <circle cx="76" cy="64" r="9.5" fill="none" stroke="#5AAB66" strokeWidth="1.5" />
      {/* Nose */}
      <path d="M57 77 L60 74 L63 77 Q60 80 57 77 Z" fill="#FF6B8B" />
      {/* Mouth */}
      <path d="M60 77 L60 82" stroke="#FF6B8B" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M53 82 Q60 88 67 82" stroke="#FF6B8B" fill="none" strokeWidth="1.5" strokeLinecap="round" />
      {/* Whiskers */}
      <line x1="20" y1="76" x2="46" y2="79" stroke="#E07B00" strokeWidth="1.2" />
      <line x1="20" y1="82" x2="46" y2="82" stroke="#E07B00" strokeWidth="1.2" />
      <line x1="74" y1="79" x2="100" y2="76" stroke="#E07B00" strokeWidth="1.2" />
      <line x1="74" y1="82" x2="100" y2="82" stroke="#E07B00" strokeWidth="1.2" />
      {/* Magnifying glass */}
      <circle cx="92" cy="36" r="14" fill="white" stroke="#5B8DEF" strokeWidth="3" />
      <circle cx="92" cy="36" r="9" fill="#D6ECFF" opacity="0.8" />
      <line x1="80" y1="46" x2="72" y2="54" stroke="#5B8DEF" strokeWidth="3.5" strokeLinecap="round" />
      {/* Cheek blush */}
      <ellipse cx="32" cy="74" rx="8" ry="5" fill="#FFD0A0" opacity="0.5" />
      <ellipse cx="88" cy="74" rx="8" ry="5" fill="#FFD0A0" opacity="0.5" />
    </svg>
  );
}

// 3. Chubby Hamster Chef - for 每日食谱
export function HamsterChef({ size = 90 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background bubble */}
      <circle cx="60" cy="60" r="58" fill="#F0FFF0" />
      {/* Chef hat */}
      <rect x="32" y="22" width="56" height="12" rx="4" fill="white" stroke="#E0E0E0" strokeWidth="1.5" />
      <ellipse cx="60" cy="22" rx="22" ry="14" fill="white" stroke="#E0E0E0" strokeWidth="1.5" />
      {/* Small ears */}
      <circle cx="26" cy="58" r="12" fill="#C9956B" />
      <circle cx="26" cy="58" r="7" fill="#E8B090" />
      <circle cx="94" cy="58" r="12" fill="#C9956B" />
      <circle cx="94" cy="58" r="7" fill="#E8B090" />
      {/* Head */}
      <circle cx="60" cy="70" r="42" fill="#D4956A" />
      {/* Chubby cheeks */}
      <ellipse cx="28" cy="76" rx="16" ry="14" fill="#E8A070" />
      <ellipse cx="92" cy="76" rx="16" ry="14" fill="#E8A070" />
      {/* Face center */}
      <ellipse cx="60" cy="74" rx="28" ry="26" fill="#F5C094" />
      {/* Left eye */}
      <circle cx="46" cy="64" r="8" fill="#222" />
      <circle cx="48" cy="62" r="2.5" fill="white" />
      {/* Right eye */}
      <circle cx="74" cy="64" r="8" fill="#222" />
      <circle cx="76" cy="62" r="2.5" fill="white" />
      {/* Nose */}
      <ellipse cx="60" cy="76" rx="5" ry="3.5" fill="#FF9EB4" />
      <ellipse cx="60" cy="77" rx="2.5" ry="1.5" fill="#FF6B8B" />
      {/* Mouth */}
      <path d="M54 81 Q60 87 66 81" stroke="#CC5577" fill="none" strokeWidth="1.5" strokeLinecap="round" />
      {/* Cheek blush */}
      <ellipse cx="30" cy="78" rx="9" ry="6" fill="#FFB090" opacity="0.5" />
      <ellipse cx="90" cy="78" rx="9" ry="6" fill="#FFB090" opacity="0.5" />
      {/* Fork & spoon */}
      <line x1="28" y1="96" x2="28" y2="112" stroke="#888" strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="28" cy="94" rx="4" ry="6" fill="none" stroke="#888" strokeWidth="2" />
      <line x1="90" y1="88" x2="92" y2="112" stroke="#888" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="86" y1="88" x2="86" y2="96" stroke="#888" strokeWidth="2" strokeLinecap="round" />
      <line x1="90" y1="88" x2="90" y2="96" stroke="#888" strokeWidth="2" strokeLinecap="round" />
      <line x1="94" y1="88" x2="94" y2="96" stroke="#888" strokeWidth="2" strokeLinecap="round" />
      <path d="M86 96 Q90 100 94 96" stroke="#888" fill="none" strokeWidth="2" />
      {/* Chicken drumstick on hat (SVG paths, no <text> node) */}
      <ellipse cx="52" cy="16" rx="7" ry="5" fill="#E8934A" />
      <ellipse cx="52" cy="20" rx="4" ry="3" fill="#F5C070" />
      <rect x="49" y="19" width="6" height="7" rx="2" fill="#F5C070" />
      <circle cx="52" cy="27" r="3" fill="white" stroke="#DDD" strokeWidth="1" />
    </svg>
  );
}

// 4. White Rabbit Scientist - for 基因检测
export function RabbitScientist({ size = 90 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background bubble */}
      <circle cx="60" cy="60" r="58" fill="#FAF0FF" />
      {/* Long ears */}
      <ellipse cx="38" cy="28" rx="10" ry="26" fill="#F0F0F0" stroke="#E0D0E0" strokeWidth="1.5" />
      <ellipse cx="38" cy="28" rx="5" ry="20" fill="#FFD0DC" />
      <ellipse cx="82" cy="28" rx="10" ry="26" fill="#F0F0F0" stroke="#E0D0E0" strokeWidth="1.5" />
      <ellipse cx="82" cy="28" rx="5" ry="20" fill="#FFD0DC" />
      {/* Head */}
      <circle cx="60" cy="72" r="40" fill="#F5F5F5" />
      {/* Snout */}
      <ellipse cx="60" cy="82" rx="16" ry="10" fill="#F0E8F0" />
      {/* Left eye */}
      <circle cx="46" cy="68" r="8.5" fill="#FF99AA" />
      <circle cx="46" cy="68" r="5.5" fill="#CC3355" />
      <circle cx="48" cy="66" r="2" fill="white" />
      {/* Right eye */}
      <circle cx="74" cy="68" r="8.5" fill="#FF99AA" />
      <circle cx="74" cy="68" r="5.5" fill="#CC3355" />
      <circle cx="76" cy="66" r="2" fill="white" />
      {/* Nose */}
      <path d="M57 80 L60 77 L63 80 Q60 83 57 80 Z" fill="#FF88AA" />
      {/* Mouth */}
      <path d="M54 83 Q60 89 66 83" stroke="#FF88AA" fill="none" strokeWidth="1.5" strokeLinecap="round" />
      {/* Cheek blush */}
      <ellipse cx="33" cy="76" rx="8" ry="5" fill="#FFB3C6" opacity="0.4" />
      <ellipse cx="87" cy="76" rx="8" ry="5" fill="#FFB3C6" opacity="0.4" />
      {/* Lab glasses */}
      <circle cx="46" cy="68" r="12" fill="none" stroke="#7C5CBF" strokeWidth="2" />
      <circle cx="74" cy="68" r="12" fill="none" stroke="#7C5CBF" strokeWidth="2" />
      <line x1="58" y1="68" x2="62" y2="68" stroke="#7C5CBF" strokeWidth="2" />
      <line x1="34" y1="64" x2="30" y2="60" stroke="#7C5CBF" strokeWidth="2" strokeLinecap="round" />
      <line x1="86" y1="64" x2="90" y2="60" stroke="#7C5CBF" strokeWidth="2" strokeLinecap="round" />
      {/* DNA Helix */}
      <path d="M88 85 Q96 92 88 99 Q96 106 88 113" stroke="#5B8DEF" strokeWidth="2" fill="none" />
      <path d="M100 85 Q92 92 100 99 Q92 106 100 113" stroke="#FF6B9D" strokeWidth="2" fill="none" />
      <line x1="88" y1="89" x2="100" y2="93" stroke="#7C5CBF" strokeWidth="1.5" />
      <line x1="94" y1="96" x2="94" y2="102" stroke="#7C5CBF" strokeWidth="1.5" />
      <line x1="88" y1="103" x2="100" y2="107" stroke="#7C5CBF" strokeWidth="1.5" />
    </svg>
  );
}

// 5. Dog + Cat Hearts - for 宠物交友配对
export function PetHeartMatch({ size = 90 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background bubble */}
      <circle cx="60" cy="60" r="58" fill="#FFF0F5" />
      {/* === Left: Corgi Dog === */}
      {/* Left dog ear */}
      <polygon points="16,38 10,20 28,32" fill="#E8934A" />
      {/* Right dog ear */}
      <polygon points="36,38 40,20 24,32" fill="#E8934A" />
      {/* Dog head */}
      <circle cx="26" cy="52" r="22" fill="#F5A85A" />
      {/* Dog snout */}
      <ellipse cx="26" cy="61" rx="11" ry="8" fill="#F5C99A" />
      {/* Dog left eye */}
      <circle cx="19" cy="48" r="5" fill="white" />
      <circle cx="19" cy="49" r="3.5" fill="#222" />
      <circle cx="20" cy="47" r="1.2" fill="white" />
      {/* Dog right eye */}
      <circle cx="33" cy="48" r="5" fill="white" />
      <circle cx="33" cy="49" r="3.5" fill="#222" />
      <circle cx="34" cy="47" r="1.2" fill="white" />
      {/* Dog nose */}
      <ellipse cx="26" cy="60" rx="4" ry="3" fill="#CC6633" />
      {/* Dog mouth */}
      <path d="M22 64 Q26 68 30 64" stroke="#AA4411" fill="none" strokeWidth="1.2" strokeLinecap="round" />
      {/* Dog cheek */}
      <ellipse cx="14" cy="56" rx="5" ry="3" fill="#FFCC88" opacity="0.5" />
      <ellipse cx="38" cy="56" rx="5" ry="3" fill="#FFCC88" opacity="0.5" />

      {/* === Right: Cat === */}
      {/* Cat left ear */}
      <polygon points="78,38 74,18 92,34" fill="#B090CC" />
      <polygon points="80,38 77,22 90,34" fill="#DFC0F0" />
      {/* Cat right ear */}
      <polygon points="104,38 110,18 96,34" fill="#B090CC" />
      <polygon points="102,38 106,22 94,34" fill="#DFC0F0" />
      {/* Cat head */}
      <circle cx="94" cy="52" r="22" fill="#C4A0DC" />
      {/* Cat snout */}
      <ellipse cx="94" cy="62" rx="11" ry="7.5" fill="#E0C8F0" />
      {/* Cat left eye */}
      <circle cx="87" cy="48" r="5.5" fill="#80EE80" />
      <ellipse cx="87" cy="48" rx="3" ry="4.5" fill="#222" />
      <circle cx="88" cy="46" r="1.5" fill="white" />
      {/* Cat right eye */}
      <circle cx="101" cy="48" r="5.5" fill="#80EE80" />
      <ellipse cx="101" cy="48" rx="3" ry="4.5" fill="#222" />
      <circle cx="102" cy="46" r="1.5" fill="white" />
      {/* Cat nose */}
      <path d="M91 60 L94 57 L97 60 Q94 63 91 60 Z" fill="#FF88AA" />
      {/* Cat mouth */}
      <path d="M89 63 Q94 68 99 63" stroke="#FF88AA" fill="none" strokeWidth="1.2" strokeLinecap="round" />
      {/* Cat whiskers */}
      <line x1="74" y1="59" x2="87" y2="62" stroke="#9070B0" strokeWidth="0.8" />
      <line x1="74" y1="64" x2="87" y2="64" stroke="#9070B0" strokeWidth="0.8" />
      <line x1="101" y1="62" x2="114" y2="59" stroke="#9070B0" strokeWidth="0.8" />
      <line x1="101" y1="64" x2="114" y2="64" stroke="#9070B0" strokeWidth="0.8" />
      {/* Cat cheek blush */}
      <ellipse cx="82" cy="56" rx="5" ry="3" fill="#FFAACC" opacity="0.45" />
      <ellipse cx="106" cy="56" rx="5" ry="3" fill="#FFAACC" opacity="0.45" />

      {/* === Center Hearts === */}
      {/* Big red heart */}
      <path d="M60 62 Q60 50 50 50 Q44 50 44 58 Q44 66 60 74 Q76 66 76 58 Q76 50 70 50 Q60 50 60 62 Z" fill="#FF4D7A" />
      {/* Small pink hearts floating */}
      <path d="M46 30 Q46 25 41 25 Q38 25 38 29 Q38 33 46 37 Q54 33 54 29 Q54 25 51 25 Q46 25 46 30 Z" fill="#FF99BB" opacity="0.7" />
      <path d="M74 28 Q74 24 70 24 Q67 24 67 27 Q67 31 74 34 Q81 31 81 27 Q81 24 78 24 Q74 24 74 28 Z" fill="#FF99BB" opacity="0.7" />
      {/* Sparkles (SVG paths, no <text> node) */}
      <path d="M96 102 L97.5 106 L101 107 L97.5 108 L96 112 L94.5 108 L91 107 L94.5 106 Z" fill="#FFD700" opacity="0.85" />
      <path d="M18 102 L19.5 106 L23 107 L19.5 108 L18 112 L16.5 108 L13 107 L16.5 106 Z" fill="#FFD700" opacity="0.85" />

      {/* Body hints */}
      <ellipse cx="26" cy="82" rx="20" ry="14" fill="#F5A85A" />
      <ellipse cx="94" cy="82" rx="20" ry="14" fill="#C4A0DC" />
    </svg>
  );
}

// Paw print icon for decorative use
export function PawPrint({ size = 24, color = "#FF6B9D" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <circle cx="9" cy="4" r="2.5" />
      <circle cx="15" cy="4" r="2.5" />
      <circle cx="5" cy="9" r="2.3" />
      <circle cx="19" cy="9" r="2.3" />
      <path d="M12 22 Q5 20 4 13 Q4 9 8 9 Q10 9 12 12 Q14 9 16 9 Q20 9 20 13 Q19 20 12 22 Z" />
    </svg>
  );
}
