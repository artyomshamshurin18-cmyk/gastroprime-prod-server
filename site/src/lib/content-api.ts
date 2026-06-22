// Content API utility for the marketing site
// Fetches content blocks from the backend API

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.gastroprime.ru/api';

export interface ContentBlock {
  id: number;
  type: 'PAGE_TEXT' | 'GALLERY' | 'REVIEW' | 'CASE' | 'FAQ' | 'SOLUTION';
  pageSlug: string | null;
  key: string;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  sortOrder: number;
  visible: boolean;
}

export interface ContentPhoto {
  id: number;
  galleryKey: string;
  filename: string;
  filepath: string;
  title: string | null;
  sortOrder: number;
  visible: boolean;
}

// Cache for blocks during a page's lifecycle
let blocksCache: ContentBlock[] | null = null;

export async function getContentBlocks(pageSlug?: string, type?: string): Promise<ContentBlock[]> {
  try {
    const params = new URLSearchParams();
    if (pageSlug) params.set('pageSlug', pageSlug);
    if (type) params.set('type', type);
    
    const url = `${API_BASE}/content/blocks?${params.toString()}`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error('Failed to fetch content blocks:', e);
    return [];
  }
}

export async function getContentPhotos(galleryKey?: string): Promise<ContentPhoto[]> {
  try {
    const params = new URLSearchParams();
    if (galleryKey) params.set('galleryKey', galleryKey);
    
    const url = `${API_BASE}/content/photos?${params.toString()}`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error('Failed to fetch content photos:', e);
    return [];
  }
}

/**
 * Get a single content block by pageSlug and key
 */
export async function getContentBlock(pageSlug: string, key: string): Promise<ContentBlock | null> {
  const blocks = await getContentBlocks(pageSlug);
  return blocks.find(b => b.key === key && b.visible) || null;
}

/**
 * Get all blocks for a page, grouped by key for easy access
 */
export async function getPageContent(pageSlug: string): Promise<Record<string, ContentBlock>> {
  const blocks = await getContentBlocks(pageSlug);
  const map: Record<string, ContentBlock> = {};
  for (const block of blocks) {
    if (block.visible) {
      map[block.key] = block;
    }
  }
  return map;
}
