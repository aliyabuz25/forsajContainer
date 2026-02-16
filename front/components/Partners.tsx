import React from 'react';
import { ShieldCheck, Truck, Globe, Zap } from 'lucide-react';
import { useSiteContent } from '../hooks/useSiteContent';

const Partners: React.FC = () => {
  const { getPage, getText } = useSiteContent('partners');
  const partnersPage = getPage('partners');

  const getIcon = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes('shield')) return <ShieldCheck className="w-10 h-10" />;
    if (l.includes('truck')) return <Truck className="w-10 h-10" />;
    if (l.includes('globe')) return <Globe className="w-10 h-10" />;
    if (l.includes('zap')) return <Zap className="w-10 h-10" />;
    return <ShieldCheck className="w-10 h-10" />; // Fallback
  };

  const partnerList = [
    { id: 'partner_1', defaultName: 'AZMF', iconKey: 'shield' },
    { id: 'partner_2', defaultName: 'OFFROAD AZ', iconKey: 'truck' },
    { id: 'partner_3', defaultName: 'GLOBAL 4X4', iconKey: 'globe' },
    { id: 'partner_4', defaultName: 'RACE TECH', iconKey: 'zap' },
  ];

  const partners = partnerList.map((p, i) => {
    const cmsItem = partnersPage?.sections?.find(s => s.id === p.id);
    return {
      id: p.id,
      name: cmsItem ? cmsItem.value : p.defaultName,
      icon: getIcon(p.iconKey),
      color: i % 2 === 0 ? 'text-[#FF4D00]' : 'text-white',
      bg: i % 2 === 0 ? 'group-hover:bg-[#FF4D00]/10' : 'group-hover:bg-white/10',
      glow: i % 2 === 0 ? 'group-hover:shadow-[#FF4D00]/20' : 'group-hover:shadow-white/10',
      tag: 'OFFICIAL PARTNER'
    };
  });


  return (
    <section className="py-32 bg-[#050505] relative overflow-hidden border-t border-white/5">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-[0.05]">
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-[#FF4D00] rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-white rounded-full blur-[120px]"></div>
      </div>

      <div className="container mx-auto px-6 lg:px-20 relative z-10">
        <div className="flex flex-col items-center mb-20">
          <h4 className="text-[#FF4D00] font-black italic text-[11px] uppercase tracking-[0.5em] mb-4">
            {getText('SECTION_TITLE', 'RƏSMİ TƏRƏFDAŞLARIMIZ')}
          </h4>
          <div className="w-20 h-1 bg-white/10"></div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {partners.map((p) => (
            <div
              key={p.id}
              className="group flex flex-col items-center justify-center p-10 bg-[#0A0A0A] border border-white/5 rounded-sm transition-all duration-500 hover:border-[#FF4D00]/30 hover:shadow-[0_20px_50px_rgba(255,77,0,0.1)] cursor-pointer"
            >
              <div className={`mb-6 p-6 rounded-sm transition-all duration-500 text-gray-700 ${p.color} ${p.bg} ${p.glow} group-hover:scale-110 group-hover:rotate-3`}>
                {p.icon}
              </div>

              <div className="relative">
                <span className="text-2xl md:text-4xl font-black italic tracking-tighter uppercase text-gray-600 group-hover:text-white transition-colors duration-300">
                  {p.name}
                </span>
                <div className={`absolute -bottom-2 left-0 w-0 h-1.5 transition-all duration-300 group-hover:w-full bg-[#FF4D00] shadow-[0_0_10px_rgba(255,77,0,0.5)]`}></div>
              </div>

              <p className="mt-6 text-[9px] font-black italic text-[#FF4D00] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {(p as any).tag || getText(`${p.id}_label`, 'OFFICIAL PARTNER')}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Partners;
