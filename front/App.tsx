
import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import Marquee from './components/Marquee';
import Navbar from './components/Navbar';
import Home from './components/Home';
import About from './components/About';
import NewsPage from './components/NewsPage';
import EventsPage from './components/EventsPage';
import DriversPage from './components/DriversPage';
import RulesPage from './components/RulesPage';
import ContactPage from './components/ContactPage';
import GalleryPage from './components/GalleryPage';
import Footer from './components/Footer';
import { useSiteContent } from './hooks/useSiteContent';
import { useEffect } from 'react';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'home' | 'about' | 'news' | 'events' | 'drivers' | 'rules' | 'contact' | 'gallery'>('home');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const handleViewChange = (view: 'home' | 'about' | 'news' | 'events' | 'drivers' | 'rules' | 'contact' | 'gallery', category: string | null = null) => {
    setCurrentView(view);
    setActiveCategory(category);
    window.scrollTo(0, 0);
  };

  const { getText } = useSiteContent('general');

  useEffect(() => {
    const title = getText('SEO_TITLE', 'Forsaj Club - Offroad Motorsport Hub');
    const description = getText('SEO_DESCRIPTION', '');
    const keywords = getText('SEO_KEYWORDS', '');
    const canonicalUrl = getText('SEO_CANONICAL_URL', window.location.origin);
    const robots = getText('SEO_ROBOTS', 'index,follow');
    const author = getText('SEO_AUTHOR', 'Forsaj Club');
    const lang = getText('SEO_LANGUAGE', 'az');
    const ogTitle = getText('SEO_OG_TITLE', title);
    const ogDescription = getText('SEO_OG_DESCRIPTION', description);
    const ogImage = getText('SEO_OG_IMAGE', '');
    const ogUrl = getText('SEO_OG_URL', canonicalUrl);
    const twitterCard = getText('SEO_TWITTER_CARD', 'summary_large_image');
    const twitterSite = getText('SEO_TWITTER_SITE', '');
    const twitterCreator = getText('SEO_TWITTER_CREATOR', '');
    const googleVerification = getText('SEO_GOOGLE_VERIFICATION', '');
    const bingVerification = getText('SEO_BING_VERIFICATION', '');
    const yandexVerification = getText('SEO_YANDEX_VERIFICATION', '');

    const setMetaByName = (name: string, content: string) => {
      if (!content) return;
      let node = document.querySelector(`meta[name="${name}"]`);
      if (!node) {
        node = document.createElement('meta');
        node.setAttribute('name', name);
        document.head.appendChild(node);
      }
      node.setAttribute('content', content);
    };

    const setMetaByProperty = (property: string, content: string) => {
      if (!content) return;
      let node = document.querySelector(`meta[property="${property}"]`);
      if (!node) {
        node = document.createElement('meta');
        node.setAttribute('property', property);
        document.head.appendChild(node);
      }
      node.setAttribute('content', content);
    };

    const setCanonical = (url: string) => {
      if (!url) return;
      let link = document.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', url);
    };

    document.title = title;
    document.documentElement.lang = lang || 'az';

    setMetaByName('description', description);
    setMetaByName('keywords', keywords);
    setMetaByName('robots', robots);
    setMetaByName('author', author);
    setMetaByName('google-site-verification', googleVerification);
    setMetaByName('msvalidate.01', bingVerification);
    setMetaByName('yandex-verification', yandexVerification);

    setMetaByProperty('og:type', 'website');
    setMetaByProperty('og:title', ogTitle);
    setMetaByProperty('og:description', ogDescription || description);
    setMetaByProperty('og:url', ogUrl || canonicalUrl);
    setMetaByProperty('og:image', ogImage);

    setMetaByName('twitter:card', twitterCard);
    setMetaByName('twitter:title', ogTitle);
    setMetaByName('twitter:description', ogDescription || description);
    setMetaByName('twitter:image', ogImage);
    setMetaByName('twitter:site', twitterSite);
    setMetaByName('twitter:creator', twitterCreator);

    setCanonical(canonicalUrl);
  }, [getText]);

  return (
    <div className="flex flex-col min-h-screen">
      <Toaster position="top-right" />
      <Marquee />
      <Navbar currentView={currentView} onViewChange={(view) => handleViewChange(view, null)} />
      <main className="flex-grow">
        {currentView === 'home' && <Home onViewChange={(view, cat) => handleViewChange(view, cat || null)} />}
        {currentView === 'about' && <About />}
        {currentView === 'news' && <NewsPage />}
        {currentView === 'events' && <EventsPage onViewChange={(view) => handleViewChange(view, null)} />}
        {currentView === 'drivers' && <DriversPage initialCategoryId={activeCategory} />}
        {currentView === 'rules' && <RulesPage />}
        {currentView === 'contact' && <ContactPage />}
        {currentView === 'gallery' && <GalleryPage />}
      </main>
      <Footer onViewChange={(view) => handleViewChange(view, null)} />
    </div>
  );
};

export default App;
