import { useNavigate } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import { PawPrint } from './PetCartoonIcons';
import type { ReactNode } from 'react';

interface MiniAppShellProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  bgColor?: string;
  titleColor?: string;
  rightAction?: ReactNode;
}

export function MiniAppShell({
  children,
  title,
  showBack = false,
  onBack,
  bgColor = 'bg-white',
  titleColor = 'text-gray-800',
  rightAction,
}: MiniAppShellProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) onBack();
    else navigate(-1);
  };

  return (
    <div className="min-h-screen" style={{ background: '#f0f0f0' }}>
      <div className="max-w-[390px] mx-auto min-h-screen flex flex-col shadow-2xl relative" style={{ background: '#fff' }}>
        {/* WeChat Status Bar */}
        <div
          className={`flex items-center justify-between px-5 pt-2 pb-1 ${bgColor}`}
          style={{ height: '44px' }}
        >
          <span className="text-xs font-semibold text-gray-700">9:41</span>
          <div className="flex items-center gap-1.5">
            <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
              <rect x="0" y="6" width="3" height="4" rx="0.5" fill="#333" />
              <rect x="4" y="4" width="3" height="6" rx="0.5" fill="#333" />
              <rect x="8" y="2" width="3" height="8" rx="0.5" fill="#333" />
              <rect x="12" y="0" width="3" height="10" rx="0.5" fill="#333" />
            </svg>
            <svg width="15" height="11" viewBox="0 0 15 11" fill="none">
              <path d="M7.5 2.2 Q11.5 2.2 13.5 4.8" stroke="#333" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              <path d="M7.5 4.5 Q10 4.5 11.5 6.5" stroke="#333" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              <path d="M7.5 6.8 Q8.5 6.8 9.5 8" stroke="#333" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              <circle cx="7.5" cy="9.5" r="1.2" fill="#333" />
            </svg>
            <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
              <rect x="0" y="1" width="21" height="10" rx="2" stroke="#333" strokeWidth="1.2" />
              <rect x="22" y="4" width="2.5" height="5" rx="1" fill="#333" />
              <rect x="1.5" y="2.5" width="16" height="7" rx="1.2" fill="#333" />
            </svg>
          </div>
        </div>

        {/* Navigation Bar */}
        {title !== undefined && (
          <div
            className={`flex items-center px-4 ${bgColor} relative`}
            style={{ height: '44px' }}
          >
            {showBack && (
              <button
                onClick={handleBack}
                className="absolute left-3 flex items-center justify-center w-8 h-8 rounded-full hover:bg-black/5 transition-colors"
              >
                <ChevronLeft size={22} className={titleColor} />
              </button>
            )}
            <div className="flex items-center gap-1.5 mx-auto">
              {!showBack && <PawPrint size={14} color="#FF6B9D" />}
              <span className={`text-sm font-semibold ${titleColor}`}>{title}</span>
              {!showBack && <PawPrint size={14} color="#FF6B9D" />}
            </div>
            {rightAction && (
              <div className="absolute right-4">{rightAction}</div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
      </div>
    </div>
  );
}