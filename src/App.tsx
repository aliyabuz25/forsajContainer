import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import VisualEditor from './pages/VisualEditor';
import FrontendSettings from './pages/FrontendSettings';
import UsersManager from './pages/UsersManager';
import SetupGuide from './components/SetupGuide';
import Login from './pages/Login';
import ApplicationsManager from './pages/ApplicationsManager';
import GeneralSettings from './pages/GeneralSettings';
import { Toaster } from 'react-hot-toast';
import type { SidebarItem } from './types/navigation';
import './index.css';

const normalizeText = (value: string) =>
  value
    .toLocaleLowerCase('az')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const titleMap: Record<string, string> = {
  DASHBOARD: 'Panel Ana Səhifə',
  'ANA SƏHİFƏ': 'Sayt Məzmunu',
  'HAQQIMIZDA': 'Haqqımızda',
  'XƏBƏRLƏR': 'Xəbərlər',
  'TƏDBİRLƏR': 'Tədbirlər',
  'SÜRÜCÜLƏR': 'Sürücülər',
  QALEREYA: 'Qalereya',
  QAYDALAR: 'Qaydalar',
  'ƏLAQƏ': 'Əlaqə',
  'ADMİN HESABLARI': 'İstifadəçi İdarəsi',
  'SİSTEM AYARLARI': 'Frontend Ayarları',
};

const childTitleMap: Record<string, string> = {
  'Ümumi Görünüş': 'Ana Səhifə Blokları',
  'Naviqasiya': 'Menyu və Naviqasiya',
  'Giriş Hissəsi': 'Hero Bölməsi',
  'Sürüşən Yazı': 'Marquee Yazısı',
  'Sayt Sonu': 'Footer',
  'Xəbər Siyahısı': 'Xəbər Məzmunu',
  'Xəbər Səhifəsi': 'Xəbər Səhifəsi Mətni',
  'Tədbir Təqvimi': 'Tədbir Siyahısı',
  'Tədbir Səhifəsi': 'Tədbir Səhifəsi Mətni',
  'Sürücü Reytinqi': 'Sürücü Cədvəli',
  'Sürücülər Səhifəsi': 'Sürücülər Səhifəsi Mətni',
};

