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
    console.log("DEBUG: useSitemap - sitemapUrl received:", sitemapUrl); // Added log
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
        const response = await fetch(`http://localhost:3001/api/sitemap-fetch?sitemapUrl=${encodeURIComponent(sitemapUrl)}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        console.log("DEBUG: useSitemap - Raw response text from backend:", text);

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
        console.log("DEBUG: useSitemap - Extracted URLs:", extractedUrls); // Added log
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
