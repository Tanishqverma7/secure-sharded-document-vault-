# Secure Sharded Document Vault 🛡️

A highly secure, multi-cloud document vault built with robust cryptographic principles. This application takes your sensitive files, encrypts them entirely on the backend, splits them into multiple shards, and distributes them across three totally independent cloud storage providers using a RAID-5 logic system. 

If any single cloud provider experiences an outage, denies access, or loses your data, the application performs real-time algorithmic recovery to reconstruct the original document without skipping a beat!

## 🚀 Features

- **End-to-End File Encryption:** Utilizes standard `AES-256-GCM` encryption. Everything is secured with strong salts, initialization vectors (IVs), and authentication tags.
- **Multi-Cloud RAID-5 Sharding:** Files are split using an advanced XOR parity algorithm into two data shards and one parity shard:
  - **Shard A:** Uploaded to **Google Drive**
  - **Shard B:** Uploaded to **Dropbox**
  - **Parity Shard:** Uploaded to **Cloudinary**
- **Fault-Tolerant Recovery:** Even if a cloud provider is completely down, as long as 2 out of 3 shards are retrieved, the vault seamlessly reconstructs your decrypted file!
- **Beautiful & Dynamic UI:** Crafted with Next.js 16+, Tailwind CSS, and Shadcn UI, featuring slick micro-animations, glassmorphism, and responsive data tables.
- **Secure Authentication:** JWT-based user authentication using Next-Auth.
- **Comprehensive Auditing:** Tracks all file uploads, downloads, recoveries, and degradations in a fast SQLite database via Prisma ORM.

## 🛠️ Technology Stack

- **Framework:** Next.js 16+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + Framer Motion
- **UI Components:** Shadcn UI, Radix UI, Dnd-Kit
- **Database:** SQLite (managed via Prisma ORM)
- **Cloud Integrations:** `googleapis` v171, `dropbox` SDK, `cloudinary` v2

## ⚙️ Local Development Setup

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) installed. We recommend using `npm` for standard compatibility, but `bun` is supported.

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Copy the supplied `.env.example` into a `.env` file and populate it. You **must** provide functional credentials for:
- Database URL (SQLite path is fine)
- JWT Secret
- Google Drive Service Account JSON Details & Target Folder ID
- Dropbox Short-Lived User Access Token
- Cloudinary API Key, Secret, and Cloud Name

### 4. Initialize Database
Apply the schema and generate the Prisma client:
```bash
npm run db:push
npm run db:generate
```

### 5. Run the Application
Start the Next.js development server:
```bash
npm run dev
```
Visit `http://localhost:3000` to interact with the application.

## 🏗️ Building for Production
This vault was refactored for complete cross-platform execution on Windows and Unix environments. 

```bash
npm run build
npm run start
```

---
*Developed with a focus on bulletproof fault tolerance and uncompromising data privacy.*
