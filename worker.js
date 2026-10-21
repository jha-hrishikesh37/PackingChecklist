/**
 * Cloudflare Worker for AI Travel Packing Checklist Generator
 *
 * Provides a secure proxy to Groq API (gpt-oss-120b) with strict JSON enforcement,
 * tailored system prompt rules, and robust server-side payload sanitization.
 */

const ALLOWED_ACCENTS = ['amber', 'sky', 'emerald', 'violet', 'rose', 'indigo'];

/**
 * Strips accidental markdown code fences (```json ... ``` or ``` ... ```)
 * from raw LLM text responses.
 */
export function stripCodeFences(str) {
    if (typeof str !== 'string') return '';
    let text = str.trim();

    // Check if text is enclosed in markdown code fences
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenceMatch) {
        return fenceMatch[1].trim();
    }

    // Strip leading and trailing fences if unmatched
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
    return text.trim();
}

/**
 * Validates and normalizes icon names:
 * - Must be lowercase
 * - Must start with 'ph-'
 * - Normalizes 'ph-Identification-badge' -> 'ph-identification-badge'
 * - Falls back to 'ph-suitcase' if missing or invalid
 */
export function sanitizeIcon(iconStr) {
    if (!iconStr || typeof iconStr !== 'string') {
        return 'ph-suitcase';
    }
    let icon = iconStr.trim().toLowerCase();
    if (!icon.startsWith('ph-')) {
        icon = 'ph-' + icon;
    }
    return /^ph-[a-z0-9-]+$/.test(icon) ? icon : 'ph-suitcase';
}

/**
 * Validates accent colors against the allowed palette:
 * ['amber', 'sky', 'emerald', 'violet', 'rose', 'indigo']
 * Falls back to 'rose' if missing or invalid.
 */
export function sanitizeAccent(accentStr) {
    if (typeof accentStr === 'string') {
        const normalized = accentStr.trim().toLowerCase();
        if (ALLOWED_ACCENTS.includes(normalized)) {
            return normalized;
        }
    }
    return 'rose';
}

/**
 * Sanitizes an individual packing item:
 * - Ensures unique string id
 * - Strips leading quantity prefixes (e.g. "2x T-Shirts" or "3 x Pants") into qty
 * - Enforces boolean packed: false
 * - Enforces integer qty >= 1
 */
function sanitizeItem(rawItem, catIndex, itemIndex, usedItemIds) {
    if (!rawItem) return null;

    let text = '';
    let rawQty = 1;
    let rawId = '';

    if (typeof rawItem === 'string') {
        text = rawItem.trim();
    } else if (typeof rawItem === 'object') {
        text = typeof rawItem.text === 'string'
            ? rawItem.text.trim()
            : (typeof rawItem.item === 'string' ? rawItem.item.trim() : '');
        rawQty = rawItem.qty;
        rawId = typeof rawItem.id === 'string'
            ? rawItem.id.trim()
            : (rawItem.id !== undefined && rawItem.id !== null ? String(rawItem.id).trim() : '');
    }

    // Strip leading "2x ", "3 x ", "5X ", "4x" prefixes and put multiplier into qty
    let extractedQty = null;
    const prefixMatch = text.match(/^(\d+)\s*(?:x|X|×|\*)\s*(.+)$/);
    if (prefixMatch && prefixMatch[2].trim()) {
        extractedQty = parseInt(prefixMatch[1], 10);
        text = prefixMatch[2].trim();
    }

    if (!text) {
        text = 'Checklist Item';
    }

    // Determine clean integer qty >= 1
    let qty = 1;
    if (extractedQty !== null && !isNaN(extractedQty) && extractedQty >= 1) {
        qty = Math.floor(extractedQty);
    } else if (rawQty !== undefined && rawQty !== null) {
        const parsed = parseInt(rawQty, 10);
        if (!isNaN(parsed) && parsed >= 1) {
            qty = Math.floor(parsed);
        }
    }

    // Ensure unique string id
    let id = rawId;
    if (!id || usedItemIds.has(id)) {
        id = `item_${catIndex + 1}_${itemIndex + 1}`;
    }
    while (usedItemIds.has(id)) {
        id = `item_${catIndex + 1}_${itemIndex + 1}_${Math.random().toString(36).substring(2, 6)}`;
    }
    usedItemIds.add(id);

    return {
        id,
        text,
        packed: false,
        qty
    };
}

