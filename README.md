<div align="center">
  <img src="https://via.placeholder.com/150x150/0f172a/f59e0b?text=TARGETUP" alt="Targetup Logo" />
  <h1>Targetup - Lead Engine (Microservice)</h1>
  <p>The asynchronous background worker system for orchestrating, scraping, deduplicating, and intelligently classifying massive CRM datasets without blocking the core API.</p>
</div>

<hr />

## 📋 Table of Contents
1. [System Architecture](#system-architecture)
2. [Technology Stack](#technology-stack)
3. [Environment Configuration (ENV)](#environment-configuration-env)
4. [Installation & Starting Workers](#installation--starting-workers)
5. [The 8-Step Extraction Pipeline](#the-8-step-extraction-pipeline)
6. [Intelligent Classification System](#intelligent-classification-system)

---

## 🏗️ System Architecture
By decoupling the heavy execution of web-crawling Google Maps and sorting thousands of leads simultaneously, this Node.js microservice communicates with the Core Backend exclusively through the **Redis** message broken utilizing **BullMQ**. Core backends push jobs (`{ lat, lng, limit }`) and process immediately returns `200 OK`, while this worker spins up the required Apify actors asynchronously.

---

## 🚀 Technology Stack
* **Queue Engine**: BullMQ 
* **State & Persistence**: Redis (ioRedis driver)
* **Scraper Abstraction**: `apify-client`
* **Data Layer**: Direct mapped connection via Sequelize (to Core DB `team_attendance`)
* **Logging System**: Winston (Independent rotation files)

---

## ⚙️ Environment Configuration (`.env`)
Create a `.env` file in the root of the `lead-engine` directory.

```ini
# Server Setup
PORT=4001
NODE_ENV=production

# Database (MySQL) - Points directly to the Core Shared DB
DATABASE_URL=mysql://root:your_db_password@localhost:3306/team_attendance

# Redis Connection (Crucial for BullMQ locking)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# Apify Setup (External Actor Target)
APIFY_API_TOKEN=your_apify_secret_token_here

# Queue Configuration
QUEUE_CONCURRENCY=3
QUEUE_RATE_LIMIT_MAX=100
QUEUE_RATE_LIMIT_DURATION=60000
```

---

## 🛠️ Installation & Starting Workers

1. **Clone & Install**:
   ```bash
   git clone https://github.com/targetup26/targetup.lead.engine.git
   cd targetup.lead.engine
   npm install
   ```
2. **Start Background Loop**:
   ```bash
   npm run dev      # Development (auto-restart)
   npm start        # Production Single thread
   ```
   *Note: Using a Process Manager like PM2 (`pm2 start ecosystem.config.js`) is mandatory for Production to sustain worker vitality.*

---

## 🔄 The 8-Step Extraction Pipeline
When a `lead-extraction` job appears in Redis, `worker.process.js` initiates the workflow:

1. **Job Initialization**: Marks `ExtractionStatus` as `PROCESSING` in MySQL.
2. **Actor Call (`apify.service.js`)**: Executes the `compass/google-maps-extractor` formatting payload limits, latitudes, longitudes, and bounds dynamically.
3. **Data Polling**: Asynchronously awaits Apify dataset generation.
4. **Deduplication (`deduplication.service.js`)**: Safely loops existing SQL `Lead` records. Strips matches against Website URLs, Phone formats, and precise Map URLs to prevent dirty DBs.
5. **Heuristic Classification (`classification.service.js`)**: Generates normalized categories per remaining lead.
6. **Batch Instantiation**: Bulk inserts array payload securely into `team_attendance.Leads`.
7. **Taxonomy Syncing**: Bumps incremental statistics in the `Categories` tracking tables.
8. **Finalization**: Logs Winston completion, transitions Core DB Status to `COMPLETED`.

---

## 🧠 Intelligent Classification System
The most complex sub-system. It reads chaotic RAW inputs from Google Maps and categorizes them deterministically so Sales Reps can filter them cleanly.

**Scoring Mechanic (1-100 Confidence)**:
* **Primary Factor**: Hard-matching the raw Google `placeType` strings against our RegEx dictionary triggers an instant `Confidence: 100`.
* **Secondary Factor**: Keywords scanning in titles. If `Medical Center` is found in a title, it boosts `Health & Beauty` arrays by `+60`.
* **Fallback Mechanisms**: Unidentified types route into a generic `Retail` or `Uncategorized` taxonomy branch keeping the data clean.