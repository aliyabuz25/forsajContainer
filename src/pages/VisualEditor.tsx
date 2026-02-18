import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Save, Type, Image as ImageIcon, Layout, Globe, Plus, Trash2, X, Search, Calendar, FileText, Trophy, Video, Play, ChevronUp, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import './VisualEditor.css';

interface Section {
    id: string;
    type: 'text' | 'image';
    label: string;
    value: string;
    url?: string;
    order?: number;
}

interface PageImage {
    id: string;
    path: string;
    alt: string;
    type: 'local' | 'remote';
    order?: number;
}

interface PageContent {
    id: string;
    title: string;
    active?: boolean;
    sections: Section[];
    images: PageImage[];
}

interface EventItem {
    id: number;
    title: string;
    date: string;
    location: string;
    category: string;
    img: string;
    description: string;
    rules: string;
    pdfUrl?: string;
    status: 'planned' | 'past';
}

interface NewsItem {
    id: number;
    title: string;
    date: string;
    img: string;
    description: string;
    category?: string;
    status: 'published' | 'draft';
}

interface DriverItem {
    id: number;
    rank: number;
    name: string;
    license: string;
    team: string;
    wins: number;
    points: number;
    img: string;
}

interface VideoItem {
    id: number;
    title: string;
    youtubeUrl: string;
    videoId: string;
    duration: string;
    thumbnail: string;
    created_at?: string;
}

interface GalleryPhotoItem {
    id: number;
    title: string;
    url: string;
}

interface DriverCategory {
    id: string;
    name: string;
    drivers: DriverItem[];
}

const QUILL_MODULES = {
    toolbar: [
        [{ 'header': [2, 3, false] }],
        ['bold', 'italic', 'underline'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        ['link'],
        ['clean']
    ],
};

const ICON_PRESETS = ['Shield', 'Users', 'Leaf', 'Zap', 'Target', 'Globe', 'Star', 'Flag'];

const bbcodeToHtmlForEditor = (raw: string) => {
    if (!raw) return '';

    const value = raw.replace(/\\+\[/g, '[').replace(/\\+\]/g, ']');
    const hasBbcode = /\[(\/?)(B|I|U|S|CENTER|FONT|URL|IMG|COLOR|SIZE|QUOTE|CODE|LIST|\*)[\]=\s\w"':#.,+-]*\]/i.test(value);
    if (!hasBbcode) return value;

    let html = value;
    html = html.replace(/\[CENTER\]([\s\S]*?)\[\/CENTER\]/gi, '<div style="text-align:center;">$1</div>');
    html = html.replace(/\[FONT=([^\]]+)\]([\s\S]*?)\[\/FONT\]/gi, '<span style="font-family:$1;">$2</span>');
    html = html.replace(/\[B\]([\s\S]*?)\[\/B\]/gi, '<strong>$1</strong>');
    html = html.replace(/\[I\]([\s\S]*?)\[\/I\]/gi, '<em>$1</em>');
    html = html.replace(/\[U\]([\s\S]*?)\[\/U\]/gi, '<span style="text-decoration:underline;">$1</span>');
    html = html.replace(/\[S\]([\s\S]*?)\[\/S\]/gi, '<strike>$1</strike>');
    html = html.replace(/\[URL=([^\]]+)\]([\s\S]*?)\[\/URL\]/gi, '<a href="$1" target="_blank" rel="noopener noreferrer">$2</a>');
    html = html.replace(/\[IMG\]([\s\S]*?)\[\/IMG\]/gi, '<img src="$1" style="max-width:100%;" />');
    html = html.replace(/\[COLOR=([^\]]+)\]([\s\S]*?)\[\/COLOR\]/gi, '<span style="color:$1;">$2</span>');
    html = html.replace(/\[SIZE=([^\]]+)\]([\s\S]*?)\[\/SIZE\]/gi, '<span style="font-size:$1px;">$2</span>');
    html = html.replace(/\[QUOTE\]([\s\S]*?)\[\/QUOTE\]/gi, '<blockquote>$1</blockquote>');
    html = html.replace(/\[CODE\]([\s\S]*?)\[\/CODE\]/gi, '<pre><code>$1</code></pre>');
    html = html.replace(/\r?\n/g, '<br />');
    return html;
};

const QuillEditor: React.FC<{ value: string, onChange: (val: string) => void, id: string, readOnly?: boolean }> = ({ value, onChange, id, readOnly = false }) => {
    return (
        <div className="quill-editor-wrapper" id={id}>
            <ReactQuill
                theme="snow"
                value={value || ''}
                onChange={onChange}
                modules={readOnly ? { toolbar: false } : QUILL_MODULES}
                readOnly={readOnly}
                placeholder="Məzmunu daxil edin..."
            />
        </div>
    );
};

const extractSectionKey = (section: Section) => {
    if (/^[A-Z0-9_]+$/.test(section.id)) return section.id.trim();

    const label = (section.label || '').trim();
    if (label.startsWith('KEY:')) {
        return label.replace(/^KEY:\s*/i, '').trim();
    }

    return '';
};

