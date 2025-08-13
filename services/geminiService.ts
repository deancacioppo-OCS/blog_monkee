
import { GoogleGenAI, Type } from "@google/genai";
import { Client, BlogPost } from "../types";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const textModel = "gemini-2.5-flash";
const imageModel = "imagen-3.0-generate-002";

async function findTrendingTopic(industry: string): Promise<string> {
    const prompt = `Using Google Search, find one current and highly relevant trending topic, news story, or popular question related to the '${industry}' industry. Provide only the topic name or headline.`;
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
  const prompt = `
    You are an expert content strategist for a company in the '${client.industry}' industry.
    Company's unique value proposition: '${client.uniqueValueProp}'
    Company's brand voice: '${client.brandVoice}'
    We want to write a blog post about the following topic: '${topic}'

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
    const prompt = `
        Based on the following title and angle, create a detailed blog post outline.
        Title: '${title}'
        Angle: '${angle}'

        The outline should have a clear hierarchical structure with H2 and H3 headings. Include an introduction and a conclusion. The blog title itself will be the H1, so do not include it in the outline. Output only the outline.
    `;
     const response = await ai.models.generateContent({
        model: textModel,
        contents: prompt,
    });
    return response.text.trim();
}

async function generateFullContent(title: string, outline: string, client: Client): Promise<string> {
    const prompt = `
        Write a complete blog post in HTML format based on the provided title and outline.
        Title (H1): '${title}'
        Outline:
        ${outline}

        Follow these instructions:
        - Elaborate on each point in the outline. Use <p> tags for paragraphs.
        - Use <h2> and <h3> tags exactly as specified in the outline.
        - Do NOT include the H1 title in the generated content; it will be added separately.
        - Write in the following brand voice: '${client.brandVoice}'.
        - Naturally incorporate the company's unique value proposition where relevant: '${client.uniqueValueProp}'.
        - Ensure the tone is confident and expert. Avoid apologetic language or AI self-references.
        - The content must be original and engaging.
        - **IMPORTANT:** Include external HTML hyperlinks to relevant, high-authority referencing material where appropriate.
        - **IMPORTANT:** Include at least two internal HTML hyperlinks to relevant pages/blogs on the client's website. Select these links from the following list of URLs:
          ${client.sitemapUrls && client.sitemapUrls.length > 0 ? client.sitemapUrls.join('\n') : 'No sitemap URLs available.'}
    `;
    const response = await ai.models.generateContent({
        model: textModel,
        contents: prompt
    });
    return response.text.trim().replace(/^```html|```$/g, '').trim();
}

async function generateFeaturedImage(title: string, angle: string): Promise<string> {
    const prompt = `${title}. ${angle}. A cinematic, photorealistic, high-quality image, no text or words on the image.`;
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

export async function generateFullBlog(client: Client, updateProgress: (message: string) => void): Promise<BlogPost> {
    updateProgress("Finding trending topic...");
    const topic = await findTrendingTopic(client.industry);

    updateProgress(`Generating title, angle, and keywords for: "${topic}"`);
    const { title, angle, keywords } = await generateBlogDetails(client, topic);

    updateProgress("Creating blog post outline...");
    const outline = await generateOutline(title, angle);

    updateProgress("Writing full blog post content...");
    const content = await generateFullContent(title, outline, client);

    updateProgress("Generating featured image...");
    const featuredImageBase64 = await generateFeaturedImage(title, angle);
    
    updateProgress("Finalizing post...");

    return { title, angle, keywords, outline, content, featuredImageBase64 };
}
