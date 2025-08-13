import { useState, useEffect } from 'react';

interface SitemapResult {
  urls: string[];
  loading: boolean;
  error: string | null;
}

const useSitemap = (sitemapUrl: string | undefined): SitemapResult => {
  const [urls, setUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSitemap = async () => {
      if (!sitemapUrl) {
        setUrls([]);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setUrls([]);

      try {
        // Construct the proxied URL
        const url = new URL(sitemapUrl);
        const proxiedSitemapUrl = `/sitemap-proxy${url.pathname}${url.search}`;
        const response = await fetch(proxiedSitemapUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();

        // Parse XML to extract URLs
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "application/xml");

        const errorNode = xmlDoc.querySelector('parsererror');
        if (errorNode) {
          throw new Error('Failed to parse XML: ' + errorNode.textContent);
        }

        const locElements = xmlDoc.querySelectorAll('loc');
        const extractedUrls: string[] = [];
        locElements.forEach(loc => {
          if (loc.textContent) {
            extractedUrls.push(loc.textContent);
          }
        });
        setUrls(extractedUrls);
      } catch (e: any) {
        console.error("Error fetching or parsing sitemap:", e);
        setError(e.message || "Failed to fetch or parse sitemap.");
      } finally {
        setLoading(false);
      }
    };

    fetchSitemap();
  }, [sitemapUrl]);

  return { urls, loading, error };
};

export default useSitemap;
