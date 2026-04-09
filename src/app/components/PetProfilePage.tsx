import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Camera, ChevronDown, Check } from 'lucide-react';
import { MiniAppShell } from './MiniAppShell';
import { PawPrint } from './PetCartoonIcons';
import { savePetProfile } from '../lib/petProfileDb';
import { apiCreatePetProfile, apiUploadPetPhotos } from '../lib/backendApi';

const petTypes = ['狗狗', '猫猫', '仓鼠', '兔子', '鸟类', '其他'];
const BREEDS_BY_TYPE: Record<string, string[]> = {
  狗狗: ['金毛', '拉布拉多', '柯基', '柴犬', '边牧', '哈士奇', '贵宾(泰迪)', '比熊', '法斗', '萨摩耶', '阿拉斯加', '德牧', '杜宾', '秋田犬', '雪纳瑞', '腊肠犬', '博美', '巴哥', '马尔济斯', '约克夏', '其他'],
  猫猫: ['英短', '美短', '布偶', '暹罗', '波斯猫', '缅因猫', '异国短毛猫', '德文卷毛猫', '狸花猫', '橘猫', '其他'],
  兔子: ['荷兰兔', '垂耳兔', '侏儒兔', '狮子兔', '安哥拉兔', '雷克斯兔', '其他'],
  鸟类: ['虎皮鹦鹉', '玄凤鹦鹉', '牡丹鹦鹉', '文鸟', '金丝雀', '八哥', '相思鸟', '其他'],
  仓鼠: ['金丝熊', '三线仓鼠', '一线仓鼠', '罗伯罗夫斯基仓鼠', '紫仓', '银狐', '其他'],
  其他: ['其他'],
};

const genderOptions = [
  { value: 'male', label: '男生 ♂', color: '#5B8DEF', bg: '#EEF4FF' },
  { value: 'female', label: '女生 ♀', color: '#FF6B9D', bg: '#FFF0F7' },
];

const steps = ['基本信息', '身体数据', '上传照片'];

