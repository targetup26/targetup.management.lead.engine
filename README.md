# 🎯 Lead Generation Engine - Technical Specification

A high-performance microservice specialized in automated lead extraction, data enrichment, and intelligent classification. This service operates as a worker-based system to handle long-running scraping tasks without blocking the main API thread.

## �️ Technical Stack (A to Z)

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Runtime** | `Node.js` | High-concurrency JavaScript runtime. |
| **API Framework** | `Express.js` | RESTful API structure with modular routing. |
| **Database (ORM)** | `Sequelize` | Object-Relational Mapping for MySQL/MariaDB. |
| **Queue System** | `BullMQ` | Redis-backed message queue for background jobs. |
| **Memory Store** | `Redis` | Message broker and job state persistence. |
| **External API** | `Apify SDK` | Cloud-based browser automation for scraping. |
| **ORM Dialect** | `mysql2` | High-performance MySQL driver. |
| **Logging** | `Winston` | Multi-level logging (Console & Files). |
| **Process Mgr** | `Nodemon` | Automatic dev server restarts. |

---

## 📡 API Endpoints Specification

All endpoints are prefixed with `/api`. An `INTERNAL_TOKEN` must be provided in the headers for authorization.

### 1. Job Orchestration
#### `POST /search/start`
Initiates a new scraping session via Apify.
- **Header**: `Authorization: Bearer <INTERNAL_TOKEN>`
- **Body Parameters**:
    - `searchId`: (String) Unique UUID for tracking the session.
    - `keyword`: (String) Search query (e.g., "Software Companies").
    - `city`: (String) Target city for location-based scraping.
    - `limit`: (Integer) Max number of leads to extract (Default: 50).
    - `country`: (String) Target country code (Default: "US").
- **Workflow**: 
    1. Validates input using `LeadExtractionDTO`.
    2. Registers the job in the MySQL `lead_jobs` table.
    3. Pushes the job onto the `lead-extraction` Redis queue.
    4. Worker picks up the job and triggers the Apify Actor.

#### `GET /search/status/:jobId`
Polls the real-time progress of a specific job.
- **Response**:
    - `status`: `pending` | `active` | `completed` | `failed`
    - `progress`: Percentage (0-100).
    - `processedCount`: Number of leads already saved.

### 2. System Health
#### `GET /health`
Returns the status of the service, Database connection, and Redis availability.

---

## ⚙️ Core Logic Components

- **`search.controller.js`**: Handles incoming requests and orchestrates queue interaction.
- **`worker.js`**: The engine's heart. It listens to Redis, calls Apify, and processes the raw JSON results.
- **`lead.repository.js`**: Managed data persistence, including intelligent deduplication (checking if a business exists before saving).
- **`apify.service.js`**: Standardized wrapper for interacting with the Apify cloud platform.

---
*Maintained by Antigravity AI*