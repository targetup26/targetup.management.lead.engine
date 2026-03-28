# Targetup - Lead Engine Microservice

A dedicated Node.js microservice handling the heavy, asynchronous workload of CRM Lead generation and extraction. By offloading this from the core backend, Targetup ensures the main API remains extremely fast and responsive.

## 🚀 Technology Stack
* **Runtime**: Node.js
* **Message Queue**: BullMQ (Job processing)
* **In-Memory Store**: Redis (ioRedis for queue persistence and rate-limiting)
* **Web Scraping**: apify-client (Interfaces with Google Maps extraction actors)
* **Database interaction**: MySQL 8.0 (via Sequelize ORM)
* **Logging**: Winston

---

## ⚙️ Environment Variables (`.env`)
Create a `.env` file in the root of the `lead-engine` directory.

```ini
# Server Setup
PORT=4001
NODE_ENV=production

# Database (MySQL) - Shared with Core Backend
DATABASE_URL=mysql://root:your_db_password@localhost:3306/team_attendance

# Redis Connection (BullMQ Needs This)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# Apify Setup (External Scraping API)
APIFY_API_TOKEN=your_apify_secret_token_here

# Queue Configuration
QUEUE_CONCURRENCY=3
QUEUE_RATE_LIMIT_MAX=100
QUEUE_RATE_LIMIT_DURATION=60000
```

---

## 🛠️ Installation & Setup

1. **Prerequisites**: Ensure you have Node.js (v18+), Redis (Running natively or via Docker), and a valid Apify developer token.
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Run the Development Worker**:
   ```bash
   npm run dev
   ```
   The engine will connect to Redis and begin listening for `lead-extraction` jobs emitted by the core backend.

4. **Production Deployment**:
   ```bash
   npm start
   # Or via PM2
   pm2 start ecosystem.config.js --only attendance-lead-engine
   ```

---

## 📁 Core Architecture Pipeline
* `/src/workers/lead.worker.js`: BullMQ worker loop executing the 8-step pipeline (Extract -> Dedup -> Classify -> Batch Insert).
* `/src/services/apify.service.js`: Calls the external actor with normalized parameters.
* `/src/services/classification.service.js`: Intelligent heuristic scoring engine applying weights to Google Types and Keywords to assign standardized Categories (e.g. `car_repair` -> `Automotive`).
* `/src/services/deduplication.service.js`: Safely strips overlapping leads before database insertion.