import { GoogleGenAI, Type } from "@google/genai";
import { Client, BlogPost } from "../types";

const API_KEY = import.meta.env.VITE_API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set.");
}

function getAiInstance() {
  return new GoogleGenAI({ apiKey: API_KEY });
}

const textModel = "gemini-2.5-flash";
const imageModel = "imagen-3.0-generate-002";

async function findTrendingTopic(client: Client): Promise<string> {
    const ai = getAiInstance();
    const prompt = `
      // Client ID: ${client.id}
      Using Google Search, find one current and highly relevant trending topic, news story, or popular question related to the '${client.industry}' industry. Provide only the topic name or headline.
      Consider the existing content on the client's website (from the sitemap) to avoid duplicate topics and find relevant areas for internal linking.
      Existing sitemap URLs:
      ${client.externalSitemapUrls && client.externalSitemapUrls.length > 0 ? client.externalSitemapUrls.join('\n') : 'No external sitemap URLs available.'}
    `;
    const response = await ai.models.generateContent({
        model: textModel,
        contents: prompt,
        config: {
            tools: [{googleSearch: {}}],
        },
    });
    return response.text.trim();
}

const blogDetailsSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "A compelling, SEO-friendly blog post title." },
    angle: { type: Type.STRING, description: "A unique angle or perspective for the article." },
    keywords: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "A list of 5-7 relevant SEO keywords."
    },
  },
  required: ["title", "angle", "keywords"],
};

async function generateBlogDetails(client: Client, topic: string): Promise<{ title: string; angle: string; keywords: string[] }> {
  const ai = getAiInstance();
  const prompt = `
    // Client ID: ${client.id}
    You are an expert content strategist for a company in the '${client.industry}' industry.
    Company's unique value proposition: '${client.uniqueValueProp}'
    Company's brand voice: '${client.brandVoice}'
    Company's content strategy: '${client.contentStrategy}'
    We want to write a blog post about the following topic: '${topic}'

    Consider the existing content on the client's website (from the sitemap) to ensure the new blog post is unique and provides good internal linking opportunities.
    Existing sitemap URLs:
    ${client.externalSitemapUrls && client.externalSitemapUrls.length > 0 ? client.externalSitemapUrls.join('\n') : 'No external sitemap URLs available.'}

    Please generate a compelling, SEO-friendly blog post title, a unique angle for the article, and a list of 5-7 relevant SEO keywords.
  `;


  const response = await ai.models.generateContent({
    model: textModel,
    contents: prompt,
    config: {
        responseMimeType: "application/json",
        responseSchema: blogDetailsSchema,
    }
  });
  
  const jsonResponse = JSON.parse(response.text);
  return jsonResponse;
}

async function generateOutline(title: string, angle: string): Promise<string> {
    console.log("DEBUG: generateOutline - Input Title:", title); // Added log
    console.log("DEBUG: generateOutline - Input Angle:", angle); // Added log
    const ai = getAiInstance();
    const prompt = `
        Based on the following title and angle, create a detailed blog post outline.
        Title: '${title}'
        Angle: '${angle}'

        The outline should have a clear hierarchical structure with H2 and H3 headings. Include an introduction and a conclusion. The blog title itself will be the H1, so do not include it in the outline. Output only the outline.
    `;
    console.log("DEBUG: generateOutline - Prompt sent to Gemini:", prompt); // Added log
     const response = await ai.models.generateContent({
        model: textModel,
        contents: prompt,
    });
    const outline = response.text.trim();
    console.log("DEBUG: generateOutline - Generated Outline:", outline); // Added log
    return outline;
}

