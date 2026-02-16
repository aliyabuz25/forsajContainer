import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useSiteContent } from '../hooks/useSiteContent';

interface HeroProps {
  onViewChange: (view: any) => void;
}

const Hero: React.FC<HeroProps> = ({ onViewChange }) => {
  const { getText, getImage, getUrl, isLoading } = useSiteContent('hero');

  const heroImg = getImage('hero-bg', 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=2070&auto=format&fit=crop');

  if (isLoading) return <div className="h-[85vh] bg-black animate-pulse"></div>;

  const handleAction = (key: string, defaultView: string) => {
    const url = getUrl(key, defaultView);
    if (url.startsWith('http')) {
      window.open(url, '_blank');
    } else {
      onViewChange(url as any);
    }
  };

  return (
    <section className="relative h-[85vh] flex items-center justify-center overflow-hidden bg-black">
      <div className="absolute inset-0 z-0">
        <img
          src={heroImg.path}
          alt={heroImg.alt}
          className="w-full h-full object-cover opacity-30 grayscale contrast-125 transition-all duration-700 hover:grayscale-0"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-black/40"></div>
      </div>

      <div className="relative z-10 text-center px-4 max-w-4xl">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-10 h-0.5 bg-[#FF4D00]"></div>
          <h3 className="text-[#FF4D00] font-black italic tracking-[0.3em] text-[10px] uppercase">
            {getText('text-0', 'AZERBAIJAN OFFROAD MOTORSPORT HUB')}
          </h3>
          <div className="w-10 h-0.5 bg-[#FF4D00]"></div>
        </div>
        <h2 className="text-6xl md:text-9xl font-black italic tracking-tighter leading-[0.85] mb-8 text-white uppercase">
          {getText('text-1', 'SƏRHƏDSİZ OFFROAD HƏYƏCANI')}
        </h2>
        <p className="text-gray-400 font-bold italic max-w-xl mx-auto mb-10 text-sm md:text-base leading-relaxed uppercase tracking-wide">
          {getText('text-2', 'Azərbaycanın ən çətin yollarında peşəkar yarışlar və adrenalin dolu anlar.')}
        </p>

        <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
          <button
            onClick={() => handleAction('text-3', 'events')}
            className="bg-[#FF4D00] hover:bg-white hover:text-black text-black font-black italic py-5 px-12 rounded-sm flex items-center gap-3 transition-all transform hover:scale-105 active:scale-95 shadow-[0_10px_40px_rgba(255,77,0,0.3)]"
          >
            {getText('text-3', 'YARIŞLARA BAX')} <ChevronRight className="w-6 h-6" />
          </button>
          <button
            onClick={() => handleAction('text-4', 'about')}
            className="border-2 border-white/20 text-white hover:border-[#FF4D00] hover:text-[#FF4D00] font-black italic py-5 px-12 rounded-sm transition-all bg-white/5 backdrop-blur-sm"
          >
            {getText('text-4', 'HAQQIMIZDA')}
          </button>
        </div>
      </div>
    </section>
  );
};

export default Hero;