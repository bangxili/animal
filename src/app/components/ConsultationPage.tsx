import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Mic, Image as ImageIcon, Plus } from 'lucide-react';
import { MiniAppShell } from './MiniAppShell';
import { BorderCollieDoctor, PawPrint } from './PetCartoonIcons';
import type { PetProfileRecord } from '../lib/petProfileDb';
import { getPetProfileById } from '../lib/petProfileDb';
import { getChatMessagesByUserPet, saveChatMessage } from '../lib/petChatDb';
import { apiAskConsultation, apiGetConsultationHistory, getBackendPetId } from '../lib/backendApi';

interface Message {
  id: number;
  role: 'user' | 'doctor';
  text: string;
  time: string;
  imageUrl?: string;
}

function makeInitialDoctorMessage(petName: string): Message {
  return {
    id: 1,
    role: 'doctor',
    text: `汪汪！你好呀！我是毛毛健康的AI宠物医生🐾，你可以叫我"毛博士"！我专门负责宠物健康咨询哦～\n\n请问你的${petName}今天有什么不舒服吗？🌟`,
    time: '09:30',
  };
}

const quickReplies = ['最近不爱吃饭', '频繁挠耳朵', '走路姿势异常', '精神状态差', '体重突然下降', '毛发脱落严重'];

