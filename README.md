# DPS Server (Dedicated Media Processing and API Server)

A standalone backend service built with Node.js, Express.js, and Sharp to handle high-performance image processing, automated WebP conversion, visual asset compression, VPS filesystem storage, and static media delivery for Dua Putra Srikandi (DPS).

This server operates independently from the serverless Jamstack frontend, isolating intensive image processing and disk filesystem operations to a dedicated VPS instance.

---

## System Architecture

```
[ Frontend ]
   ├── dps-cms (Admin CMS)
   └── dps-compro (Company Profile)
            │
            │  1. Text Data and Entity CRUD
            ▼
    [ Database ]
            ▲
            │  2. Upload Media and Retrieve WebP URLs
            ▼
[ Dedicated VPS Server ]
    └── dps-server (Node.js + Express + Sharp)
         ├── Port: 3000
         ├── Sharp Image Processor (Auto-conversion to WebP and compression)
         ├── Directory: /home/ideatecore/client/dps/dps-server
         └── Static Media Delivery: http://103.127.135.206:3000/uploads/...
```

---

## Installation and Local Development

1. Navigate to the server directory:
   ```bash
   cd dps-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```
   The service will listen on `http://localhost:3000`.

---

## VPS Deployment Guide

### 1. Working Directory
Target deployment path on VPS:
```
/home/ideatecore/client/dps/dps-server
```

### 2. Initialization on VPS
Connect via SSH and execute:
```bash
cd /home/ideatecore/client/dps/dps-server
npm install
npm run build
```

### 3. Process Management via PM2
Using PM2 for background process persistence:
```bash
pm2 start dist/index.js --name "dps-server"
pm2 save
pm2 startup
```

To view runtime status and logs:
```bash
pm2 status
pm2 logs dps-server
```

---

## REST API Endpoints

### 1. Single Image Upload
- Endpoint: `POST /api/upload`
- Body (`multipart/form-data`):
  - `file`: Image file (JPG, PNG, WebP, GIF, etc.)
  - `folder` (optional): Storage subfolder (`products`, `articles`, `services`, `media`, `site`). Defaults to `media`.
- Response:
  ```json
  {
    "success": true,
    "message": "File processed and uploaded successfully.",
    "url": "http://103.127.135.206:3000/uploads/products/172589..._marka.webp",
    "relativeUrl": "/uploads/products/172589..._marka.webp",
    "fileName": "172589..._marka.webp",
    "originalName": "marka.png",
    "fileSize": "142 KB",
    "mimeType": "image/webp",
    "width": 1200,
    "height": 900
  }
  ```

### 2. Batch Image Upload
- Endpoint: `POST /api/upload/multiple`
- Body (`multipart/form-data`):
  - `files`: Collection of image files (up to 25 files per batch).
  - `folder` (optional): Target storage subfolder.
- Response:
  ```json
  {
    "success": true,
    "message": "3 files processed and uploaded successfully.",
    "count": 3,
    "data": [ ... ]
  }
  ```

### 3. Remove File from Server Disk
- Endpoint: `DELETE /api/upload`
- Query Params or JSON Body:
  - `url`: Full asset URL or relative path
- Response:
  ```json
  {
    "success": true,
    "message": "File successfully deleted from server."
  }
  ```

### 4. Health Check
- Endpoint: `GET /api/health`
- Response:
  ```json
  {
    "status": "ok",
    "service": "DPS Media & API Server",
    "version": "1.0.0",
    "uptimeSeconds": 3600,
    "environment": "production"
  }
  ```
