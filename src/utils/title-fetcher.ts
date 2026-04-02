import { requestUrl, RequestUrlParam } from 'obsidian';
import { decodeHtmlEntities } from './html-entities';

/**
 * Fetches the HTML title from a URL
 * Uses Obsidian's requestUrl API for proper CORS handling
 *
 * @param url - The URL to fetch title from
 * @param timeout - Maximum time to wait in milliseconds
 * @returns The page title, or null if fetch failed
 */
export async function fetchUrlTitle(
    url: string,
    timeout: number
): Promise<string | null> {
    if (!url || typeof url !== 'string') {
        return null;
    }

    const validProtocols = ['http:', 'https:'];
    try {
        const urlObj = new URL(url);
        if (!validProtocols.includes(urlObj.protocol)) {
            return null;
        }
    } catch {
        return null;
    }

    try {
        const options: RequestUrlParam = {
            url: url,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; ObsidianURLFormatter/1.0)'
            }
        };

        const fetchPromise = requestUrl(options);
        
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
                reject(new Error('Request timeout'));
            }, timeout);
        });

        const response = await Promise.race([fetchPromise, timeoutPromise]);

        const contentType = response.headers?.['content-type'] || '';
        if (!contentType.includes('text/html')) {
            return null;
        }

        const html = response.text;

        const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/is);
        if (!titleMatch || !titleMatch[1]) {
            return null;
        }

        let title = titleMatch[1].trim();

        title = decodeHtmlEntities(title);
        title = title.replace(/\s+/g, ' ');

        if (title.length > 500) {
            title = title.substring(0, 500) + '...';
        }

        return title || null;
    } catch (error) {
        if (error instanceof Error) {
            console.warn('URL Formatter: Title fetch failed:', error.message);
        }
        return null;
    }
}