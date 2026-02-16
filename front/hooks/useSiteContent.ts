import { useState, useEffect } from 'react';

interface ContentSection {
    id: string;
    type: 'text' | 'image';
    label: string;
    value: string;
    url?: string;
}

interface ImageSection {
    id: string;
    path: string;
    alt: string;
    type: 'local' | 'remote';
}

interface PageContent {
    id: string;
    title: string;
    active?: boolean;
    sections: ContentSection[];
    images: ImageSection[];
}

let siteContentCache: PageContent[] | null = null;
let siteContentInFlight: Promise<PageContent[]> | null = null;

const normalizeContent = (data: any): PageContent[] => {
    if (!Array.isArray(data)) return [];
    return data.map((p: any) => ({
        id: String(p?.page_id || p?.id || '').toLowerCase(),
        title: p?.title || '',
        active: typeof p?.active === 'boolean' ? p.active : true,
        sections: Array.isArray(p?.sections) ? p.sections : [],
        images: Array.isArray(p?.images) ? p.images : []
    }));
};

const fetchSiteContentOnce = async (): Promise<PageContent[]> => {
    if (siteContentCache) return siteContentCache;
    if (siteContentInFlight) return siteContentInFlight;

    siteContentInFlight = (async () => {
        const response = await fetch('/api/site-content');
        if (!response.ok) throw new Error('Failed to fetch site content');
        const data = await response.json();
        const normalized = normalizeContent(data);
        siteContentCache = normalized;
        return normalized;
    })().finally(() => {
        siteContentInFlight = null;
    });

    return siteContentInFlight;
};

export const useSiteContent = (scopePageId?: string) => {
    const [content, setContent] = useState<PageContent[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const loadContent = async () => {
            try {
                if (siteContentCache) {
                    if (isMounted) setContent(siteContentCache);
                    return;
                }

                const mapped = await fetchSiteContentOnce();
                if (isMounted) setContent(mapped as any);
            } catch (err) {
                console.error('Failed to load site content from API:', err);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        loadContent();
        return () => {
            isMounted = false;
        };
    }, []);

    const getPage = (id: string) => {
        if (!id) return undefined;
        return (content as PageContent[]).find(p => p.id === id.toLowerCase());
    };

    const getText = (arg1: string, arg2?: string | number, arg3: string = '') => {
        let pageId: string | undefined;
        let sectionIdOrIndex: string | number;
        let defaultValue: string;

        if (scopePageId) {
            // Usage: getText(key, default)
            pageId = scopePageId;
            sectionIdOrIndex = arg1;
            defaultValue = (typeof arg2 === 'string' ? arg2 : '') || '';
        } else {
            // Usage: getText(pageId, key, default)
            pageId = arg1;
            sectionIdOrIndex = arg2 as string | number;
            defaultValue = arg3;
        }

        if (!pageId) return defaultValue;

        const page = getPage(pageId);
        if (!page) return defaultValue;
        const sections = Array.isArray(page.sections) ? page.sections : [];

        const section = typeof sectionIdOrIndex === 'number'
            ? sections[sectionIdOrIndex]
            : sections.find(s => s.id === sectionIdOrIndex);

        return section ? section.value : defaultValue;
    };

    const getImage = (arg1: string, arg2?: string | number, arg3: string = '') => {
        let pageId: string | undefined;
        let imageIdOrIndex: string | number;
        let defaultPath: string;

        if (scopePageId) {
            pageId = scopePageId;
            imageIdOrIndex = arg1;
            defaultPath = (typeof arg2 === 'string' ? arg2 : '') || '';
        } else {
            pageId = arg1;
            imageIdOrIndex = arg2 as string | number;
            defaultPath = arg3;
        }

        if (!pageId) return { path: defaultPath, alt: '' };

        const page = getPage(pageId);
        if (!page) return { path: defaultPath, alt: '' };
        const images = Array.isArray(page.images) ? page.images : [];

        const image = typeof imageIdOrIndex === 'number'
            ? images[imageIdOrIndex]
            : images.find(img => img.id === imageIdOrIndex);

        return image ? { path: image.path, alt: image.alt } : { path: defaultPath, alt: '' };
    };

    const getUrl = (arg1: string, arg2?: string | number, arg3: string = '') => {
        let pageId: string | undefined;
        let sectionIdOrIndex: string | number;
        let defaultUrl: string;

        if (scopePageId) {
            pageId = scopePageId;
            sectionIdOrIndex = arg1;
            defaultUrl = (typeof arg2 === 'string' ? arg2 : '') || '';
        } else {
            pageId = arg1;
            sectionIdOrIndex = arg2 as string | number;
            defaultUrl = arg3;
        }

        if (!pageId) return defaultUrl;

        const page = getPage(pageId);
        if (!page) return defaultUrl;
        const sections = Array.isArray(page.sections) ? page.sections : [];

        const section = typeof sectionIdOrIndex === 'number'
            ? sections[sectionIdOrIndex]
            : sections.find(s => s.id === sectionIdOrIndex);

        return section?.url || defaultUrl;
    };

    return { content, isLoading, getPage, getText, getImage, getUrl };
};
