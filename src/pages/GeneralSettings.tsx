import React, { useState, useEffect } from 'react';
import { Globe, Image as ImageIcon, BarChart3, Save, Upload, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLocation } from 'react-router-dom';
import './GeneralSettings.css';

const GeneralSettings: React.FC = () => {
    const [pages, setPages] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const location = useLocation();

    const loadSettings = async () => {
        try {
            const res = await fetch('/api/site-content');
            const data = await res.json();
            setPages(data);
            setIsLoading(false);
        } catch (err) {
            toast.error('Ayarlar yüklənərkən xəta baş verdi');
        }
    };

    useEffect(() => {
        loadSettings();
    }, []);

    useEffect(() => {
        if (isLoading) return;
        const params = new URLSearchParams(location.search);
        const tab = params.get('tab');

        const tabToSection: Record<string, string> = {
            seo: 'seo-basic',
            general: 'branding',
            contact: 'contact-details',
            social: 'social-links',
            stats: 'stats',
        };

        const section = tab ? tabToSection[tab] : '';
        if (!section) return;

        setTimeout(() => {
            const target = document.querySelector(`[data-settings-section="${section}"]`);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 50);
    }, [location.search, isLoading]);

    const updateField = (id: string, value: string, isImage: boolean = false) => {
        const newPages = [...pages];
        let pageIdx = newPages.findIndex(p => p.id === 'general');
        if (pageIdx === -1) {
            newPages.push({ id: 'general', title: 'SİSTEM AYARLARI', sections: [], images: [] });
            pageIdx = newPages.length - 1;
        }

        if (isImage) {
            const imgIdx = newPages[pageIdx].images.findIndex((img: any) => img.id === id);
            if (imgIdx === -1) {
                newPages[pageIdx].images.push({ id, path: value, alt: id, type: 'local' });
            } else {
                newPages[pageIdx].images[imgIdx].path = value;
            }
        } else {
            const secIdx = newPages[pageIdx].sections.findIndex((sec: any) => sec.id === id);
            if (secIdx === -1) {
                newPages[pageIdx].sections.push({ id, type: 'text', label: id, value });
            } else {
                newPages[pageIdx].sections[secIdx].value = value;
            }
        }
        setPages(newPages);
    };

    const getFieldValue = (id: string, isImage: boolean = false) => {
        const page = pages.find(p => p.id === 'general');
        if (!page) return '';
        if (isImage) {
            return page.images.find((img: any) => img.id === id)?.path || '';
        }
        return page.sections.find((sec: any) => sec.id === id)?.value || '';
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);
        const toastId = toast.loading('Şəkil yüklənir...');

        try {
            const res = await fetch('/api/upload-image', { method: 'POST', body: formData });
            if (res.ok) {
                const data = await res.json();
                updateField(id, data.url, true);
                toast.success('Şəkil yükləndi', { id: toastId });
            }
        } catch (err) {
            toast.error('Yükləmə xətası', { id: toastId });
        }
    };

    const saveChanges = async () => {
        setIsSaving(true);
        const toastId = toast.loading('Yadda saxlanılır...');
        try {
            await fetch('/api/save-content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pages)
            });
            toast.success('Ayarlar qeyd edildi!', { id: toastId });
        } catch (err) {
            toast.error('Xəta baş verdi', { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="loading-state">Yüklənir...</div>;

    return (
        <div className="general-settings fade-in">
            <div className="settings-header">
                <div>
                    <h1>Sistem Ayarları</h1>
                    <p>SEO, Brendinq və ümumi sayt tənzimləmələri</p>
                </div>
                <button className="save-btn" onClick={saveChanges} disabled={isSaving}>
                    <Save size={18} />
                    <span>Yadda Saxla</span>
                </button>
            </div>

            <div className="settings-grid">
                {/* SEO Section */}
                <div className="settings-card shadow-sm" data-settings-section="seo-basic">
                    <div className="card-header">
                        <Globe size={20} className="text-blue-500" />
                        <h2>SEO və axtarış motoru</h2>
                    </div>
                    <div className="card-body">
                        <div className="field-group">
                            <label>Meta başlıq (sayt adı)</label>
                            <input
                                type="text"
                                value={getFieldValue('SEO_TITLE')}
                                onChange={(e) => updateField('SEO_TITLE', e.target.value)}
                                placeholder="Məs: Forsaj Club - Offroad & Motorsport"
                            />
                        </div>
                        <div className="field-group">
                            <label>Meta təsvir</label>
                            <textarea
                                value={getFieldValue('SEO_DESCRIPTION')}
                                onChange={(e) => updateField('SEO_DESCRIPTION', e.target.value)}
                                placeholder="Sayt haqqında qısa məlumat..."
                            />
                        </div>
                        <div className="field-group">
                            <label>Açar sözlər</label>
                            <input
                                type="text"
                                value={getFieldValue('SEO_KEYWORDS')}
                                onChange={(e) => updateField('SEO_KEYWORDS', e.target.value)}
                                placeholder="offroad, baki, yarış, mitsubishi, pajero"
                            />
                        </div>
                        <div className="field-group">
                            <label>Kanonik URL</label>
                            <input
                                type="text"
                                value={getFieldValue('SEO_CANONICAL_URL')}
                                onChange={(e) => updateField('SEO_CANONICAL_URL', e.target.value)}
                                placeholder="https://forsaj.az"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="field-group">
                                <label>Robots direktivi</label>
                                <input
                                    type="text"
                                    value={getFieldValue('SEO_ROBOTS')}
                                    onChange={(e) => updateField('SEO_ROBOTS', e.target.value)}
                                    placeholder="index,follow"
                                />
                            </div>
                            <div className="field-group">
                                <label>Müəllif</label>
                                <input
                                    type="text"
                                    value={getFieldValue('SEO_AUTHOR')}
                                    onChange={(e) => updateField('SEO_AUTHOR', e.target.value)}
                                    placeholder="Forsaj Club"
                                />
                            </div>
                        </div>
                        <div className="field-group">
                            <label>Dil (html lang)</label>
                            <input
                                type="text"
                                value={getFieldValue('SEO_LANGUAGE')}
                                onChange={(e) => updateField('SEO_LANGUAGE', e.target.value)}
                                placeholder="az"
                            />
                        </div>
                    </div>
                </div>

                {/* Open Graph / Twitter SEO */}
                <div className="settings-card shadow-sm" data-settings-section="seo-social">
                    <div className="card-header">
                        <Globe size={20} className="text-cyan-500" />
                        <h2>Sosial paylaşım SEO (OG / Twitter)</h2>
                    </div>
                    <div className="card-body">
                        <div className="field-group">
                            <label>OG başlıq</label>
                            <input
                                type="text"
                                value={getFieldValue('SEO_OG_TITLE')}
                                onChange={(e) => updateField('SEO_OG_TITLE', e.target.value)}
                                placeholder="Sosial şəbəkə başlığı"
                            />
                        </div>
                        <div className="field-group">
                            <label>OG təsvir</label>
                            <textarea
                                value={getFieldValue('SEO_OG_DESCRIPTION')}
                                onChange={(e) => updateField('SEO_OG_DESCRIPTION', e.target.value)}
                                placeholder="Sosial şəbəkə paylaşım təsviri"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="field-group">
                                <label>OG URL</label>
                                <input
                                    type="text"
                                    value={getFieldValue('SEO_OG_URL')}
                                    onChange={(e) => updateField('SEO_OG_URL', e.target.value)}
                                    placeholder="https://forsaj.az"
                                />
                            </div>
                            <div className="field-group">
                                <label>Twitter kart növü</label>
                                <input
                                    type="text"
                                    value={getFieldValue('SEO_TWITTER_CARD')}
                                    onChange={(e) => updateField('SEO_TWITTER_CARD', e.target.value)}
                                    placeholder="summary_large_image"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="field-group">
                                <label>Twitter hesabı (site)</label>
                                <input
                                    type="text"
                                    value={getFieldValue('SEO_TWITTER_SITE')}
                                    onChange={(e) => updateField('SEO_TWITTER_SITE', e.target.value)}
                                    placeholder="@forsajclub"
                                />
                            </div>
                            <div className="field-group">
                                <label>Twitter müəllif</label>
                                <input
                                    type="text"
                                    value={getFieldValue('SEO_TWITTER_CREATOR')}
                                    onChange={(e) => updateField('SEO_TWITTER_CREATOR', e.target.value)}
                                    placeholder="@forsajclub"
                                />
                            </div>
                        </div>
                        <div className="field-group">
                            <label>OG şəkli</label>
                            <div className="logo-preview" style={{ minHeight: '140px' }}>
                                {getFieldValue('SEO_OG_IMAGE', true) ? (
                                    <img src={getFieldValue('SEO_OG_IMAGE', true)} alt="OG Şəkli" />
                                ) : (
                                    <div className="no-logo">OG şəkli yoxdur</div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4" style={{ marginTop: '10px' }}>
                                <label className="upload-btn">
                                    <Upload size={14} /> Şəkil yüklə
                                    <input type="file" hidden onChange={(e) => handleFileUpload(e, 'SEO_OG_IMAGE')} />
                                </label>
                                <input
                                    type="text"
                                    value={getFieldValue('SEO_OG_IMAGE', true)}
                                    onChange={(e) => updateField('SEO_OG_IMAGE', e.target.value, true)}
                                    placeholder="https://forsaj.az/og-cover.jpg"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Verification Section */}
                <div className="settings-card shadow-sm" data-settings-section="seo-verify">
                    <div className="card-header">
                        <BarChart3 size={20} className="text-violet-500" />
                        <h2>Axtarış motoru təsdiqləri</h2>
                    </div>
                    <div className="card-body">
                        <div className="field-group">
                            <label>Google təsdiq kodu</label>
                            <input
                                type="text"
                                value={getFieldValue('SEO_GOOGLE_VERIFICATION')}
                                onChange={(e) => updateField('SEO_GOOGLE_VERIFICATION', e.target.value)}
                                placeholder="google-site-verification kodu"
                            />
                        </div>
                        <div className="field-group">
                            <label>Bing təsdiq kodu</label>
                            <input
                                type="text"
                                value={getFieldValue('SEO_BING_VERIFICATION')}
                                onChange={(e) => updateField('SEO_BING_VERIFICATION', e.target.value)}
                                placeholder="msvalidate.01 kodu"
                            />
                        </div>
                        <div className="field-group">
                            <label>Yandex təsdiq kodu</label>
                            <input
                                type="text"
                                value={getFieldValue('SEO_YANDEX_VERIFICATION')}
                                onChange={(e) => updateField('SEO_YANDEX_VERIFICATION', e.target.value)}
                                placeholder="yandex-verification kodu"
                            />
                        </div>
                    </div>
                </div>

                {/* Branding Section */}
                <div className="settings-card shadow-sm" data-settings-section="branding">
                    <div className="card-header">
                        <ImageIcon size={20} className="text-orange-500" />
                        <h2>Brendinq & Loqo</h2>
                    </div>
                    <div className="card-body">
                        <div className="logo-upload-grid">
                            <div className="logo-box">
                                <label>Əsas Loqo (Light)</label>
                                <div className="logo-preview">
                                    {getFieldValue('SITE_LOGO_LIGHT', true) ? (
                                        <img src={getFieldValue('SITE_LOGO_LIGHT', true)} alt="Logo Light" />
                                    ) : (
                                        <div className="no-logo">Loqo yoxdur</div>
                                    )}
                                </div>
                                <label className="upload-btn">
                                    <Upload size={14} /> Yüklə
                                    <input type="file" hidden onChange={(e) => handleFileUpload(e, 'SITE_LOGO_LIGHT')} />
                                </label>
                            </div>
                            <div className="logo-box">
                                <label>Alternativ Loqo (Dark)</label>
                                <div className="logo-preview dark-bg">
                                    {getFieldValue('SITE_LOGO_DARK', true) ? (
                                        <img src={getFieldValue('SITE_LOGO_DARK', true)} alt="Logo Dark" />
                                    ) : (
                                        <div className="no-logo">Loqo yoxdur</div>
                                    )}
                                </div>
                                <label className="upload-btn">
                                    <Upload size={14} /> Yüklə
                                    <input type="file" hidden onChange={(e) => handleFileUpload(e, 'SITE_LOGO_DARK')} />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Contact Details Section */}
                <div className="settings-card shadow-sm" data-settings-section="contact-details">
                    <div className="card-header">
                        <ImageIcon size={20} className="text-red-500" />
                        <h2>Əlaqə & Ünvan Məlumatları</h2>
                    </div>
                    <div className="card-body">
                        <div className="field-group">
                            <label>Baş Ofis Ünvan (Sətir 1)</label>
                            <input
                                type="text"
                                value={getFieldValue('CONTACT_ADDRESS_1')}
                                onChange={(e) => updateField('CONTACT_ADDRESS_1', e.target.value)}
                                placeholder="Məs: AZADLIQ 102, BAKI"
                            />
                        </div>
                        <div className="field-group">
                            <label>Baş Ofis Ünvan (Sətir 2)</label>
                            <input
                                type="text"
                                value={getFieldValue('CONTACT_ADDRESS_2')}
                                onChange={(e) => updateField('CONTACT_ADDRESS_2', e.target.value)}
                                placeholder="Məs: AZƏRBAYCAN // SECTOR_01"
                            />
                        </div>
                        <div className="field-group">
                            <label>İş Saatları</label>
                            <input
                                type="text"
                                value={getFieldValue('CONTACT_HOURS')}
                                onChange={(e) => updateField('CONTACT_HOURS', e.target.value)}
                                placeholder="Məs: 09:00 - 18:00"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="field-group">
                                <label>Əlaqə Nömrəsi</label>
                                <input
                                    type="text"
                                    value={getFieldValue('CONTACT_PHONE')}
                                    onChange={(e) => updateField('CONTACT_PHONE', e.target.value)}
                                    placeholder="+994 50 000 00 00"
                                />
                            </div>
                            <div className="field-group">
                                <label>Əlaqə E-poçtu</label>
                                <input
                                    type="text"
                                    value={getFieldValue('CONTACT_EMAIL')}
                                    onChange={(e) => updateField('CONTACT_EMAIL', e.target.value)}
                                    placeholder="info@forsaj.az"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Department Emails Section */}
                <div className="settings-card shadow-sm" data-settings-section="departments">
                    <div className="card-header">
                        <Mail size={20} className="text-purple-500" />
                        <h2>Şöbə E-poçtları</h2>
                    </div>
                    <div className="card-body">
                        <div className="field-group">
                            <label>Baş Ofis (HQ)</label>
                            <input
                                type="text"
                                value={getFieldValue('DEPT_HQ_EMAIL')}
                                onChange={(e) => updateField('DEPT_HQ_EMAIL', e.target.value)}
                                placeholder="hq@forsaj.az"
                            />
                        </div>
                        <div className="field-group">
                            <label>Media və PR</label>
                            <input
                                type="text"
                                value={getFieldValue('DEPT_PR_EMAIL')}
                                onChange={(e) => updateField('DEPT_PR_EMAIL', e.target.value)}
                                placeholder="pr@forsaj.az"
                            />
                        </div>
                        <div className="field-group">
                            <label>Texniki Dəstək</label>
                            <input
                                type="text"
                                value={getFieldValue('DEPT_TECH_EMAIL')}
                                onChange={(e) => updateField('DEPT_TECH_EMAIL', e.target.value)}
                                placeholder="tech@forsaj.az"
                            />
                        </div>
                    </div>
                </div>

                {/* Social Links Section */}
                <div className="settings-card shadow-sm" data-settings-section="social-links">
                    <div className="card-header">
                        <Globe size={20} className="text-pink-500" />
                        <h2>Sosial Media Linkləri</h2>
                    </div>
                    <div className="card-body">
                        <div className="field-group">
                            <label>Instagram</label>
                            <input
                                type="text"
                                value={getFieldValue('SOCIAL_INSTAGRAM')}
                                onChange={(e) => updateField('SOCIAL_INSTAGRAM', e.target.value)}
                                placeholder="https://instagram.com/forsajclub"
                            />
                        </div>
                        <div className="field-group">
                            <label>Youtube</label>
                            <input
                                type="text"
                                value={getFieldValue('SOCIAL_YOUTUBE')}
                                onChange={(e) => updateField('SOCIAL_YOUTUBE', e.target.value)}
                                placeholder="https://youtube.com/@forsajclub"
                            />
                        </div>
                        <div className="field-group">
                            <label>Facebook</label>
                            <input
                                type="text"
                                value={getFieldValue('SOCIAL_FACEBOOK')}
                                onChange={(e) => updateField('SOCIAL_FACEBOOK', e.target.value)}
                                placeholder="https://facebook.com/forsajclub"
                            />
                        </div>
                    </div>
                </div>

                {/* Stats Section */}
                <div className="settings-card shadow-sm" data-settings-section="stats">
                    <div className="card-header">
                        <BarChart3 size={20} className="text-green-500" />
                        <h2>Sayt Statistikaları</h2>
                    </div>
                    <div className="card-body">
                        <div className="stats-edit-grid">
                            <div className="field-group">
                                <label>Pilot Sayı</label>
                                <input
                                    type="text"
                                    value={getFieldValue('STATS_PILOTS')}
                                    onChange={(e) => updateField('STATS_PILOTS', e.target.value)}
                                    placeholder="Susmaya görə: 140+"
                                />
                            </div>
                            <div className="field-group">
                                <label>Yarış Sayı</label>
                                <input
                                    type="text"
                                    value={getFieldValue('STATS_RACES')}
                                    onChange={(e) => updateField('STATS_RACES', e.target.value)}
                                    placeholder="Susmaya görə: 50+"
                                />
                            </div>
                            <div className="field-group">
                                <label>Gənc İştirakçı</label>
                                <input
                                    type="text"
                                    value={getFieldValue('STATS_YOUTH')}
                                    onChange={(e) => updateField('STATS_YOUTH', e.target.value)}
                                    placeholder="Susmaya görə: 20+"
                                />
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default GeneralSettings;
