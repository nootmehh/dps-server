# DPS Server (Dedicated Media Processing & API Server)

Server backend mandiri berbasis **Node.js + Express.js + Sharp** untuk menangani pemrosesan gambar berkecepatan tinggi, konversi otomatis ke **WebP**, kompresi aset visual, penyimpanan berkas lokal VPS, dan penyajian media statis untuk **Dua Putra Srikandi (DPS)**.

Server ini dirancang terpisah dari frontend (Netlify Jamstack), sehingga frontend tetap ringan (*serverless*) dan seluruh beban komputasi berat (*Sharp image processing*, filesystem I/O, dsb.) ditangani secara dedicated di VPS.

---

## 🏗️ Arsitektur Sistem

```
[ Frontend (Netlify) ]
   ├── dps-cms (Admin CMS)
   └── dps-compro (Company Profile)
            │
            │  1. Data Teks / Entitas (CRUD)
            ▼
    [ Supabase Database ]
            ▲
            │  2. Unggah Media & Ambil URL WebP
            ▼
[ VPS Server (Ubuntu / Linux) ]
    └── dps-server (Node.js + Express + Sharp)
         ├── Port: 3000
         ├── Sharp Image Processor (Auto-convert ke WebP & kompresi)
         ├── Directory: /home/ideatecore/client/dps/dps-server
         └── Static Media: http://103.127.135.206:3000/uploads/...
```

---

## 🚀 Instalasi & Menjalankan di Lokal

1. Masuk ke direktori `dps-server`:
   ```bash
   cd dps-server
   ```

2. Pasang dependensi:
   ```bash
   npm install
   ```

3. Jalankan mode pengembangan:
   ```bash
   npm run dev
   ```
   Server akan aktif di `http://localhost:3000`.

---

## 📦 Panduan Deployment ke VPS (Ubuntu / Linux)

### 1. Letak Folder di VPS
Direktori di VPS:
```
/home/ideatecore/client/dps/dps-server
```

### 2. Setup Awal di VPS
Masuk ke VPS via SSH, lalu jalankan:
```bash
cd /home/ideatecore/client/dps/dps-server
npm install
npm run build
```

### 3. Menjalankan dengan PM2 (Process Manager)
Pastikan `pm2` sudah terpasang di VPS (`npm install -g pm2`). Jalankan:
```bash
pm2 start dist/index.js --name "dps-server"
pm2 save
pm2 startup
```

Untuk melihat log & status di VPS:
```bash
pm2 status
pm2 logs dps-server
```

---

## ⚙️ Variabel Lingkungan (`.env`)

File `.env` di VPS:
```env
PORT=3000
NODE_ENV=production
BASE_URL=http://103.127.135.206:3000
UPLOAD_DIR=/home/ideatecore/client/dps/dps-server/uploads
MAX_FILE_SIZE_MB=25
ALLOWED_ORIGINS=*
```

---

## 📡 Dokumentasi Endpoint REST API

### 1. Unggah Gambar Tunggal
- **Endpoint**: `POST /api/upload`
- **Body (`multipart/form-data`)**:
  - `file`: Berkas gambar (JPG, PNG, WebP, GIF, dsb.)
  - `folder` *(opsional)*: Subdirektori penyimpanan (`products`, `articles`, `services`, `media`, `site`). Default: `media`.
- **Response**:
  ```json
  {
    "success": true,
    "message": "Berkas berhasil diproses dan diunggah.",
    "url": "http://103.127.135.206:3000/uploads/products/172589..._cat-marka.webp",
    "relativeUrl": "/uploads/products/172589..._cat-marka.webp",
    "fileName": "172589..._cat-marka.webp",
    "originalName": "cat-marka.png",
    "fileSize": "142 KB",
    "mimeType": "image/webp",
    "width": 1200,
    "height": 900
  }
  ```

### 2. Unggah Gambar Banyak (Batch)
- **Endpoint**: `POST /api/upload/multiple`
- **Body (`multipart/form-data`)**:
  - `files`: Koleksi berkas gambar (hingga 25 berkas sekaligus).
  - `folder` *(opsional)*: Subdirektori tujuan.
- **Response**:
  ```json
  {
    "success": true,
    "message": "3 berkas berhasil diproses dan diunggah.",
    "count": 3,
    "data": [ ... ]
  }
  ```

### 3. Hapus Berkas dari Disk Server
- **Endpoint**: `DELETE /api/upload`
- **Query Params / JSON Body**:
  - `url`: URL berkas lengkap atau path relatif (misal: `http://103.127.135.206:3000/uploads/products/file.webp` atau `/uploads/products/file.webp`)
- **Response**:
  ```json
  {
    "success": true,
    "message": "Berkas berhasil dihapus dari server."
  }
  ```

### 4. Health Check
- **Endpoint**: `GET /api/health`
- **Response**:
  ```json
  {
    "status": "ok",
    "service": "DPS Media & API Server",
    "version": "1.0.0",
    "uptimeSeconds": 3600,
    "environment": "production"
  }
  ```
