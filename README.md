# 🎥 Snappit

<img src="public/assets/images/thumbnail.png" alt="thumbnail image" width="300" height="250" />

# Snappit 

Snappit is a powerful, full-stack screen recording and video hosting platform. It features a modern Next.js web application and a companion Chrome Extension (Manifest V3) that allows users to record their screen, tab, or window seamlessly from anywhere on the web. 

Recorded videos are safely buffered using IndexedDB and ArrayBuffers to handle massive files without memory crashes, and are effortlessly synced to the web app for uploading, playback, and sharing.

---

## ✨ Features

### Web Application
- **Screen Recording:** Native screen, window, and tab capturing using the `MediaDevices` API.
- **Custom Video Player:** A bespoke native HTML5 video player featuring custom controls, picture-in-picture, playback speed, skip forward/backward, and keyboard shortcuts.
- **Secure Authentication:** Seamless Google OAuth login powered by Better Auth.
- **Robust Upload Pipeline:** Large file handling with drag-and-drop support, automatic thumbnail generation, and metadata extraction.
- **Modern UI:** Beautiful, responsive, and accessible interface built with Tailwind CSS, Radix UI (Shadcn), and Lucide icons.

### Chrome Extension
- **Record Anywhere:** Initiate screen recordings from any browser tab without keeping the Snappit web app open.
- **Manifest V3 Architecture:** Utilizes Offscreen Documents to securely record media in the background.
- **Cross-Origin Syncing:** Securely transfers massive video blobs from the extension's isolated environment directly into the web app's IndexedDB via Content Scripts.
- **Authentication Aware:** Reads HTTP-only session cookies to ensure only authenticated users can initiate recordings.

---

## 🛠️ Tech Stack

**Frontend (Web):**
- Next.js (App Router)
- React
- Tailwind CSS
- Shadcn UI (Radix Primitives)
- React Hook Form + Zod (Validation)

**Backend & Data:**
- Next.js Route Handlers
- Drizzle ORM
- PostgreSQL
- Better Auth
- IndexedDB (Client-side large blob storage)

**Extension:**
- Chrome Extension API (Manifest V3)
- Background Service Workers & Offscreen Documents
- Chrome Messaging & Content Scripts

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18 or higher)
- **PostgreSQL** database (local or hosted, e.g., Supabase/Neon)
- **Google Cloud Console** account (for OAuth credentials)
- **Chromium-based browser** (Chrome, Edge, Brave)

### 1. Fork and Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/snappit.git
cd snappit
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Environment Variables

Create a `.env` (or `.env.local`) file in the root directory and add the following keys:

```env
# Application
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Database (Drizzle / Postgres)
DATABASE_URL=postgresql://user:password@localhost:5432/snappit

# Better Auth & Google OAuth
BETTER_AUTH_SECRET=your_super_secret_string
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

*(Note: Ensure your Google OAuth credentials have `http://localhost:3000/api/auth/callback/google` added to the Authorized redirect URIs).*

### 4. Setup the Database

Push the Drizzle schema to your PostgreSQL database:

```bash
npm run db:push
# or your configured drizzle-kit command
```

### 5. Run the Web Application

```bash
npm run dev
```
The app should now be running on http://localhost:3000.

---

## 🧩 Chrome Extension Setup (Local Development)

To test the Chrome Extension locally and sync it with your local Next.js environment:

1. Open your Chromium browser and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (toggle in the top right corner).
3. Click **Load unpacked** in the top left corner.
4. Select the `extension/` folder located inside the `snappit` repository.
5. Open the `extension/background.js` and `extension/popup.js` files and ensure `APP_URL` is set to `http://localhost:3000` (comment out the production URL during local development).
6. Click the extension's **Reload** icon on the `chrome://extensions/` page to apply changes.

---

## 🤝 Contributing

Contributions are highly welcome! If you'd like to improve Snappit:

1. Fork the project.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.