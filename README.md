# Wanderlust Pack — Smart Travel Packing Checklist & AI Trip Planner

An elegant, single-page vacation checklist and smart travel companion with an integrated **AI Trip Planner & Packing Sync** engine. Built with a zero-build vanilla web architecture, it effortlessly plans trips, crafts day-by-day itineraries with daily climate tips, and synchronizes customized packing recommendations directly into your checklist with duplicate prevention.

---

## 🌐 Live URL

* **Live Application**: [https://packingchecklist.jha-hrishikesh98.workers.dev](https://packingchecklist.jha-hrishikesh98.workers.dev)

---

## ✨ Features

### 1. 🤖 AI Trip Planner & Smart Packing Sync
* **Interactive Trip Form**: Enter your destination, trip duration (1 to 14 days with stepper controls), travel month, and travel activities/vibe.
* **Quick Vibe Presets**: One-click tags for popular travel styles (*🌸 Cherry Blossoms & Culture*, *🏖️ Beach & Relaxation*, *🥾 Mountain Hiking*, *🍜 Street Food & Nightlife*, *🏛️ Historic Sightseeing*).
* **Day-by-Day Itinerary**: AI-crafted schedule with daily highlights, activity bullets, and seasonal weather advice.
* **Smart Packing Recommendations**: Curated items categorized by Clothing, Gear, Toiletries, Documents, Electronics, and Medical, each with a contextual reason.
* **Duplicate-Safe Sync**: Case-insensitive matching prevents items already on your list from being duplicated. Items already present are tagged with an *"In Checklist"* badge.
* **Instant Demo Mode**: Includes an instant sample preview (Kyoto 3-day trip) for quick testing and offline exploration.

### 2. 🧳 Interactive Packing Checklist
* **Categorized Sections**: Organize packing into *Essentials & Documents*, *Clothing & Footwear*, *Toiletries & Health*, *Electronics & Gear*, and *Beach & Comfort Extras*.
* **Quantity Adjustments**: Increment/decrement item counts directly with `+` and `-` controls.
* **Dynamic Progress Bar**: Real-time completion percentage, item counter, and responsive milestone status badges.
* **Custom Items**: Add new items via quick add at the top or inline within each category card.
* **Live Search & Filter**: Filter by status (*All*, *To Pack*, *Packed*) and perform instant client-side text searches.
* **Trip Renaming**: Customize your trip name (e.g., *"Alpine Ski Adventure"*) directly from the header.
* **Bulk Actions**: Uncheck all items for a new trip or restore starter defaults with confirmation modals.

### 3. 💾 Offline Readiness & Local Persistence
* **localStorage State Sync**: Automatically saves both your active checklist and your latest generated trip plan across browser refreshes and sessions.
* **Zero Dependencies**: Pure HTML5, modern CSS, and vanilla JavaScript—runs instantly in any browser without npm, Node.js builds, or external bundling.

---

## 🛠️ Tech Stack & Architecture

| Layer | Technologies |
|---|---|
| **Frontend** | HTML5, Vanilla JavaScript (ES6+), [Tailwind CSS CDN](https://tailwindcss.com), [Phosphor Icons](https://phosphoricons.com), Google Fonts (Inter, Plus Jakarta Sans) |
| **Backend API** | Cloudflare Workers proxy connected to Groq API (`llama-3.3-70b-versatile` in strict JSON mode) |
| **Hosting & CI/CD** | Cloudflare Pages & Workers via GitHub integration |
| **Storage** | Client-side `localStorage` (`wanderlust_packing_checklist_v1` & `wanderlust_ai_trip_plan_v1`) |

---

## 🔌 Backend Worker API Specification

The frontend communicates with a standalone Cloudflare Worker proxy that interfaces securely with the Groq API:

* **Endpoint**: `https://packing-ai-api.jha-hrishikesh98.workers.dev`
* **Method**: `POST`
* **Headers**: `Content-Type: application/json`

### Request Body
```json
{
  "destination": "Manali",
  "days": 3,
  "month": "December",
  "activities": "Snow trekking and cafe hopping"
}
```

### JSON Response Format
```json
{
  "tripSummary": "Snowy adventure in Manali with cozy cafe hops, chilly December weather",
  "itinerary": [
    {
      "day": 1,
      "title": "Arrival & Old Manali Café Crawl",
      "activities": [
        "Check into hotel",
        "Stroll through Old Manali",
        "Cafe hopping at Café 1947 and Johnson's Café"
      ],
      "weatherTip": "Wear an insulated jacket, waterproof boots and layered clothing for cold mornings"
    }
  ],
  "packingItems": [
    {
      "item": "Insulated down jacket",
      "category": "Clothing",
      "reason": "Keeps you warm during cold December days and high‑altitude treks"
    },
    {
      "item": "Sturdy waterproof trekking boots",
      "category": "Gear",
      "reason": "Provides grip on icy terrain and keeps feet dry"
    }
  ]
}
```

---

## 🚀 Running Locally

Because this application uses a zero-build vanilla setup, running it locally requires no installation:

### Option 1: Direct File Opening
Double-click `index.html` or open it directly in any modern browser.

### Option 2: Lightweight Local HTTP Server
Using Node.js:
```bash
npx serve .
```

Or using Python:
```bash
python -m http.server 3000
```
Then visit `http://localhost:3000/` in your browser.

---

## 🚢 Deployment

The project is configured for continuous deployment on **Cloudflare Pages**:
1. Every commit pushed to the `main` branch on GitHub triggers an automatic deployment.
2. Build command: *None* (Static site).
3. Build output directory: `/` (Root directory containing `index.html`).

---

## 📄 License
This project is open source and available under the [MIT License](LICENSE).
