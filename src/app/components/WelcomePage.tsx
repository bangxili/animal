import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { PawPrint } from './PetCartoonIcons';

const floatingPaws = [
  { x: 15, y: 12, delay: 0, size: 20, opacity: 0.25, rotate: 20 },
  { x: 75, y: 8, delay: 0.4, size: 16, opacity: 0.2, rotate: -15 },
  { x: 88, y: 30, delay: 0.8, size: 22, opacity: 0.3, rotate: 35 },
  { x: 5, y: 55, delay: 0.6, size: 18, opacity: 0.2, rotate: -20 },
  { x: 82, y: 62, delay: 1.0, size: 24, opacity: 0.25, rotate: 10 },
  { x: 25, y: 80, delay: 0.3, size: 15, opacity: 0.2, rotate: 45 },
  { x: 65, y: 88, delay: 0.7, size: 19, opacity: 0.22, rotate: -30 },
  { x: 50, y: 5, delay: 0.5, size: 14, opacity: 0.18, rotate: 0 },
];

export function WelcomePage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f0f0f0' }}>
      <div
        className="max-w-[390px] w-full min-h-screen relative overflow-hidden flex flex-col items-center justify-between pb-10"
        style={{
          background: 'linear-gradient(160deg, #FF6B9D 0%, #FF9A5C 40%, #FFCA80 80%, #FFF0A0 100%)',
        }}
      >
        {/* Floating paw prints */}
        {floatingPaws.map((p, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{ left: `${p.x}%`, top: `${p.y}%`, opacity: p.opacity }}
            animate={{ y: [0, -12, 0], rotate: [p.rotate, p.rotate + 8, p.rotate] }}
            transition={{ duration: 3.5 + i * 0.3, repeat: Infinity, ease: 'easeInOut', delay: p.delay }}
          >
            <PawPrint size={p.size} color="white" />
          </motion.div>
        ))}

        {/* Top spacer */}
        <div />

        {/* Main content */}
        <div className="flex flex-col items-center gap-6 px-8 mt-16">
          {/* Logo */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
            className="relative"
          >
            <div
              className="w-32 h-32 rounded-[40px] flex items-center justify-center shadow-2xl"
              style={{ background: 'rgba(255,255,255,0.9)' }}
            >
              {/* App icon - dog face */}
              <svg width="80" height="80" viewBox="0 0 100 100" fill="none">
                {/* Ears */}
                <ellipse cx="24" cy="42" rx="14" ry="22" fill="#FF9A5C" transform="rotate(-10 24 42)" />
                <ellipse cx="76" cy="42" rx="14" ry="22" fill="#FF9A5C" transform="rotate(10 76 42)" />
                {/* Head */}
                <circle cx="50" cy="58" r="38" fill="#FFCA7A" />
                {/* Snout */}
                <ellipse cx="50" cy="70" rx="18" ry="13" fill="#FFE0A0" />
                {/* Eyes */}
                <circle cx="37" cy="52" r="8" fill="white" />
                <circle cx="38" cy="53" r="5.5" fill="#333" />
                <circle cx="40" cy="51" r="1.8" fill="white" />
                <circle cx="63" cy="52" r="8" fill="white" />
                <circle cx="64" cy="53" r="5.5" fill="#333" />
                <circle cx="66" cy="51" r="1.8" fill="white" />
                {/* Nose */}
                <ellipse cx="50" cy="67" rx="7" ry="5" fill="#FF6B9D" />
                <ellipse cx="50" cy="68" rx="3.5" ry="2.5" fill="#CC3366" />
                {/* Mouth */}
                <path d="M43 74 Q50 80 57 74" stroke="#CC3366" fill="none" strokeWidth="1.8" strokeLinecap="round" />
                {/* Blush */}
                <ellipse cx="29" cy="62" rx="8" ry="5" fill="#FF8080" opacity="0.4" />
                <ellipse cx="71" cy="62" rx="8" ry="5" fill="#FF8080" opacity="0.4" />
                {/* Heart on head */}
                <path d="M50 32 Q50 25 44 25 Q40 25 40 30 Q40 36 50 42 Q60 36 60 30 Q60 25 56 25 Q50 25 50 32 Z" fill="#FF6B9D" />
              </svg>
            </div>

            {/* Glowing ring */}
            <motion.div
              className="absolute inset-0 rounded-[40px]"
              style={{ border: '3px solid rgba(255,255,255,0.5)' }}
              animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.9, 0.5] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            />
          </motion.div>

          {/* App name */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="flex flex-col items-center gap-2"
          >
            <h1
              className="text-white text-center"
              style={{ fontSize: '36px', fontWeight: 800, textShadow: '0 2px 8px rgba(0,0,0,0.15)', letterSpacing: '-0.5px' }}
            >
              爪爪远眺
            </h1>
            <p
              className="text-white/90 text-center"
              style={{ fontSize: '15px', fontWeight: 400, letterSpacing: '2px' }}
            >
              ✨ 宠物专属健康管家 ✨
            </p>
          </motion.div>

          {/* Feature badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="flex flex-wrap justify-center gap-2 mt-2"
          >
            {['🐾 智能问诊', '🍖 营养食谱', '🧬 基因检测', '💕 宠物配对'].map((t) => (
              <span
                key={t}
                className="px-3 py-1.5 rounded-full text-xs text-white"
                style={{ background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.4)' }}
              >
                {t}
              </span>
            ))}
          </motion.div>

          {/* Cute pet illustrations */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.9, duration: 0.5 }}
            className="flex gap-4 mt-2"
          >
            {['🐶', '🐱', '🐹', '🐰', '🐾'].map((emoji, i) => (
              <motion.span
                key={i}
                style={{ fontSize: '28px' }}
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.25, ease: 'easeInOut' }}
              >
                {emoji}
              </motion.span>
            ))}
          </motion.div>
        </div>

        {/* Bottom section */}
        <div className="flex flex-col items-center gap-4 w-full px-8">
          {/* Start button */}
          <motion.button
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, type: 'spring', stiffness: 200 }}
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => navigate('/setup')}
            className="w-full py-4 rounded-3xl text-base font-bold shadow-lg flex items-center justify-center gap-2"
            style={{
              background: 'rgba(255,255,255,0.95)',
              color: '#FF6B9D',
              boxShadow: '0 8px 32px rgba(255,107,157,0.4)',
            }}
          >
            <PawPrint size={20} color="#FF6B9D" />
            开始探索毛毛世界
            <PawPrint size={20} color="#FF6B9D" />
          </motion.button>

          {/* Login hint */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
            className="text-white/80 text-center"
            style={{ fontSize: '12px' }}
          >
            微信登录 · 保护隐私 · 安全可信
          </motion.p>

          {/* Version */}
          <p className="text-white/50" style={{ fontSize: '11px' }}>
            爪爪远眺 v1.0.0 · 让每一只毛孩子都健康快乐 🐾
          </p>
        </div>
      </div>
    </div>
  );
}