const KEY_TOKEN_REGEX = /\b[A-Z0-9]+(?:_[A-Z0-9]+)+\b/;
const looksLikeKeyToken = (value?: string) => KEY_TOKEN_REGEX.test((value || '').trim());
const humanizeKey = (value: string) => value.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
const normalizePlainText = (value: string) => {
    if (!value) return '';
    let current = value;

    for (let i = 0; i < 4; i++) {
        const doc = new DOMParser().parseFromString(current, 'text/html');
        const decoded = (doc.body.textContent || '').trim();
        if (!decoded || decoded === current) break;
        current = decoded;
    }

    const finalDoc = new DOMParser().parseFromString(current, 'text/html');
    return (finalDoc.body.textContent || '')
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

const toAbsoluteUrl = (rawValue: string) => {
    const value = (rawValue || '').trim();
    if (!value) return '';
    if (/^(https?:)?\/\//i.test(value)) return value;
    const normalizedPath = value.startsWith('/') ? value : `/${value}`;
    return `${window.location.origin}${normalizedPath}`;
};

const containsHtmlNoise = (value: string) =>
    /&(?:lt|gt|nbsp|quot|amp);|<\/?[a-z][^>]*>/i.test(value || '');

const hasRichContentMarkers = (value: string) =>
    /<(ul|ol|li|a|img|iframe|video|table|h[1-6])\b|\[(b|i|u|url|img|center)\]/i.test(value || '');

const shouldForcePlainText = (section: Section) => {
    const key = extractSectionKey(section);
    if (key) return true;
    if (isStatSectionId(section.id)) return true;
    if (section.id.startsWith('txt-') || section.id.startsWith('val-')) return true;
    if (section.id.startsWith('RULES_') || section.id.startsWith('PAGE_') || section.id.startsWith('BTN_') || section.id.startsWith('DOC_')) return true;
    if (containsHtmlNoise(section.value || '') && !hasRichContentMarkers(section.value || '')) return true;
    return false;
};

const STAT_LABEL_PREFIX = 'label-stat-';
const STAT_VALUE_PREFIX = 'value-stat-';
const isStatSectionId = (id: string) => id.startsWith(STAT_LABEL_PREFIX) || id.startsWith(STAT_VALUE_PREFIX);
const getStatSuffix = (id: string) => id.startsWith(STAT_LABEL_PREFIX)
    ? id.slice(STAT_LABEL_PREFIX.length)
    : id.startsWith(STAT_VALUE_PREFIX)
        ? id.slice(STAT_VALUE_PREFIX.length)
        : '';

const isSectionBusinessEditable = (_section: Section) => {
    return true;
};

const canEditSectionField = (section: Section, field: 'value' | 'label' | 'url') => {
    if (!isSectionBusinessEditable(section)) return false;

    const key = extractSectionKey(section);
    if (key) return field === 'value';

    return true;
};

const canDeleteSection = (section: Section) => {
    if (!isSectionBusinessEditable(section)) return false;
    return !extractSectionKey(section);
};

const isSectionVisibleInAdmin = (_section: Section) => {
    return true;
};

const shouldSkipSectionInEditor = (section: Section) => {
    const key = extractSectionKey(section);
    // Keep human-facing key fields editable, but hide raw token placeholders.
    if (key && key.includes('_') && looksLikeKeyToken(normalizePlainText(section.value || ''))) return true;
    if (!key && looksLikeKeyToken(section.value)) return true;
    return false;
};

const PARTNER_KEY_REGEX = /^PARTNER_(\d+)_(NAME|TAG|ICON|USE_IMAGE|IMAGE_ID)$/;
type PartnerField = 'name' | 'tag' | 'icon' | 'useImage' | 'imageId';
type PartnerRow = {
    index: number;
    name: string;
    tag: string;
    icon: string;
    useImage: string;
    imageId: string;
};

const toPartnerField = (token: string): PartnerField | null => {
    if (token === 'NAME') return 'name';
    if (token === 'TAG') return 'tag';
    if (token === 'ICON') return 'icon';
    if (token === 'USE_IMAGE') return 'useImage';
    if (token === 'IMAGE_ID') return 'imageId';
    return null;
};

const componentLabels: Record<string, string> = {
    'hero': 'Hero Bölməsi',
    'marquee': 'Marquee Yazısı',
    'navbar': 'Menyu və Naviqasiya',
    'about': 'HAQQIMIZDA',
    'mission_vision': 'Missiya və Vizyon',
    'values': 'Dəyərlərimiz',
    'eventspage': 'Tədbirlər Səhifəsi',
    'newspage': 'Xəbər Səhifəsi',
    'gallerypage': 'Qalereya Səhifəsi',
    'contactpage': 'Əlaqə Səhifəsi',
    'rulespage': 'Qaydalar Səhifəsi',
    'news': 'Xəbərlər',
    'drivers': 'Sürücülər',
    'categoryleaders': 'Kateqoriya Liderləri',
    'gallery': 'Qalereya',
    'videos': 'Videolar',
    'videoarchive': 'Video Arxiv',
    'footer': 'Footer',
    'partners': 'Tərəfdaşlar',
    'offroadinfo': 'Offroad Nədir?',
    'whatisoffroad': 'Offroad Nədir?',
    'nextrace': 'Növbəti Yarış',
    'site': 'Sayt Ayarları',
    'settings': 'Ümumi Parametrlər',
    'general': 'SİSTEM AYARLARI',
    'app': 'Tətbiq Ayarları'
};

const TAB_PAGE_GROUPS: Record<string, string[]> = {
    home: ['navbar', 'hero', 'marquee', 'categoryleaders', 'footer'],
    // About page in frontend reads all content from "about" page id.
    abouttab: ['about'],
    newstab: ['newspage'],
    eventstab: ['eventspage'],
    driverstab: ['drivers'],
    gallerytab: ['gallerypage', 'gallery', 'videos', 'videoarchive'],
    rulestab: ['rulespage'],
    contacttab: ['contactpage']
};

const PAGE_TO_TAB_GROUP: Record<string, string> = Object.entries(TAB_PAGE_GROUPS).reduce((acc, [tabKey, pageIds]) => {
    pageIds.forEach((id) => {
        acc[id] = tabKey;
    });
    return acc;
}, {} as Record<string, string>);

const resolvePageGroup = (pageParam?: string | null) => {
    if (!pageParam) return [];
    if (TAB_PAGE_GROUPS[pageParam]) return TAB_PAGE_GROUPS[pageParam];
    const tabKey = PAGE_TO_TAB_GROUP[pageParam];
    if (tabKey && TAB_PAGE_GROUPS[tabKey]) return TAB_PAGE_GROUPS[tabKey];
    return [pageParam];
};

const CONTENT_VERSION_KEY = 'forsaj_site_content_version';
const normalizeOrder = (value: number | undefined, fallback: number) =>
    Number.isFinite(value as number) ? (value as number) : fallback;

const VisualEditor: React.FC = () => {
    const [pages, setPages] = useState<PageContent[]>([]);
    const [selectedPageIndex, setSelectedPageIndex] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [extractStep, setExtractStep] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImageSelectorOpen, setIsImageSelectorOpen] = useState(false);
    const [isAddingNewFromSystem, setIsAddingNewFromSystem] = useState(false);
    const [allAvailableImages, setAllAvailableImages] = useState<string[]>([]);
    const [activeImageField, setActiveImageField] = useState<{ pageIdx: number, imgId: string } | null>(null);
    const [newSectionTitle, setNewSectionTitle] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const [events, setEvents] = useState<EventItem[]>([]);
    const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
    const [eventForm, setEventForm] = useState<Partial<EventItem>>({});

    // News Mode State
    const [news, setNews] = useState<NewsItem[]>([]);
    const [selectedNewsId, setSelectedNewsId] = useState<number | null>(null);
    const [newsForm, setNewsForm] = useState<Partial<NewsItem>>({});

    // Video Mode State
    const [videos, setVideos] = useState<VideoItem[]>([]);
    const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);
    const [videoForm, setVideoForm] = useState<Partial<VideoItem>>({});

    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const mode = queryParams.get('mode'); // 'extract', 'events', 'news', 'drivers', 'videos', 'photos'
    const pageParam = queryParams.get('page');

    const [editorMode, setEditorMode] = useState<'extract' | 'events' | 'news' | 'drivers' | 'videos' | 'photos'>('extract');

    const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhotoItem[]>([]);
    const autoSyncTriggeredRef = useRef(false);
    const [selectedPhotoId, setSelectedPhotoId] = useState<number | null>(null);
    const [photoForm, setPhotoForm] = useState<Partial<GalleryPhotoItem>>({});

    useEffect(() => {
        if (mode) {
            setEditorMode(mode as any);
        } else if (pageParam) {
            setEditorMode('extract');
        } else {
            setEditorMode('extract');
        }
    }, [mode, pageParam]);
    const [driverCategories, setDriverCategories] = useState<DriverCategory[]>([]);
    const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
    const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
    const [driverForm, setDriverForm] = useState<Partial<DriverItem>>({});

    const loadContent = async () => {
        try {
            // 1. Load Site Content
            const resContent = await fetch('/api/site-content');
            const contentData = await resContent.json();
            if (Array.isArray(contentData)) {
                // Ensure default sections exist
                const defaultIds = [
                    'hero', 'marquee', 'navbar', 'about', 'mission_vision', 'values',
                    'rulespage', 'eventspage', 'newspage', 'gallerypage', 'contactpage',
                    'news', 'drivers', 'categoryleaders', 'gallery', 'videos', 'videoarchive',
                    'footer', 'partners', 'offroadinfo', 'whatisoffroad', 'nextrace',
                    'site', 'settings', 'general', 'app'
                ];
                const updatedContent = [...contentData];
                const ensureAboutDefaults = (aboutPage: PageContent) => {
                    const sections = aboutPage.sections || [];
                    const images = aboutPage.images || [];

                    const ensureSection = (id: string, label: string, value: string) => {
                        if (sections.some(s => s.id === id)) return;
                        sections.push({ id, type: 'text', label, value });
                    };
                    const ensureImage = (id: string, path: string, alt: string) => {
                        if (images.some(i => i.id === id)) return;
                        images.push({
                            id,
                            path,
                            alt,
                            type: 'remote',
                            order: images.length
                        });
                    };

                    // Ensure key "about" title fields always exist in panel
                    ensureSection(
                        'txt-est-2018-motorsp-949',
                        'About Üst Başlıq',
                        'EST. 2018 // MOTORSPORT MƏRKƏZİ'
                    );
                    ensureSection(
                        'txt-forsaj-club-az-rba-66',
                        'About Ana Başlıq',
                        '"FORSAJ CLUB" AZƏRBAYCANIN OFFROAD MƏDƏNİYYƏTİNİ PEŞƏKAR SƏVİYYƏYƏ ÇATDIRMAQ ÜÇÜN YARADILMIŞDIR.'
                    );
                    ensureSection(
                        'txt-bi-zi-m-mi-ssi-yamiz-424',
                        'Missiya Başlığı',
                        'BİZİM MİSSİYAMIZ'
                    );
                    ensureSection(
                        'txt-az-rbaycan-n-h-r-bir-45',
                        'Missiya Təsviri',
                        'Azərbaycanın hər bir guşəsində offroad idmanını təbliğ etmək, yerli pilotları beynəlxalq standartlara uyğun yetişdirmək və təbiəti qoruyaraq ekstremal adrenalin təcrübəsi bəxş etmək.'
                    );
                    ensureSection(
                        'txt-h-d-fi-mi-z-dakar-ral-50',
                        'Missiya Hədəf Mətni',
                        'HƏDƏFİMİZ: DAKAR RALLİ 2026'
                    );
                    ensureSection(
                        'txt-bi-zi-m-baxi-imiz-944',
                        'Vizyon Başlığı',
                        'BİZİM BAXIŞIMIZ'
                    );
                    ensureSection(
                        'txt-regionun-n-b-y-k-mo-901',
                        'Vizyon Təsviri',
                        'Regionun ən böyük motorsport hubuna çevrilmək, rəqəmsal və fiziki infrastrukturlarla pilotlarımızı dəstəkləmək və motorsportu hər kəs üçün əlçatan bir ehtirasa çevirmək.'
                    );
                    ensureSection(
                        'txt-qafqazin-li-der-klubu-758',
                        'Vizyon Şüarı',
                        'QAFQAZIN LİDER KLUBUNA ÇEVRİLMƏK'
                    );
                    ensureSection(
                        'txt-fundamental-pri-nsi-pl-219',
                        'Dəyərlər Alt Başlıq',
                        'FUNDAMENTAL PRİNSİPLƏR'
                    );
                    ensureSection(
                        'txt-sas-d-y-rl-ri-mi-z-482',
                        'Dəyərlər Başlığı',
                        'ƏSAS DƏYƏRLƏRİMİZ'
                    );
                    ensureSection('val-icon-1', 'Dəyər 1 İkonu', 'Shield');
                    ensureSection('val-title-1', 'Dəyər 1 Başlıq', 'TƏHLÜKƏSİZLİK');
                    ensureSection('val-desc-1', 'Dəyər 1 Təsvir', 'EKSTREMAL İDMANDA CAN SAĞLIĞI BİZİM BİR NÖMRƏLİ QAYDAMIZDIR. BÜTÜN TEXNİKALARIMIZ FIA STANDARTLARINA UYĞUN YOXLANILIR.');
                    ensureSection('val-icon-2', 'Dəyər 2 İkonu', 'Users');
                    ensureSection('val-title-2', 'Dəyər 2 Başlıq', 'İCMA RUHU');
                    ensureSection('val-desc-2', 'Dəyər 2 Təsvir', 'FORSAJ BİR KLUBDAN DAHA ÇOX, SADİQ VƏ BÖYÜK BİR AİLƏDİR. BİRİMİZ HAMIMIZ, HAMIMIZ BİRİMİZ ÜÇÜN!');
                    ensureSection('val-icon-3', 'Dəyər 3 İkonu', 'Leaf');
                    ensureSection('val-title-3', 'Dəyər 3 Başlıq', 'TƏBİƏTİ QORU');
                    ensureSection('val-desc-3', 'Dəyər 3 Təsvir', 'BİZ OFFROAD EDƏRKƏN TƏBİƏTƏ ZƏRƏR VERMƏMƏYİ ÖZÜMÜZƏ BORC BİLİRİK. EKOLOJİ BALANS BİZİM ÜÇÜN MÜQƏDDƏSDİR.');
                    ensureSection('val-icon-4', 'Dəyər 4 İkonu', 'Zap');
                    ensureSection('val-title-4', 'Dəyər 4 Başlıq', 'MÜKƏMMƏLLİK');
                    ensureSection('val-desc-4', 'Dəyər 4 Təsvir', 'HƏR YARIŞDA, HƏR DÖNGƏDƏ DAHA YAXŞI OLMAĞA ÇALIŞIRIQ. TƏLİMLƏRİMİZ PEŞƏKAR İNSTRUKTORLAR TƏRƏFİNDƏN İDARƏ OLUNUR.');

                    const hasStatPairs = sections.some(s => s.id.includes('label-stat')) && sections.some(s => s.id.includes('value-stat'));
                    if (hasStatPairs) {
                        aboutPage.sections = sections;
                        ensureImage(
                            'img-992',
                            'https://images.unsplash.com/photo-1541447271487-09612b3f49f7?q=80&w=1974&auto=format&fit=crop',
                            'Forsaj Club Detail'
                        );
                        aboutPage.images = images;
                        return;
                    }

                    const defaults = [
                        { label: 'PİLOTLAR', value: '140+' },
                        { label: 'YARIŞLAR', value: '50+' },
                        { label: 'GƏNCLƏR', value: '20+' }
                    ];

                    defaults.forEach((item, index) => {
                        const suffix = `${index + 1}`;
                        sections.push({
                            id: `label-stat-${suffix}`,
                            type: 'text',
                            label: `Statistika Etiketi ${index + 1}`,
                            value: item.label
                        });
                        sections.push({
                            id: `value-stat-${suffix}`,
                            type: 'text',
                            label: `Statistika Dəyəri ${index + 1}`,
                            value: item.value
                        });
                    });

                    aboutPage.sections = sections;
                    ensureImage(
                        'img-992',
                        'https://images.unsplash.com/photo-1541447271487-09612b3f49f7?q=80&w=1974&auto=format&fit=crop',
                        'Forsaj Club Detail'
                    );
                    aboutPage.images = images;
                };
                const ensurePartnersDefaults = (partnersPage: PageContent) => {
                    const sections = partnersPage.sections || [];
                    const images = partnersPage.images || [];

                    const ensureSection = (id: string, label: string, value: string) => {
                        if (sections.some(s => s.id === id)) return;
                        sections.push({ id, type: 'text', label, value });
                    };
                    const ensureImage = (id: string) => {
                        if (images.some(i => i.id === id)) return;
                        images.push({ id, path: '', alt: id, type: 'local', order: images.length });
                    };

                    ensureSection('SECTION_TITLE', 'Bölmə Başlığı', 'RƏSMİ TƏRƏFDAŞLARIMIZ');

                    const defaults = [
                        { name: 'AZMF', tag: 'OFFICIAL PARTNER', icon: 'ShieldCheck' },
                        { name: 'OFFROAD AZ', tag: 'OFFICIAL PARTNER', icon: 'Truck' },
                        { name: 'GLOBAL 4X4', tag: 'OFFICIAL PARTNER', icon: 'Globe' },
                        { name: 'RACE TECH', tag: 'OFFICIAL PARTNER', icon: 'Zap' }
                    ];

                    defaults.forEach((item, i) => {
                        const idx = i + 1;
                        ensureSection(`PARTNER_${idx}_NAME`, `Tərəfdaş ${idx} Ad`, item.name);
                        ensureSection(`PARTNER_${idx}_TAG`, `Tərəfdaş ${idx} Etiket`, item.tag);
                        ensureSection(`PARTNER_${idx}_ICON`, `Tərəfdaş ${idx} İkon`, item.icon);
                        ensureSection(`PARTNER_${idx}_USE_IMAGE`, `Tərəfdaş ${idx} Görsel İstifadə`, 'false');
                        ensureSection(`PARTNER_${idx}_IMAGE_ID`, `Tərəfdaş ${idx} Görsel ID`, `partner-image-${idx}`);
                        ensureImage(`partner-image-${idx}`);
                    });

                    partnersPage.sections = sections;
                    partnersPage.images = images;
                };
                const ensureHeroDefaults = (heroPage: PageContent) => {
                    const sections = heroPage.sections || [];
                    const ensureSection = (id: string, label: string, value: string, url?: string) => {
                        const idx = sections.findIndex(s => s.id === id);
                        if (idx === -1) {
                            sections.push({ id, type: 'text', label, value, ...(url ? { url } : {}) });
                            return;
                        }
                        if (url && !sections[idx].url) sections[idx].url = url;
                    };

                    ensureSection('text-3', 'Hero Düymə 1', 'YARIŞLARA BAX', 'events');
                    ensureSection('text-4', 'Hero Düymə 2', 'HAQQIMIZDA', 'about');
                    heroPage.sections = sections;
                };
                const ensurePageSectionDefaults = (
                    page: PageContent,
                    defaults: Array<{ id: string; label: string; value: string; url?: string }>
                ) => {
                    const sections = page.sections || [];
                    defaults.forEach((item) => {
                        const idx = sections.findIndex((s) => s.id === item.id);
                        if (idx === -1) {
                            sections.push({
                                id: item.id,
                                type: 'text',
                                label: item.label,
                                value: item.value,
                                ...(item.url ? { url: item.url } : {})
                            });
                            return;
                        }
                        if (item.url && !sections[idx].url) sections[idx].url = item.url;
                    });
                    page.sections = sections;
                };
                const ensureContactDefaults = (page: PageContent) => {
                    ensurePageSectionDefaults(page, [
                        { id: 'ONLINE_STATUS_LABEL', label: 'Onlayn Status Mətni', value: 'ONLINE' },
                        { id: 'FORM_STATUS_LABEL', label: 'Form Status Mətni', value: 'STATUS: ONLINE' },
                        { id: 'FORM_TOAST_REQUIRED', label: 'Form Boş Sahə Xəbərdarlığı', value: 'Zəhmət olmasa bütün sahələri doldurun.' },
                        { id: 'FORM_TOAST_SUCCESS', label: 'Form Uğurlu Göndəriş Mesajı', value: 'Müraciətiniz uğurla göndərildi!' },
                        { id: 'FORM_TOAST_ERROR', label: 'Form Xəta Mesajı', value: 'Gondərilmə zamanı xəta baş verdi.' }
                    ]);
                };
                const ensureEventsDefaults = (page: PageContent) => {
                    ensurePageSectionDefaults(page, [
                        { id: 'PILOT_FORM_TOAST_REQUIRED', label: 'Pilot Form Boş Sahə Xəbərdarlığı', value: 'Zəhmət olmasa bütün sahələri doldurun.' },
                        { id: 'PILOT_FORM_TOAST_SUCCESS', label: 'Pilot Form Uğurlu Göndəriş Mesajı', value: 'Qeydiyyat müraciətiniz uğurla göndərildi!' },
                        { id: 'PILOT_FORM_TOAST_ERROR', label: 'Pilot Form Xəta Mesajı', value: 'Gondərilmə zamanı xəta baş verdi.' },
                        { id: 'PLACEHOLDER_PHONE', label: 'Telefon Placeholder', value: '+994 -- --- -- --' },
                        { id: 'SPECTATOR_TICKET_URL', label: 'İzləyici Bilet Linki', value: 'https://iticket.az', url: 'https://iticket.az' },
                        { id: 'CLUB_OPTION_1', label: 'Klub Seçimi 1', value: 'Fərdi İştirakçı' },
                        { id: 'CLUB_OPTION_2', label: 'Klub Seçimi 2', value: 'Club 4X4' },
                        { id: 'CLUB_OPTION_3', label: 'Klub Seçimi 3', value: 'Extreme 4X4' },
                        { id: 'CLUB_OPTION_4', label: 'Klub Seçimi 4', value: 'Forsaj Club' },
                        { id: 'CLUB_OPTION_5', label: 'Klub Seçimi 5', value: 'Offroad.az' },
                        { id: 'CLUB_OPTION_6', label: 'Klub Seçimi 6', value: 'Overland 4X4' },
                        { id: 'CLUB_OPTION_7', label: 'Klub Seçimi 7', value: 'PatrolClub.az' },
                        { id: 'CLUB_OPTION_8', label: 'Klub Seçimi 8', value: 'Victory Club' },
                        { id: 'CLUB_OPTION_9', label: 'Klub Seçimi 9', value: 'Zəfər 4X4 Club' }
                    ]);
                };
                const ensureFooterDefaults = (page: PageContent) => {
                    ensurePageSectionDefaults(page, [
                        { id: 'FOOTER_LOGO_ALT', label: 'Footer Logo Alt', value: 'Forsaj Logo' },
                        { id: 'FOOTER_ABOUT_TEXT', label: 'Footer Haqqında Mətn', value: 'Azərbaycanın ən prestijli motorsport mərkəzi. Sərhədsiz offroad həyəcanını bizimlə yaşayın.' },
                        { id: 'FOOTER_ADDRESS_LABEL', label: 'Footer Ünvan Başlığı', value: 'ÜNVAN' },
                        { id: 'FOOTER_CONTACT_LABEL', label: 'Footer Əlaqə Başlığı', value: 'ƏLAQƏ' },
                        { id: 'FOOTER_NAV_TITLE', label: 'Footer Naviqasiya Başlığı', value: 'NAVİQASİYA' },
                        { id: 'FOOTER_MOTORSPORT_TITLE', label: 'Footer Motorsport Başlığı', value: 'MOTORSPORT' },
                        { id: 'FOOTER_NEWSLETTER_TITLE', label: 'Footer Abunə Başlığı', value: 'XƏBƏRDAR OL' },
                        { id: 'FOOTER_NEWSLETTER_DESC', label: 'Footer Abunə Təsviri', value: 'Yarış təqvimi və xəbərlərdən anında xəbərdar olmaq üçün abunə olun.' },
                        { id: 'FOOTER_NEWSLETTER_PLACEHOLDER', label: 'Footer Abunə Placeholder', value: 'EMAIL DAXİL EDİN' },
                        { id: 'FOOTER_COPYRIGHT', label: 'Footer Copyright', value: '© 2024 FORSAJ CLUB. ALL RIGHTS RESERVED.' },
                        { id: 'FOOTER_PRIVACY_LABEL', label: 'Footer Privacy Link Mətni', value: 'Privacy Policy', url: '#' },
                        { id: 'FOOTER_TERMS_LABEL', label: 'Footer Terms Link Mətni', value: 'Terms of Service', url: '#' }
                    ]);
                };
                const ensureCategoryLeaderDefaults = (page: PageContent) => {
                    ensurePageSectionDefaults(page, [
                        { id: 'LEADER_TITLE_SUFFIX', label: 'Lider Başlıq Suffix', value: 'LİDERİ' },
                        { id: 'EMPTY_DRIVER_NAME', label: 'Boş Sürücü Adı', value: '---' },
                        { id: 'EMPTY_DRIVER_TEAM', label: 'Boş Komanda Adı', value: '---' }
                    ]);
                };
                const ensureNextRaceDefaults = (page: PageContent) => {
                    ensurePageSectionDefaults(page, [
                        { id: 'RACE_IMAGE_ALT', label: 'Növbəti Yarış Görsel Alt', value: 'Next Race' }
                    ]);
                };

                defaultIds.forEach(id => {
                    const found = updatedContent.find(p => p.id === id);
                    if (!found) {
                        updatedContent.push({
                            id,
                            title: componentLabels[id] || id,
                            sections: [{ id: `${id}-default`, type: 'text', label: 'Bölmə', value: '' }],
                            images: []
                        });
                    } else if (id === 'about') {
                        ensureAboutDefaults(found);
                    } else if (id === 'partners') {
                        ensurePartnersDefaults(found);
                    } else if (id === 'hero') {
                        ensureHeroDefaults(found);
                    } else if (id === 'contactpage') {
                        ensureContactDefaults(found);
                    } else if (id === 'eventspage') {
                        ensureEventsDefaults(found);
                    } else if (id === 'footer') {
                        ensureFooterDefaults(found);
                    } else if (id === 'categoryleaders') {
                        ensureCategoryLeaderDefaults(found);
                    } else if (id === 'nextrace') {
                        ensureNextRaceDefaults(found);
                    }
                });

                const aboutPage = updatedContent.find(p => p.id === 'about');
                if (aboutPage) ensureAboutDefaults(aboutPage);
                const partnersPage = updatedContent.find(p => p.id === 'partners');
                if (partnersPage) ensurePartnersDefaults(partnersPage);
                const heroPage = updatedContent.find(p => p.id === 'hero');
                if (heroPage) ensureHeroDefaults(heroPage);
                const contactPage = updatedContent.find(p => p.id === 'contactpage');
                if (contactPage) ensureContactDefaults(contactPage);
                const eventsPage = updatedContent.find(p => p.id === 'eventspage');
                if (eventsPage) ensureEventsDefaults(eventsPage);
                const footerPage = updatedContent.find(p => p.id === 'footer');
                if (footerPage) ensureFooterDefaults(footerPage);
                const categoryLeadersPage = updatedContent.find(p => p.id === 'categoryleaders');
                if (categoryLeadersPage) ensureCategoryLeaderDefaults(categoryLeadersPage);
                const nextRacePage = updatedContent.find(p => p.id === 'nextrace');
                if (nextRacePage) ensureNextRaceDefaults(nextRacePage);

                const defaultRank = new Map(defaultIds.map((id, idx) => [id, idx]));
                updatedContent.sort((a, b) => {
                    const ra = defaultRank.has(a.id) ? (defaultRank.get(a.id) as number) : Number.MAX_SAFE_INTEGER;
                    const rb = defaultRank.has(b.id) ? (defaultRank.get(b.id) as number) : Number.MAX_SAFE_INTEGER;
                    if (ra !== rb) return ra - rb;
                    return (a.title || a.id).localeCompare(b.title || b.id);
                });

                const cleanedContent = updatedContent.map((page: PageContent) => ({
                    ...page,
                    sections: (page.sections || [])
                        .map((section, sectionIndex) => {
                        if (section.type !== 'text') return section;

                        const forcePlain = shouldForcePlainText(section);
                        const nextValue = forcePlain ? normalizePlainText(section.value || '') : (section.value || '').replace(/\u00a0/g, ' ');
                        const nextLabel = containsHtmlNoise(section.label || '') ? normalizePlainText(section.label || '') : section.label;

                        return {
                            ...section,
                            label: nextLabel,
                            value: nextValue,
                            ...(section.url ? { url: toAbsoluteUrl(section.url) } : {}),
                            order: normalizeOrder(section.order, sectionIndex)
                        };
                    })
                        .sort((a, b) => normalizeOrder(a.order, 0) - normalizeOrder(b.order, 0)),
                    images: (page.images || [])
                        .map((img, imgIndex) => ({
                            ...img,
                            order: normalizeOrder(img.order, imgIndex)
                        }))
                        .sort((a, b) => normalizeOrder(a.order, 0) - normalizeOrder(b.order, 0))
                }));

                setPages(cleanedContent);
            }

            // 2..7. Load all secondary resources in parallel to avoid slow UI boot.
            const [imagesData, eventsData, newsData, driversData, photosData, videosData] = await Promise.all([
                fetch(`/api/all-images?v=${Date.now()}`).then(res => res.json()).catch(() => ({})),
                fetch('/api/events').then(res => res.json()).catch(() => []),
                fetch('/api/news').then(res => res.json()).catch(() => []),
                fetch('/api/drivers').then(res => res.json()).catch(() => []),
                fetch('/api/gallery-photos').then(res => res.json()).catch(() => []),
                fetch('/api/videos').then(res => res.json()).catch(() => [])
            ]);

            if (imagesData?.local) setAllAvailableImages(imagesData.local);

            if (Array.isArray(eventsData)) {
                setEvents(eventsData);
                if (eventsData.length > 0 && selectedEventId === null) {
                    setSelectedEventId(eventsData[0].id);
                    setEventForm(eventsData[0]);
                }
            }

            if (Array.isArray(newsData)) {
                setNews(newsData);
                if (newsData.length > 0 && selectedNewsId === null) {
                    setSelectedNewsId(newsData[0].id);
                    setNewsForm({ ...newsData[0] });
                }
            }

            if (Array.isArray(driversData)) {
                setDriverCategories(driversData);
                if (driversData.length > 0 && selectedCatId === null) {
                    setSelectedCatId(driversData[0].id);
                }
            }

            if (Array.isArray(photosData)) setGalleryPhotos(photosData);

            if (Array.isArray(videosData)) {
                setVideos(videosData);
                if (videosData.length > 0 && selectedVideoId === null) {
                    handleVideoSelect(videosData[0].id);
                }
            }
        } catch (err) {
            console.error('Content load error:', err);
        }
    };

    useEffect(() => {
        loadContent();
    }, []);

    useEffect(() => {
        if (!pages.length) return;

        const aboutIdx = pages.findIndex((p) => p.id === 'about');
        if (aboutIdx === -1) return;

        const aboutPage = pages[aboutIdx];
        const hasStatPairs = (aboutPage.sections || []).some((s) => isStatSectionId(s.id));
        if (hasStatPairs) return;

        const defaults = [
            { label: 'PİLOTLAR', value: '140+' },
            { label: 'YARIŞLAR', value: '50+' },
            { label: 'GƏNCLƏR', value: '20+' }
        ];

        const patched = [...pages];
        const target = { ...patched[aboutIdx] };
        const sections = [...(target.sections || [])];

        defaults.forEach((item, index) => {
            const suffix = `${index + 1}`;
            sections.push(
                {
                    id: `${STAT_LABEL_PREFIX}${suffix}`,
                    type: 'text',
                    label: `Statistika Etiketi ${index + 1}`,
                    value: item.label
                },
                {
                    id: `${STAT_VALUE_PREFIX}${suffix}`,
                    type: 'text',
                    label: `Statistika Dəyəri ${index + 1}`,
                    value: item.value
                }
            );
        });

        target.sections = sections;
        patched[aboutIdx] = target;
        setPages(patched);
    }, [pages]);

    useEffect(() => {
        if (autoSyncTriggeredRef.current) return;
        autoSyncTriggeredRef.current = true;
        startExtraction();
    }, []);

    // Sync URL params to state
    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const modeParam = queryParams.get('mode');
        const pageParam = queryParams.get('page');

        if (modeParam && ['extract', 'events', 'news', 'drivers', 'videos', 'photos'].includes(modeParam)) {
            setEditorMode(modeParam as any);
        } else if (pageParam) {
            setEditorMode('extract');
            const candidateIds = resolvePageGroup(pageParam);
            const idx = pages.findIndex(p => candidateIds.includes(p.id));
            if (idx !== -1) setSelectedPageIndex(idx);
        }
    }, [location.search, pages]);

    const startExtraction = async () => {
        setIsExtracting(true);
        setExtractStep('Front-end komponentləri skan edilir...');
        setProgress(30);

        const startTime = Date.now();
        const toastId = toast.loading('Sinxronizasiya başladı...');

        try {
            const response = await fetch('/api/extract-content', { method: 'POST' });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(errText || 'Extraction failed');
            }

            setProgress(60);
            setExtractStep('Bulud bazası ilə sinxronizasiya edilir...');

            const data = await response.json();
            const extractedPages = data.pages || data;

            // Sync with JSON storage
            const syncRes = await fetch('/api/save-content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(extractedPages)
            });
            if (!syncRes.ok) {
                const errText = await syncRes.text();
                throw new Error(errText || 'Save failed');
            }

            setProgress(90);
            setPages(extractedPages);

            // Artificial delay for UX
            const elapsed = Date.now() - startTime;
            if (elapsed < 800) await new Promise(r => setTimeout(r, 800 - elapsed));

            setProgress(100);
            setExtractStep('Tamamlandı!');

            setTimeout(() => {
                setIsExtracting(false);
                localStorage.setItem('forsaj_extracted', 'true');
                localStorage.setItem(CONTENT_VERSION_KEY, Date.now().toString());
                toast.success('Sinxronizasiya tamamlandı! Baza yeniləndi.', { id: toastId });
            }, 500);

        } catch (error: any) {
            console.error('Extraction error:', error);
            setIsExtracting(false);
            toast.error(`Sinxronizasiya xətası: ${error.message}`, { id: toastId });
        }
    };

    const handleSectionChange = (pageIdx: number, sectionId: string, field: 'value' | 'label' | 'url', value: string) => {
        const newPages = [...pages];
        const sectionIdx = newPages[pageIdx].sections.findIndex(s => s.id === sectionId);
        if (sectionIdx !== -1) {
            const targetSection = newPages[pageIdx].sections[sectionIdx];
            if (!canEditSectionField(targetSection, field)) return;
            let nextValue = value;
            const key = extractSectionKey(targetSection);
            const plainTextSection =
                !!key ||
                isStatSectionId(targetSection.id) ||
                targetSection.id.startsWith('val-') ||
                targetSection.id.startsWith('txt-');

            if ((field === 'value' || field === 'label') && plainTextSection) {
                nextValue = normalizePlainText(value);
            }

            newPages[pageIdx].sections[sectionIdx][field] = nextValue;
            setPages(newPages);
        }
    };

    const normalizeSectionUrl = (pageIdx: number, sectionId: string) => {
        const page = pages[pageIdx];
        if (!page) return;
        const section = page.sections.find(s => s.id === sectionId);
        if (!section || !section.url) return;
        const normalized = toAbsoluteUrl(section.url);
        if (normalized && normalized !== section.url) {
            handleSectionChange(pageIdx, sectionId, 'url', normalized);
        }
    };

    const handleImageAltChange = (pageIdx: number, imgId: string, alt: string) => {
        const newPages = [...pages];
        const imgIdx = newPages[pageIdx].images.findIndex(i => i.id === imgId);
        if (imgIdx !== -1) {
            newPages[pageIdx].images[imgIdx].alt = alt;
            setPages(newPages);
        }
    };

    const addNewSection = () => {
        if (!newSectionTitle.trim()) {
            toast.error('Başlıq daxil edin!');
            return;
        }

        const newId = newSectionTitle.toLowerCase().replace(/\s+/g, '-');
        const newPage: PageContent = {
            id: newId,
            title: newSectionTitle,
            sections: [
                { id: `text-0`, type: 'text', label: 'Bölmə', value: 'Yeni bölmə məzmunu...' }
            ],
            images: [],
        };

        setPages([...pages, newPage]);
        setSelectedPageIndex(pages.length);
        setIsModalOpen(false);
        setNewSectionTitle('');
        toast.success('Yeni bölmə əlavə edildi!');
    };

    const addField = (type: 'text' | 'image', customLabel?: string, customId?: string) => {
        if (selectedPageIndex < 0 || selectedPageIndex >= pages.length) return;
        const newPages = [...pages];
        const currentPage = newPages[selectedPageIndex];
        if (!currentPage) return;

        if (type === 'text') {
            const newId = customId || `text-${currentPage.sections.length}-${Date.now()}`;
            const nextOrder = currentPage.sections.reduce((max, s, idx) => Math.max(max, normalizeOrder(s.order, idx)), -1) + 1;
            currentPage.sections.push({ id: newId, type: 'text', label: customLabel || 'Bölmə', value: 'Yeni mətn sahəsi...', order: nextOrder });
            toast.success(`${customLabel || 'Yeni mətn'} sahəsi əlavə edildi`);
        } else {
            const newId = customId || `img-${currentPage.images.length}-${Date.now()}`;
            const nextOrder = currentPage.images.reduce((max, i, idx) => Math.max(max, normalizeOrder(i.order, idx)), -1) + 1;
            currentPage.images.push({ id: newId, path: '', alt: '', type: 'local', order: nextOrder });
            toast.success('Yeni şəkil sahəsi əlavə edildi');
        }

        setPages(newPages);
    };

    const removeField = (type: 'text' | 'image', fieldId: string) => {
        if (selectedPageIndex < 0 || selectedPageIndex >= pages.length) return;
        const newPages = [...pages];
        const currentPage = newPages[selectedPageIndex];
        if (!currentPage) return;

        if (type === 'text') {
            currentPage.sections = currentPage.sections.filter(s => s.id !== fieldId);
            currentPage.sections = currentPage.sections.map((s, idx) => ({ ...s, order: idx }));
        } else {
            currentPage.images = currentPage.images.filter(img => img.id !== fieldId);
            currentPage.images = currentPage.images.map((img, idx) => ({ ...img, order: idx }));
        }

        setPages(newPages);
        toast.success('Sahə silindi');
    };

    const moveField = (type: 'text' | 'image', fieldId: string, direction: 'up' | 'down') => {
        if (selectedPageIndex < 0 || selectedPageIndex >= pages.length) return;
        const newPages = [...pages];
        const currentPage = newPages[selectedPageIndex];
        if (!currentPage) return;

        const list = type === 'text' ? currentPage.sections : currentPage.images;
        const idx = list.findIndex((item: any) => item.id === fieldId);
        if (idx === -1) return;

        const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= list.length) return;

        const temp = list[idx];
        list[idx] = list[targetIdx];
        list[targetIdx] = temp;
        if (type === 'text') {
            currentPage.sections = (currentPage.sections || []).map((s, index) => ({ ...s, order: index }));
        } else {
            currentPage.images = (currentPage.images || []).map((img, index) => ({ ...img, order: index }));
        }

        setPages(newPages);
    };

    const addAboutStatRow = (pageIdx: number = selectedPageIndex) => {
        if (pageIdx < 0 || pageIdx >= pages.length) return;
        const newPages = [...pages];
        const current = newPages[pageIdx];
        if (!current || current.id !== 'about') return;

        const suffix = `${Date.now()}`;
        current.sections.push(
            { id: `${STAT_LABEL_PREFIX}${suffix}`, type: 'text', label: 'Statistika Etiketi', value: 'YENİ STATİSTİKA' },
            { id: `${STAT_VALUE_PREFIX}${suffix}`, type: 'text', label: 'Statistika Dəyəri', value: '0+' }
        );
        setPages(newPages);
        toast.success('Yeni statistika əlavə edildi');
    };

    const updateAboutStatField = (suffix: string, field: 'label' | 'value', value: string, pageIdx: number = selectedPageIndex) => {
        if (pageIdx < 0 || pageIdx >= pages.length) return;
        const newPages = [...pages];
        const current = newPages[pageIdx];
        if (!current || current.id !== 'about') return;

        const targetId = field === 'label' ? `${STAT_LABEL_PREFIX}${suffix}` : `${STAT_VALUE_PREFIX}${suffix}`;
        const idx = current.sections.findIndex(s => s.id === targetId);

        const normalized = normalizePlainText(value);

        if (idx !== -1) {
            current.sections[idx].value = normalized;
        } else {
            current.sections.push({
                id: targetId,
                type: 'text',
                label: field === 'label' ? 'Statistika Etiketi' : 'Statistika Dəyəri',
                value: normalized
            });
        }

        setPages(newPages);
    };

    const removeAboutStatRow = (suffix: string, pageIdx: number = selectedPageIndex) => {
        if (pageIdx < 0 || pageIdx >= pages.length) return;
        const newPages = [...pages];
        const current = newPages[pageIdx];
        if (!current || current.id !== 'about') return;

        current.sections = current.sections.filter(
            s => s.id !== `${STAT_LABEL_PREFIX}${suffix}` && s.id !== `${STAT_VALUE_PREFIX}${suffix}`
        );
        setPages(newPages);
        toast.success('Statistika silindi');
    };

    const getPartnerRows = (page: PageContent | undefined): PartnerRow[] => {
        if (!page) return [];
        const rows = new Map<number, PartnerRow>();
        (page.sections || []).forEach((section) => {
            const m = section.id.match(PARTNER_KEY_REGEX);
            if (!m) return;
            const idx = Number(m[1]);
            const field = toPartnerField(m[2]);
            if (!field) return;

            const current = rows.get(idx) || {
                index: idx,
                name: '',
                tag: 'OFFICIAL PARTNER',
                icon: 'ShieldCheck',
                useImage: 'false',
                imageId: `partner-image-${idx}`
            };
            current[field] = section.value || '';
            rows.set(idx, current);
        });
        return Array.from(rows.values()).sort((a, b) => a.index - b.index);
    };

    const rewritePartnerRows = (rows: PartnerRow[]) => {
        if (selectedPageIndex < 0 || selectedPageIndex >= pages.length) return;
        const newPages = [...pages];
        const page = newPages[selectedPageIndex];
        if (!page || page.id !== 'partners') return;

        const restSections = (page.sections || []).filter(s => !PARTNER_KEY_REGEX.test(s.id));
        const partnerSections: Section[] = [];

        rows.forEach((row) => {
            partnerSections.push(
                { id: `PARTNER_${row.index}_NAME`, type: 'text', label: `Tərəfdaş ${row.index} Ad`, value: row.name },
                { id: `PARTNER_${row.index}_TAG`, type: 'text', label: `Tərəfdaş ${row.index} Etiket`, value: row.tag },
                { id: `PARTNER_${row.index}_ICON`, type: 'text', label: `Tərəfdaş ${row.index} İkon`, value: row.icon },
                { id: `PARTNER_${row.index}_USE_IMAGE`, type: 'text', label: `Tərəfdaş ${row.index} Görsel İstifadə`, value: row.useImage },
                { id: `PARTNER_${row.index}_IMAGE_ID`, type: 'text', label: `Tərəfdaş ${row.index} Görsel ID`, value: row.imageId || `partner-image-${row.index}` }
            );
        });

        const existingImages = page.images || [];
        const neededImageIds = new Set(rows.map(r => r.imageId || `partner-image-${r.index}`));
        const nextImages = [...existingImages];
        neededImageIds.forEach((id) => {
            if (nextImages.some(img => img.id === id)) return;
            nextImages.push({ id, path: '', alt: id, type: 'local', order: nextImages.length });
        });

        page.sections = [...restSections, ...partnerSections];
        page.images = nextImages.map((img, idx) => ({ ...img, order: idx }));
        setPages(newPages);
    };

    const updatePartnerRowField = (index: number, field: PartnerField, value: string) => {
        const rows = getPartnerRows(pages[selectedPageIndex]).map(r => r.index === index ? { ...r, [field]: value } : r);
        rewritePartnerRows(rows);
    };

    const addPartnerRow = () => {
        const rows = getPartnerRows(pages[selectedPageIndex]);
        const nextIndex = (rows[rows.length - 1]?.index || 0) + 1;
        rows.push({
            index: nextIndex,
            name: `PARTNER ${nextIndex}`,
            tag: 'OFFICIAL PARTNER',
            icon: 'ShieldCheck',
            useImage: 'false',
            imageId: `partner-image-${nextIndex}`
        });
        rewritePartnerRows(rows);
    };

    const removePartnerRow = (index: number) => {
        const rows = getPartnerRows(pages[selectedPageIndex]).filter(r => r.index !== index);
        rewritePartnerRows(rows);
    };

    const movePartnerRow = (index: number, direction: 'up' | 'down') => {
        const rows = getPartnerRows(pages[selectedPageIndex]);
        const idx = rows.findIndex(r => r.index === index);
        if (idx === -1) return;
        const target = direction === 'up' ? idx - 1 : idx + 1;
        if (target < 0 || target >= rows.length) return;
        const temp = rows[idx];
        rows[idx] = rows[target];
        rows[target] = temp;
        const normalized = rows.map((r, i) => ({ ...r, index: i + 1, imageId: r.imageId || `partner-image-${i + 1}` }));
        rewritePartnerRows(normalized);
    };

    const openImageSelector = (pageIdx: number, imgId: string) => {
        setActiveImageField({ pageIdx, imgId });
        setIsImageSelectorOpen(true);
    };

    const uploadAsset = async (
        file: File,
        options?: { loadingText?: string; successText?: string; errorText?: string }
    ): Promise<string | null> => {
        const formData = new FormData();
        formData.append('image', file);
        const uploadId = toast.loading(options?.loadingText || 'Şəkil yüklənir...');
        try {
            const response = await fetch('/api/upload-image', { method: 'POST', body: formData });
            if (response.ok) {
                const data = await response.json();
                toast.success(options?.successText || 'Şəkil uğurla yükləndi', { id: uploadId });
                return data.url;
            } else {
                throw new Error('Upload fail');
            }
        } catch (err) {
            console.error('Upload error:', err);
            toast.error(options?.errorText || 'Görsəl yüklənərkən xəta baş verdi', { id: uploadId });
            return null;
        }
    };

    const uploadImage = async (file: File): Promise<string | null> => {
        return uploadAsset(file);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, pageIdx: number, imgId: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const url = await uploadImage(file);
        if (url) {
            const newPages = [...pages];
            const imgIdx = newPages[pageIdx].images.findIndex(i => i.id === imgId);
            if (imgIdx !== -1) {
                newPages[pageIdx].images[imgIdx].path = url;
                newPages[pageIdx].images[imgIdx].type = 'local';
                setPages(newPages);
            }
        }
    };

    const selectImage = (path: string) => {
        if (!activeImageField) return;

        const newPages = [...pages];
        if (isAddingNewFromSystem) {
            // Add a new field instead of replacing
            const newId = `img-${newPages[activeImageField.pageIdx].images.length}-${Date.now()}`;
            newPages[activeImageField.pageIdx].images.push({
                id: newId,
                path: path,
                alt: 'Daxil edildi',
                type: 'local'
            });
            setIsAddingNewFromSystem(false);
        } else {
            const imgIdx = newPages[activeImageField.pageIdx].images.findIndex(i => i.id === activeImageField.imgId);
            if (imgIdx !== -1) {
                newPages[activeImageField.pageIdx].images[imgIdx].path = path;
                newPages[activeImageField.pageIdx].images[imgIdx].type = 'local';
            }
        }

        setPages(newPages);
        setIsImageSelectorOpen(false);
        toast.success('Şəkil seçildi');
    };

    const saveChanges = async () => {
        setIsSaving(true);
        const toastId = toast.loading('Yadda saxlanılır...');
        try {
            if (editorMode === 'extract') {
                const res = await fetch('/api/save-content', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(pages)
                });
                if (!res.ok) throw new Error(await res.text());
                localStorage.setItem(CONTENT_VERSION_KEY, Date.now().toString());
            } else if (editorMode === 'events') {
                const res = await fetch('/api/events', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(events)
                });
                if (!res.ok) throw new Error(await res.text());
            } else if (editorMode === 'news') {
                const res = await fetch('/api/news', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(news)
                });
                if (!res.ok) throw new Error(await res.text());
            } else if (editorMode === 'drivers') {
                const res = await fetch('/api/drivers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(driverCategories)
                });
                if (!res.ok) throw new Error(await res.text());
            } else if (editorMode === 'videos') {
                const res = await fetch('/api/videos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(videos)
                });
                if (!res.ok) throw new Error(await res.text());
            } else if (editorMode === 'photos') {
                const res = await fetch('/api/gallery-photos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(galleryPhotos)
                });
                if (!res.ok) throw new Error(await res.text());
            }

            toast.success('Dəyişikliklər bulud bazasına qeyd edildi!', { id: toastId });
            await loadContent();
        } catch (err: any) {
            console.error('Save error:', err);
            toast.error(`Yadda saxlama xətası: ${err.message} `, { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    const handleEventSelect = (id: number) => {
        const evt = events.find(e => e.id === id);
        if (evt) {
            setSelectedEventId(id);
            setEventForm({ ...evt });
        }
    };

    const handleEventChange = (field: keyof EventItem, value: any, targetId?: number) => {
        const activeId = targetId || selectedEventId;

        setEventForm(prev => {
            // Only update local form if the ID matches what we are currently looking at
            // or if it's a field like 'title' that doesn't use targetId
            const isSameEvent = !targetId || targetId === selectedEventId;
            const updatedForm = isSameEvent ? { ...prev, [field]: value } as EventItem : prev;

            // ALWAYS update the master events list using the correct ID
            if (activeId) {
                setEvents(oldEvents => oldEvents.map(e => e.id === activeId ? { ...e, [field]: value } : e));
            }

            return updatedForm;
        });
    };

    const addNewEvent = () => {
        const newId = events.length > 0 ? Math.max(...events.map(e => e.id)) + 1 : 1;
        const newEvent: EventItem = {
            id: newId,
            title: 'Yeni Tədbir',
            date: new Date().toISOString().split('T')[0],
            location: 'Bakı',
            category: 'OFFROAD',
            img: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=2070&auto=format&fit=crop',
            description: '',
            rules: '',
            status: 'planned'
        };
        setEvents([...events, newEvent]);
        setSelectedEventId(newId);
        setEventForm(newEvent);
        toast.success('Yeni tədbir yaradıldı');
    };

    const deleteEvent = async (id: any, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Bu tədbiri silmək istədiyinizə əminsiniz?')) {
            if (typeof id === 'string') {
                // For JSON file, we just save the updated list, so deleting from state is enough
                // But if we wanted to be strict, we'd save immediately. 
                // For now, saveChanges() handles saving the whole list.
            }
            setEvents(events.filter(ev => ev.id !== id));
            if (selectedEventId === id) setSelectedEventId(null);
            toast.success('Tədbir silindi');
        }
    };

    // News Handlers
    const handleNewsSelect = (id: number) => {
        const item = news.find(n => n.id === id);
        if (item) {
            setSelectedNewsId(id);
            setNewsForm({ ...item });
        }
    };

    const handleNewsChange = (field: keyof NewsItem, value: string | number | boolean, targetId?: number) => {
        const activeId = targetId || selectedNewsId;

        setNewsForm(prev => {
            const isSame = !targetId || targetId === selectedNewsId;
            const updatedForm = isSame ? { ...prev, [field]: value } as NewsItem : prev;

            if (activeId) {
                setNews(oldNews => oldNews.map(n => n.id === activeId ? { ...n, [field]: value } : n));
            }

            return updatedForm;
        });
    };

    const addNewNews = () => {
        const newId = news.length > 0 ? Math.max(...news.map(n => n.id)) + 1 : 1;
        const newItem: NewsItem = {
            id: newId,
            title: 'Yeni Xəbər',
            date: new Date().toISOString().split('T')[0],
            img: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=2070&auto=format&fit=crop',
            description: '',
            category: 'BLOQ',
            status: 'draft'
        };
        setNews([...news, newItem]);
        setSelectedNewsId(newId);
        setNewsForm(newItem);
        toast.success('Yeni xəbər yaradıldı');
    };

    // Video Handlers
    const handleVideoSelect = (id: number) => {
        setSelectedVideoId(id);
        const item = videos.find(v => v.id === id);
        if (item) setVideoForm({ ...item });
    };

    const handleVideoChange = (field: keyof VideoItem, value: string, targetId?: number) => {
        const activeId = targetId || selectedVideoId;

        setVideoForm(prev => {
            const isSame = !targetId || targetId === selectedVideoId;
            let updatedForm = isSame ? { ...prev, [field]: value } as VideoItem : prev;

            // Extract YouTube info if URL changes
            if (field === 'youtubeUrl' && isSame) {
                const vId = extractYoutubeId(value);
                if (vId) {
                    updatedForm = {
                        ...updatedForm,
                        videoId: vId,
                        thumbnail: `https://img.youtube.com/vi/${vId}/maxresdefault.jpg`
                    };
                }
            }

            if (activeId) {
                setVideos(old => old.map(v => {
                    if (v.id === activeId) {
                        let updated = { ...v, [field]: value };
                        if (field === 'youtubeUrl') {
                            const vId = extractYoutubeId(value);
                            if (vId) {
                                updated.videoId = vId;
                                updated.thumbnail = `https://img.youtube.com/vi/${vId}/maxresdefault.jpg`;
                            }
                        }
                        return updated;
                    }
                    return v;
                }));
            }

            return updatedForm;
        });
    };

    const extractYoutubeId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const handlePhotoSelect = (id: number) => {
        setSelectedPhotoId(id);
        const item = galleryPhotos.find(p => p.id === id);
        if (item) setPhotoForm({ ...item });
    };

    const addGalleryPhoto = () => {
        const newId = Date.now();
        const newItem: GalleryPhotoItem = {
            id: newId,
            title: 'Yeni Şəkil',
            url: ''
        };
        setGalleryPhotos(prev => [...prev, newItem]);
        handlePhotoSelect(newId);
    };

    const deleteGalleryPhoto = async (id: any, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Bu şəkli silmək istədiyinizə əminsiniz?')) {
            if (typeof id === 'string') {
                // Local state update is sufficient until save
            }
            setGalleryPhotos(prev => prev.filter(p => p.id !== id));
            if (selectedPhotoId === id) {
                setSelectedPhotoId(null);
                setPhotoForm({});
            }
            toast.success('Şəkil silindi');
        }
    };

    const handlePhotoChange = (field: keyof GalleryPhotoItem, value: string) => {
        setPhotoForm(prev => {
            const updatedForm = { ...prev, [field]: value } as GalleryPhotoItem;
            if (selectedPhotoId) {
                setGalleryPhotos(old => old.map(p => p.id === selectedPhotoId ? updatedForm : p));
            }
            return updatedForm;
        });
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const url = await uploadImage(file);
        if (url) {
            handlePhotoChange('url', url);
        }
    };

    const addNewVideo = () => {
        const newId = videos.length > 0 ? Math.max(...videos.map(v => v.id)) + 1 : 1;
        const newItem: VideoItem = {
            id: newId,
            title: 'Yeni Video',
            youtubeUrl: '',
            videoId: '',
            duration: '00:00',
            thumbnail: '',
            created_at: new Date().toISOString()
        };
        setVideos([...videos, newItem]);
        setSelectedVideoId(newId);
        setVideoForm(newItem);
        toast.success('Yeni video əlavə edildi');
    };

    const deleteVideo = async (id: any, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Bu videonu silmək istədiyinizə əminsiniz?')) {
            if (typeof id === 'string') {
                // Local state update is sufficient until save
            }
            setVideos(videos.filter(v => v.id !== id));
            if (selectedVideoId === id) setSelectedVideoId(null);
            toast.success('Video silindi');
        }
    };

    const deleteNews = async (id: any, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Bu xəbəri silmək istədiyinizə əminsiniz?')) {
            if (typeof id === 'string') {
                // Local state update is sufficient until save
            }
            setNews(news.filter(n => n.id !== id));
            if (selectedNewsId === id) setSelectedNewsId(null);
            toast.success('Xəbər silindi');
        }
    };

    // Drivers Handlers
    const handleCatSelect = (id: string) => {
        setSelectedCatId(id);
        setSelectedDriverId(null);
        setDriverForm({});
    };

    const handleDriverSelect = (id: number) => {
        setSelectedDriverId(id);
        const cat = driverCategories.find(c => c.id === selectedCatId);
        const driver = cat?.drivers.find(d => d.id === id);
        if (driver) {
            setDriverForm({ ...driver });
        }
    };

    const handleDriverChange = (field: keyof DriverItem, value: any) => {
        if (!selectedCatId || !selectedDriverId) return;

        // Update both form and master list
        setDriverForm(prev => {
            const updated = { ...prev, [field]: value } as DriverItem;

            setDriverCategories(prevCats => prevCats.map(c => {
                if (c.id === selectedCatId) {
                    return {
                        ...c,
                        drivers: c.drivers.map(d => d.id === selectedDriverId ? updated : d)
                    };
                }
                return c;
            }));

            return updated;
        });
    };

    const addDriver = () => {
        if (!selectedCatId) {
            toast.error('Öncə kateqoriya seçin və ya yaradın');
            return;
        }
        const newId = Date.now();
        const newDriver: DriverItem = {
            id: newId,
            rank: 99,
            name: 'Yeni Sürücü',
            license: 'PILOT LICENSE',
            team: 'TEAM NAME',
            wins: 0,
            points: 0,
            img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=400&fit=crop'
        };

        setDriverCategories(prev => prev.map(c => {
            if (c.id === selectedCatId) {
                return { ...c, drivers: [...c.drivers, newDriver] };
            }
            return c;
        }));

        setSelectedDriverId(newId);
        setDriverForm(newDriver);
        toast.success('Yeni sürücü siyahıya əlavə edildi');
    };

    const deleteDriver = (id: number) => {
        if (window.confirm('Bu sürücünü silmək istədiyinizə əminsiniz?')) {
            setDriverCategories(prev => prev.map(c => {
                if (c.id === selectedCatId) {
                    return { ...c, drivers: c.drivers.filter(d => d.id !== id) };
                }
                return c;
            }));
            if (selectedDriverId === id) {
                setSelectedDriverId(null);
                setDriverForm({});
            }
            toast.success('Sürücü silindi');
        }
    };

    const handleDriverSave = async () => {
        // Ensure master list is up to date one last time just in case
        const currentForm = driverForm as DriverItem;
        const updatedCats = driverCategories.map(c => {
            if (c.id === selectedCatId) {
                return {
                    ...c,
                    drivers: c.drivers.map(d => d.id === selectedDriverId ? { ...d, ...currentForm } as DriverItem : d)
                };
            }
            return c;
        });

        setIsSaving(true);
        const tid = toast.loading('Yadda saxlanılır...');
        try {
            const res = await fetch('/api/drivers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedCats)
            });
            if (!res.ok) throw new Error('Yadda saxlama uğursuz oldu');
            setDriverCategories(updatedCats);
            toast.success('Bütün sürücü məlumatları qeyd edildi', { id: tid });
        } catch (err) {
            toast.error('Xəta baş verdi', { id: tid });
        } finally {
            setIsSaving(false);
        }
    };

    const addCategory = () => {
        const name = window.prompt('Kateqoriya adı (Məs: UNLIMITED CLASS):');
        if (!name) return;
        const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        if (driverCategories.find(c => c.id === id)) {
            toast.error('Bu adda kateqoriya artıq mövcuddur');
            return;
        }
        const newCat: DriverCategory = { id, name, drivers: [] };
        setDriverCategories([...driverCategories, newCat]);
        setSelectedCatId(id);
        toast.success('Kateqoriya əlavə edildi');
    };

    const deleteCategory = () => {
        if (!selectedCatId) return;
        const cat = driverCategories.find(c => c.id === selectedCatId);
        if (!cat) return;

        if (window.confirm(`"${cat.name}" kateqoriyasını və içindəki bütün sürücüləri silmək istədiyinizə əminsiniz?`)) {
            const newCats = driverCategories.filter(c => c.id !== selectedCatId);
            setDriverCategories(newCats);
            if (newCats.length > 0) {
                setSelectedCatId(newCats[0].id);
            } else {
                setSelectedCatId(null);
            }
            setSelectedDriverId(null);
            setDriverForm({});
            toast.success('Kateqoriya silindi');
        }
    };

    if (pages.length === 0 && !isExtracting && !localStorage.getItem('forsaj_extracted')) {
        return (
            <div className="extractor-overlay">
                <div className="extractor-card fade-in">
                    <Globe size={64} className="text-primary" style={{ marginBottom: '1.5rem' }} />
                    <h2>Sayt Məzmununu və Görselləri Çıxarın</h2>
                    <p>Front-end layihənizdəki bütün səhifələri, mətnləri və şəkilləri avtomatik olaraq bu panelə yükləyin.</p>
                    <button className="extract-btn" onClick={startExtraction}>
                        Sinxronizasiyanı Başlat
                    </button>
                </div>
            </div>
        );
    }

    if (isExtracting) {
        return (
            <div className="extractor-overlay">
                <div className="extractor-card">
                    <div className="loader-ring" style={{ marginBottom: '1.5rem' }}></div>
                    <h2>Avtomatik Sinxronizasiya</h2>
                    <p>Zəhmət olmasa gözləyin, front-end məlumatları oxunur...</p>
                    <div className="progress-container">
                        <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                    </div>
                    <div className="step-label">{extractStep}</div>
                </div>
            </div>
        );
    }

    const currentPage = pages[selectedPageIndex];
    const activeGroupIds = resolvePageGroup(pageParam);
    const activeGroupPages = activeGroupIds
        .map((id) => {
            const pageIdx = pages.findIndex((page) => page.id === id);
            if (pageIdx === -1) return null;
            return { page: pages[pageIdx], pageIdx };
        })
        .filter(Boolean) as { page: PageContent; pageIdx: number }[];
    const isGroupedRequest = !!pageParam && (
        !!TAB_PAGE_GROUPS[pageParam] ||
        !!PAGE_TO_TAB_GROUP[pageParam]
    );
    const isGroupedTabView = editorMode === 'extract' && isGroupedRequest && activeGroupPages.length > 0;

    const displayedSections = (currentPage?.sections || []).filter(s => {
        if (!isSectionVisibleInAdmin(s)) return false;
        if (shouldSkipSectionInEditor(s)) return false;
        if (currentPage?.id === 'about' && isStatSectionId(s.id)) return false;
        if (currentPage?.id === 'partners' && (PARTNER_KEY_REGEX.test(s.id) || s.id === 'SECTION_TITLE')) return false;
        return !searchTerm ||
            s.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.value.toLowerCase().includes(searchTerm.toLowerCase());
    }).sort((a, b) => normalizeOrder(a.order, 0) - normalizeOrder(b.order, 0));

    const aboutStats = currentPage?.id === 'about'
        ? (() => {
            const statsMap = new Map<string, { label: string; value: string }>();

            (currentPage.sections || []).forEach(section => {
                if (!isStatSectionId(section.id)) return;
                const suffix = getStatSuffix(section.id) || section.id;
                const current = statsMap.get(suffix) || { label: '', value: '' };

                if (section.id.startsWith(STAT_LABEL_PREFIX)) current.label = section.value || '';
                if (section.id.startsWith(STAT_VALUE_PREFIX)) current.value = section.value || '';

                statsMap.set(suffix, current);
            });

            const rows = Array.from(statsMap.entries())
                .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
                .map(([suffix, data]) => ({ suffix, ...data }));

            if (!searchTerm) return rows;
            const q = searchTerm.toLowerCase();
            return rows.filter(row => row.label.toLowerCase().includes(q) || row.value.toLowerCase().includes(q));
        })()
        : [];

    const partnerRows = currentPage?.id === 'partners' ? getPartnerRows(currentPage) : [];

    const displayedImages = (currentPage?.images || []).filter(i => {
        return !searchTerm ||
            i.alt.toLowerCase().includes(searchTerm.toLowerCase()) ||
            i.path.toLowerCase().includes(searchTerm.toLowerCase());
    }).sort((a, b) => normalizeOrder(a.order, 0) - normalizeOrder(b.order, 0));

    const shouldUseRichEditor = (section: Section) => {
        const v = (section.value || '').toLowerCase();
        // Only use heavy rich editor for explicit rich content.
        return (
            v.includes('<p') ||
            v.includes('<br') ||
            v.includes('[b]') ||
            v.includes('[i]') ||
            v.includes('[u]') ||
            v.includes('[url') ||
            v.includes('[img') ||
            v.includes('[center]')
        );
    };

    const isIconField = (section: Section) =>
        section.id.startsWith('val-icon-') ||
        /ikon|icon/i.test(section.label || '');

    const searchQuery = searchTerm.trim().toLowerCase();
    const matchesSearch = (...values: Array<string | number | undefined>) => {
        if (!searchQuery) return true;
        return values.some((value) => (value || '').toString().toLowerCase().includes(searchQuery));
    };

    const filteredNews = news.filter((item) =>
        matchesSearch(item.title, item.date, item.category, item.status, item.description)
    );
    const filteredEvents = events.filter((item) =>
        matchesSearch(item.title, item.date, item.location, item.category, item.status, item.description)
    );
    const filteredVideos = videos.filter((item) =>
        matchesSearch(item.title, item.duration, item.youtubeUrl, item.videoId, item.created_at)
    );
    const filteredPhotos = galleryPhotos.filter((item) =>
        matchesSearch(item.title, item.url)
    );

    return (
        <div className="visual-editor fade-in">
            <div className="editor-header">
                <div className="header-top-row">
                    <div className="header-info">
                        <h1><Globe size={20} /> Admin Panel</h1>
                    </div>

                    <div className="header-search-container">
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            placeholder="Komponentləri və məzmunu axtar..."
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="header-search-input"
                        />
                    </div>

                    <div className="header-actions">
                        <button
                            className={`save-btn ${isSaving ? 'saving' : ''}`}
                            onClick={saveChanges}
                            disabled={isSaving}
                        >
                            {isSaving ? 'Gözləyin...' : <><Save size={16} /> Saxla</>}
                        </button>
                    </div>
                </div>

                <div className="mode-switcher">
                    <button
                        className={`mode-btn ${editorMode === 'extract' ? 'active' : ''}`}
                        onClick={() => setEditorMode('extract')}
                    >
                        Ana Səhifə
                    </button>
                    <button
                        className={`mode-btn ${editorMode === 'events' ? 'active' : ''}`}
                        onClick={() => setEditorMode('events')}
                    >
                        Tədbirlər
                    </button>
                    <button
                        className={`mode-btn ${editorMode === 'news' ? 'active' : ''}`}
                        onClick={() => setEditorMode('news')}
                    >
                        Xəbərlər
                    </button>
                    <button
                        className={`mode-btn ${editorMode === 'drivers' ? 'active' : ''}`}
                        onClick={() => setEditorMode('drivers')}
                    >
                        Sürücülər
                    </button>
                    <button
                        className={`mode-btn ${editorMode === 'videos' ? 'active' : ''}`}
                        onClick={() => setEditorMode('videos')}
                    >
                        Videolar
                    </button>
                    <button
                        className={`mode-btn ${editorMode === 'photos' ? 'active' : ''}`}
                        onClick={() => setEditorMode('photos')}
                    >
                        Fotolar
                    </button>
                </div>
            </div>

            {editorMode === 'news' ? (
                <div className="editor-layout with-sidebar">
                    <aside className="page-list">
                        <div className="list-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3>Xəbərlər</h3>
                            <button className="add-section-btn" onClick={addNewNews}>
                                <Plus size={16} />
                            </button>
                        </div>
                        <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 300px)' }}>
                            {filteredNews.length === 0 ? (
                                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem', border: '1px dashed #e2e8f0', borderRadius: '8px' }}>
                                    {searchQuery
                                        ? 'Axtarışa uyğun xəbər tapılmadı.'
                                        : 'Hələ heç bir xəbər yoxdur. Yeni xəbər yaratmaq üçün yuxarıdakı "+" düyməsini basın.'}
                                </div>
                            ) : (
                                filteredNews.map((item) => (
                                    <div key={item.id} className="page-nav-wrapper" style={{ position: 'relative', marginBottom: '4px' }}>
                                        <button
                                            className={`page-nav-item ${selectedNewsId === item.id ? 'active' : ''}`}
                                            onClick={() => handleNewsSelect(item.id)}
                                            style={{ width: '100%', paddingRight: '40px', textAlign: 'left' }}
                                        >
                                            <FileText size={14} /> {item.title}
                                            <div style={{ fontSize: '10px', color: '#999', marginLeft: '24px' }}>{item.date}</div>
                                        </button>
                                        <button
                                            className="delete-section-btn"
                                            onClick={(e) => deleteNews(item.id, e)}
                                            style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#ff4d4f', opacity: 0.5, cursor: 'pointer' }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </aside>

                    <main className="editor-canvas editor-canvas-flat">
                        {selectedNewsId !== null && newsForm.id !== undefined ? (
                            <div className="editor-workspace">
                                <div className="canvas-header canvas-header-block">
                                    <h2 style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <FileText size={22} /> Xəbəri Redaktə Et
                                    </h2>
                                    <p style={{ color: '#64748b' }}>{newsForm.title} // ID: {newsForm.id}</p>
                                </div>

                                <div className="edit-grid grid-2">
                                    <div className="form-group">
                                        <label>BAŞLIQ (AZ)</label>
                                        <input
                                            type="text"
                                            value={newsForm.title}
                                            onChange={(e) => handleNewsChange('title', e.target.value, newsForm.id)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>TARİX</label>
                                        <input
                                            type="date"
                                            value={newsForm.date}
                                            onChange={(e) => handleNewsChange('date', e.target.value, newsForm.id)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>KATEQORİYA</label>
                                        <input
                                            type="text"
                                            value={newsForm.category}
                                            onChange={(e) => handleNewsChange('category', e.target.value, newsForm.id)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>VƏZİYYƏT</label>
                                        <select
                                            value={newsForm.status}
                                            onChange={(e) => handleNewsChange('status', e.target.value, newsForm.id)}
                                        >
                                            <option value="draft">Qaralama</option>
                                            <option value="published">Dərc edilib</option>
                                        </select>
                                    </div>
                                    <div className="form-group full-span">
                                        <label>ŞƏKİL</label>
                                        <div style={{ width: '100%', height: '180px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#f8fafc', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {newsForm.img ? (
                                                <img src={newsForm.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <span style={{ color: '#94a3b8', fontSize: '12px' }}>Şəkil seçilməyib</span>
                                            )}
                                        </div>
                                        <div className="input-row">
                                            <input
                                                type="text"
                                                value={newsForm.img}
                                                onChange={(e) => handleNewsChange('img', e.target.value, newsForm.id)}
                                            />
                                            <input
                                                type="file"
                                                id="news-full-img"
                                                style={{ display: 'none' }}
                                                onChange={async (e) => {
                                                    const f = e.target.files?.[0];
                                                    if (f) {
                                                        const url = await uploadImage(f);
                                                        if (url) handleNewsChange('img', url, newsForm.id);
                                                    }
                                                }}
                                            />
                                            <button onClick={() => document.getElementById('news-full-img')?.click()} className="btn-secondary">Yüklə</button>
                                        </div>
                                    </div>
                                    <div className="form-group full-span">
                                        <label>MƏZMUN</label>
                                        <QuillEditor
                                            id="news-full-desc"
                                            value={bbcodeToHtmlForEditor(newsForm.description || '')}
                                            onChange={(val: string) => handleNewsChange('description', val, newsForm.id)}
                                        />
                                    </div>
                                </div>

                                <div className="editor-savebar">
                                    <button className="btn-primary" onClick={saveChanges}>Yadda Saxla</button>
                                </div>
                            </div>
                        ) : (
                            <div className="editor-empty">
                                <FileText size={48} style={{ opacity: 0.2 }} />
                                <p>Redaktə etmək üçün sol tərəfdən xəbər seçin və ya yeni yaradın.</p>
                            </div>
                        )}
                    </main>
                </div>
            ) : editorMode === 'events' ? (
                <div className="editor-layout with-sidebar">
                    <aside className="page-list">
                        <div className="list-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3>Tədbirlər</h3>
                            <button className="add-section-btn" onClick={addNewEvent}>
                                <Plus size={16} />
                            </button>
                        </div>
                        <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 300px)' }}>
                            {filteredEvents.length === 0 ? (
                                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem', border: '1px dashed #e2e8f0', borderRadius: '8px' }}>
                                    {searchQuery
                                        ? 'Axtarışa uyğun tədbir tapılmadı.'
                                        : 'Hələ heç bir tədbir yoxdur. Yeni tədbir yaratmaq üçün yuxarıdakı "+" düyməsini basın.'}
                                </div>
                            ) : (
                                filteredEvents.map((evt) => (
                                    <div key={evt.id} className="page-nav-wrapper" style={{ position: 'relative', marginBottom: '4px' }}>
                                        <button
                                            className={`page-nav-item ${selectedEventId === evt.id ? 'active' : ''}`}
                                            onClick={() => handleEventSelect(evt.id)}
                                            style={{ width: '100%', paddingRight: '40px', textAlign: 'left' }}
                                        >
                                            <Calendar size={14} /> {evt.title}
                                            <div style={{ fontSize: '10px', color: '#999', marginLeft: '24px' }}>{evt.date}</div>
                                        </button>
                                        <button
                                            className="delete-section-btn"
                                            onClick={(e) => deleteEvent(evt.id, e)}
                                            style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#ff4d4f', opacity: 0.5, cursor: 'pointer' }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </aside>

                    <main className="editor-canvas editor-canvas-flat">
                        {selectedEventId !== null && eventForm.id !== undefined ? (
                            <div className="editor-workspace">
                                <div className="canvas-header canvas-header-block">
                                    <h2 style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <Calendar size={22} /> Tədbiri Redaktə Et
                                    </h2>
                                    <p style={{ color: '#64748b' }}>{eventForm.title} // ID: {eventForm.id}</p>
                                </div>

                                <div className="edit-grid grid-2">
                                    <div className="form-group">
                                        <label>TƏDBİR ADI</label>
                                        <input
                                            type="text"
                                            value={eventForm.title}
                                            onChange={(e) => handleEventChange('title', e.target.value, eventForm.id)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>TARİX</label>
                                        <input
                                            type="date"
                                            value={eventForm.date}
                                            onChange={(e) => handleEventChange('date', e.target.value, eventForm.id)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>MƏKAN</label>
                                        <input
                                            type="text"
                                            value={eventForm.location}
                                            onChange={(e) => handleEventChange('location', e.target.value, eventForm.id)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>KATEQORİYA</label>
                                        <input
                                            type="text"
                                            value={eventForm.category}
                                            onChange={(e) => handleEventChange('category', e.target.value, eventForm.id)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>VƏZİYYƏT</label>
                                        <select
                                            value={eventForm.status}
                                            onChange={(e) => handleEventChange('status', e.target.value, eventForm.id)}
                                        >
                                            <option value="planned">Gələcək</option>
                                            <option value="past">Keçmiş</option>
                                        </select>
                                    </div>
                                    <div className="form-group full-span">
                                        <label>ŞƏKİL</label>
                                        <div style={{ width: '100%', height: '180px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#f8fafc', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {eventForm.img ? (
                                                <img src={eventForm.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <span style={{ color: '#94a3b8', fontSize: '12px' }}>Şəkil seçilməyib</span>
                                            )}
                                        </div>
                                        <div className="input-row">
                                            <input
                                                type="text"
                                                value={eventForm.img}
                                                onChange={(e) => handleEventChange('img', e.target.value, eventForm.id)}
                                            />
                                            <input
                                                type="file"
                                                id="event-full-img"
                                                style={{ display: 'none' }}
                                                onChange={async (e) => {
                                                    const f = e.target.files?.[0];
                                                    if (f) {
                                                        const url = await uploadImage(f);
                                                        if (url) handleEventChange('img', url, eventForm.id);
                                                    }
                                                }}
                                            />
                                            <button onClick={() => document.getElementById('event-full-img')?.click()} className="btn-secondary">Yüklə</button>
                                        </div>
                                    </div>
                                    <div className="form-group full-span">
                                        <label>TƏSVİR</label>
                                        <QuillEditor
                                            id="event-full-desc"
                                            value={bbcodeToHtmlForEditor(eventForm.description || '')}
                                            onChange={(val: string) => handleEventChange('description', val, eventForm.id)}
                                        />
                                    </div>
                                    <div className="form-group full-span">
                                        <label>PDF URL</label>
                                        <div className="input-row">
                                            <input
                                                type="text"
                                                value={eventForm.pdfUrl || ''}
                                                onChange={(e) => handleEventChange('pdfUrl', e.target.value, eventForm.id)}
                                                placeholder="https://.../rules.pdf"
                                            />
                                            <input
                                                type="file"
                                                id="event-full-pdf"
                                                accept=".pdf,application/pdf"
                                                style={{ display: 'none' }}
                                                onChange={async (e) => {
                                                    const f = e.target.files?.[0];
                                                    if (!f) return;
                                                    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
                                                        toast.error('Yalnız PDF faylı yüklənə bilər');
                                                        return;
                                                    }
                                                    const url = await uploadAsset(f, {
                                                        loadingText: 'PDF yüklənir...',
                                                        successText: 'PDF uğurla yükləndi',
                                                        errorText: 'PDF yüklənərkən xəta baş verdi'
                                                    });
                                                    if (url) handleEventChange('pdfUrl', url, eventForm.id);
                                                    (e.target as HTMLInputElement).value = '';
                                                }}
                                            />
                                            <button type="button" onClick={() => document.getElementById('event-full-pdf')?.click()} className="btn-secondary">PDF Yüklə</button>
                                        </div>
                                    </div>
                                    <div className="form-group full-span">
                                        <label>QAYDALAR</label>
                                        <QuillEditor
                                            id="event-full-rules"
                                            value={bbcodeToHtmlForEditor(eventForm.rules || '')}
                                            onChange={(val: string) => handleEventChange('rules', val, eventForm.id)}
                                        />
                                    </div>
                                </div>

                                <div className="editor-savebar">
                                    <button className="btn-primary" onClick={saveChanges}>Yadda Saxla</button>
                                </div>
                            </div>
                        ) : (
                            <div className="editor-empty">
                                <Calendar size={48} style={{ opacity: 0.2 }} />
                                <p>Redaktə etmək üçün sol tərəfdən tədbir seçin və ya yeni yaradın.</p>
                            </div>
                        )}
                    </main>
                </div>
            ) : editorMode === 'drivers' ? (
                <div className="editor-layout with-sidebar">
                    <aside className="page-list">
                        <div className="list-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3>Kateqoriyalar</h3>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                <button className="add-section-btn" onClick={addCategory} title="Kateqoriya əlavə et">
                                    <Plus size={16} />
                                </button>
                                <button className="delete-section-btn" onClick={deleteCategory} title="Seçilmiş kateqoriyanı sil" style={{ background: 'none', border: 'none', color: '#ff4d4f', cursor: 'pointer', padding: '4px' }}>
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                        <select
                            value={selectedCatId || ''}
                            onChange={(e) => handleCatSelect(e.target.value)}
                            style={{ width: '100%', padding: '10px', marginBottom: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 'bold' }}
                        >
                            {driverCategories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>

                        <div className="list-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3>Sürücülər</h3>
                            <button className="add-section-btn" onClick={addDriver}>
                                <Plus size={16} />
                            </button>
                        </div>
                        <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 400px)' }}>
                            {selectedCatId && (driverCategories.find(c => c.id === selectedCatId)?.drivers || []).filter((d) =>
                                matchesSearch(d.name, d.license, d.team, d.rank, d.points, d.wins)
                            ).length === 0 ? (
                                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
                                    {searchQuery ? 'Axtarışa uyğun sürücü tapılmadı.' : 'Bu kateqoriyada sürücü yoxdur.'}
                                </div>
                            ) : (
                                (driverCategories.find(c => c.id === selectedCatId)?.drivers || [])
                                    .filter((d) => matchesSearch(d.name, d.license, d.team, d.rank, d.points, d.wins))
                                    .map((d) => (
                                    <div key={d.id} className="page-nav-wrapper" style={{ position: 'relative', marginBottom: '4px' }}>
                                        <button
                                            className={`page-nav-item ${selectedDriverId === d.id ? 'active' : ''}`}
                                            onClick={() => handleDriverSelect(d.id)}
                                            style={{ width: '100%', paddingRight: '40px', textAlign: 'left' }}
                                        >
                                            <span style={{ fontWeight: '900', color: 'var(--primary)', marginRight: '8px' }}>#{d.rank}</span> {d.name}
                                        </button>
                                        <button
                                            className="delete-section-btn"
                                            onClick={(e) => { e.stopPropagation(); deleteDriver(d.id); }}
                                            style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#ff4d4f', opacity: 0.5, cursor: 'pointer' }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </aside>

                    <main className="editor-canvas editor-canvas-flat">
                        {selectedDriverId !== null && driverForm.id !== undefined ? (
                            <div className="editor-workspace">
                                <div className="canvas-header canvas-header-block">
                                    <h2 style={{ fontSize: '2rem' }}>{driverForm.name}</h2>
                                    <p style={{ color: '#64748b' }}>{driverCategories.find(c => c.id === selectedCatId)?.name} // RANK #{driverForm.rank}</p>
                                </div>

                                <div className="edit-grid grid-2">
                                    <div className="form-group">
                                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '12px', color: '#64748b' }}>SÜRÜCÜNÜN ADI VƏ SOYADI</label>
                                        <input
                                            type="text"
                                            value={driverForm.name}
                                            onChange={(e) => handleDriverChange('name', e.target.value)}
                                            placeholder="Məs: Əli Məmmədov"
                                            style={{ width: '100%', padding: '14px', border: '2px solid #e2e8f0', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold' }}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '12px', color: '#64748b' }}>YARIŞ SIRALAMASI (RANK)</label>
                                        <input
                                            type="number"
                                            value={driverForm.rank}
                                            readOnly
                                            style={{ width: '100%', padding: '14px', border: '2px solid #e2e8f0', borderRadius: '12px', fontSize: '16px', background: '#f8fafc', color: '#94a3b8', cursor: 'not-allowed' }}
                                        />
                                        <p style={{ fontSize: '11px', color: '#3b82f6', marginTop: '6px', fontWeight: 'bold' }}>ℹ️ Bu sıra ballara görə avtomatik hesablanır</p>
                                    </div>

                                    <div className="form-group">
                                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '12px', color: '#64748b' }}>PİLOT LİSENZİYASI</label>
                                        <input
                                            type="text"
                                            value={driverForm.license}
                                            onChange={(e) => handleDriverChange('license', e.target.value)}
                                            placeholder="Məs: A-SİNFİ"
                                            style={{ width: '100%', padding: '14px', border: '2px solid #e2e8f0', borderRadius: '12px', fontSize: '15px' }}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '12px', color: '#64748b' }}>TƏMSİL ETDİYİ KOMANDA</label>
                                        <input
                                            type="text"
                                            value={driverForm.team}
                                            onChange={(e) => handleDriverChange('team', e.target.value)}
                                            placeholder="Məs: FORSAJ RACING"
                                            style={{ width: '100%', padding: '14px', border: '2px solid #e2e8f0', borderRadius: '12px', fontSize: '15px' }}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '12px', color: '#64748b' }}>QALİBİYYƏT (WINS)</label>
                                        <input
                                            type="number"
                                            value={driverForm.wins}
                                            onChange={(e) => handleDriverChange('wins', parseInt(e.target.value))}
                                            style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '12px', color: '#64748b' }}>XAL (POINTS)</label>
                                        <input
                                            type="number"
                                            value={driverForm.points}
                                            onChange={(e) => handleDriverChange('points', parseInt(e.target.value))}
                                            style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }}
                                        />
                                    </div>

                                    <div className="form-group full-span">
                                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '12px', color: '#64748b' }}>PİLOT ŞƏKLİ</label>
                                        <div className="input-row">
                                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', background: '#f1f5f9', border: '2px solid var(--primary)' }}>
                                                {driverForm.img ? (
                                                    <img src={driverForm.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <ImageIcon size={24} style={{ opacity: 0.2 }} />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="input-row" style={{ flex: 1 }}>
                                                <input
                                                    type="text"
                                                    value={driverForm.img || ''}
                                                    onChange={(e) => handleDriverChange('img', e.target.value)}
                                                    placeholder="Şəkil URL və ya yol..."
                                                    style={{ flex: 1, padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }}
                                                />
                                                <input
                                                    type="file"
                                                    id="driver-img-upload"
                                                    style={{ display: 'none' }}
                                                    accept="image/*"
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            const url = await uploadImage(file);
                                                            if (url) handleDriverChange('img', url);
                                                        }
                                                    }}
                                                />
                                                <button
                                                    onClick={() => document.getElementById('driver-img-upload')?.click()}
                                                    style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '8px', cursor: 'pointer' }}
                                                >
                                                    Yüklə
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="editor-savebar">
                                    <button className="btn-primary" onClick={handleDriverSave} disabled={isSaving}>
                                        {isSaving ? 'Gözləyin...' : 'Sürücünü Yadda Saxla'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="editor-empty">
                                <Trophy size={48} style={{ opacity: 0.2 }} />
                                <p>Redaktə etmək üçün sol tərəfdən sürücü seçin.</p>
                            </div>
                        )}
                    </main>
                </div>
            ) : editorMode === 'videos' ? (
                <div className="editor-layout with-sidebar">
                    <aside className="page-list">
                        <div className="list-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3>Videolar</h3>
                            <button className="add-section-btn" onClick={addNewVideo}>
                                <Plus size={16} />
                            </button>
                        </div>
                        <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 300px)' }}>
                            {filteredVideos.length === 0 ? (
                                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
                                    {searchQuery ? 'Axtarışa uyğun video tapılmadı.' : 'Heç bir video əlavə edilməyib.'}
                                </div>
                            ) : (
                                filteredVideos.map((v) => (
                                    <div key={v.id} className="page-nav-wrapper" style={{ position: 'relative', marginBottom: '4px' }}>
                                        <button
                                            className={`page-nav-item ${selectedVideoId === v.id ? 'active' : ''}`}
                                            onClick={() => handleVideoSelect(v.id)}
                                            style={{ width: '100%', paddingRight: '40px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}
                                        >
                                            <div style={{ width: '24px', height: '16px', background: '#333', borderRadius: '2px', overflow: 'hidden' }}>
                                                {v.thumbnail && <img src={v.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                            </div>
                                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title}</span>
                                        </button>
                                        <button
                                            className="delete-section-btn"
                                            onClick={(e) => { e.stopPropagation(); deleteVideo(v.id, e); }}
                                            style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#ff4d4f', opacity: 0.5, cursor: 'pointer' }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </aside>

                    <main className="editor-canvas editor-canvas-flat">
                        {selectedVideoId !== null && videoForm.id !== undefined ? (
                            <div className="editor-workspace">
                                <div className="canvas-header canvas-header-block">
                                    <h2 style={{ fontSize: '2rem' }}>Video Redaktəsi</h2>
                                    <p style={{ color: '#64748b' }}>{videoForm.title} // ID: {videoForm.id}</p>
                                </div>

                                <div className="edit-grid grid-1">
                                    <div className="form-group">
                                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '12px', color: '#64748b' }}>VİDEO BAŞLIĞI</label>
                                        <input
                                            type="text"
                                            value={videoForm.title}
                                            onChange={(e) => handleVideoChange('title', e.target.value)}
                                            style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold' }}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '12px', color: '#64748b' }}>YOUTUBE URL</label>
                                        <div style={{ position: 'relative' }}>
                                            <Globe size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                            <input
                                                type="text"
                                                value={videoForm.youtubeUrl}
                                                onChange={(e) => handleVideoChange('youtubeUrl', e.target.value)}
                                                placeholder="https://www.youtube.com/watch?v=..."
                                                style={{ width: '100%', padding: '12px 12px 12px 40px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }}
                                            />
                                        </div>
                                        <p style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>YouTube linkini daxil etdikdə şəkil və ID avtomatik təyin olunacaq.</p>
                                    </div>

                                    <div className="edit-grid grid-2-compact">
                                        <div className="form-group">
                                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '12px', color: '#64748b' }}>MÜDDƏT (MƏS: 05:20)</label>
                                            <input
                                                type="text"
                                                value={videoForm.duration}
                                                onChange={(e) => handleVideoChange('duration', e.target.value)}
                                                style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '12px', color: '#64748b' }}>VİDEO ID (AVTOMATİK)</label>
                                            <input
                                                type="text"
                                                value={videoForm.videoId}
                                                readOnly
                                                style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', background: '#f8fafc', color: '#94a3b8' }}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '12px', color: '#64748b' }}>YARADILMA TARİXİ</label>
                                        <input
                                            type="text"
                                            value={videoForm.created_at || ''}
                                            onChange={(e) => handleVideoChange('created_at', e.target.value)}
                                            placeholder="2026-02-16T10:30:00.000Z"
                                            style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '12px', color: '#64748b' }}>ÖNİZLƏMƏ (THUMBNAIL)</label>
                                        <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: '12px', overflow: 'hidden', background: '#000', border: '1px solid #e2e8f0', position: 'relative' }}>
                                            {videoForm.thumbnail ? (
                                                <img src={videoForm.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
                                                    <Video size={48} style={{ opacity: 0.1, color: 'white' }} />
                                                    <p style={{ color: '#64748b', fontSize: '12px' }}>YouTube linki daxil edin</p>
                                                </div>
                                            )}
                                            {videoForm.videoId && (
                                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)', cursor: 'pointer' }} onClick={() => window.open(videoForm.youtubeUrl, '_blank')}>
                                                    <div style={{ background: '#FF4D00', color: 'white', padding: '12px', borderRadius: '50%', boxShadow: '0 0 20px rgba(255,77,0,0.4)' }}>
                                                        <Play size={24} fill="currentColor" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="editor-empty">
                                <Video size={48} style={{ opacity: 0.2 }} />
                                <p>Redaktə etmək üçün sol tərəfdən video seçin və ya yeni əlavə edin.</p>
                            </div>
                        )}
                    </main>
                </div>
            ) : editorMode === 'photos' ? (
                <div className="editor-layout with-sidebar">
                    <aside className="page-list">
                        <div className="list-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3>Foto Arxiv</h3>
                            <button className="add-section-btn" onClick={addGalleryPhoto} title="Yeni şəkil əlavə et">
                                <Plus size={16} />
                            </button>
                        </div>
                        <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
                            {filteredPhotos.length === 0 ? (
                                <p style={{ padding: '20px', color: '#94a3b8', textAlign: 'center', fontSize: '13px' }}>
                                    {searchQuery ? 'Axtarışa uyğun şəkil tapılmadı.' : 'Şəkil yoxdur'}
                                </p>
                            ) : (
                                filteredPhotos.map((photo) => (
                                    <div key={photo.id} className="page-nav-wrapper" style={{ position: 'relative', marginBottom: '4px' }}>
                                        <button
                                            className={`page-nav-item ${selectedPhotoId === photo.id ? 'active' : ''}`}
                                            onClick={() => handlePhotoSelect(photo.id)}
                                            style={{ width: '100%', paddingRight: '40px', display: 'flex', alignItems: 'center', gap: '8px' }}
                                        >
                                            <div style={{ width: '24px', height: '24px', borderRadius: '4px', overflow: 'hidden', flexShrink: 0, background: '#eee' }}>
                                                {photo.url ? <img src={photo.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon size={12} style={{ margin: '6px', opacity: 0.3 }} />}
                                            </div>
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{photo.title}</span>
                                        </button>
                                        <button
                                            className="delete-section-btn"
                                            onClick={(e) => deleteGalleryPhoto(photo.id, e)}
                                            style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#ff4d4f', opacity: 0.5, cursor: 'pointer' }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </aside>

                    <main className="editor-canvas editor-canvas-flat">
                        {selectedPhotoId !== null && photoForm.id !== undefined ? (
                            <div className="editor-workspace">
                                <div className="canvas-header canvas-header-block">
                                    <h2 style={{ fontSize: '2rem' }}>Şəkil Redaktəsi</h2>
                                    <p style={{ color: '#64748b' }}>{photoForm.title} // ID: {photoForm.id}</p>
                                </div>

                                <div className="edit-grid grid-1">
                                    <div className="form-group">
                                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '12px', color: '#64748b' }}>ŞƏKİL BAŞLIĞI</label>
                                        <input
                                            type="text"
                                            value={photoForm.title}
                                            onChange={(e) => handlePhotoChange('title', e.target.value)}
                                            style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold' }}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '12px', color: '#64748b' }}>FOTO</label>
                                        <div style={{ width: '100%', minHeight: '300px', borderRadius: '12px', overflow: 'hidden', background: '#f8fafc', border: '1px dashed #cbd5e1', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
                                            {photoForm.url ? (
                                                <img src={photoForm.url} alt="" style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain' }} />
                                            ) : (
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
                                                    <ImageIcon size={48} style={{ opacity: 0.1 }} />
                                                    <p style={{ color: '#64748b', fontSize: '12px' }}>Şəkil seçilməyib</p>
                                                </div>
                                            )}
                                            <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                                                <input
                                                    type="file"
                                                    id="gallery-photo-upload"
                                                    style={{ display: 'none' }}
                                                    accept="image/*"
                                                    onChange={handlePhotoUpload}
                                                />
                                                <button
                                                    onClick={() => document.getElementById('gallery-photo-upload')?.click()}
                                                    className="btn-primary"
                                                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                                >
                                                    <Plus size={18} /> Şəkil Yüklə
                                                </button>
                                                <input
                                                    type="text"
                                                    value={photoForm.url || ''}
                                                    onChange={(e) => handlePhotoChange('url', e.target.value)}
                                                    placeholder="URL və ya yol..."
                                                    style={{ padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', width: '250px' }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="editor-empty">
                                <ImageIcon size={48} style={{ opacity: 0.2 }} />
                                <p>Redaktə etmək üçün sol tərəfdən şəkil seçin və ya yeni əlavə edin.</p>
                            </div>
                        )}
                    </main>
                </div>
            ) : (
                <div className="editor-layout">
                    <main className="editor-canvas" style={{ width: '100%' }}>
                        {isGroupedTabView ? (
                            <div className="edit-fields" style={{ width: '100%' }}>
                                {pageParam === 'home' && (
                                    <div className="canvas-header">
                                        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                                            Ana Səhifə Blokları
                                        </h2>
                                    </div>
                                )}
                                {pageParam === 'abouttab' && (
                                    <div className="canvas-header">
                                        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                                            HAQQIMIZDA
                                        </h2>
                                    </div>
                                )}
                                {activeGroupPages.map(({ page, pageIdx }) => {
                                    const pageSections = (page.sections || [])
                                        .filter((section) => {
                                            if (!isSectionVisibleInAdmin(section) || shouldSkipSectionInEditor(section)) return false;
                                            if (page.id === 'about' && isStatSectionId(section.id)) return false;
                                            return true;
                                        })
                                        .sort((a, b) => normalizeOrder(a.order, 0) - normalizeOrder(b.order, 0));
                                    const pageImages = (page.images || [])
                                        .sort((a, b) => normalizeOrder(a.order, 0) - normalizeOrder(b.order, 0));
                                    const pageAboutStats = page.id === 'about'
                                        ? (() => {
                                            const statsMap = new Map<string, { label: string; value: string }>();
                                            (page.sections || []).forEach((section) => {
                                                if (!isStatSectionId(section.id)) return;
                                                const suffix = getStatSuffix(section.id) || section.id;
                                                const current = statsMap.get(suffix) || { label: '', value: '' };
                                                if (section.id.startsWith(STAT_LABEL_PREFIX)) current.label = section.value || '';
                                                if (section.id.startsWith(STAT_VALUE_PREFIX)) current.value = section.value || '';
                                                statsMap.set(suffix, current);
                                            });
                                            return Array.from(statsMap.entries())
                                                .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
                                                .map(([suffix, data]) => ({ suffix, ...data }));
                                        })()
                                        : [];

                                    return (
                                        <div key={page.id} className="field-group">
                                            <div className="canvas-header">
                                                <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
                                                    {componentLabels[page.id] || page.title}
                                                </h2>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                                                {page.id === 'about' && (
                                                    <div className="field-item-wrapper" style={{ position: 'relative', background: '#fcfcfd', padding: '1rem', borderRadius: '12px', border: '1px solid #f0f0f2' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 800 }}>
                                                                Statistikalar
                                                            </div>
                                                            <button
                                                                type="button"
                                                                className="add-field-minimal"
                                                                onClick={() => addAboutStatRow(pageIdx)}
                                                            >
                                                                <Plus size={14} /> Yeni Statistika
                                                            </button>
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                            {pageAboutStats.map((row) => (
                                                                <div key={row.suffix} style={{ display: 'grid', gridTemplateColumns: '1fr 180px auto', gap: '8px', alignItems: 'center' }}>
                                                                    <input
                                                                        type="text"
                                                                        value={row.label}
                                                                        onChange={(e) => updateAboutStatField(row.suffix, 'label', e.target.value, pageIdx)}
                                                                        placeholder="Statistika adı"
                                                                        style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', fontWeight: 700 }}
                                                                    />
                                                                    <input
                                                                        type="text"
                                                                        value={row.value}
                                                                        onChange={(e) => updateAboutStatField(row.suffix, 'value', e.target.value, pageIdx)}
                                                                        placeholder="Dəyər"
                                                                        style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', fontWeight: 700 }}
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeAboutStatRow(row.suffix, pageIdx)}
                                                                        style={{ background: '#fff', border: '1px solid #fee2e2', color: '#ef4444', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {pageSections.map((section) => {
                                                    const sectionKey = extractSectionKey(section);
                                                    const canEditValue = canEditSectionField(section, 'value');
                                                    const canEditUrl = canEditSectionField(section, 'url');
                                                    const hasUrl = !!section.url?.trim();
                                                    const iconField = isIconField(section);
                                                    return (
                                                        <div key={`${page.id}-${section.id}`} className="field-item-wrapper" style={{ position: 'relative', background: '#fcfcfd', padding: '1rem', borderRadius: '12px', border: '1px solid #f0f0f2' }}>
                                                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, marginBottom: '6px' }}>
                                                                {sectionKey ? humanizeKey(sectionKey) : section.label}
                                                            </div>
                                                            {iconField ? (
                                                                <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '8px' }}>
                                                                    <select
                                                                        value={section.value || ''}
                                                                        disabled={!canEditValue}
                                                                        onChange={(e) => handleSectionChange(pageIdx, section.id, 'value', e.target.value)}
                                                                        style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px' }}
                                                                    >
                                                                        {ICON_PRESETS.map((opt) => (
                                                                            <option key={opt} value={opt}>{opt}</option>
                                                                        ))}
                                                                    </select>
                                                                    <input
                                                                        type="text"
                                                                        value={section.value || ''}
                                                                        disabled={!canEditValue}
                                                                        onChange={(e) => handleSectionChange(pageIdx, section.id, 'value', e.target.value)}
                                                                        style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px' }}
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <textarea
                                                                    rows={3}
                                                                    value={section.value}
                                                                    disabled={!canEditValue}
                                                                    onChange={(e) => handleSectionChange(pageIdx, section.id, 'value', e.target.value)}
                                                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', lineHeight: 1.4, resize: 'vertical' }}
                                                                />
                                                            )}

                                                            {hasUrl && (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '0.75rem' }}>
                                                                    <Globe size={14} style={{ color: '#94a3b8' }} />
                                                                    <input
                                                                        type="text"
                                                                        value={toAbsoluteUrl(section.url || '')}
                                                                        disabled={!canEditUrl}
                                                                        onChange={(e) => handleSectionChange(pageIdx, section.id, 'url', e.target.value)}
                                                                        onBlur={() => normalizeSectionUrl(pageIdx, section.id)}
                                                                        placeholder="https://example.com/path"
                                                                        style={{ fontSize: '12px', padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', flex: 1 }}
                                                                    />
                                                                </div>
                                                            )}

                                                            {!hasUrl && canEditUrl && (
                                                                <button
                                                                    type="button"
                                                                    className="add-field-minimal"
                                                                    onClick={() => handleSectionChange(pageIdx, section.id, 'url', `${window.location.origin}/`)}
                                                                    style={{ marginTop: '0.75rem' }}
                                                                >
                                                                    <Plus size={14} /> Link əlavə et
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            <div style={{ marginTop: '1rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>
                                                        Şəkillər
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="add-field-minimal"
                                                        onClick={() => {
                                                            const newPages = [...pages];
                                                            const target = newPages[pageIdx];
                                                            if (!target) return;
                                                            target.images.push({
                                                                id: `img-${target.images.length}-${Date.now()}`,
                                                                path: '',
                                                                alt: '',
                                                                type: 'local',
                                                                order: target.images.length
                                                            });
                                                            setPages(newPages);
                                                        }}
                                                    >
                                                        <Plus size={14} /> Yeni Şəkil
                                                    </button>
                                                </div>
                                                <div className="images-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
                                                    {pageImages.length === 0 && (
                                                        <div className="empty-fields-tip" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '1rem', border: '1px dashed #cbd5e1', borderRadius: '10px', color: '#64748b' }}>
                                                            Bu bölmədə şəkil yoxdur.
                                                        </div>
                                                    )}
                                                    {pageImages.map((img) => (
                                                        <div key={`${page.id}-${img.id}`} className="image-edit-card" style={{ border: '1px solid #eee', borderRadius: '12px', padding: '0.75rem', background: '#fff' }}>
                                                            <div style={{ height: '120px', background: '#f8fafc', borderRadius: '8px', marginBottom: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                {img.path ? (
                                                                    <img src={img.path} alt={img.alt || img.id} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                ) : (
                                                                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>Önizləmə yoxdur</span>
                                                                )}
                                                            </div>
                                                            <input
                                                                type="text"
                                                                value={img.path}
                                                                placeholder="Tam şəkil linki"
                                                                onChange={(e) => {
                                                                    const newPages = [...pages];
                                                                    const target = newPages[pageIdx];
                                                                    if (!target) return;
                                                                    const idx = target.images.findIndex((i) => i.id === img.id);
                                                                    if (idx === -1) return;
                                                                    target.images[idx].path = e.target.value;
                                                                    setPages(newPages);
                                                                }}
                                                                style={{ width: '100%', fontSize: '12px', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', marginBottom: '8px' }}
                                                            />
                                                            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                                                <input
                                                                    id={`group-file-up-${page.id}-${img.id}`}
                                                                    type="file"
                                                                    accept="image/*"
                                                                    style={{ display: 'none' }}
                                                                    onChange={async (e) => {
                                                                        const f = e.target.files?.[0];
                                                                        if (!f) return;
                                                                        const url = await uploadImage(f);
                                                                        if (!url) return;
                                                                        const newPages = [...pages];
                                                                        const target = newPages[pageIdx];
                                                                        if (!target) return;
                                                                        const idx = target.images.findIndex((i) => i.id === img.id);
                                                                        if (idx === -1) return;
                                                                        target.images[idx].path = url;
                                                                        target.images[idx].type = 'local';
                                                                        setPages(newPages);
                                                                    }}
                                                                />
                                                                <button
                                                                    type="button"
                                                                    className="btn-secondary"
                                                                    onClick={() => document.getElementById(`group-file-up-${page.id}-${img.id}`)?.click()}
                                                                    style={{ fontSize: '11px', padding: '6px 10px' }}
                                                                >
                                                                    Fayldan yüklə
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="btn-secondary"
                                                                    onClick={() => openImageSelector(pageIdx, img.id)}
                                                                    style={{ fontSize: '11px', padding: '6px 10px' }}
                                                                >
                                                                    Kitabxanadan seç
                                                                </button>
                                                            </div>
                                                            <input
                                                                type="text"
                                                                value={img.alt}
                                                                placeholder="Alt mətni"
                                                                onChange={(e) => handleImageAltChange(pageIdx, img.id, e.target.value)}
                                                                style={{ width: '100%', fontSize: '12px', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : currentPage ? (
                            <>
                                <div className="canvas-header">
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                                        {componentLabels[currentPage.id] || currentPage.title}
                                    </h2>
                                    <div className="canvas-actions">
                                        {currentPage.id === 'about' && (
                                            <button className="add-field-minimal" onClick={() => addAboutStatRow()} style={{ background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe' }}>
                                                <Trophy size={14} /> Statistika Əlavə Et
                                            </button>
                                        )}
                                        {currentPage.id === 'values' && (
                                            <button className="add-field-minimal" onClick={() => {
                                                addField('text', 'İkon Kodu (Shield/Users/Leaf/Zap)', `val-icon-${Date.now()}`);
                                                addField('text', 'Dəyər Başlığı', `val-title-${Date.now()}`);
                                                addField('text', 'Dəyər Təsviri', `val-desc-${Date.now()}`);
                                            }} style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
                                                <Plus size={14} /> Yeni Dəyər Əlavə Et
                                            </button>
                                        )}
                                        <div style={{ width: '1px', height: '24px', background: '#e2e8f0', margin: '0 4px' }}></div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '4px 12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                            <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b' }}>VƏZİYYƏT:</span>
                                            <button
                                                onClick={() => {
                                                    const newPages = [...pages];
                                                    newPages[selectedPageIndex].active = currentPage?.active === false ? true : false;
                                                    setPages(newPages);
                                                    toast.success(newPages[selectedPageIndex].active ? 'Bölmə aktivləşdirildi' : 'Bölmə deaktiv edildi');
                                                }}
                                                style={{
                                                    width: '36px',
                                                    height: '18px',
                                                    borderRadius: '9px',
                                                    background: currentPage?.active !== false ? '#10b981' : '#cbd5e1',
                                                    position: 'relative',
                                                    cursor: 'pointer',
                                                    border: 'none',
                                                    transition: 'background 0.3s'
                                                }}
                                            >
                                                <div style={{
                                                    width: '14px',
                                                    height: '14px',
                                                    borderRadius: '50%',
                                                    background: 'white',
                                                    position: 'absolute',
                                                    top: '2px',
                                                    left: currentPage?.active !== false ? '20px' : '2px',
                                                    transition: 'left 0.3s'
                                                }} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="edit-fields">
                                    {currentPage.id === 'about' && (
                                        <div className="field-group">
                                            <div className="field-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <label><Trophy size={16} /> Statistikalar</label>
                                                <button className="add-field-minimal" onClick={() => addAboutStatRow()}>
                                                    <Plus size={14} /> Yeni Statistika
                                                </button>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                {aboutStats.length > 0 ? (
                                                    aboutStats.map((row) => (
                                                        <div key={row.suffix} style={{ display: 'grid', gridTemplateColumns: '1fr 180px auto', gap: '8px', alignItems: 'center', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '10px', background: '#fff' }}>
                                                            <input
                                                                type="text"
                                                                value={row.label}
                                                                onChange={(e) => updateAboutStatField(row.suffix, 'label', e.target.value)}
                                                                placeholder="Statistika adı (Məs: PİLOTLAR)"
                                                                style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', fontWeight: 700 }}
                                                            />
                                                            <input
                                                                type="text"
                                                                value={row.value}
                                                                onChange={(e) => updateAboutStatField(row.suffix, 'value', e.target.value)}
                                                                placeholder="Dəyər (Məs: 140+)"
                                                                style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', fontWeight: 700 }}
                                                            />
                                                            <button
                                                                onClick={() => removeAboutStatRow(row.suffix)}
                                                                title="Statistikanı sil"
                                                                style={{ background: '#fff', border: '1px solid #fee2e2', color: '#ef4444', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div style={{ padding: '1rem', border: '1px dashed #cbd5e1', borderRadius: '8px', color: '#64748b', fontSize: '13px' }}>
                                                        {searchTerm ? 'Axtarışa uyğun statistika tapılmadı.' : 'Hələ statistika yoxdur. "Yeni Statistika" ilə əlavə edin.'}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {currentPage.id === 'partners' && (
                                        <div className="field-group">
                                            <div className="field-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <label><Trophy size={16} /> Tərəfdaş Kartları</label>
                                                <button className="add-field-minimal" onClick={addPartnerRow}>
                                                    <Plus size={14} /> Tərəfdaş Əlavə Et
                                                </button>
                                            </div>
                                            <div style={{ marginBottom: '12px' }}>
                                                <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '6px', fontWeight: 700 }}>Bölmə Başlığı</label>
                                                <input
                                                    type="text"
                                                    value={currentPage.sections.find(s => s.id === 'SECTION_TITLE')?.value || ''}
                                                    onChange={(e) => handleSectionChange(selectedPageIndex, 'SECTION_TITLE', 'value', e.target.value)}
                                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', fontWeight: 700 }}
                                                />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                {partnerRows.map((row, idx) => {
                                                    const canMoveUp = idx > 0;
                                                    const canMoveDown = idx < partnerRows.length - 1;
                                                    return (
                                                        <div key={row.index} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', background: '#fff' }}>
                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 200px auto', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                                                                <input
                                                                    type="text"
                                                                    value={row.name}
                                                                    onChange={(e) => updatePartnerRowField(row.index, 'name', e.target.value)}
                                                                    placeholder="Tərəfdaş adı"
                                                                    style={{ padding: '9px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                                                                />
                                                                <input
                                                                    type="text"
                                                                    value={row.tag}
                                                                    onChange={(e) => updatePartnerRowField(row.index, 'tag', e.target.value)}
                                                                    placeholder="Etiket"
                                                                    style={{ padding: '9px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                                                                />
                                                                <input
                                                                    type="text"
                                                                    value={row.icon}
                                                                    onChange={(e) => updatePartnerRowField(row.index, 'icon', e.target.value)}
                                                                    placeholder="ShieldCheck / Truck / Globe / Zap"
                                                                    style={{ padding: '9px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                                                                />
                                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                                    <button
                                                                        title="Yuxarı"
                                                                        onClick={() => movePartnerRow(row.index, 'up')}
                                                                        disabled={!canMoveUp}
                                                                        style={{ width: '30px', height: '30px', border: '1px solid #e2e8f0', background: '#fff', borderRadius: '8px', color: canMoveUp ? '#334155' : '#cbd5e1' }}
                                                                    >
                                                                        <ChevronUp size={14} />
                                                                    </button>
                                                                    <button
                                                                        title="Aşağı"
                                                                        onClick={() => movePartnerRow(row.index, 'down')}
                                                                        disabled={!canMoveDown}
                                                                        style={{ width: '30px', height: '30px', border: '1px solid #e2e8f0', background: '#fff', borderRadius: '8px', color: canMoveDown ? '#334155' : '#cbd5e1' }}
                                                                    >
                                                                        <ChevronDown size={14} />
                                                                    </button>
                                                                    <button
                                                                        title="Sil"
                                                                        onClick={() => removePartnerRow(row.index)}
                                                                        style={{ width: '30px', height: '30px', border: '1px solid #fee2e2', background: '#fff', borderRadius: '8px', color: '#ef4444' }}
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', gap: '8px', alignItems: 'center' }}>
                                                                <select
                                                                    value={row.useImage}
                                                                    onChange={(e) => updatePartnerRowField(row.index, 'useImage', e.target.value)}
                                                                    style={{ padding: '9px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                                                                >
                                                                    <option value="false">İkon istifadə et</option>
                                                                    <option value="true">Görsel istifadə et</option>
                                                                </select>
                                                                <input
                                                                    type="text"
                                                                    value={row.imageId}
                                                                    onChange={(e) => updatePartnerRowField(row.index, 'imageId', e.target.value)}
                                                                    placeholder="Görsel ID (Məs: partner-image-1)"
                                                                    style={{ padding: '9px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    <div className="field-group">
                                        <div className="field-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <label><Type size={16} /> Mətn Sahələri</label>
                                            <button className="add-field-minimal" onClick={() => addField('text')}>
                                                <Plus size={14} /> Mətn Əlavə Et
                                            </button>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                            {displayedSections.length === 0 && searchTerm ? (
                                                <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem', border: '1px dashed #e2e8f0', borderRadius: '8px' }}>
                                                    Bu səhifədə sorğuya uyğun mətn tapılmadı.
                                                </div>
                                            ) : (
                                                displayedSections.map((section, visibleIndex) => {
                                                    const editable = isSectionBusinessEditable(section);
                                                    const key = extractSectionKey(section);
                                                    const editableLabel = canEditSectionField(section, 'label');
                                                    const editableValue = canEditSectionField(section, 'value');
                                                    const editableUrl = canEditSectionField(section, 'url');
                                                    const hasUrlValue = !!(section.url || '').trim();
                                                    const deletable = canDeleteSection(section);
                                                    const realSections = currentPage?.sections || [];
                                                    const realIndex = realSections.findIndex(s => s.id === section.id);
                                                    const canMoveUp = realIndex > 0;
                                                    const canMoveDown = realIndex >= 0 && realIndex < realSections.length - 1;
                                                    const iconField = isIconField(section);

                                                    return (
                                                        <div key={section.id} className="field-item-wrapper" style={{ background: editable ? '#fcfcfd' : '#f8fafc', padding: '1.25rem', borderRadius: '14px', border: editable ? '1px solid #e5e7eb' : '1px dashed #cbd5e1' }}>
                                                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                                                                <input
                                                                    type="text"
                                                                    value={looksLikeKeyToken(section.label) ? humanizeKey(section.label) : section.label}
                                                                    onChange={(e) => handleSectionChange(selectedPageIndex, section.id, 'label', e.target.value)}
                                                                    disabled={!editableLabel}
                                                                    style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)', border: 'none', background: 'none', width: 'auto', padding: 0 }}
                                                                />
                                                                {key && (
                                                                    <span style={{ fontSize: '10px', color: '#475569', background: '#f1f5f9', borderRadius: '999px', padding: '3px 8px', fontWeight: 700 }}>
                                                                        Açar mətn
                                                                    </span>
                                                                )}
                                                                <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, marginLeft: 'auto' }}>
                                                                    Sıra: {visibleIndex + 1}
                                                                </span>
                                                            </div>
                                                            {iconField ? (
                                                                <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '8px' }}>
                                                                    <select
                                                                        value={section.value || ''}
                                                                        onChange={(e) => handleSectionChange(selectedPageIndex, section.id, 'value', e.target.value)}
                                                                        disabled={!editableValue}
                                                                        style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px' }}
                                                                    >
                                                                        {ICON_PRESETS.map((opt) => (
                                                                            <option key={opt} value={opt}>{opt}</option>
                                                                        ))}
                                                                    </select>
                                                                    <input
                                                                        type="text"
                                                                        value={section.value || ''}
                                                                        onChange={(e) => handleSectionChange(selectedPageIndex, section.id, 'value', e.target.value)}
                                                                        disabled={!editableValue}
                                                                        style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px' }}
                                                                    />
                                                                </div>
                                                            ) : key || !shouldUseRichEditor(section) ? (
                                                                <textarea
                                                                    value={section.value || ''}
                                                                    onChange={(e) => handleSectionChange(selectedPageIndex, section.id, 'value', e.target.value)}
                                                                    disabled={!editableValue}
                                                                    rows={4}
                                                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', lineHeight: '1.4', resize: 'vertical' }}
                                                                />
                                                            ) : (
                                                                <QuillEditor
                                                                    id={`editor-${section.id}`}
                                                                    value={bbcodeToHtmlForEditor(section.value || '')}
                                                                    onChange={(val: string) => handleSectionChange(selectedPageIndex, section.id, 'value', val)}
                                                                    readOnly={!editableValue}
                                                                />
                                                            )}
                                                            {hasUrlValue && (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '0.75rem' }}>
                                                                    <Globe size={14} style={{ color: '#94a3b8' }} />
                                                                    <input
                                                                        type="text"
                                                                        value={toAbsoluteUrl(section.url || '')}
                                                                        onChange={(e) => handleSectionChange(selectedPageIndex, section.id, 'url', e.target.value)}
                                                                        onBlur={() => normalizeSectionUrl(selectedPageIndex, section.id)}
                                                                        disabled={!editableUrl}
                                                                        placeholder="URL (Məs: /about veya https://...)"
                                                                        style={{ fontSize: '12px', padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', flex: 1 }}
                                                                    />
                                                                </div>
                                                            )}
                                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.9rem' }}>
                                                                {!hasUrlValue && editableUrl && (
                                                                    <button
                                                                        title="Link əlavə et"
                                                                        onClick={() => handleSectionChange(selectedPageIndex, section.id, 'url', `${window.location.origin}/`)}
                                                                        style={{ background: '#fff', border: '1px solid #dbeafe', color: '#2563eb', borderRadius: '8px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '12px' }}
                                                                    >
                                                                        <Globe size={12} /> Link əlavə et
                                                                    </button>
                                                                )}
                                                                <button
                                                                    title="Yuxarı daşı"
                                                                    onClick={() => moveField('text', section.id, 'up')}
                                                                    disabled={!canMoveUp}
                                                                    style={{ background: '#fff', border: '1px solid #e2e8f0', color: canMoveUp ? '#334155' : '#cbd5e1', borderRadius: '8px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6, cursor: canMoveUp ? 'pointer' : 'not-allowed', fontSize: '12px' }}
                                                                >
                                                                    <ChevronUp size={12} /> Yuxarı
                                                                </button>
                                                                <button
                                                                    title="Aşağı daşı"
                                                                    onClick={() => moveField('text', section.id, 'down')}
                                                                    disabled={!canMoveDown}
                                                                    style={{ background: '#fff', border: '1px solid #e2e8f0', color: canMoveDown ? '#334155' : '#cbd5e1', borderRadius: '8px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6, cursor: canMoveDown ? 'pointer' : 'not-allowed', fontSize: '12px' }}
                                                                >
                                                                    <ChevronDown size={12} /> Aşağı
                                                                </button>
                                                                {deletable && (
                                                                    <button
                                                                        className="field-delete-btn"
                                                                        onClick={() => removeField('text', section.id)}
                                                                        style={{ background: '#fff', border: '1px solid #fee2e2', color: '#ef4444', borderRadius: '8px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '12px' }}
                                                                    >
                                                                        <Trash2 size={12} /> Sil
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>

                                    <div className="field-group">
                                        <div className="field-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <label><ImageIcon size={16} /> Bölmədəki Şəkillər</label>
                                            <button className="add-field-minimal" onClick={() => addField('image')}>
                                                <Plus size={14} /> Yeni Şəkil Yeri
                                            </button>
                                        </div>
                                        {displayedImages.length > 0 && (
                                            <div style={{ marginBottom: '1rem' }}>
                                                <div style={{ fontSize: '12px', fontWeight: 800, color: '#64748b', marginBottom: '8px' }}>
                                                    Komponent Daxili Önizləmə (Sıra ilə)
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
                                                    {displayedImages.map((img, idx) => (
                                                        <div key={`preview-${img.id}`} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', background: '#fff' }}>
                                                            <div style={{ height: '84px', background: '#f8fafc' }}>
                                                                {img.path ? (
                                                                    <img src={img.path} alt={img.alt || `Preview ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                ) : (
                                                                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '11px' }}>
                                                                        Şəkil yoxdur
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div style={{ padding: '6px 8px', fontSize: '10px', color: '#475569', fontWeight: 700 }}>
                                                                #{idx + 1} • {img.id}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        <div className="images-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.5rem' }}>
                                            {displayedImages.length > 0 ? (
                                                displayedImages.map((img, visibleIndex) => {
                                                    const realImages = currentPage?.images || [];
                                                    const realIndex = realImages.findIndex(i => i.id === img.id);
                                                    const canMoveUp = realIndex > 0;
                                                    const canMoveDown = realIndex >= 0 && realIndex < realImages.length - 1;
                                                    return (
                                                    <div key={img.id} className="image-edit-card" style={{ border: '1px solid #eee', borderRadius: '12px', overflow: 'hidden', background: '#fff', position: 'relative' }}>
                                                        <button
                                                            className="field-delete-btn"
                                                            onClick={() => removeField('image', img.id)}
                                                            style={{ position: 'absolute', right: '8px', top: '8px', zIndex: 10, background: 'rgba(255,255,255,0.9)', border: '1px solid #fee2e2', color: '#ef4444', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                        <div style={{ position: 'absolute', right: '40px', top: '8px', zIndex: 10, display: 'flex', gap: '6px' }}>
                                                            <button
                                                                title="Yuxarı daşı"
                                                                onClick={() => moveField('image', img.id, 'up')}
                                                                disabled={!canMoveUp}
                                                                style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid #e2e8f0', color: canMoveUp ? '#334155' : '#cbd5e1', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: canMoveUp ? 'pointer' : 'not-allowed' }}
                                                            >
                                                                <ChevronUp size={12} />
                                                            </button>
                                                            <button
                                                                title="Aşağı daşı"
                                                                onClick={() => moveField('image', img.id, 'down')}
                                                                disabled={!canMoveDown}
                                                                style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid #e2e8f0', color: canMoveDown ? '#334155' : '#cbd5e1', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: canMoveDown ? 'pointer' : 'not-allowed' }}
                                                            >
                                                                <ChevronDown size={12} />
                                                            </button>
                                                        </div>
                                                        <div style={{ height: '120px', background: '#f8fafc', position: 'relative', overflow: 'hidden' }}>
                                                            {img.path && (img.path.startsWith('http') || img.path.startsWith('/')) ? (
                                                                <img src={img.path} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            ) : (
                                                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}>
                                                                    <ImageIcon size={32} style={{ opacity: 0.1 }} />
                                                                    <span style={{ fontSize: '10px', color: '#999', position: 'absolute', bottom: '10px' }}>Yol yoxdur</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div style={{ padding: '0.75rem' }}>
                                                            <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, marginBottom: '6px' }}>
                                                                Sıra: {visibleIndex + 1}
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '4px' }}>
                                                                <input
                                                                    type="text"
                                                                    placeholder="Resur yolu..."
                                                                    value={img.path}
                                                                    onChange={(e) => {
                                                                        if (selectedPageIndex < 0 || selectedPageIndex >= pages.length) return;
                                                                        const newPages = [...pages];
                                                                        const targetPage = newPages[selectedPageIndex];
                                                                        if (!targetPage) return;
                                                                        const realIdx = targetPage.images.findIndex(i => i.id === img.id);
                                                                        if (realIdx !== -1) {
                                                                            targetPage.images[realIdx].path = e.target.value;
                                                                            setPages(newPages);
                                                                        }
                                                                    }}
                                                                    style={{ fontSize: '0.75rem', flex: 1, padding: '0.4rem', border: '1px solid #eee', borderRadius: '4px' }}
                                                                />
                                                                <button
                                                                    onClick={() => openImageSelector(selectedPageIndex, img.id)}
                                                                    title="Sistemdən seç"
                                                                    style={{ padding: '0 8px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: 'pointer' }}
                                                                >
                                                                    <Globe size={14} />
                                                                </button>
                                                                <div style={{ position: 'relative' }}>
                                                                    <input
                                                                        type="file"
                                                                        id={`file-up-${img.id}`}
                                                                        style={{ display: 'none' }}
                                                                        accept="image/*"
                                                                        onChange={(e) => handleFileUpload(e, selectedPageIndex, img.id)}
                                                                    />
                                                                    <button
                                                                        onClick={() => document.getElementById(`file-up-${img.id}`)?.click()}
                                                                        title="Kompüterdən yüklə"
                                                                        style={{ padding: '0 8px', height: '100%', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                                    >
                                                                        <Plus size={14} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <input
                                                                type="text"
                                                                placeholder="Alt mətni..."
                                                                value={img.alt}
                                                                onChange={(e) => handleImageAltChange(selectedPageIndex, img.id, e.target.value)}
                                                                style={{ fontSize: '0.75rem', width: '100%', padding: '0.4rem', border: '1px solid #eee', borderRadius: '4px' }}
                                                            />
                                                        </div>
                                                    </div>
                                                )})) : (
                                                <div className="empty-fields-tip" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                                                    {searchTerm ? 'Sorğuya uyğun şəkil tapılmadı.' : 'Bu bölmədə redaktə ediləcək şəkil yoxdur.'}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="field-group">
                                        <label><ImageIcon size={16} /> Yeni Şəkil Yüklə</label>
                                        <div className="upload-dropzone">
                                            <Plus size={24} />
                                            <p>Şəkil yükləmək üçün seçin</p>
                                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                                <button className="btn-secondary" onClick={() => {
                                                    const input = document.createElement('input');
                                                    input.type = 'file';
                                                    input.accept = 'image/*';
                                                    input.onchange = async (e) => {
                                                        const file = (e.target as HTMLInputElement).files?.[0];
                                                        if (!file) return;
                                                        const url = await uploadImage(file);
                                                        if (url && selectedPageIndex >= 0 && selectedPageIndex < pages.length) {
                                                            const newPages = [...pages];
                                                            const targetPage = newPages[selectedPageIndex];
                                                            if (targetPage) {
                                                                const newId = `img-${targetPage.images.length}-${Date.now()}`;
                                                                targetPage.images.push({ id: newId, path: url, alt: '', type: 'local' });
                                                                setPages(newPages);
                                                                toast.success('Yeni şəkil əlavə edildi');
                                                            }
                                                        }
                                                    };
                                                    input.click();
                                                }}>Cihazdan Yüklə</button>
                                                <button className="btn-secondary" onClick={() => {
                                                    const dummyId = `img-${(currentPage.images || []).length}`;
                                                    setActiveImageField({ pageIdx: selectedPageIndex, imgId: dummyId }); // Temporary for next add
                                                    setIsAddingNewFromSystem(true);
                                                    setIsImageSelectorOpen(true);
                                                }}>Kitabxanadan Seç</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', gap: '1rem' }}>
                                <Layout size={48} style={{ opacity: 0.2 }} />
                                <p>Redaktə etmək üçün sol tərəfdən bir komponent seçin.</p>
                            </div>
                        )}
                    </main>
                </div>
            )
            }

            {
                isModalOpen && (
                    <div className="modal-overlay">
                        <div className="modal-card fade-in">
                            <div className="modal-header">
                                <h3>Yeni Bölmə Əlavə Et</h3>
                                <button onClick={() => setIsModalOpen(false)}><X size={20} /></button>
                            </div>
                            <div className="modal-body">
                                <div className="field-group">
                                    <label>Bölmə Başlığı</label>
                                    <input
                                        type="text"
                                        value={newSectionTitle}
                                        onChange={(e) => setNewSectionTitle(e.target.value)}
                                        placeholder="Məs: Xidmətlərimiz, Kampaniyalar..."
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>Ləğv et</button>
                                <button className="btn-primary" onClick={addNewSection}>Əlavə et</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                isImageSelectorOpen && (
                    <div className="modal-overlay">
                        <div className="modal-card fade-in" style={{ maxWidth: '800px' }}>
                            <div className="modal-header">
                                <h3>Sistem Şəkilləri</h3>
                                <button onClick={() => setIsImageSelectorOpen(false)}><X size={20} /></button>
                            </div>
                            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                                <div className="image-selector-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '1rem' }}>
                                    {allAvailableImages.length > 0 ? allAvailableImages.map((path, idx) => (
                                        <div
                                            key={idx}
                                            className="selector-image-card"
                                            onClick={() => selectImage(path)}
                                            style={{ cursor: 'pointer', border: '2px solid #f1f5f9', borderRadius: '12px', overflow: 'hidden', transition: 'all 0.2s' }}
                                        >
                                            <div style={{ aspectRatio: '1/1', background: '#f8fafc' }}>
                                                <img src={path} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>
                                            <div style={{ padding: '0.5rem', fontSize: '10px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' }}>
                                                {path.split('/').pop()}
                                            </div>
                                        </div>
                                    )) : (
                                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                                            Sistemdə heç bir şəkil tapılmadı.
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn-secondary" onClick={() => setIsImageSelectorOpen(false)}>Bağla</button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default VisualEditor;
