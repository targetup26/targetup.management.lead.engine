# 🔧 Laragon Redis Setup Guide

## ⚠️ **Important: Start Redis First!**

Before running the Lead Engine, you **MUST** start Redis in Laragon.

---

## 📋 **Step-by-Step Setup**

### **1. Start Redis in Laragon**

1. Open **Laragon**
2. Click **Menu** → **Redis** → **Start**
3. Wait for Redis to start (green indicator)

**OR** use command line:
```bash
# Navigate to Laragon Redis directory
cd C:\laragon\bin\redis\redis-x64-5.0.14.1

# Start Redis server
redis-server.exe
```

### **2. Verify Redis is Running**

Open a new terminal and run:
```bash
# Test Redis connection
redis-cli ping
```

**Expected Output:**
```
PONG
```

If you get `PONG`, Redis is running! ✅

---

## 🚀 **Start Lead Engine**

After Redis is running:

```bash
cd lead-engine
npm run dev
```

You should see:
```
2026-02-13 10:39:34 [info]: Database connection established successfully
2026-02-13 10:39:34 [info]: Redis connection established for queue
2026-02-13 10:39:34 [info]: Lead extraction queue initialized
2026-02-13 10:39:34 [info]: Lead extraction worker started
2026-02-13 10:39:34 [info]: 🚀 Lead Engine running on port 4001
```

---

## ✅ **Test Health Check**

```bash
curl http://localhost:4001/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "service": "lead-engine",
  "checks": {
    "apify": true,
    "redis": true
  },
  "timestamp": "2026-02-13T08:39:34.000Z"
}
```

---

## ⚠️ **Troubleshooting**

### **Problem: "Redis connection error"**

**Solution:**
1. Make sure Redis is started in Laragon
2. Check if port 6379 is available
3. Verify `.env` settings:
   ```env
   REDIS_HOST=127.0.0.1
   REDIS_PORT=6379
   REDIS_PASSWORD=
   ```

### **Problem: "Queue error"**

**Solution:**
- Restart Redis in Laragon
- Restart Lead Engine service
- Check Laragon logs for errors

### **Problem: Redis version warning**

```
It is highly recommended to use a minimum Redis version of 6.2.0
Current: 5.0.14.1
```

**Solution:**
- This is just a warning, not an error
- Laragon's Redis 5.0.14 works fine for development
- For production, consider upgrading to Redis 6.2+

---

## 📝 **Configuration Files Updated**

### **Lead Engine (.env)**
```env
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
```

### **Core Backend (.env)**
```env
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
```

---

## 🔄 **Full Startup Sequence**

1. **Start Laragon** (if not running)
2. **Start MySQL** in Laragon
3. **Start Redis** in Laragon ⚠️ **CRITICAL**
4. **Start Core Backend**
   ```bash
   cd backend
   npm start
   ```
5. **Start Lead Engine**
   ```bash
   cd lead-engine
   npm run dev
   ```
6. **Start Frontend**
   ```bash
   cd frontend
   npm run dev
   ```

---

## ✅ **Verification Checklist**

- [ ] Laragon is running
- [ ] MySQL is started (green indicator)
- [ ] Redis is started (green indicator)
- [ ] `redis-cli ping` returns `PONG`
- [ ] Lead Engine starts without errors
- [ ] Health check returns `"status": "ok"`
- [ ] Core Backend can connect to Lead Engine

---

**🎯 Once all services are running, you're ready to test lead extraction!**
