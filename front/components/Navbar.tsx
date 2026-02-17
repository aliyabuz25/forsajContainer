import React, { useState } from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import { useSiteContent } from '../hooks/useSiteContent';

interface NavbarProps {
  currentView: 'home' | 'about' | 'news' | 'events' | 'drivers' | 'rules' | 'contact' | 'gallery';
  onViewChange: (view: 'home' | 'about' | 'news' | 'events' | 'drivers' | 'rules' | 'contact' | 'gallery') => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentView, onViewChange }) => {
  const { getPage, language, setSiteLanguage } = useSiteContent('navbar');
  const { getImage: getImageGeneral } = useSiteContent('general');
  const [isLangOpen, setIsLangOpen] = useState(false);

  const navbarPage = getPage('navbar');
  const logoImg = getImageGeneral('SITE_LOGO_LIGHT').path;

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

  const viewIds = new Set(['home', 'about', 'news', 'events', 'drivers', 'gallery', 'rules', 'contact']);
  const normalize = (value: string) =>
    (value || '')
      .toLocaleLowerCase('az')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '');

  const inferViewFromText = (value: string): string | null => {
    const token = normalize(value);
    if (token.includes('anashe') || token.includes('anasif')) return 'home';
    if (token.includes('haqqimizda')) return 'about';
    if (token.includes('xeber') || token.includes('xber') || token.includes('xbr')) return 'news';
    if (token.includes('tedbir') || token.includes('tdbir') || token.includes('tebdir')) return 'events';
    if (token.includes('surucu') || token.includes('srucu') || token.includes('src')) return 'drivers';
    if (token.includes('qalereya') || token.includes('galereya')) return 'gallery';
    if (token.includes('qayda')) return 'rules';
    if (token.includes('elaqe') || token.includes('laq') || token.includes('elaq')) return 'contact';
    return null;
  };

  const navItems = (navbarPage?.sections || [])
    .filter((s) => {
      const label = (s.label || '').toUpperCase();
      const value = (s.value || '').toUpperCase();
      const url = (s.url || '').trim();
      if (!url) return false;
      if (label.includes('SITE_LOGO') || label.includes('ALT:')) return false;
      if (value.includes('SITE_LOGO') || value.includes('FORSAJ LOGO')) return false;
      return true;
    })
    .map((s) => {
      const name = (s.value || s.label || '').trim();
      const rawUrl = (s.url || '').trim();
      const inferred = inferViewFromText(name) || inferViewFromText(s.label || '');
      const normalizedUrl = normalize(rawUrl);

      let id = rawUrl;
      if (!rawUrl.startsWith('http')) {
        if (viewIds.has(rawUrl)) {
          id = rawUrl;
        } else if (viewIds.has(normalizedUrl)) {
          id = normalizedUrl;
        } else if (inferred) {
          id = inferred;
        } else {
          id = 'home';
        }
      }

      return { name, id };
    });

  const resolvedNavItems = navItems.length > 0 ? navItems : defaultNavItems;

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
            </h1>
          </div>
        )}
      </div>

      <div className="hidden lg:flex items-center gap-2 xl:gap-4">
        {resolvedNavItems.map((item, idx) => (
          <button
            key={`${item.id}-${idx}`}
            onClick={() => {
              if (item.id.startsWith('http')) {
                window.open(item.id, '_blank');
              } else {
                onViewChange((viewIds.has(item.id) ? item.id : 'home') as any);
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
          <span className="text-[11px] font-black italic text-white">{language}</span>
          <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform ${isLangOpen ? 'rotate-180' : ''}`} />
        </button>

        {isLangOpen && (
          <div className="absolute right-0 mt-3 w-28 bg-[#111] border border-white/10 shadow-2xl z-50 py-2 rounded-sm overflow-hidden">
            {languages.map((lang) => (
              <button
                key={lang}
                onClick={() => {
                  setSiteLanguage(lang as any);
                  setIsLangOpen(false);
                }}
                className={`w-full text-left px-5 py-3 text-[10px] font-black italic hover:bg-[#FF4D00] hover:text-black transition-all ${language === lang ? 'text-[#FF4D00]' : 'text-gray-500'
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
