# Error Logging Changes Documentation

This document outlines the `DEBUG` and `console.error` logging statements added to the codebase to aid in diagnosing various issues, particularly related to sitemap fetching and WordPress publishing.

## Files Modified for Logging:

### 1. `App.tsx`
*   **Purpose:** To trace the `selectedClient` ID, and the `externalSitemapUrls` and `generatedBlogPostUrls` associated with it, as well as updates to the client list.
*   **Added Logs:**
    *   `console.log("DEBUG: App.tsx - Selected Client ID:", client?.id, "External Sitemap URLs:", client?.externalSitemapUrls, "Generated Blog Post URLs:", client?.generatedBlogPostUrls);`
        *   **Location:** Inside the `useMemo` hook for `selectedClient`.
        *   **Purpose:** Provides a comprehensive view of the selected client's sitemap and generated URLs whenever the `selectedClient` object is re-evaluated.
    *   `console.log("DEBUG: App.tsx - Updated Clients after fetching generated blog post URLs:", updatedClients);`
        *   **Location:** Inside the `useEffect` that fetches `generatedBlogPostUrls` from the backend.
        *   **Purpose:** Confirms when the `clients` state is updated with new `generatedBlogPostUrls`.
    *   `console.log("DEBUG: App.tsx - Updated Clients after fetching external sitemap URLs:", updatedClients);`
        *   **Location:** Inside the `useEffect` that fetches `externalSitemapUrls` from the backend (this `useEffect` was later removed to fix an infinite loop, but the log was present during debugging).
        *   **Purpose:** Confirmed when the `clients` state was updated with new `externalSitemapUrls`.

### 2. `components/ClientForm.tsx`
*   **Purpose:** To trace the `sitemapUrl` input and the `sitemapUrls` extracted by the `useSitemap` hook.
*   **Added Logs:**
    *   `console.log("DEBUG: ClientForm.tsx - useEffect - existingClient ID:", existingClient?.id, "sitemapUrl from existingClient:", existingClient?.sitemapUrl);`
        *   **Location:** Inside the `useEffect` that initializes `formData`.
        *   **Purpose:** Shows the `sitemapUrl` value when the form is opened or an existing client is loaded.
    *   `console.log("DEBUG: ClientForm.tsx - useEffect - formData.sitemapUrl after setFormData:", formData.sitemapUrl);`
        *   **Location:** Inside the `useEffect` that initializes `formData`.
        *   **Purpose:** Shows the `sitemapUrl` value after `setFormData` is called.
    *   `console.log("DEBUG: ClientForm.tsx - handleSubmit - formData.sitemapUrl:", formData.sitemapUrl);`
        *   **Location:** Inside the `handleSubmit` function.
        *   **Purpose:** Confirms the `sitemapUrl` value being submitted with the form.
    *   `console.log("DEBUG: ClientForm.tsx - handleSubmit - sitemapUrls from useSitemap:", sitemapUrls);`
        *   **Location:** Inside the `handleSubmit` function.
        *   **Purpose:** Shows the `sitemapUrls` array obtained from the `useSitemap` hook at the time of form submission.

### 3. `components/ClientManager.tsx`
*   **Purpose:** To trace the `Client` object being saved, specifically its `externalSitemapUrls`.
*   **Added Logs:**
    *   `console.log("DEBUG: ClientManager.tsx - Saving Client ID:", clientToSave.id, "External Sitemap URLs:", clientToSave.externalSitemapUrls);`
        *   **Location:** Inside the `handleSaveClient` function.
        *   **Purpose:** Confirms the `externalSitemapUrls` that are being saved to the `clients` state (and thus to local storage).

### 4. `hooks/useSitemap.ts`
*   **Purpose:** To trace the sitemap URL being processed and the raw response content from the backend.
*   **Added Logs:**
    *   `console.log("DEBUG: useSitemap - sitemapUrl received:", sitemapUrl);`
        *   **Location:** At the beginning of the `useEffect` hook.
        *   **Purpose:** Shows the `sitemapUrl` that the hook is attempting to fetch.
    *   `console.log("DEBUG: useSitemap - Raw response text from backend:", text);`
        *   **Location:** After fetching the sitemap content from the backend and converting it to text.
        *   **Purpose:** Displays the raw XML content received from the backend's `/api/sitemap-fetch` endpoint, crucial for verifying the content of the sitemap.
    *   `console.log("DEBUG: useSitemap - Extracted URLs:", extractedUrls);`
        *   **Location:** After parsing the XML and extracting the URLs.
        *   **Purpose:** Shows the array of URLs that were successfully extracted from the sitemap XML.

