
import React from 'react';
import { Instagram, Youtube, Facebook, ArrowRight, MapPin, Phone } from 'lucide-react';
import { useSiteContent } from '../hooks/useSiteContent';

interface FooterProps {
  onViewChange: (view: 'home' | 'about' | 'news' | 'events' | 'drivers' | 'rules' | 'contact' | 'gallery') => void;
}

const Footer: React.FC<FooterProps> = ({ onViewChange }) => {
  const { getText, getUrl, getImage } = useSiteContent('footer');
  const { getText: getGeneralText, getImage: getImageGeneral } = useSiteContent('general');
  const footerAbout = getText('FOOTER_ABOUT_TEXT', 'Azərbaycanın ən prestijli motorsport mərkəzi. Sərhədsiz offroad həyəcanını bizimlə yaşayın.');
  const addressLabel = getText('FOOTER_ADDRESS_LABEL', 'ÜNVAN');
  const contactLabel = getText('FOOTER_CONTACT_LABEL', 'ƏLAQƏ');
  const navTitle = getText('FOOTER_NAV_TITLE', 'NAVİQASİYA');
  const motorsportTitle = getText('FOOTER_MOTORSPORT_TITLE', 'MOTORSPORT');
  const newsletterTitle = getText('FOOTER_NEWSLETTER_TITLE', 'XƏBƏRDAR OL');
  const newsletterDesc = getText('FOOTER_NEWSLETTER_DESC', 'Yarış təqvimi və xəbərlərdən anında xəbərdar olmaq üçün abunə olun.');
  const newsletterPlaceholder = getText('FOOTER_NEWSLETTER_PLACEHOLDER', 'EMAIL DAXİL EDİN');
  const copyrightText = getText('FOOTER_COPYRIGHT', '© 2024 FORSAJ CLUB. ALL RIGHTS RESERVED.');
  const privacyLabel = getText('FOOTER_PRIVACY_LABEL', 'Privacy Policy');
  const termsLabel = getText('FOOTER_TERMS_LABEL', 'Terms of Service');
  const privacyUrl = getUrl('FOOTER_PRIVACY_LABEL', '#');
  const termsUrl = getUrl('FOOTER_TERMS_LABEL', '#');

  const logoImg = getImageGeneral('SITE_LOGO_LIGHT').path;

  const { getPage } = useSiteContent('socials');
  const socialsPage = getPage('socials');

  const socialIconMap = {
    instagram: Instagram,
    youtube: Youtube,
    facebook: Facebook
  };

  const socialLinks = socialsPage?.sections?.length > 0
    ? socialsPage.sections.map(s => ({
      Icon: socialIconMap[s.label?.toLowerCase() as keyof typeof socialIconMap] || Instagram,
      url: s.value
    }))
    : [
      { Icon: Instagram, url: getGeneralText('SOCIAL_INSTAGRAM') || '#' },
      { Icon: Youtube, url: getGeneralText('SOCIAL_YOUTUBE') || '#' },
      { Icon: Facebook, url: getGeneralText('SOCIAL_FACEBOOK') || '#' },
    ];


  const navigationLinks = [
    { name: getText('txt-ana-s-h-f-744', 'ANA SƏHİFƏ'), id: getUrl('txt-ana-s-h-f-744', 'home') as any },
    { name: getText('txt-haqqimizda-942', 'HAQQIMIZDA'), id: getUrl('txt-haqqimizda-942', 'about') as any },
    { name: getText('txt-x-b-rl-r-431', 'XƏBƏRLƏR'), id: getUrl('txt-x-b-rl-r-431', 'news') as any },
    { name: getText('txt-t-dbi-rl-r-62', 'TƏDBİRLƏR'), id: getUrl('txt-t-dbi-rl-r-62', 'events') as any },
    { name: getText('txt-s-r-c-l-r-931', 'SÜRÜCÜLƏR'), id: getUrl('txt-s-r-c-l-r-931', 'drivers') as any },
    { name: getText('txt-qalereya-112', 'QALEREYA'), id: getUrl('txt-qalereya-112', 'gallery') as any },
    { name: getText('txt-laq-452', 'ƏLAQƏ'), id: getUrl('txt-laq-452', 'contact') as any },
  ];

  const rulesLinks = [
    { name: getText('txt-pi-lot-protokolu-31', 'PİLOT PROTOKOLU'), id: getUrl('txt-pi-lot-protokolu-31', 'rules') as any },
    { name: getText('txt-texni-ki-normati-712', 'TEXNİKİ NORMATİVLƏR'), id: getUrl('txt-texni-ki-normati-712', 'rules') as any },
    { name: getText('txt-t-hl-k-si-zli-k-q-121', 'TƏHLÜKƏSİZLİK QAYDALARI'), id: getUrl('txt-t-hl-k-si-zli-k-q-121', 'rules') as any },
    { name: getText('txt-ekoloji-m-suli-yy-612', 'EKOLOJİ MƏSULİYYƏT'), id: getUrl('txt-ekoloji-m-suli-yy-612', 'rules') as any },
  ];

  return (
    <footer className="bg-[#050505] pt-32 pb-12 px-6 lg:px-20 border-t border-white/5">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-16 mb-24">

        <div className="lg:col-span-1">
          <div className="flex items-center gap-3 mb-8 cursor-pointer" onClick={() => onViewChange('home')}>
            {logoImg ? (
              <img src={logoImg} alt={getText('FOOTER_LOGO_ALT', 'Forsaj Logo')} className="h-12 w-auto object-contain" />
            ) : (
              <div className="flex items-center gap-3">
                <div className="bg-[#FF4D00] w-10 h-10 rounded-sm flex items-center justify-center relative shadow-[0_0_20px_rgba(255,77,0,0.4)] group-hover:scale-110 transition-transform">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 text-black fill-current transform -rotate-12">
                    <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-black italic tracking-tighter flex items-center">
                  <span className="text-white">FORSAJ</span>
                  <span className="text-[#FF4D00] ml-1">CLUB</span>
                </h2>
              </div>
            )}
          </div>
          <p className="text-gray-500 font-bold italic text-[11px] uppercase leading-relaxed mb-10 max-w-xs tracking-tight">
            {footerAbout}
          </p>
          <div className="flex gap-4 mb-8">
            {socialLinks.map(({ Icon, url }, idx) => (
              <a
                key={idx}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/5 p-4 rounded-sm text-gray-500 hover:bg-[#FF4D00] hover:text-black transition-all transform hover:-translate-y-1 shadow-sm"
              >
                <Icon className="w-5 h-5" />
              </a>
            ))}
          </div>

          <div className="space-y-4 pt-4 border-t border-white/5">
            <div className="flex items-start gap-4 text-gray-500 group">
              <div className="bg-white/5 p-3 rounded-sm text-[#FF4D00]">
                <MapPin size={18} />
              </div>
              <div>
                <p className="text-[9px] font-black italic uppercase tracking-widest text-[#FF4D00] mb-1">{addressLabel}</p>
                <p className="text-[11px] font-bold italic uppercase leading-tight">
                  {getGeneralText('CONTACT_ADDRESS_1') || 'AZADLIQ 102, BAKI'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-gray-500 group">
              <div className="bg-white/5 p-3 rounded-sm text-[#FF4D00]">
                <Phone size={18} />
              </div>
              <div>
                <p className="text-[9px] font-black italic uppercase tracking-widest text-[#FF4D00] mb-1">{contactLabel}</p>
                <p className="text-[11px] font-bold italic uppercase leading-none">
                  {getGeneralText('CONTACT_PHONE') || '+994 50 123 45 67'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-[#FF4D00] font-black italic text-[13px] mb-8 uppercase tracking-[0.3em]">{navTitle}</h4>
          <ul className="space-y-5">
            {navigationLinks.map(link => (
              <li key={link.name}>
                <button
                  onClick={() => {
                    const id = link.id;
                    if (id.startsWith('http')) {
                      window.open(id, '_blank');
                    } else {
                      onViewChange(id as any);
                    }
                  }}
                  className="text-gray-500 font-black italic text-[11px] uppercase hover:text-white transition-colors tracking-tight text-left"
                >
                  {link.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-[#FF4D00] font-black italic text-[13px] mb-8 uppercase tracking-[0.3em]">{motorsportTitle}</h4>
          <ul className="space-y-5">
            {rulesLinks.map(link => (
              <li key={link.name}>
                <button
                  onClick={() => {
                    const id = link.id;
                    if (id.startsWith('http')) {
                      window.open(id, '_blank');
                    } else {
                      onViewChange(id as any);
                    }
                  }}
                  className="text-gray-500 font-black italic text-[11px] uppercase hover:text-white transition-colors tracking-tight text-left"
                >
                  {link.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white/5 p-8 rounded-sm border border-white/5">
          <h4 className="text-white font-black italic text-[13px] mb-4 uppercase tracking-tighter">{newsletterTitle}</h4>
          <p className="text-gray-500 font-bold italic text-[10px] uppercase mb-8 leading-relaxed tracking-tight">
            {newsletterDesc}
          </p>
          <div className="flex items-center">
            <input
              type="email"
              placeholder={newsletterPlaceholder}
              className="flex-grow bg-[#111] border border-white/10 border-r-0 py-4 px-5 font-black italic text-[10px] text-white uppercase focus:outline-none focus:border-[#FF4D00] transition-colors placeholder:text-gray-600"
            />
            <button className="bg-[#FF4D00] text-black p-4 hover:bg-white transition-colors flex items-center justify-center">
              <ArrowRight size={22} strokeWidth={3} />
            </button>
          </div>
        </div>
      </div>

      <div className="border-t border-white/5 pt-12 flex flex-col md:flex-row justify-between items-center gap-6">
        <p className="text-gray-600 font-black italic text-[9px] uppercase tracking-widest">
          {copyrightText}
        </p>
        <div className="flex gap-10">
          <a href={privacyUrl || '#'} target={privacyUrl?.startsWith('http') ? '_blank' : undefined} rel={privacyUrl?.startsWith('http') ? 'noopener noreferrer' : undefined} className="text-gray-600 font-black italic text-[9px] uppercase tracking-widest hover:text-[#FF4D00] transition-colors">{privacyLabel}</a>
          <a href={termsUrl || '#'} target={termsUrl?.startsWith('http') ? '_blank' : undefined} rel={termsUrl?.startsWith('http') ? 'noopener noreferrer' : undefined} className="text-gray-600 font-black italic text-[9px] uppercase tracking-widest hover:text-[#FF4D00] transition-colors">{termsLabel}</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