async function generateFullContent(title: string, outline: string, client: Client): Promise<string> {
    console.log("DEBUG: generateFullContent - Client ID:", client.id, "Client Name:", client.name, "External Sitemap URLs:", client.externalSitemapUrls); // Added log
    const ai = getAiInstance();
    const prompt = `
        // Client ID: ${client.id}
        Write a complete blog post in HTML format based on the provided title and outline.
        Title (H1): '${title}'
        Outline:
        ${outline}

        Follow these instructions:
        - Adhere to the client's content strategy: '${client.contentStrategy}'.
        - Elaborate on each point in the outline. Use <p> tags for paragraphs.
        - Use <h2> and <h3> tags exactly as specified in the outline.
        - Do NOT include the H1 title in the generated content; it will be added separately.
        - Write in the following brand voice: '${client.brandVoice}'.
        - Naturally incorporate the company's unique value proposition where relevant: '${client.uniqueValueProp}'.
        - Ensure the tone is confident and expert. Avoid apologetic language or AI self-references.
        - The content must be original and engaging.
        - **IMPORTANT:** Include external HTML hyperlinks to relevant, high-authority referencing material where appropriate.
        - **CRITICAL:** You MUST include exactly 2-4 internal HTML hyperlinks within the generated content. Each link MUST point to a DIFFERENT URL from the provided list. The anchor text for each link MUST be naturally and contextually integrated into the surrounding prose. Prioritize linking to live and published content if possible. Select these links from the following list of URLs:
          ${client.externalSitemapUrls && client.externalSitemapUrls.length > 0 ? client.externalSitemapUrls.join('\n') : 'No external sitemap URLs available. If no URLs are available, do NOT include internal links.'}
    `;
    console.log("DEBUG: generateFullContent - Prompt sent to Gemini:", prompt); // Added log
    const response = await ai.models.generateContent({
        model: textModel,
        contents: prompt
    });

    let content = response.text.trim().replace(/^```html|```$/g, '').trim();

    // const headings = content.match(/<h[23]>(.*?)<\/h[23]>/g) || [];
    // let imageCount = 0;

    // for (const heading of headings) {
    //     if (imageCount >= 2) break;

    //     const headingText = heading.replace(/<\/?h[23]>/g, '');
    //     try {
    //         const imageBase64 = await generateInBodyImage(headingText);
    //         const imageTag = `<img src="data:image/jpeg;base64,${imageBase64}" alt="${headingText}" />`;
    //         content = content.replace(heading, `${heading}\n${imageTag}`);
    //         imageCount++;
    //     } catch (error) {
    //         console.error(`Failed to generate image for heading: ${headingText}`, error);
    //     }
    // }

    const faqSection = await generateFaqSection(title, content);
    content += faqSection;

    return content;
}

const faqSchema = {
  type: Type.OBJECT,
  properties: {
    faqs: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING, description: "A frequently asked question related to the blog post." },
          answer: { type: Type.STRING, description: "The answer to the question." },
        },
        required: ["question", "answer"],
      },
    },
  },
  required: ["faqs"],
};

async function generateFaqSection(title: string, content: string): Promise<string> {
    const ai = getAiInstance();
    const prompt = `
        Based on the following blog post title and content, generate a list of at least 3 frequently asked questions (FAQs) with their answers.

        Title: ${title}

        Content:
        ${content.substring(0, 2000)}...

        Return the FAQs in a JSON object that conforms to the provided schema.
    `;

    const response = await ai.models.generateContent({
        model: textModel,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: faqSchema,
        }
    });

    const { faqs } = JSON.parse(response.text);

    const faqPageSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqs.map((faq: { question: string; answer: string }) => ({
            "@type": "Question",
            "name": faq.question,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.answer
            }
        }))
    };

    let html = `
        <div class="faq-section">
            <h2>Frequently Asked Questions</h2>
    `;

    faqs.forEach((faq: { question: string; answer: string }) => {
        html += `
            <h3>${faq.question}</h3>
            <p>${faq.answer}</p>
        `;
    });

    html += `
        </div>
        <script type="application/ld+json">
            ${JSON.stringify(faqPageSchema)}
        </script>
    `;

    return html;
}