/**
 * Server-Side Payload Sanitizer (sanitizeChecklistPayload)
 * Parses raw JSON (stripping markdown fences if string), validates categories,
 * icons, accents, item uniqueness, clean text, and realistic quantities.
 */
export function sanitizeChecklistPayload(data) {
    let parsed = data;

    if (typeof data === 'string') {
        const cleanedStr = stripCodeFences(data);
        try {
            parsed = JSON.parse(cleanedStr);
        } catch (e) {
            // Attempt extracting JSON substring if there's surrounding text
            const firstBrace = cleanedStr.indexOf('{');
            const lastBrace = cleanedStr.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                parsed = JSON.parse(cleanedStr.substring(firstBrace, lastBrace + 1));
            } else {
                throw new Error(`Failed to parse AI checklist JSON: ${e.message}`);
            }
        }
    }

    if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid checklist payload format');
    }

    const tripTitle = (typeof parsed.tripTitle === 'string' && parsed.tripTitle.trim())
        ? parsed.tripTitle.trim()
        : 'Trip Packing Checklist';

    const usedItemIds = new Set();
    const usedCatIds = new Set();
    const sanitizedCategories = [];

    const rawCategories = Array.isArray(parsed.categories) ? parsed.categories : [];
    rawCategories.forEach((cat, catIdx) => {
        if (!cat || typeof cat !== 'object') return;

        let catId = (typeof cat.id === 'string' && cat.id.trim())
            ? cat.id.toLowerCase().trim()
            : `category_${catIdx + 1}`;

        if (usedCatIds.has(catId)) {
            catId = `${catId}_${catIdx + 1}`;
        }
        usedCatIds.add(catId);

        const name = (typeof cat.name === 'string' && cat.name.trim())
            ? cat.name.trim()
            : 'Additional Items';

        const icon = sanitizeIcon(cat.icon);
        const accent = sanitizeAccent(cat.accent);

        const items = [];
        const rawItems = Array.isArray(cat.items) ? cat.items : [];
        rawItems.forEach((item, itemIdx) => {
            const cleanItem = sanitizeItem(item, catIdx, itemIdx, usedItemIds);
            if (cleanItem) {
                items.push(cleanItem);
            }
        });

        sanitizedCategories.push({
            id: catId,
            name,
            icon,
            accent,
            items
        });
    });

    // Fallback baseline categories if empty
    if (sanitizedCategories.length === 0) {
        sanitizedCategories.push(
            { id: 'essentials', name: 'Essentials & Documents', icon: 'ph-identification-badge', accent: 'amber', items: [] },
            { id: 'clothing', name: 'Clothing & Footwear', icon: 'ph-t-shirt', accent: 'sky', items: [] },
            { id: 'toiletries', name: 'Toiletries & Health', icon: 'ph-first-aid-kit', accent: 'emerald', items: [] },
            { id: 'electronics', name: 'Tech & Gear', icon: 'ph-device-mobile-camera', accent: 'violet', items: [] }
        );
    }

    return {
        tripTitle,
        categories: sanitizedCategories
    };
}