### 5. `services/geminiService.ts`
*   **Purpose:** To trace the various stages of blog post generation and the values of key variables, including the featured image.
*   **Added Logs:**
    *   `console.log("DEBUG: generateFullBlog - Topic found:", topic);`
        *   **Location:** After `findTrendingTopic`.
        *   **Purpose:** Confirms the trending topic identified by the AI.
    *   `console.log("DEBUG: generateFullBlog - Title, angle, keywords generated:", { title, angle, keywords });`
        *   **Location:** After `generateBlogDetails`.
        *   **Purpose:** Shows the generated title, angle, and keywords.
    *   `console.log("DEBUG: generateFullBlog - Outline generated:", outline);`
        *   **Location:** After `generateOutline`.
        *   **Purpose:** Displays the generated blog post outline.
    *   `console.log("DEBUG: generateFullContent - Client ID:", client.id, "Client Name:", client.name, "External Sitemap URLs:", client.externalSitemapUrls);`
        *   **Location:** At the beginning of `generateFullContent`.
        *   **Purpose:** Confirms the client details and the `externalSitemapUrls` being used for content generation.
    *   `console.log("DEBUG: generateFullContent - Prompt sent to Gemini:", prompt);`
        *   **Location:** Before sending the prompt to Gemini for full content generation.
        *   **Purpose:** Shows the complete prompt used for generating the blog post content, including client-specific details and sitemap URLs.
    *   `console.log("DEBUG: generateFullBlog - Full content generated.");`
        *   **Location:** After `generateFullContent`.
        *   **Purpose:** Indicates that the main blog content has been generated.
    *   `console.log("DEBUG: generateFullBlog - Featured Image Base64:", featuredImageBase64 ? "Generated" : "Not Generated");`
        *   **Location:** After `generateFeaturedImage`.
        *   **Purpose:** Confirms whether a featured image was successfully generated (and provides a simple indication of its presence).
    *   `console.log("DEBUG: generateFullBlog - Title for slug:", title);`
        *   **Location:** Before `createSlug`.
        *   **Purpose:** Shows the title used to generate the slug.
    *   `console.log("DEBUG: createSlug - Input title:", title);`
        *   **Location:** At the beginning of `createSlug`.
        *   **Purpose:** Shows the input title for slug generation.
    *   `console.log("DEBUG: createSlug - Output slug:", slug);`
        *   **Location:** After slug generation.
        *   **Purpose:** Displays the generated slug.
    *   `console.log("DEBUG: generateFullBlog - Generated URL:", newBlogPostUrl);`
        *   **Location:** After generating the new blog post URL.
        *   **Purpose:** Shows the full URL for the new blog post.
    *   `console.error("DEBUG: generateFullBlog - An error occurred during blog generation:", error);`
        *   **Location:** In the `catch` block of `generateFullBlog`.
        *   **Purpose:** Catches and logs any errors that occur during the overall blog generation process.

### 6. `services/wordpressService.ts`
*   **Purpose:** To provide detailed error messages during WordPress media upload and post creation failures.
*   **Added Logs:**
    *   `console.error("DEBUG: WordPress Image Upload Error:", { status: response.status, statusText: response.statusText, errorData });`
        *   **Location:** In the `catch` block of `uploadFeaturedImage`.
        *   **Purpose:** Logs the HTTP status, status text, and any error data returned by the WordPress API when image upload fails.
    *   `console.error("DEBUG: WordPress Post Creation Error:", { status: response.status, statusText: response.statusText, errorData });`
        *   **Location:** In the `catch` block of `publishToWordPress`.
        *   **Purpose:** Logs the HTTP status, status text, and any error data returned by the WordPress API when post creation fails.

This comprehensive logging strategy has been instrumental in identifying and resolving issues related to data flow, sitemap processing, and external API interactions.