export function PetProfilePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const frontPhotoInputRef = useRef<HTMLInputElement>(null);
  const sidePhotoInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: '',
    age: '',
    ageUnit: '岁',
    gender: '',
    petType: '',
    breed: '',
    customBreed: '',
    weight: '',
    length: '',
    frontPhotoUploaded: false,
    sidePhotoUploaded: false,
    frontPhotoFile: null as File | null,
    sidePhotoFile: null as File | null,
    frontPhotoPreview: '',
    sidePhotoPreview: '',
  });
  const [showBreedDropdown, setShowBreedDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('');

  const breeds = BREEDS_BY_TYPE[form.petType] ?? ['其他'];
  const finalBreed = form.breed === '其他' ? form.customBreed.trim() : form.breed;

  const canNext = () => {
    if (step === 0) return form.name && form.age && form.gender && form.petType;
    if (step === 1) return form.weight && form.length;
    return form.frontPhotoUploaded && form.sidePhotoUploaded;
  };

  const handleNext = async () => {
    if (step < 2) {
      setStep(step + 1);
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('正在创建宠物档案...');

    const userId = localStorage.getItem('current-user-id') || 'demo-user';
    const localId = crypto.randomUUID();
    await savePetProfile({
      id: localId,
      userId,
      name: form.name,
      age: form.age,
      ageUnit: form.ageUnit,
      gender: form.gender,
      petType: form.petType,
      breed: finalBreed,
      weight: form.weight,
      length: form.length,
      frontPhoto: form.frontPhotoFile || undefined,
      sidePhoto: form.sidePhotoFile || undefined,
      frontPhotoName: form.frontPhotoFile?.name,
      sidePhotoName: form.sidePhotoFile?.name,
      createdAt: new Date().toISOString(),
    });

    try {
      const created = await apiCreatePetProfile({
        userId,
        name: form.name,
        age: form.age ? Number(form.age) : undefined,
        ageUnit: form.ageUnit,
        gender: form.gender,
        petType: form.petType,
        breed: finalBreed,
        weight: form.weight ? Number(form.weight) : undefined,
        length: form.length ? Number(form.length) : undefined,
      });
      localStorage.setItem('current-pet-id', created.id);

      setSubmitStatus('正在生成Q版卡通头像，请稍候...');
      await apiUploadPetPhotos(created.id, form.frontPhotoFile, form.sidePhotoFile);
    } catch {
      localStorage.setItem('current-pet-id', localId);
    }
    setIsSubmitting(false);
    navigate('/home');
  };

  const handleFrontPhotoChange = (file: File | null) => {
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setForm((prev) => ({
      ...prev,
      frontPhotoUploaded: true,
      frontPhotoFile: file,
      frontPhotoPreview: previewUrl,
    }));
  };

  const handleSidePhotoChange = (file: File | null) => {
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setForm((prev) => ({
      ...prev,
      sidePhotoUploaded: true,
      sidePhotoFile: file,
      sidePhotoPreview: previewUrl,
    }));
  };

  return (
    <MiniAppShell
      title="建立宠物档案"
      showBack={step > 0}
      onBack={() => setStep(step - 1)}
      bgColor="bg-[#FFF5F8]"
      titleColor="text-[#FF6B9D]"
    >
      <div
        className="flex-1 flex flex-col overflow-y-auto"
        style={{ background: 'linear-gradient(180deg, #FFF5F8 0%, #FFF8FF 100%)' }}
      >
        {/* Progress Steps */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center justify-between mb-4">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-1">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                    style={{
                      background: i <= step ? '#FF6B9D' : '#F0E0E8',
                      color: i <= step ? 'white' : '#CCA0B0',
                    }}
                  >
                    {i < step ? <Check size={14} /> : i + 1}
                  </div>
                  <span className="text-xs" style={{ color: i <= step ? '#FF6B9D' : '#CCA0B0', fontWeight: i === step ? 600 : 400 }}>
                    {s}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className="flex-1 h-0.5 mx-1 mb-4 rounded-full transition-all duration-300" style={{ background: i < step ? '#FF6B9D' : '#F0E0E8', width: '40px' }} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 px-5 pb-4 flex flex-col gap-4">
            {/* Step 0: Basic Info */}
            {step === 0 && (
              <>
                <SectionCard title="🐾 宠物名字">
                  <input
                    type="text"
                    placeholder="给你的毛孩子起个名字~"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl outline-none text-sm"
                    style={{ background: '#FFF0F7', border: '1.5px solid #FFD0E8', color: '#444' }}
                  />
                </SectionCard>

                <SectionCard title="🎂 宠物年龄">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="年龄"
                      value={form.age}
                      onChange={(e) => setForm({ ...form, age: e.target.value })}
                      className="flex-1 px-4 py-3 rounded-2xl outline-none text-sm"
                      style={{ background: '#FFF0F7', border: '1.5px solid #FFD0E8', color: '#444' }}
                    />
                    <div className="flex rounded-2xl overflow-hidden" style={{ border: '1.5px solid #FFD0E8' }}>
                      {['岁', '个月'].map((u) => (
                        <button
                          key={u}
                          onClick={() => setForm({ ...form, ageUnit: u })}
                          className="px-3 py-3 text-xs font-medium transition-all"
                          style={{
                            background: form.ageUnit === u ? '#FF6B9D' : '#FFF0F7',
                            color: form.ageUnit === u ? 'white' : '#FF9DBB',
                          }}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title="⚧ 宠物性别">
                  <div className="flex gap-3">
                    {genderOptions.map((g) => (
                      <button
                        key={g.value}
                        onClick={() => setForm({ ...form, gender: g.value })}
                        className="flex-1 py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                        style={{
                          background: form.gender === g.value ? g.color : g.bg,
                          color: form.gender === g.value ? 'white' : g.color,
                          border: `2px solid ${form.gender === g.value ? g.color : 'transparent'}`,
                        }}
                      >
                        <Check size={14} style={{ visibility: form.gender === g.value ? 'visible' : 'hidden' }} />
                        {g.label}
                      </button>
                    ))}
                  </div>
                </SectionCard>

                <SectionCard title="🐶 宠物类型">
                  <div className="grid grid-cols-3 gap-2">
                    {petTypes.map((t) => (
                      <button
                        key={t}
                        onClick={() => setForm({ ...form, petType: t, breed: '', customBreed: '' })}
                        className="py-2.5 rounded-2xl text-sm font-medium transition-all"
                        style={{
                          background: form.petType === t ? '#FF6B9D' : '#FFF0F7',
                          color: form.petType === t ? 'white' : '#FF9DBB',
                          border: `1.5px solid ${form.petType === t ? '#FF6B9D' : '#FFD0E8'}`,
                        }}
                      >
                        {t === '狗狗' ? '🐶' : t === '猫猫' ? '🐱' : t === '仓鼠' ? '🐹' : t === '兔子' ? '🐰' : t === '鸟类' ? '🐦' : '🐾'} {t}
                      </button>
                    ))}
                  </div>
                </SectionCard>

                {form.petType && (
                  <SectionCard title="🔍 宠物品种">
                    <div
                      className="flex items-center justify-between px-4 py-3 rounded-2xl cursor-pointer"
                      style={{ background: '#FFF0F7', border: '1.5px solid #FFD0E8' }}
                      onClick={() => setShowBreedDropdown(!showBreedDropdown)}
                    >
                      <span className="text-sm" style={{ color: form.breed ? '#444' : '#CCA0B0' }}>
                        {form.breed || '选择品种'}
                      </span>
                      <ChevronDown size={16} color="#FF9DBB" className={`transition-transform ${showBreedDropdown ? 'rotate-180' : ''}`} />
                    </div>
                    {showBreedDropdown && (
                      <div className="mt-1 rounded-2xl overflow-hidden shadow-lg" style={{ border: '1.5px solid #FFD0E8' }}>
                        {breeds.map((b) => (
                          <div
                            key={b}
                            className="px-4 py-2.5 text-sm cursor-pointer hover:bg-pink-50 transition-colors"
                            style={{ color: '#444', background: form.breed === b ? '#FFE0F0' : 'white' }}
                            onClick={() => {
                              setForm({ ...form, breed: b, customBreed: b === '其他' ? form.customBreed : '' });
                              setShowBreedDropdown(false);
                            }}
                          >
                            {form.breed === b && <span className="mr-2 text-pink-500">✓</span>}
                            {b}
                          </div>
                        ))}
                      </div>
                    )}
                    {form.breed === '其他' && (
                      <input
                        type="text"
                        placeholder="请输入宠物品种"
                        value={form.customBreed}
                        onChange={(e) => setForm({ ...form, customBreed: e.target.value })}
                        className="w-full mt-2 px-4 py-3 rounded-2xl outline-none text-sm"
                        style={{ background: '#FFF0F7', border: '1.5px solid #FFD0E8', color: '#444' }}
                      />
                    )}
                  </SectionCard>
                )}
              </>
            )}

            {/* Step 1: Body Measurements */}
            {step === 1 && (
              <>
                <div className="flex items-center justify-center py-4">
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    style={{ fontSize: '80px' }}
                  >
                    {form.petType === '狗狗' ? '🐶' : form.petType === '猫猫' ? '🐱' : form.petType === '仓鼠' ? '🐹' : form.petType === '兔子' ? '🐰' : '🐾'}
                  </motion.div>
                </div>
                <p className="text-center text-sm mb-2" style={{ color: '#FF9DBB' }}>
                  记录 <span style={{ color: '#FF6B9D', fontWeight: 700 }}>{form.name || '毛孩子'}</span> 的身体数据
                </p>

                <SectionCard title="⚖️ 体重">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="请输入体重"
                      value={form.weight}
                      onChange={(e) => setForm({ ...form, weight: e.target.value })}
                      className="flex-1 px-4 py-3 rounded-2xl outline-none text-sm"
                      style={{ background: '#FFF0F7', border: '1.5px solid #FFD0E8', color: '#444' }}
                    />
                    <span className="text-sm font-medium px-3" style={{ color: '#FF6B9D' }}>千克</span>
                  </div>
                </SectionCard>

                <SectionCard title="📏 身长">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="从头到尾巴根部"
                      value={form.length}
                      onChange={(e) => setForm({ ...form, length: e.target.value })}
                      className="flex-1 px-4 py-3 rounded-2xl outline-none text-sm"
                      style={{ background: '#FFF0F7', border: '1.5px solid #FFD0E8', color: '#444' }}
                    />
                    <span className="text-sm font-medium px-3" style={{ color: '#FF6B9D' }}>厘米</span>
                  </div>
                </SectionCard>

                <SectionCard title="🏥 健康备注">
                  <textarea
                    placeholder="是否有过敏史、慢性病或其他需要注意的健康信息？（可选）"
                    rows={3}
                    className="w-full px-4 py-3 rounded-2xl outline-none text-sm resize-none"
                    style={{ background: '#FFF0F7', border: '1.5px solid #FFD0E8', color: '#444' }}
                  />
                </SectionCard>
              </>
            )}

            {/* Step 2: Photo Upload */}
            {step === 2 && (
              <>
                <div className="flex flex-col items-center gap-4 py-4">
                  <motion.div
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    style={{ fontSize: '60px' }}
                  >
                    📸
                  </motion.div>
                  <p className="text-center font-semibold" style={{ color: '#FF6B9D', fontSize: '16px' }}>
                    上传 {form.name || '毛孩子'} 的正面照和侧面照
                  </p>
                  <p className="text-center text-xs" style={{ color: '#AAA' }}>
                    两个角度的照片有助于AI进行更准确的基因检测和健康分析
                  </p>
                </div>

                {/* Upload areas */}
                <div className="mx-2 flex flex-col gap-3">
                  <input
                    ref={frontPhotoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    className="hidden"
                    onChange={(e) => handleFrontPhotoChange(e.target.files?.[0] || null)}
                  />
                  <motion.div
                    whileTap={{ scale: 0.98 }}
                    onClick={() => frontPhotoInputRef.current?.click()}
                    className="rounded-3xl p-6 flex flex-col items-center gap-3 cursor-pointer transition-all"
                    style={{
                      background: form.frontPhotoUploaded ? 'linear-gradient(135deg, #FFE0F0, #FFD0FF)' : '#FFF5F8',
                      border: '2.5px dashed #FFB0D0',
                    }}
                  >
                    <p className="text-sm font-semibold" style={{ color: '#FF6B9D' }}>正面照</p>
                    {form.frontPhotoUploaded ? (
                      <>
                        {form.frontPhotoPreview && (
                          <img
                            src={form.frontPhotoPreview}
                            alt="正面照预览"
                            className="w-20 h-20 rounded-2xl object-cover"
                            style={{ border: '1.5px solid #FFD0E8' }}
                          />
                        )}
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#4CAF50' }}>
                            <Check size={14} color="white" />
                          </div>
                          <span className="text-sm font-medium" style={{ color: '#4CAF50' }}>正面照已上传</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div
                          className="w-16 h-16 rounded-full flex items-center justify-center"
                          style={{ background: '#FFE0F0' }}
                        >
                          <Camera size={30} color="#FF9DBB" />
                        </div>
                        <p className="text-xs text-center" style={{ color: '#CCC' }}>点击上传清晰正脸照</p>
                      </>
                    )}
                  </motion.div>

                  <input
                    ref={sidePhotoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    className="hidden"
                    onChange={(e) => handleSidePhotoChange(e.target.files?.[0] || null)}
                  />
                  <motion.div
                    whileTap={{ scale: 0.98 }}
                    onClick={() => sidePhotoInputRef.current?.click()}
                    className="rounded-3xl p-6 flex flex-col items-center gap-3 cursor-pointer transition-all"
                    style={{
                      background: form.sidePhotoUploaded ? 'linear-gradient(135deg, #FFE0F0, #FFD0FF)' : '#FFF5F8',
                      border: '2.5px dashed #FFB0D0',
                    }}
                  >
                    <p className="text-sm font-semibold" style={{ color: '#FF6B9D' }}>侧面照</p>
                    {form.sidePhotoUploaded ? (
                      <>
                        {form.sidePhotoPreview && (
                          <img
                            src={form.sidePhotoPreview}
                            alt="侧面照预览"
                            className="w-20 h-20 rounded-2xl object-cover"
                            style={{ border: '1.5px solid #FFD0E8' }}
                          />
                        )}
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#4CAF50' }}>
                            <Check size={14} color="white" />
                          </div>
                          <span className="text-sm font-medium" style={{ color: '#4CAF50' }}>侧面照已上传</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div
                          className="w-16 h-16 rounded-full flex items-center justify-center"
                          style={{ background: '#FFE0F0' }}
                        >
                          <Camera size={30} color="#FF9DBB" />
                        </div>
                        <p className="text-xs text-center" style={{ color: '#CCC' }}>点击上传身体侧面照</p>
                      </>
                    )}
                  </motion.div>
                </div>

                <div className="mt-4 px-4 py-3 rounded-2xl mx-2" style={{ background: '#FFF0E8' }}>
                  <p className="text-xs font-medium mb-2" style={{ color: '#FF9A5C' }}>📋 档案预览</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { label: '名字', value: form.name },
                      { label: '年龄', value: form.age ? `${form.age}${form.ageUnit}` : '-' },
                      { label: '性别', value: form.gender === 'male' ? '♂ 男生' : form.gender === 'female' ? '♀ 女生' : '-' },
                      { label: '类型', value: form.petType || '-' },
                      { label: '品种', value: finalBreed || '-' },
                      { label: '体重', value: form.weight ? `${form.weight}kg` : '-' },
                    ].map((item) => (
                      <div key={item.label} className="flex justify-between text-xs">
                        <span style={{ color: '#AAA' }}>{item.label}：</span>
                        <span style={{ color: '#666', fontWeight: 500 }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

        {/* Next Button */}
        <div className="px-5 pb-6 pt-2">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleNext}
            disabled={!canNext() || isSubmitting}
            className="w-full py-4 rounded-3xl font-bold text-white flex items-center justify-center gap-2 transition-all"
            style={{
              background: canNext() && !isSubmitting
                ? 'linear-gradient(135deg, #FF6B9D, #FF9A5C)'
                : '#F5D0DC',
              boxShadow: canNext() && !isSubmitting ? '0 6px 20px rgba(255,107,157,0.4)' : 'none',
            }}
          >
            <PawPrint size={18} color="white" />
            {step < 2 ? '下一步' : '完成建档，出发！'}
            <PawPrint size={18} color="white" />
          </motion.button>
        </div>

        {/* 生成头像加载遮罩 */}
        {isSubmitting && (
          <div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4"
            style={{ background: 'rgba(255,245,248,0.95)' }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className="w-16 h-16 rounded-full"
              style={{
                border: '4px solid #FFD0E8',
                borderTopColor: '#FF6B9D',
              }}
            />
            <p className="text-sm font-semibold" style={{ color: '#FF6B9D' }}>
              {submitStatus}
            </p>
            <p className="text-xs" style={{ color: '#CCA0B0' }}>
              AI正在为{form.name || '毛孩子'}绘制专属头像
            </p>
          </div>
        )}
      </div>
    </MiniAppShell>
  );
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-white rounded-3xl px-4 py-4 shadow-sm" style={{ border: '1px solid #FFE0EE' }}>
      <p className="text-sm font-semibold mb-3" style={{ color: '#FF6B9D' }}>{title}</p>
      {children}
    </div>
  );
}