export default {
    async fetch(request, env) {
        // 1. Handle CORS so your app can call this Worker
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*", // Change "*" to your app's URL once live
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        };

        if (request.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders });
        }

        if (request.method !== "POST") {
            return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
        }

        try {
            // 2. Read trip details sent from your app
            const { destination, days, month, activities } = await request.json();

            const tripDays = parseInt(days, 10) || 5;
            const tripDest = destination || 'Vacation';
            const tripMonth = month || 'upcoming month';
            const tripActivities = activities || 'general sightseeing';

            // 3. Upgraded System Prompt enforcing exact schema, standard categories, baseline items, and quantity rules
            const systemPrompt = `You are an expert minimalist travel packing planner.

Generate a structured, minimalist packing checklist tailored to the user's destination, duration, month/season, and planned activities.

CRITICAL RULES:
1. OUTPUT FORMAT:
Return ONLY valid raw JSON (no markdown code fences, no conversational text) matching this exact schema:
{
  "tripTitle": "Concise, descriptive trip title (e.g., '5-Day Tokyo Autumn Trip')",
  "categories": [
    {
      "id": "essentials",
      "name": "Essentials & Documents",
      "icon": "ph-identification-badge",
      "accent": "amber",
      "items": [
        { "id": "e1", "text": "Item Name", "packed": false, "qty": 1 }
      ]
    }
  ]
}

2. STANDARD CATEGORY REUSE (Crucial for Smart Merge):
Always use these exact 4 core category id, name, icon, and accent values first before creating any custom categories:
- id: "essentials", name: "Essentials & Documents", icon: "ph-identification-badge", accent: "amber"
- id: "clothing", name: "Clothing & Footwear", icon: "ph-t-shirt", accent: "sky"
- id: "toiletries", name: "Toiletries & Health", icon: "ph-first-aid-kit", accent: "emerald"
- id: "electronics", name: "Tech & Gear", icon: "ph-device-mobile-camera", accent: "violet"

3. OPTIONAL ACTIVITY CATEGORIES (Max 1–2 extra):
If the trip requires specialized gear (e.g., Beach, Winter Sports, Camping, Business, Photography), you may add 1 or 2 extra categories, but you MUST ONLY choose from:
- Allowed accent values: ["amber", "sky", "emerald", "violet", "rose", "indigo"]
- Allowed icon values: ["ph-suitcase", "ph-sunglasses", "ph-sneaker", "ph-briefcase", "ph-tent", "ph-camera", "ph-mountains", "ph-swimming-pool", "ph-baby"]

4. CANONICAL BASELINE ITEM NAMES:
When including universal items, prefer these exact item text strings so the frontend Smart Merge matches them cleanly:
- "ID / Passport & Tickets"
- "Wallet, Cards & Cash"
- "Keys & Emergency Contacts"
- "Casual Tops / T-Shirts"
- "Underwear & Socks"
- "Comfortable Shoes"
- "Toothbrush & Toothpaste"
- "Deodorant & Grooming Basics"
- "Phone & Charging Cable"
- "Power Bank & Earphones"
Then add destination-, weather-, and activity-specific items alongside them.

5. SMART QUANTITY (qty) RULES:
- Never include numbers or quantities inside the text string (BAD: "5x T-Shirts", GOOD: "text": "Casual Tops / T-Shirts", "qty": 5).
- Calculate realistic clothing quantities based on trip duration (${tripDays} days):
  - Tops / Shirts: min(${tripDays}, 7) -> around ${Math.min(tripDays, 7)}
  - Underwear & Socks: min(${tripDays} + 1, 8) -> around ${Math.min(tripDays + 1, 8)}
  - Bottoms / Pants / Shorts: clamp(ceil(${tripDays} / 3), 1, 4) -> around ${Math.min(Math.max(Math.ceil(tripDays / 3), 1), 4)}
  - Sleepwear / Swimwear: 1 to 2
  - Documents, Toiletries, Electronics, Jackets, Shoes: 1 (unless a spare is specifically needed).
- All items must have packed: false, and integer qty >= 1.`;

            const userPrompt = `Create a tailored packing checklist for a ${tripDays}-day trip to ${tripDest} in ${tripMonth}. Planned activities and travel vibe: ${tripActivities}. Follow all category, canonical item, and smart quantity rules.`;

            // 4. Call Groq API using gpt-oss-120b in strict JSON Mode
            const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${env.GROQ_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "openai/gpt-oss-120b",
                    temperature: 0.4,
                    // Forces Groq to output valid JSON
                    response_format: { type: "json_object" },
                    messages: [
                        {
                            role: "system",
                            content: systemPrompt
                        },
                        {
                            role: "user",
                            content: userPrompt
                        }
                    ]
                })
            });

            const data = await groqResponse.json();

            if (!groqResponse.ok) {
                throw new Error(data.error?.message || "Groq API error");
            }

            // 5. Extract LLM content and run through server-side payload sanitizer
            const rawContent = data.choices[0].message.content;
            const sanitizedPayload = sanitizeChecklistPayload(rawContent);

            return new Response(JSON.stringify(sanitizedPayload), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });

        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }
    }
};