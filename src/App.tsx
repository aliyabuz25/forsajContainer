import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import VisualEditor from './pages/VisualEditor';
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
  'SİSTEM AYARLARI': 'Sistem Ayarları',
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
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('forsaj_admin_user');
        localStorage.removeItem('forsaj_admin_token');
        setUser(null);
      }
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
        let nextUnreadCount = unreadCount;
        // Fetch unread count
        const unreadRes = await fetch('/api/applications/unread-count', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (unreadRes.ok) {
          const { count } = await unreadRes.json();
          nextUnreadCount = Number(count) || 0;
          setUnreadCount(nextUnreadCount);
        }

        // Fetch sitemap
        const response = await fetch(`/api/sitemap?v=${Date.now()}`);
        if (response.ok) {
          const data = await response.json();
          let items = Array.isArray(data) ? data : [];

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
                badge: nextUnreadCount > 0 ? { text: nextUnreadCount.toString(), color: 'bg-red-500' } : undefined
              }
            ];
          } else if (nextUnreadCount > 0) {
            hasApplications.badge = { text: nextUnreadCount.toString(), color: 'bg-red-500' };
          } else {
            delete hasApplications.badge;
          }

          // Ensure a single canonical "Sistem Ayarları" item with required children.
          const requiredSystemChildren: SidebarItem[] = [
            { title: 'SEO Ayarları', path: '/general-settings?tab=seo', icon: 'Globe' },
            { title: 'Ümumi Parametrlər', path: '/general-settings?tab=general', icon: 'Sliders' },
            { title: 'Əlaqə və Sosial', path: '/general-settings?tab=contact', icon: 'Phone' },
            { title: 'Tətbiq Ayarları', path: '/general-settings?tab=stats', icon: 'Activity' },
          ];

          const systemIdx = items.findIndex((i: any) => normalizeText(i?.title || '') === 'sistem ayarlari');
          if (systemIdx === -1) {
            items = [
              ...items,
              {
                title: 'Sistem Ayarları',
                icon: 'Settings',
                children: requiredSystemChildren
              }
            ];
          } else {
            const existing = items[systemIdx];
            const mergedChildren = new Map<string, SidebarItem>();
            (existing.children || []).forEach((c: SidebarItem) => {
              const key = `${normalizeText(c.title)}|${normalizeText((c as any).path || '')}`;
              mergedChildren.set(key, c);
            });
            requiredSystemChildren.forEach((c) => {
              const key = `${normalizeText(c.title)}|${normalizeText((c as any).path || '')}`;
              mergedChildren.set(key, c);
            });
            items[systemIdx] = { ...existing, children: Array.from(mergedChildren.values()), icon: existing.icon || 'Settings' };
          }

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
  }, [user]);

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
              localStorage.removeItem('forsaj_admin_token');
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