const prettifyItem = (item: SidebarItem): SidebarItem => {
  const title = titleMap[item.title] || item.title;
  return {
    ...item,
    title,
    children: item.children?.map((child) => ({
      ...child,
      title: childTitleMap[child.title] || child.title,
    })),
  };
};

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [sitemap, setSitemap] = useState<SidebarItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const savedUser = localStorage.getItem('forsaj_admin_user');
    const token = localStorage.getItem('forsaj_admin_token');

    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    } else {
      setUser(null);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('forsaj_admin_token');
      if (!token) return;

      try {
        // Fetch unread count
        const unreadRes = await fetch('/api/applications/unread-count', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (unreadRes.ok) {
          const { count } = await unreadRes.json();
          setUnreadCount(count);
        }

        // Fetch sitemap
        const response = await fetch(`/api/sitemap?v=${Date.now()}`);
        if (response.ok) {
          const data = await response.json();
          let items = Array.isArray(data) ? data : [];

          // Normalize menu titles to avoid confusing duplicates in sidebar labels.
          items = items.map((item: any) => {
            if (item?.path === '/frontend-settings') {
              return { ...item, title: 'Frontend Ayarları' };
            }
            return item;
          });
          items = items.map((item: SidebarItem) => prettifyItem(item));

          // Inject "Müraciətlər" item if not present
          const hasApplications = items.find((i: any) => i.path === '/applications');
          if (!hasApplications) {
            items = [
              ...items,
              {
                title: 'Müraciətlər',
                path: '/applications',
                icon: 'Inbox',
                badge: unreadCount > 0 ? { text: unreadCount.toString(), color: 'bg-red-500' } : undefined
              }
            ];
          } else if (unreadCount > 0) {
            hasApplications.badge = { text: unreadCount.toString(), color: 'bg-red-500' };
          }

          // Remove any existing system-settings variants before injecting the canonical one.
          // This catches cases like: "SİSTEM AYARLARI", "Sistem Ayarları", "System Settings", id=general.
          items = items.filter((i: any) => {
            const normalizedTitle = normalizeText(i?.title || '');
            const normalizedId = normalizeText(i?.id || '');
            const normalizedPath = normalizeText(i?.path || '');
            const looksLikeSystemSettingsTitle =
              normalizedTitle === 'sistem ayarlari' ||
              normalizedTitle === 'system settings';
            const looksLikeSystemSettingsId =
              normalizedId === 'general' ||
              normalizedId === 'settings' ||
              normalizedId === 'sistem-ayarlari';
            const looksLikeSystemSettingsPath =
              normalizedPath === '/general-settings' ||
              normalizedPath === '/settings';

            return !(
              looksLikeSystemSettingsTitle ||
              looksLikeSystemSettingsId ||
              looksLikeSystemSettingsPath
            );
          });

          // Force inject "Sistem Ayarları" (with SEO tab) at the end.
          items = [
            ...items,
            {
              title: 'Sistem Ayarları',
              icon: 'Settings',
              children: [
                { title: 'SEO Ayarları', path: '/general-settings?tab=seo', icon: 'Globe' },
                { title: 'Ümumi Ayarlar', path: '/general-settings?tab=general', icon: 'Settings' },
                { title: 'Əlaqə və Sosial', path: '/general-settings?tab=contact', icon: 'Phone' },
              ]
            }
          ];

          // Final guard against any duplicate menu items by path+title.
          const deduped = new Map<string, SidebarItem>();
          for (const item of items) {
            const key = `${normalizeText((item as any).path || '')}|${normalizeText(item.title || '')}`;
            deduped.set(key, item);
          }

          setSitemap(Array.from(deduped.values()));
        }
      } catch (err) {
        console.error('Fetch data failed', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [user, unreadCount]);

  if (isLoading) {
    return <div style={{
      display: 'flex', height: '100vh', width: '100vw',
      alignItems: 'center', justifyContent: 'center',
      background: '#f4f6f9', color: '#3b82f6',
      fontSize: '1.2rem', fontWeight: '600'
    }}>Yüklənir...</div>;
  }

  const isSitemapEmpty = !sitemap || sitemap.length === 0;

  return (
    <Router basename={import.meta.env.PROD ? '/admin' : '/'}>
      <div className="app-container">
        <Toaster containerStyle={{ zIndex: 10001 }} position="top-right" reverseOrder={false} />
        {!user ? (
          <Login onLogin={setUser} />
        ) : (
          <>
            <Sidebar menuItems={sitemap} user={user} onLogout={() => {
              localStorage.removeItem('forsaj_admin_user');
              setUser(null);
            }} />
            <main className="main-content">
              <Header user={user} />
              <div className="content-body">
                <Routes>
                  {isSitemapEmpty ? (
                    <Route path="*" element={<SetupGuide />} />
                  ) : (
                    <>
                      <Route path="/" element={<VisualEditor />} />

                      <Route path="/applications" element={<ApplicationsManager />} />

                      <Route path="/general-settings" element={<GeneralSettings />} />

                      <Route path="/users-management" element={<UsersManager currentUser={user} />} />

                      <Route path="/frontend-settings" element={
                        user.role === 'master' ? <FrontendSettings /> : <div className="fade-in"><h1>İcazə yoxdur</h1><p>Bu səhifə yalnız Baş Admin üçündür.</p></div>
                      } />

                      <Route path="*" element={<div className="fade-in"><h1>Səhifə tapılmadı</h1></div>} />
                    </>
                  )}
                </Routes>
              </div>
            </main>
          </>
        )}
      </div>
    </Router>
  );
};

export default App;
