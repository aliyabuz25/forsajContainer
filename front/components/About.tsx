import React from 'react';
import { Shield, Users, Leaf, Zap, Target, Globe } from 'lucide-react';
import { useSiteContent } from '../hooks/useSiteContent';
import { bbcodeToHtml } from '../utils/bbcode';

const About: React.FC = () => {
  const { getPage, getText, getImage } = useSiteContent('about');
  const { getText: getGeneralText } = useSiteContent('general');
  const page = getPage('about');

  const getValIcon = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes('shield')) return <Shield className="text-[#FF4D00]" />;
    if (l.includes('users')) return <Users className="text-[#FF4D00]" />;
    if (l.includes('leaf')) return <Leaf className="text-[#FF4D00]" />;
    if (l.includes('zap')) return <Zap className="text-[#FF4D00]" />;
    return <Shield className="text-[#FF4D00]" />;
  };

  const dynamicStats: any[] = [];
  const dynamicValues: any[] = [];

  if (page?.sections) {
    // Stats: label then value pairs
    const statLabels = page.sections.filter(s => s.id.includes('label-stat'));
    const statValues = page.sections.filter(s => s.id.includes('value-stat'));

    for (let i = 0; i < statLabels.length; i++) {
      if (statLabels[i] && statValues[i]) {
        dynamicStats.push({ label: statLabels[i].value, value: statValues[i].value });
      }
    }

    // Values: icon label, title, desc
    const valIcons = page.sections.filter(s => s.id.includes('val-icon'));
    const valTitles = page.sections.filter(s => s.id.includes('val-title'));
    const valDescs = page.sections.filter(s => s.id.includes('val-desc'));

    for (let i = 0; i < valIcons.length; i++) {
      if (valIcons[i] && valTitles[i] && valDescs[i]) {
        dynamicValues.push({
          icon: getValIcon(valIcons[i].value || ''), // value contains the keyword
          title: valTitles[i].value,
          desc: valDescs[i].value
        });
      }
    }
  }

  const stats = dynamicStats.length > 0 ? dynamicStats : [
    { label: getText('txt-pi-lotlar-label-123', 'PİLOTLAR'), value: getGeneralText('STATS_PILOTS') || getText('txt-pi-lotlar-value-123', '140+') },
    { label: getText('txt-yari-lar-label-123', 'YARIŞLAR'), value: getGeneralText('STATS_RACES') || getText('txt-yari-lar-value-123', '50+') },
    { label: getText('txt-g-ncl-r-label-123', 'GƏNCLƏR'), value: getGeneralText('STATS_YOUTH') || getText('txt-g-ncl-r-value-123', '20+') },
  ];

  const values = dynamicValues.length > 0 ? dynamicValues : [
    { icon: <Shield className="text-[#FF4D00]" />, title: getText('txt-val-safety-title-123', 'TƏHLÜKƏSİZLİK'), desc: getText('txt-val-safety-desc-123', 'EKSTREMAL İDMANDA CAN SAĞLIĞI BİZİM BİR NÖMRƏLİ QAYDAMIZDIR. BÜTÜN TEXNİKALARIMIZ FIA STANDARTLARINA UYĞUN YOXLANILIR.') },
    { icon: <Users className="text-[#FF4D00]" />, title: getText('txt-val-community-title-123', 'İCMA RUHU'), desc: getText('txt-val-community-desc-123', 'FORSAJ BİR KLUBDAN DAHA ÇOX, SADİQ VƏ BÖYÜK BİR AİLƏDİR. BİRİMİZ HAMIMIZ, HAMIMIZ BİRİMİZ ÜÇÜN!') },
    { icon: <Leaf className="text-[#FF4D00]" />, title: getText('txt-val-nature-title-123', 'TƏBİƏTİ QORU'), desc: getText('txt-val-nature-desc-123', 'BİZ OFFROAD EDƏRKƏN TƏBİƏTƏ ZƏRƏR VERMƏMƏYİ ÖZÜMÜZƏ BORC BİLİRİK. EKOLOJİ BALANS BİZİM ÜÇÜN MÜQƏDDƏSDİR.') },
    { icon: <Zap className="text-[#FF4D00]" />, title: getText('txt-val-excellence-title-123', 'MÜKƏMMƏLLİK'), desc: getText('txt-val-excellence-desc-123', 'HƏR YARIŞDA, HƏR DÖNGƏDƏ DAHA YAXŞI OLMAĞA ÇALIŞIRIQ. TƏLİMLƏRİMİZ PEŞƏKAR İNSTRUKTORLAR TƏRƏFİNDƏN İDARƏ OLUNUR.') },
  ];


  return (
    <div id="haqqımızda" className="bg-[#0A0A0A] text-white">
      {/* Standardized Hero Header Section */}
      <section className="py-16 px-6 lg:px-20 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-20">
          <div className="flex items-start gap-4">
            <div className="w-2 h-16 bg-[#FF4D00] shadow-[0_0_15px_rgba(255,77,0,0.4)]"></div>
            <div>
              <h2 className="text-6xl md:text-8xl font-black italic tracking-tighter uppercase leading-none text-white">
                {getText('txt-haqqimizda-904', 'HAQQIMIZDA')}
              </h2>
              <p className="text-[#FF4D00] font-black italic text-[11px] md:text-sm mt-2 uppercase tracking-[0.4em]">
                {getText('txt-bi-zi-m-hekay-mi-z-m-888', 'BİZİM HEKAYƏMİZ // MİSSİYAMIZ VƏ GƏLƏCƏYİMİZ')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-16">
          <div className="lg:w-7/12 relative z-10">
            <div className="mt-4">
              <h4 className="text-[#FF4D00] font-black italic text-2xl mb-4 tracking-tight">
                {getText('txt-est-2018-motorsp-949', 'EST. 2018 // MOTORSPORT MƏRKƏZİ')}
              </h4>
              <h2 className="text-3xl md:text-5xl font-black italic leading-tight mb-8 uppercase max-w-2xl text-white tracking-tighter">
                {getText('txt-forsaj-club-az-rba-66', '"FORSAJ CLUB" AZƏRBAYCANIN OFFROAD MƏDƏNİYYƏTİNİ PEŞƏKAR SƏVİYYƏYƏ ÇATDIRMAQ ÜÇÜN YARADILMIŞDIR.')}
              </h2>
              <p
                className="text-gray-400 font-bold italic text-sm md:text-base leading-relaxed mb-12 max-w-xl uppercase tracking-wide"
                dangerouslySetInnerHTML={{ __html: bbcodeToHtml(getText('txt-klubumuz-sad-c-bir-552', 'Klubumuz sadəcə bir həvəskar qrupu deyil, ölkəmizi beynəlxalq ralli xəritəsinə daxil etməyi hədəfləyən rəsmi və peşəkar bir platformadır. 2018-ci ildən bəri biz 50-dən çox rəsmi yarış, 100-dən çox ekspedisiya və saysız-hesabsız adrenalin dolu anlar yaşamışıq.')) }}
              />

              <div className="flex flex-wrap gap-4">
                {stats.map((stat, i) => (
                  <div key={i} className="bg-[#111] border border-white/5 p-8 rounded-sm min-w-[140px] shadow-2xl">
                    <p className="text-[#FF4D00] font-black italic text-[10px] mb-2 tracking-widest uppercase">{stat.label}</p>
                    <p className="text-5xl font-black italic text-white">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:w-5/12 relative hidden lg:block">
            <div className="absolute right-[-10%] top-0 w-[120%] h-full bg-[#111] transform -skew-x-12 overflow-hidden shadow-2xl border-l-8 border-[#FF4D00]/20">
              <img
                src={getImage('img-992', 'https://images.unsplash.com/photo-1541447271487-09612b3f49f7?q=80&w=1974&auto=format&fit=crop').path}
                alt={getImage('img-992', '').alt || getText('attr-forsaj-club-detail-405', 'Forsaj Club Detail')}
                className="w-full h-full object-cover opacity-40 grayscale"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="bg-[#050505] py-24 px-6 lg:px-20 text-white relative border-y border-white/5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
          <div className="relative">
            <div className="w-10 h-1 bg-[#FF4D00] mb-8"></div>
            <h3 className="text-5xl font-black italic mb-8 uppercase tracking-tighter">
              {getText('txt-bi-zi-m-mi-ssi-yamiz-424', 'BİZİM MİSSİYAMIZ')}
            </h3>
            <p className="text-gray-400 font-bold italic text-sm leading-relaxed mb-12 max-w-lg uppercase tracking-wide">
              {getText('txt-az-rbaycan-n-h-r-bir-45', 'Azərbaycanın hər bir guşəsində offroad idmanını təbliğ etmək, yerli pilotları beynəlxalq standartlara uyğun yetişdirmək və təbiəti qoruyaraq ekstremal adrenalin təcrübəsi bəxş etmək.')}
            </p>
            <div className="bg-[#FF4D00] p-5 inline-flex items-center gap-4 transform -skew-x-12 text-black shadow-[0_0_30px_rgba(255,77,0,0.2)]">
              <div className="bg-black p-2 text-[#FF4D00] transform skew-x-12 rounded-full">
                <Target size={20} />
              </div>
              <span className="font-black italic text-xs transform skew-x-12 uppercase">
                {getText('txt-h-d-fi-mi-z-dakar-ral-50', 'HƏDƏFİMİZ: DAKAR RALLİ 2026')}
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="w-10 h-1 bg-white/20 mb-8"></div>
            <h3 className="text-5xl font-black italic mb-8 uppercase tracking-tighter">
              {getText('txt-bi-zi-m-baxi-imiz-944', 'BİZİM BAXIŞIMIZ')}
            </h3>
            <p className="text-gray-400 font-bold italic text-sm leading-relaxed mb-12 max-w-lg uppercase tracking-wide">
              {getText('txt-regionun-n-b-y-k-mo-901', 'Regionun ən böyük motorsport hubuna çevrilmək, rəqəmsal və fiziki infrastrukturlarla pilotlarımızı dəstəkləmək və motorsportu hər kəs üçün əlçatan bir ehtirasa çevirmək.')}
            </p>
            <div className="bg-white/5 border border-white/10 p-5 inline-flex items-center gap-4 transform -skew-x-12">
              <div className="bg-white/10 p-2 text-white transform skew-x-12 rounded-full border border-white/10">
                <Globe size={20} />
              </div>
              <span className="font-black italic text-xs text-white transform skew-x-12 uppercase">
                {getText('txt-qafqazin-li-der-klubu-758', 'QAFQAZIN LİDER KLUBUNA ÇEVRİLMƏK')}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-24 px-6 lg:px-20 bg-[#0A0A0A]">
        <div className="text-center mb-20">
          <h4 className="text-[#FF4D00] font-black italic text-[10px] tracking-[0.4em] mb-4 uppercase">
            {getText('txt-fundamental-pri-nsi-pl-219', 'FUNDAMENTAL PRİNSİPLƏR')}
          </h4>
          <h2 className="text-6xl font-black italic tracking-tighter uppercase leading-none text-white">
            {getText('txt-sas-d-y-rl-ri-mi-z-482', 'ƏSAS DƏYƏRLƏRİMİZ')}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {values.map((v, i) => (
            <div key={i} className="flex flex-col items-start gap-6 group cursor-default">
              <div className="bg-white/5 border border-white/5 p-6 rounded-sm transform group-hover:scale-110 group-hover:bg-[#FF4D00]/10 transition-all">
                {v.icon}
              </div>
              <h5 className="font-black italic text-2xl uppercase tracking-tighter text-white group-hover:text-[#FF4D00] transition-colors">{v.title}</h5>
              <p className="text-gray-500 font-bold italic text-[10px] uppercase leading-relaxed tracking-widest">
                {v.desc}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default About;
