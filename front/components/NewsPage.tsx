import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Calendar, Facebook, Send, Twitter, MessageCircle } from 'lucide-react';
import { useSiteContent } from '../hooks/useSiteContent';
import { bbcodeToHtml } from '../utils/bbcode';

interface NewsItem {
  id: number;
  title: string;
  date: string;
  desc: string;
  img: string;
  content: string;
}



const NewsPage: React.FC = () => {
  const { getText } = useSiteContent('newspage');
  const [newsData, setNewsData] = useState<NewsItem[]>([]);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  useEffect(() => {
    const loadNews = async () => {
      try {
        const response = await fetch('/api/news');
        if (!response.ok) throw new Error('Failed to fetch news');

        const data = await response.json();

        if (data) {
          // Filter for published news and sort by date descending
          const filtered = data
            .filter((item: any) => item.status === 'published')
            .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

          const mapped = filtered.map((item: any) => ({
            id: item.id,
            title: item.title,
            date: item.date,
            desc: item.description,
            img: item.img,
            content: item.description
          }));
          setNewsData(mapped);
        }
      } catch (err) {
        console.error('Failed to load news from API', err);
      }
    };
    loadNews();
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [selectedNews]);

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const text = selectedNews?.title || '';
    let shareUrl = '';
    switch (platform) {
      case 'facebook': shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`; break;
      case 'twitter': shareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`; break;
      case 'whatsapp': shareUrl = `https://api.whatsapp.com/send?text=${text} ${url}`; break;
      case 'telegram': shareUrl = `https://t.me/share/url?url=${url}&text=${text}`; break;
    }
    window.open(shareUrl, '_blank');
  };

  if (selectedNews) {
    const otherNews = newsData.filter(n => n.id !== selectedNews.id).slice(0, 5);

    return (
      <div className="bg-[#0A0A0A] min-h-screen pb-24 text-white">
        {/* Detail Header */}
        <div className="relative h-[50vh] md:h-[65vh] overflow-hidden">
          <img
            src={selectedNews.img}
            className="w-full h-full object-cover grayscale brightness-[0.2]"
            alt={selectedNews.title}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-black/40"></div>

          <div className="absolute top-8 left-6 lg:left-20">
            <button
              onClick={() => setSelectedNews(null)}
              className="bg-[#FF4D00] text-black px-8 py-3 font-black italic text-xs transition-all uppercase tracking-widest transform -skew-x-12 flex items-center gap-2 hover:bg-white"
            >
              <span className="transform skew-x-12 flex items-center gap-2 tracking-widest"><ArrowLeft size={18} /> {getText('BTN_BACK', 'GERİ QAYIT')}</span>
            </button>
          </div>

          <div className="absolute bottom-12 left-6 lg:left-20 right-6">
            <div className="max-w-5xl">
              <div className="flex items-center gap-4 mb-6">
                <span className="text-[#FF4D00] font-black italic text-xs flex items-center gap-2 uppercase tracking-[0.3em]">
                  <Calendar size={16} /> {selectedNews.date}
                </span>
              </div>
              <h1 className="text-5xl md:text-9xl font-black italic text-white uppercase tracking-tighter leading-[0.8] mb-4">
                {selectedNews.title}
              </h1>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="px-4 lg:px-10 py-16">
          <div className="max-w-[1700px] mx-auto flex flex-col lg:flex-row gap-16">
            <div className="lg:w-8/12 bg-[#0A0A0A]">
              <div
                className="text-gray-300 text-xl md:text-2xl font-bold italic leading-relaxed space-y-8 uppercase tracking-wide quill-content"
                dangerouslySetInnerHTML={{ __html: selectedNews.content }}
              />

              {/* Social Share */}
              <div className="mt-24 pt-12 border-t border-white/5 flex flex-col items-start">
                <p className="text-gray-500 font-black italic text-[11px] uppercase tracking-[0.4em] mb-8">{getText('SHARE_LABEL', 'BU XƏBƏRİ PAYLAŞIN')}</p>
                <div className="flex gap-6">
                  <button onClick={() => handleShare('facebook')} className="w-14 h-14 flex items-center justify-center bg-[#1877F2] text-white rounded-sm hover:scale-110 transition-transform shadow-lg">
                    <Facebook size={24} fill="white" />
                  </button>
                  <button onClick={() => handleShare('whatsapp')} className="w-14 h-14 flex items-center justify-center bg-[#25D366] text-white rounded-sm hover:scale-110 transition-transform shadow-lg">
                    <MessageCircle size={24} fill="white" />
                  </button>
                  <button onClick={() => handleShare('telegram')} className="w-14 h-14 flex items-center justify-center bg-[#0088cc] text-white rounded-sm hover:scale-110 transition-transform shadow-lg">
                    <Send size={24} fill="white" className="mr-1" />
                  </button>
                  <button onClick={() => handleShare('twitter')} className="w-14 h-14 flex items-center justify-center bg-white text-black rounded-sm hover:scale-110 transition-transform shadow-lg">
                    <Twitter size={24} fill="black" />
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:w-4/12">
              <div className="sticky top-32 bg-[#111] p-8 md:p-12 border border-white/5 rounded-sm shadow-2xl">
                <div className="flex items-center gap-4 mb-12">
                  <div className="w-2 h-10 bg-[#FF4D00] shadow-[0_0_15px_rgba(255,77,0,0.4)]"></div>
                  <h4 className="text-3xl font-black italic text-white uppercase tracking-tighter leading-none">{getText('OTHER_NEWS', 'DİGƏR XƏBƏRLƏR')}</h4>
                </div>
                <div className="space-y-10">
                  {otherNews.map((news) => (
                    <div
                      key={news.id}
                      onClick={() => setSelectedNews(news)}
                      className="group cursor-pointer flex gap-6 items-start"
                    >
                      <div className="w-24 h-24 shrink-0 overflow-hidden bg-black border border-white/5 rounded-sm shadow-md">
                        <img src={news.img} className="w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700 group-hover:scale-110" alt={news.title} />
                      </div>
                      <div>
                        <span className="text-[#FF4D00] font-black italic text-[10px] mb-2 block uppercase tracking-widest">{news.date}</span>
                        <h5 className="text-lg font-black italic text-white uppercase leading-tight group-hover:text-[#FF4D00] transition-colors line-clamp-2 tracking-tighter">
                          {news.title}
                        </h5>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setSelectedNews(null)}
                  className="w-full mt-16 py-5 bg-[#FF4D00] text-black font-black italic text-sm uppercase tracking-[0.2em] hover:bg-white transition-all transform -skew-x-12 shadow-xl"
                >
                  <span className="transform skew-x-12 block">{getText('BTN_ALL_NEWS', 'BÜTÜN XƏBƏRLƏR')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0A0A0A] min-h-screen py-16 px-6 lg:px-20 text-white">
      {/* Standardized Page Header - Matches Events symmetry */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-20">
        <div className="flex items-start gap-4">
          <div className="w-2 h-16 bg-[#FF4D00] shadow-[0_0_15px_rgba(255,77,0,0.4)]"></div>
          <div>
            <h2 className="text-6xl md:text-8xl font-black italic tracking-tighter uppercase leading-none text-white">
              {getText('PAGE_TITLE', 'XƏBƏRLƏR')}
            </h2>
            <p className="text-[#FF4D00] font-black italic text-[11px] md:text-sm mt-2 uppercase tracking-[0.4em]">
              {getText('PAGE_SUBTITLE', 'MOTORSPORT MAGAZINE // SEASON 2024')}
            </p>
          </div>
        </div>
      </div>

      {newsData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-500">
          <Calendar size={64} className="mb-6 opacity-10" />
          <p className="font-black italic uppercase tracking-widest">{getText('NO_NEWS', 'HƏLƏ Kİ XƏBƏR YOXDUR')}</p>
        </div>
      ) : (
        <div className="max-w-[1800px] mx-auto">
          {/* Featured News */}
          <div
            onClick={() => setSelectedNews(newsData[0])}
            className="group relative bg-[#111] h-[500px] md:h-[750px] overflow-hidden cursor-pointer mb-24 border border-white/5 rounded-sm shadow-2xl"
          >
            <img
              src={newsData[0].img}
              className="w-full h-full object-cover grayscale brightness-50 opacity-60 transition-transform duration-1000 group-hover:scale-105 group-hover:opacity-100 group-hover:grayscale-0 group-hover:brightness-75"
              alt={newsData[0].title}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
            <div className="absolute bottom-16 left-16 right-16">
              <div className="text-[#FF4D00] font-black italic text-xs mb-4 uppercase flex items-center gap-2 tracking-[0.3em]">
                <Calendar size={16} /> {newsData[0].date}
              </div>
              <h3 className="text-5xl md:text-[120px] font-black italic text-white leading-[0.8] uppercase tracking-tighter mb-8">
                {newsData[0].title}
              </h3>
              <button className="flex items-center gap-4 text-[#FF4D00] font-black italic text-2xl hover:translate-x-4 transition-transform uppercase tracking-tighter">
                {getText('BTN_READ_NEWS', 'XƏBƏRİ OXU')} <ArrowRight size={32} />
              </button>
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {newsData.slice(1).map((news) => (
              <div
                key={news.id}
                onClick={() => setSelectedNews(news)}
                className="group cursor-pointer flex flex-col bg-[#111] border border-white/5 hover:border-[#FF4D00]/50 hover:shadow-[0_0_30px_rgba(255,77,0,0.1)] transition-all rounded-sm overflow-hidden"
              >
                <div className="aspect-video overflow-hidden relative">
                  <img src={news.img} className="w-full h-full object-cover grayscale opacity-50 transition-all duration-700 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-110" alt={news.title} />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-transparent transition-colors"></div>
                </div>
                <div className="p-10">
                  <div className="flex justify-between items-center mb-8">
                    <span className="text-[#FF4D00] font-black italic text-xs tracking-widest uppercase">{news.date}</span>
                    <span className="text-gray-600 font-black italic text-[10px] uppercase tracking-[0.2em] flex items-center gap-1">
                      <Calendar size={12} /> {getText('LABEL_LATEST', 'SON XƏBƏR')}
                    </span>
                  </div>
                  <h4 className="text-3xl font-black italic text-white uppercase leading-tight mb-6 group-hover:text-[#FF4D00] transition-colors tracking-tighter">
                    {news.title}
                  </h4>
                  <p className="text-gray-500 font-bold italic text-[10px] uppercase leading-relaxed mb-10 line-clamp-3 tracking-widest">
                    {news.desc}
                  </p>
                  <button className="flex items-center gap-3 text-[#FF4D00] font-black italic text-xs hover:translate-x-2 transition-all uppercase tracking-widest">
                    {getText('BTN_READ', 'OXU')} <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NewsPage;
