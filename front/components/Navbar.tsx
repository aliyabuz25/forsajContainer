import React, { useState } from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import { useSiteContent } from '../hooks/useSiteContent';

interface NavbarProps {
  currentView: 'home' | 'about' | 'news' | 'events' | 'drivers' | 'rules' | 'contact' | 'gallery';
  onViewChange: (view: 'home' | 'about' | 'news' | 'events' | 'drivers' | 'rules' | 'contact' | 'gallery') => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentView, onViewChange }) => {
  const { getPage, getImage } = useSiteContent('navbar');
  const { getImage: getImageGeneral } = useSiteContent('general');
  const [currentLang, setCurrentLang] = useState('AZ');
  const [isLangOpen, setIsLangOpen] = useState(false);

  const navbarPage = getPage('navbar');
  const logoImg = getImageGeneral('SITE_LOGO_LIGHT').path;

  // Default items as fallback
  const defaultNavItems = [
    { name: 'ANA SƏHİFƏ', id: 'home' },
    { name: 'HAQQIMIZDA', id: 'about' },
    { name: 'XƏBƏRLƏR', id: 'news' },
    { name: 'TƏDBİRLƏR', id: 'events' },
    { name: 'SÜRÜCÜLƏR', id: 'drivers' },
    { name: 'QALEREYA', id: 'gallery' },
    { name: 'QAYDALAR', id: 'rules' },
    { name: 'ƏLAQƏ', id: 'contact' },
  ];

  const navItems = [
    { name: 'ANA SƏHİFƏ', id: 'home' },
    { name: 'HAQQIMIZDA', id: 'about' },
    { name: 'XƏBƏRLƏR', id: 'news' },
    { name: 'TƏDBİRLƏR', id: 'events' },
    { name: 'SÜRÜCÜLƏR', id: 'drivers' },
    { name: 'QALEREYA', id: 'gallery' },
    { name: 'QAYDALAR', id: 'rules' },
    { name: 'ƏLAQƏ', id: 'contact' },
  ];


  const languages = ['AZ', 'RU', 'ENG'];

  return (
    <nav className="sticky top-0 z-50 bg-[#0A0A0A]/95 backdrop-blur-md border-b border-white/5 px-6 lg:px-20 py-4 flex items-center justify-between shadow-2xl">
      <div
        className="flex items-center gap-3 cursor-pointer group"
        onClick={() => onViewChange('home')}
      >
        {logoImg ? (
          <img src={logoImg} alt="Forsaj Logo" className="h-12 w-auto object-contain transition-transform group-hover:scale-105" />
        ) : (
          <div className="flex items-center gap-3">
            <div className="bg-[#FF4D00] w-10 h-10 rounded-sm flex items-center justify-center relative shadow-[0_0_20px_rgba(255,77,0,0.4)] group-hover:scale-110 transition-transform">
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-black fill-current transform -rotate-12">
                <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
              </svg>
            </div>
            <h1 className="text-2xl font-black italic tracking-tighter flex items-center">
              <span className="text-white">FORSAJ</span>
              <span className="text-[#FF4D00] ml-1">CLUB</span>
              <span className="text-[8px] text-gray-500 ml-2 opacity-50">FIXED</span>
            </h1>
          </div>
        )}
      </div>

      <div className="hidden lg:flex items-center gap-2 xl:gap-4">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              if (item.id.startsWith('http')) {
                window.open(item.id, '_blank');
              } else {
                onViewChange(item.id as any);
              }
            }}
            className={`px-4 py-2 text-[10px] xl:text-[11px] font-black italic transition-all uppercase tracking-tight relative transform -skew-x-12 ${currentView === item.id
              ? 'bg-[#FF4D00] text-black shadow-[0_0_25px_rgba(255,77,0,0.25)] border-2 border-[#FF4D00]'
              : 'text-gray-400 hover:text-white hover:bg-white/5 border-2 border-transparent'
              }`}
          >
            <span className="transform skew-x-12 block whitespace-nowrap">{item.name}</span>
          </button>
        ))}
      </div>

      <div className="relative">
        <button
          onClick={() => setIsLangOpen(!isLangOpen)}
          className="flex items-center gap-2 group cursor-pointer bg-white/5 px-4 py-2 rounded-sm border border-white/10 hover:border-[#FF4D00]/50 transition-all"
        >
          <Globe className="w-4 h-4 text-gray-500 group-hover:text-[#FF4D00]" />
          <span className="text-[11px] font-black italic text-white">{currentLang}</span>
          <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform ${isLangOpen ? 'rotate-180' : ''}`} />
        </button>

        {isLangOpen && (
          <div className="absolute right-0 mt-3 w-28 bg-[#111] border border-white/10 shadow-2xl z-50 py-2 rounded-sm overflow-hidden">
            {languages.map((lang) => (
              <button
                key={lang}
                onClick={() => {
                  setCurrentLang(lang);
                  setIsLangOpen(false);
                }}
                className={`w-full text-left px-5 py-3 text-[10px] font-black italic hover:bg-[#FF4D00] hover:text-black transition-all ${currentLang === lang ? 'text-[#FF4D00]' : 'text-gray-500'
                  }`}
              >
                {lang}
              </button>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