export function ConsultationPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [petProfile, setPetProfile] = useState<PetProfileRecord | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [attachedImage, setAttachedImage] = useState<File | null>(null);
  const [attachedImagePreview, setAttachedImagePreview] = useState<string>('');

  const userId = useMemo(() => localStorage.getItem('current-user-id') || 'demo-user', []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    async function load() {
      const localPetId = localStorage.getItem('current-pet-id') || '';
      const backendPetId = await getBackendPetId();

      const profile = localPetId ? await getPetProfileById(localPetId) : null;
      setPetProfile(profile);

      if (backendPetId) {
        try {
          const apiHistory = await apiGetConsultationHistory(userId, backendPetId);
          if (apiHistory.length) {
            const mapped = apiHistory.map((m) => {
              const d = new Date(m.created_at);
              const time = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
              return {
                id: m.id,
                role: m.role === 'assistant' ? 'doctor' : 'user',
                text: m.content,
                time,
              } as Message;
            });
            setMessages(mapped);
            return;
          }
        } catch {
          // API 不可用时回退本地缓存
        }
      }

      if (localPetId) {
        const history = await getChatMessagesByUserPet(userId, localPetId);
        if (history.length) {
          const toMessage = (m: (typeof history)[number]): Message => {
            const d = new Date(m.createdAt);
            const time = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
            return { id: Number(m.id) || Date.now(), role: m.role, text: m.text, time };
          };
          setMessages(history.map(toMessage));
          return;
        }
      }

      setMessages([makeInitialDoctorMessage(profile?.name || '毛毛')]);
    }

    load();
  }, [userId]);

  const sendMessage = async (text: string) => {
    if (!text.trim() && !attachedImage) return;
    const now = new Date();
    const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

    const imageToAttach = attachedImage;
    const imagePreviewUrl = attachedImagePreview;
    // 清除附件状态（但不 revoke preview URL，因为要在聊天气泡中显示）
    if (imageToAttach) {
      setAttachedImage(null);
      setAttachedImagePreview('');
    }

    const displayText = text.trim() || (imageToAttach ? '[图片]' : '');
    const userMsg: Message = { id: Date.now(), role: 'user', text: displayText, time, imageUrl: imagePreviewUrl || undefined };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    const localPetId = localStorage.getItem('current-pet-id') || '';
    const backendId = await getBackendPetId();
    if (localPetId) {
      await saveChatMessage({
        id: String(userMsg.id),
        userId,
        petId: localPetId,
        role: 'user',
        text: displayText,
        image: imageToAttach || undefined,
        imageName: imageToAttach?.name,
        createdAt: new Date().toISOString(),
      });
    }

    setTimeout(async () => {
      let replyText = '';

      if (backendId) {
        try {
          const apiRes = await apiAskConsultation({
            userId,
            petId: backendId,
            question: text.trim() || '请分析这张图片中宠物的健康状况',
            image: imageToAttach,
          });
          replyText = apiRes.answer;
        } catch (error) {
          replyText = '抱歉，我暂时无法回答你的问题。请检查网络连接或稍后再试。如果问题持续，建议直接前往宠物医院就诊。🏥';
          console.error('API调用失败:', error);
        }
      } else {
        replyText = '请先创建宠物档案，我才能为你提供专业的健康咨询哦！🐾';
      }

      const reply: Message = {
        id: Date.now() + 1,
        role: 'doctor',
        text: replyText,
        time: `${now.getHours()}:${String(now.getMinutes() + 1).padStart(2, '0')}`,
      };

      setMessages((prev) => [...prev, reply]);

      if (localPetId) {
        await saveChatMessage({
          id: String(reply.id),
          userId,
          petId: localPetId,
          role: 'doctor',
          text: reply.text,
          createdAt: new Date().toISOString(),
        });
      }

      setIsTyping(false);
    }, 800);
  };

  return (
    <MiniAppShell
      title="宠物问诊"
      showBack
      bgColor="bg-[#EEF6FF]"
      titleColor="text-[#5B8DEF]"
    >
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#F0F6FF' }}>
        {/* Doctor Banner */}
        <div
          className="px-5 py-4 flex items-center gap-4"
          style={{ background: 'linear-gradient(135deg, #5B8DEF, #7EC8E3)', borderRadius: '0 0 24px 24px' }}
        >
          <div className="flex-shrink-0">
            <BorderCollieDoctor size={64} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-white font-bold" style={{ fontSize: '16px' }}>毛博士</span>
              <span
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-white"
                style={{ background: 'rgba(255,255,255,0.25)' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-300 inline-block" />
                在线中
              </span>
            </div>
            <p className="text-white/80" style={{ fontSize: '12px' }}>AI宠物健康顾问 · 专业可信赖</p>
            <div className="flex gap-2 mt-1">
              {['🩺 智能问诊', '📋 健康报告', '💊 用药建议'].map((t) => (
                <span key={t} className="text-xs text-white/70" style={{ fontSize: '10px' }}>{t}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                {msg.role === 'doctor' ? (
                  <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: '#EEF6FF', border: '2px solid #7EC8E3' }}>
                    <span style={{ fontSize: '18px' }}>🐕</span>
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: '#FFE0F0', border: '2px solid #FF9DBB' }}>
                    <span style={{ fontSize: '18px' }}>👤</span>
                  </div>
                )}

                <div className={`flex flex-col gap-1 max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {msg.imageUrl && (
                    <img
                      src={msg.imageUrl}
                      alt="上传的图片"
                      className="rounded-2xl object-cover"
                      style={{ maxWidth: '180px', maxHeight: '180px', border: '2px solid #D0E0FF' }}
                    />
                  )}
                  <div
                    className="px-4 py-3 rounded-2xl text-sm leading-relaxed"
                    style={{
                      background: msg.role === 'doctor' ? 'white' : '#5B8DEF',
                      color: msg.role === 'doctor' ? '#333' : 'white',
                      borderRadius: msg.role === 'doctor' ? '4px 18px 18px 18px' : '18px 4px 18px 18px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {msg.text}
                  </div>
                  <span style={{ fontSize: '10px', color: '#AAA' }}>{msg.time}</span>
                </div>
              </motion.div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-2 items-end"
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#EEF6FF', border: '2px solid #7EC8E3' }}>
                  <span style={{ fontSize: '18px' }}>🐕</span>
                </div>
                <div className="px-4 py-3 rounded-2xl flex gap-1 items-center" style={{ background: 'white', borderRadius: '4px 18px 18px 18px' }}>
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 rounded-full"
                      style={{ background: '#5B8DEF' }}
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>

        {/* Image attachment preview */}
        {attachedImage && (
          <div className="px-4 -mt-1 pb-2">
            <div
              className="rounded-2xl flex items-center gap-3 px-3 py-2"
              style={{ background: '#FFF0F7', border: '1.5px solid #FFD0E8' }}
            >
              <img
                src={attachedImagePreview}
                alt="上传的图片预览"
                className="w-14 h-14 rounded-xl object-cover"
              />
              <div className="flex-1">
                <div className="text-xs font-semibold" style={{ color: '#333' }}>{attachedImage.name}</div>
                <button
                  onClick={() => {
                    URL.revokeObjectURL(attachedImagePreview);
                    setAttachedImage(null);
                    setAttachedImagePreview('');
                  }}
                  className="text-xs font-semibold mt-1"
                  style={{ color: '#FF6B9D' }}
                >
                  移除
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick replies */}
        <div className="px-4 py-2 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {quickReplies.map((r) => (
            <button
              key={r}
              onClick={() => sendMessage(r)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
              style={{
                background: '#EEF6FF',
                color: '#5B8DEF',
                border: '1.5px solid #C0D8FF',
              }}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Input bar */}
        <div
          className="px-4 py-3 flex items-center gap-2"
          style={{ background: 'white', borderTop: '1px solid #E0EEFF' }}
        >
          <button className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#EEF6FF' }}>
            <Plus size={18} color="#5B8DEF" />
          </button>
          <input
            type="text"
            placeholder="描述宠物的症状..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
            className="flex-1 px-4 py-2.5 rounded-2xl outline-none text-sm"
            style={{ background: '#F0F6FF', border: '1.5px solid #C0D8FF', color: '#333' }}
          />
          <input
            ref={imageInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              if (!file) return;
              if (attachedImagePreview) URL.revokeObjectURL(attachedImagePreview);
              const previewUrl = URL.createObjectURL(file);
              setAttachedImage(file);
              setAttachedImagePreview(previewUrl);
            }}
          />
          <button
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: '#EEF6FF' }}
            onClick={() => imageInputRef.current?.click()}
          >
            <ImageIcon size={18} color="#5B8DEF" />
          </button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => sendMessage(input)}
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: input ? '#5B8DEF' : '#C0D8FF' }}
          >
            <Send size={18} color="white" />
          </motion.button>
        </div>
      </div>
    </MiniAppShell>
  );
}