async function generateInBodyImage(prompt: string): Promise<string> {
    const ai = getAiInstance();
    const fullPrompt = `${prompt}. A cinematic, photorealistic, high-quality image, no text or words on the image.`;
    console.log("DEBUG: generateInBodyImage - Prompt:", fullPrompt); // Added log
    const response = await ai.models.generateImages({
        model: imageModel,
        prompt: fullPrompt,
        config: {
            numberOfImages: 1,
            aspectRatio: "16:9",
            outputMimeType: 'image/jpeg',
        }
    });
    
    if (!response.generatedImages || response.generatedImages.length === 0) {
        throw new Error("Image generation failed to produce an image.");
    }
    return response.generatedImages[0].image.imageBytes;
}

async function generateFeaturedImage(title: string, angle: string): Promise<string> {
    const ai = getAiInstance();
    const prompt = `${title}. ${angle}. A cinematic, photorealistic, high-quality image, no text or words on the image.`;
    console.log("DEBUG: generateFeaturedImage - Prompt:", prompt); // Added log
    const response = await ai.models.generateImages({
        model: imageModel,
        prompt: prompt,
        config: {
            numberOfImages: 1,
            aspectRatio: "16:9",
            outputMimeType: 'image/jpeg',
        }
    });
    
    if (!response.generatedImages || response.generatedImages.length === 0) {
        throw new Error("Image generation failed to produce an image.");
    }
    return response.generatedImages[0].image.imageBytes;
}

function createSlug(title: string): string {
  console.log("DEBUG: createSlug - Input title:", title); // Added log
  const slug = title
    .toLowerCase()
    .replace(/ /g, '-')
    .replace(/[^a-z0-9-]/g, ''); // Corrected regex
  console.log("DEBUG: createSlug - Output slug:", slug); // Added log
  return slug;
}

export async function generateFullBlog(client: Client, updateProgress: (message: string) => void): Promise<BlogPost> {
    try {
        updateProgress("Finding trending topic...");
        const topic = await findTrendingTopic(client);
        console.log("DEBUG: generateFullBlog - Topic found:", topic); // Added log

        updateProgress(`Generating title, angle, and keywords for: \"${topic}\"...
`);
        const { title, angle, keywords } = await generateBlogDetails(client, topic);
        console.log("DEBUG: generateFullBlog - Title, angle, keywords generated:", { title, angle, keywords }); // Added log

        updateProgress("Creating blog post outline...");
        const outline = await generateOutline(title, angle);
        console.log("DEBUG: generateFullBlog - Outline generated:", outline); // Added log

        updateProgress("Writing full blog post content...");
        const content = await generateFullContent(title, outline, client);
        console.log("DEBUG: generateFullBlog - Full content generated."); // Added log

        updateProgress("Generating featured image...");
        const featuredImageBase64 = await generateFeaturedImage(title, angle);
        console.log("DEBUG: generateFullBlog - Featured Image Base64:", featuredImageBase64 ? "Generated" : "Not Generated"); // Added log
        
        updateProgress("Adding new blog post to sitemap...");
        console.log("DEBUG: generateFullBlog - Title for slug:", title); // Added log
        const newBlogPostUrl = `/${createSlug(title)}`;
        console.log("DEBUG: generateFullBlog - Generated URL:", newBlogPostUrl); // Added log
        try {
            await fetch(`http://localhost:3001/api/clients/${client.id}/sitemap-urls`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: newBlogPostUrl }),
            });

            // Refetch sitemap URLs after adding new blog post
            const response = await fetch(`http://localhost:3001/api/clients/${client.id}/sitemap-urls`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const updatedSitemapUrls = await response.json();
            client.generatedBlogPostUrls = updatedSitemapUrls; // Update the client object with the latest generated blog post URLs

        } catch (error) {
            console.error("Failed to add new blog post to sitemap:", error);
            // We don't want to block the whole process if this fails
        }

        updateProgress("Finalizing post...");

        return { title, angle, keywords, outline, content, featuredImageBase64 };
    } catch (error) {
        console.error("DEBUG: generateFullBlog - An error occurred during blog generation:", error); // Added log
        throw error; // Re-throw to propagate the error
    }
}