import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-static';


export async function POST(req: Request) {
  try {
    const { topic, keywords } = await req.json();

    if (!topic) {
      return NextResponse.json({ success: false, error: 'Topic is required' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ success: false, error: 'Gemini API Key is not configured' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // Model initialization moved to retry loop below

    const today = new Date().toISOString().split('T')[0];

    const prompt = `
You are a SENIOR SEO STRATEGIST, TRAVEL JOURNALIST, and GOOGLE EEAT CONTENT EXPERT with 15 years of experience.

Your mission: Write the single best travel article on the internet for this topic that can outrank TripAdvisor, Lonely Planet, MakeMyTrip, Thrillophilia, and Booking.com.

TOPIC: ${topic}
${keywords ? `FOCUS KEYWORDS: ${keywords}` : ''}
DATE: ${today}

STRICT RULES (violation is unacceptable):
1. Write 100% human-like prose. No AI clichés. No "vibrant", "bustling", "nestled", "tapestry", "delve".
2. Use short paragraphs (2-4 sentences max). Use contractions. Sound like a seasoned traveler sharing tips with a friend.
3. Back up claims with specifics — exact prices in INR, real distances, real names of places.
4. Every section must add unique value a traveler cannot easily find elsewhere.
5. Follow Google EEAT: show genuine Experience, Expertise, Authoritativeness, Trustworthiness.
6. Use ALL sections below. Include comparison tables, cost tables, pro tips, common mistakes, and FAQs.
7. The article MUST be 1500–2500 words in the contentMarkdown field.
8. Return ONLY valid JSON. No markdown code fences. No extra text.

Return a single JSON object with this EXACT structure:

{
  "seo": {
    "title": "60 chars max. Include main keyword near start.",
    "metaDescription": "150-160 chars. Compelling with main keyword. Ends with benefit.",
    "focusKeyword": "primary keyword phrase",
    "secondaryKeywords": ["keyword2", "keyword3", "keyword4", "keyword5"],
    "slug": "url-friendly-slug-with-hyphens",
    "canonical": "https://tripdm.com/blog/[slug]",
    "ogTitle": "Social media optimized title",
    "ogDescription": "Social media description 1-2 sentences"
  },

  "article": {
    "title": "Full H1 article headline",
    "excerpt": "1-2 sentence hook for the reader. 120-160 chars.",
    "readingTime": "X min read",
    "category": "One of: Destinations | Travel Tips | Budget Travel | Luxury Travel | Adventure | India Travel | International Travel | Food & Culture | Travel Guides",
    "tableOfContents": [
      {"id": "section-id", "title": "Section Title", "level": 2}
    ],
    "contentMarkdown": "THE FULL ARTICLE IN MARKDOWN. Must be 3000-5000 words. Use ## H2 and ### H3 headings. Short paragraphs. Include ALL these sections:\n\n## Introduction\n## Quick Facts About [topic]\n## Best Time to Visit\n## Weather Guide (month-by-month table)\n## How to Reach [topic]\n## Getting Around\n## Top Things to Do\n## Hidden Gems & Off-the-Beaten-Path\n## Accommodation Guide\n## Where to Eat (local food guide)\n## Budget Breakdown (with INR tables)\n## Packing Checklist\n## Safety Tips & Common Mistakes\n## Nearby Attractions\n## TripDM Travel Packages CTA\n## FAQs\n## Conclusion"
  },

  "faq": [
    {
      "question": "Specific question a traveler would type into Google",
      "answer": "Direct, concise answer in 2-4 sentences. Featured snippet optimized."
    }
  ],

  "schema": {
    "article": {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "",
      "description": "",
      "author": {"@type": "Person", "name": "TripDM Travel Expert"},
      "publisher": {"@type": "Organization", "name": "TripDM", "url": "https://tripdm.com"},
      "datePublished": "${today}",
      "dateModified": "${today}"
    },
    "faq": {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": []
    },
    "breadcrumb": {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": []
    }
  },

  "internalLinks": [
    {"anchor": "link text", "url": "https://tripdm.com/relevant-page", "context": "Where to place this link in the article"}
  ],

  "callToAction": "Strong CTA paragraph encouraging readers to book a TripDM travel package with link to https://tripdm.com",

  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],

  "relatedTopics": ["Related article title 1", "Related article title 2", "Related article title 3"]
}

CRITICAL: The contentMarkdown MUST include clean, complete Markdown tables with valid headers and separator rows like:
| Month | Temp | Crowd | Verdict |
|-------|------|-------|---------|
| Jan   | 25°C | Low   | ✅ Best  |

And cost tables like:
| Item | Budget | Mid-Range | Luxury |
|------|--------|-----------|--------|
| Hotel/night | ₹800 | ₹2,500 | ₹8,000+ |

DO NOT break table rows into paragraph text. Always use pipe (|) characters for columns.
DO NOT use Unicode box-drawing characters (like ┌, ─, ┐, │, ├, ┤, └, ┘) or ASCII box art for lists. Always use standard Markdown lists (1. Item or - Item).

Include "💡 Pro Tip:" callouts throughout.
Include a "⚠️ Common Mistake:" section.
Include specific restaurant names, hotel names, viewpoints.
Make the CTA section naturally mention TripDM packages.

NOW GENERATE THE COMPLETE JSON FOR: "${topic}"
`;

    const tryModels = ['gemini-pro-latest', 'gemini-flash-latest', 'gemini-flash-lite-latest'];
    let result = null;
    let lastError = null;

    for (const modelName of tryModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.6,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 65536,
            responseMimeType: 'application/json',
          },
        });
        console.log(`Trying model: ${modelName}...`);
        result = await model.generateContent(prompt);
        console.log(`Successfully generated content using: ${modelName}`);
        break; // Success
      } catch (err: any) {
        console.warn(`Model ${modelName} failed:`, err.message);
        lastError = err;
      }
    }

    if (!result) {
      throw lastError || new Error('All AI models failed');
    }

    const response = await result.response;
    let text = response.text();

    // Aggressively clean AI output
    text = text
      .replace(/^```json\s*/m, '')
      .replace(/^```\s*/m, '')
      .replace(/```\s*$/m, '')
      .trim();

    // Find the JSON object boundaries
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      text = text.substring(firstBrace, lastBrace + 1);
    }

    try {
      const fullData = JSON.parse(text);

      // Map the rich structure to what the blog form expects
      const blogFormData = {
        title: fullData.article?.title || fullData.seo?.title || '',
        slug: fullData.seo?.slug || '',
        excerpt: fullData.article?.excerpt || '',
        content: buildFullContent(fullData),
        category: fullData.article?.category || 'Destinations',
        tags: fullData.tags || [],
        metaTitle: fullData.seo?.title || '',
        metaDescription: fullData.seo?.metaDescription || '',
        // Pass full rich data for advanced use
        _richData: fullData,
      };

      return NextResponse.json({ success: true, data: blogFormData, richData: fullData });
    } catch (parseError) {
      console.error('JSON parse error:', parseError, '\nRaw text (first 500 chars):', text.substring(0, 500));
      return NextResponse.json({ success: false, error: 'AI returned malformed JSON. Please try again.' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Error generating blog with Gemini:', error);
    return NextResponse.json({ success: false, error: error.message || 'An error occurred during generation' }, { status: 500 });
  }
}

/**
 * Assembles the final, publish-ready Markdown content from all sections of the rich JSON.
 * This is what gets saved to Firestore as the blog's main content.
 */
function buildFullContent(data: any): string {
  const parts: string[] = [];

  const article = data.article || {};
  const faq = data.faq || [];
  const cta = data.callToAction || '';
  const schema = data.schema || {};
  const seo = data.seo || {};
  const relatedTopics = data.relatedTopics || [];
  const internalLinks = data.internalLinks || [];
  const toc = article.tableOfContents || [];

  // --- SEO JSON-LD Schema Block (hidden in HTML comment for server rendering) ---
  if (schema.article || schema.faq) {
    const schemaPayload = {
      article: schema.article || {},
      faq: schema.faq || {},
      breadcrumb: schema.breadcrumb || {},
    };
    parts.push(`<!-- SCHEMA_JSON:${JSON.stringify(schemaPayload)} -->`);
  }

  // --- Focus Keyword hint for reader ---
  if (seo.focusKeyword) {
    parts.push(`> **Focus Keyword:** ${seo.focusKeyword}`);
    parts.push('');
  }

  // --- Quick Jumplinks to Navigate ---
  if (toc.length > 0) {
    parts.push('## Quick Jumplinks to Navigate\n');
    toc.forEach((item: any) => {
      const indent = item.level === 3 ? '  ' : '';
      const targetId = item.id || item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      parts.push(`${indent}- [${item.title}](#${targetId})`);
    });
    parts.push('');
  }

  // --- Main Article Content ---
  if (article.contentMarkdown) {
    parts.push(article.contentMarkdown);
    parts.push('');
  }

  // --- Call to Action ---
  if (cta) {
    parts.push('---');
    parts.push('');
    parts.push('## ✈️ Book Your Trip with TripDM\n');
    parts.push(cta);
    parts.push('');
  }

  // --- FAQ Section ---
  if (faq.length > 0) {
    parts.push('---');
    parts.push('');
    parts.push('## Frequently Asked Questions\n');
    faq.forEach((item: any) => {
      parts.push(`### ${item.question}\n`);
      parts.push(`${item.answer}\n`);
    });
  }

  // --- Secondary Keywords (for SEO context) ---
  if (seo.secondaryKeywords?.length > 0) {
    parts.push('');
    parts.push(`<!-- SECONDARY_KEYWORDS: ${seo.secondaryKeywords.join(', ')} -->`);
  }

  // --- Related Topics ---
  if (relatedTopics.length > 0) {
    parts.push('');
    parts.push('## You Might Also Like\n');
    relatedTopics.forEach((topic: string) => {
      parts.push(`- ${topic}`);
    });
    parts.push('');
  }

  return parts.join('\n');
}
