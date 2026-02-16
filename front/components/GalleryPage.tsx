import React, { useState, useEffect } from 'react';
import { PlayCircle, Image as ImageIcon, Video, ArrowRight, Zap, Maximize2, Calendar, X } from 'lucide-react';
import { useSiteContent } from '../hooks/useSiteContent';

import CsPlayer from './CsPlayer';

const GalleryPage: React.FC = () => {
  const [activeType, setActiveType] = useState<'photos' | 'videos'>('photos');
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [dynamicVideos, setDynamicVideos] = useState<any[]>([]);
  const [dynamicPhotos, setDynamicPhotos] = useState<any[]>([]);
  const { getText } = useSiteContent('gallerypage');

  const extractYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  useEffect(() => {
    const loadGallery = async () => {
      try {
        const photosRes = await fetch('/api/gallery-photos');
        if (photosRes.ok) {
          const photos = await photosRes.json();
          if (photos) setDynamicPhotos(photos);
        }

        const videosRes = await fetch('/api/videos');
        if (videosRes.ok) {
          const videos = await videosRes.json();
          if (videos) {
            const mapped = videos
              .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
              .map((v: any) => {
                const videoId = v.videoId || v.video_id || extractYoutubeId(v.youtubeUrl || v.url);
                return {
                  id: v.id,
                  title: v.title,
                  videoId: videoId,
                  thumbnail: v.thumbnail || (videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : ''),
                  duration: v.duration || '00:00'
                };
              });
            setDynamicVideos(mapped);
          }
        }
      } catch (err) {
        console.error('Gallery load failed from API', err);
      }
    };
    loadGallery();
  }, []);

  const VideoModal = () => {
    if (!playingVideoId) return null;

    return (
      <div
        className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300"
      >
        <div className="relative w-full max-w-5xl aspect-video bg-black border border-white/10 shadow-[0_0_100px_rgba(255,77,0,0.2)]">
          <button
            onClick={(e) => { e.stopPropagation(); setPlayingVideoId(null); }}
            className="absolute -top-12 right-0 md:-right-12 text-white/50 hover:text-[#FF4D00] transition-colors"
          >
            <X size={40} strokeWidth={1.5} />
          </button>

          <CsPlayer videoId={playingVideoId} />
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[#0A0A0A] min-h-screen py-16 px-6 lg:px-20 text-white animate-in fade-in duration-500">
      <VideoModal />

      {/* Standardized Page Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-20">
        <div className="flex items-start gap-4">
          <div className="w-2 h-16 bg-[#FF4D00] shadow-[0_0_15px_rgba(255,77,0,0.4)]"></div>
          <div>
            <h2 className="text-6xl md:text-8xl font-black italic tracking-tighter uppercase leading-none text-white">
              {getText('PAGE_TITLE', 'QALEREYA')}
            </h2>
            <p className="text-[#FF4D00] font-black italic text-[11px] md:text-sm mt-2 uppercase tracking-[0.4em]">
              {getText('PAGE_SUBTITLE', 'XRONOLOJİ MOTORSPORT ARXİVİ // FORSAJ CLUB')}
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="bg-white/5 p-1 rounded-sm flex items-center border border-white/10 shadow-xl self-end lg:self-center">
          <button
            onClick={() => setActiveType('photos')}
            className={`px-10 py-4 font-black italic text-sm uppercase tracking-widest transition-all flex items-center gap-3 ${activeType === 'photos' ? 'bg-[#FF4D00] text-black transform -skew-x-12 shadow-lg shadow-[#FF4D00]/20' : 'text-gray-500 hover:text-white'}`}
          >
            <span className={activeType === 'photos' ? 'transform skew-x-12 flex items-center gap-2' : 'flex items-center gap-2'}>
              <ImageIcon size={18} /> {getText('TAB_PHOTOS', 'FOTOLAR')}
            </span>
          </button>
          <button
            onClick={() => setActiveType('videos')}
            className={`px-10 py-4 font-black italic text-sm uppercase tracking-widest transition-all flex items-center gap-3 ${activeType === 'videos' ? 'bg-[#FF4D00] text-black transform -skew-x-12 shadow-lg shadow-[#FF4D00]/20' : 'text-gray-500 hover:text-white'}`}
          >
            <span className={activeType === 'videos' ? 'transform skew-x-12 flex items-center gap-2' : 'flex items-center gap-2'}>
              <Video size={18} /> {getText('TAB_VIDEOS', 'VİDEOLAR')}
            </span>
          </button>
        </div>
      </div>

      {/* Dynamic Content Grid */}
      <div className="space-y-32">
        <section className="relative group">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6 border-b border-white/5 pb-8">
            <div className="flex items-center gap-6">
              <div className="text-6xl md:text-7xl font-black italic text-white/5 select-none leading-none tracking-tighter absolute -top-12 left-0 pointer-events-none group-hover:text-[#FF4D00]/10 transition-colors">
                {activeType === 'photos' ? '01' : '02'}
              </div>
              <div className="relative">
                <h3 className="text-3xl md:text-5xl font-black italic text-white uppercase tracking-tighter leading-none mb-2">
                  {activeType === 'photos' ? getText('TAB_PHOTOS', 'FOTOLAR') : getText('TAB_VIDEOS', 'VİDEOLAR')}
                </h3>
                <div className="flex items-center gap-2 text-[#FF4D00] font-black italic text-[10px] uppercase tracking-[0.3em]">
                  <Zap size={14} /> {getText('DYNAMIC_COLLECTION', 'CANLI ARXİV // YENİLƏNƏN MƏZMUN')}
                </div>
              </div>
            </div>
            <p className="text-gray-600 font-black italic text-[10px] uppercase tracking-widest">
              {getText('TOTAL_LABEL', 'TOPLAM')} {activeType === 'photos' ? dynamicPhotos.length : dynamicVideos.length} {activeType === 'photos' ? getText('TYPE_PHOTO', 'FOTO') : getText('TYPE_VIDEO', 'VİDEO')}
            </p>
          </div>

          {activeType === 'photos' ? (
            /* Photo Grid */
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {dynamicPhotos.length === 0 ? (
                <div className="col-span-full py-20 text-center text-gray-500 font-black italic uppercase tracking-widest">
                  {getText('NO_PHOTOS', 'HƏLƏ Kİ FOTO ƏLAVƏ EDİLMƏYİB')}
                </div>
              ) : (
                dynamicPhotos.map((photo: any) => (
                  <div
                    key={photo.id}
                    className="group/item relative aspect-square bg-[#111] overflow-hidden cursor-pointer shadow-lg hover:z-20 transition-all duration-300"
                  >
                    <img
                      src={photo.url || photo.path}
                      className="w-full h-full object-cover grayscale opacity-60 transition-all duration-500 group-hover/item:scale-110 group-hover/item:grayscale-0 group-hover/item:opacity-100"
                      alt={photo.title || photo.alt}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity flex flex-col justify-end p-3">
                      <p className="text-[10px] font-black italic uppercase text-white truncate drop-shadow-md">{photo.title || photo.alt}</p>
                      <div className="flex justify-between items-center mt-1">
                        <Maximize2 size={12} className="text-[#FF4D00]" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Video Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {dynamicVideos.length === 0 ? (
                <div className="col-span-full py-20 text-center text-gray-500 font-black italic uppercase tracking-widest">
                  {getText('NO_VIDEOS', 'HƏLƏ Kİ VİDEO ƏLAVƏ EDİLMƏYİB')}
                </div>
              ) : (
                dynamicVideos.map((video: any) => (
                  <div
                    key={video.id}
                    onClick={() => setPlayingVideoId(video.videoId)}
                    className="group/video relative flex flex-col bg-[#111] border border-white/5 overflow-hidden transition-all duration-300 hover:border-[#FF4D00]/50 hover:shadow-2xl shadow-lg cursor-pointer"
                  >
                    <div className="aspect-video relative overflow-hidden">
                      <img
                        src={video.thumbnail}
                        className="w-full h-full object-cover grayscale opacity-30 transition-all duration-700 group-hover/video:scale-105 group-hover/video:grayscale-0 group-hover/video:opacity-100"
                        alt={video.title}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-black/50 backdrop-blur-sm p-4 rounded-full border border-white/10 transition-all duration-300 group-hover/video:scale-110 group-hover/video:bg-[#FF4D00] group-hover/video:text-black">
                          <PlayCircle size={40} strokeWidth={1.5} />
                        </div>
                      </div>
                      <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 text-[8px] font-black italic uppercase tracking-widest border border-white/10 text-white/80">
                        {video.duration}
                      </div>
                    </div>
                    <div className="p-4 border-t border-white/5">
                      <h4 className="text-[11px] font-black italic text-gray-400 uppercase tracking-tight group-hover/video:text-[#FF4D00] transition-colors line-clamp-1">{video.title}</h4>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default GalleryPage;
