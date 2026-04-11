# 🧪 TestGen AI

An enterprise-grade SaaS platform that uses Artificial Intelligence to streamline the Quality Assurance (QA) lifecycle. TestGen AI automatically generates structured test cases from feature descriptions or application screenshots, allows for iterative refinement via a chatbot, and outputs executable Java Selenium automation scripts.

![Preview Dashboard](/public/docs/preview.jpg) <!-- Optional preview placeholder -->

## ✨ Features

- **Text-to-Test Cases:** Input a raw feature description and receive a highly structured JSON mapping of Test Cases (Positive, Negative, Boundary conditions).
- **Vision AI Processing:** Upload a screenshot of your UI. The backend uses Google Cloud Vision OCR paired with an LLM to automatically deduce testing scenarios.
- **Chat Revision:** Missing edge cases? Interactively chat with the QA-AI to instantly refine the existing list without starting from scratch.
- **Selenium Automation Generator:** One-click conversion of human-readable test steps into a fully structured Java Selenium using the TestNG framework.
- **Excel Export:** Download test cases instantly into an `.xlsx` QA template for import into tools like Jira or TestRail.
- **Cinematic UI/UX:** A stunning, ultra-modern glassmorphic interface powered by Framer Motion, GSAP, and TailwindCSS.

## 🏗️ Architecture & Tech Stack

The application is built using a decoupled Monorepo structure containing a Frontend Vite application and a Node.js Express backend.

### Frontend
* **Core:** React 19, Vite, TypeScript
* **Styling & Animation:** Tailwind CSS, Framer Motion, GSAP, Three.js shaders.
* **State & Data:** Custom hooks, File-saver, ExcelJS.
* **Auth & DB:** Supabase

### Backend
* **Server:** Node.js, Express, Cors, Multer (in-memory parsing)
* **AI Engine:** Groq API (`llama-3.3-70b-versatile`) for lightning-fast completions.
* **Computer Vision:** Google Vision API (`@google-cloud/vision`).
* **Deployment Context:** Designed for **Google Cloud Run** using Application Default Credentials (ADC).

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Supabase Project (for User Authentication)
- Google Cloud Project (with Vision API enabled)
- Groq API Key

### 1. Repository Setup

```bash
git clone https://github.com/aditya-codes-git/ai-testcase-generator.git
cd ai-testcase-generator/ai-testgen
```

### 2. Configure Environment Variables

**Frontend (`/.env`)**
Create an `.env` file in the root `ai-testgen` folder for Vite:
```ini
VITE_SUPABASE_URL=https://<your_supabase_project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your_supabase_anon_key>
VITE_API_URL=http://localhost:8080 # Or your deployed Cloud Run URL
```

**Backend (`/backend/.env`)**
Create an `.env` file in the `backend` folder:
```ini
PORT=8080
GROQ_API_KEY=<your_groq_api_key>
GEMINI_API_KEY=<optional_gemini_key>
```
*Note: For local development with Vision API, you must export your service account JSON path to your system environment variables OR authenticate via `gcloud auth application-default login`.*

### 3. Install Dependencies & Run

You need to spin up both the backend and frontend servers in separate terminal instances.

**Terminal 1: Start Backend**
```bash
cd backend
npm install
npm run dev
```
*(The backend will start on http://localhost:8080. A `/health` route is available to verify.)*

**Terminal 2: Start Frontend**
```bash
# From the ai-testgen root
npm install
npm run dev
```

The application will be available at `http://localhost:5173`.

---

## ☁️ Production Deployment

### Backend (Google Cloud Run)
The backend is designed completely stateless making it perfect for Cloud Run. 
1. Build and push the docker container (or deploy via source).
2. Set `GROQ_API_KEY` in the Cloud Run Environment Variables dashboard.
3. Attach a Service Account to the Cloud Run instance that possesses the **"Cloud Vision API User"** IAM role. The backend uses Application Default Credentials (ADC), so no local `.json` files are needed!

### Frontend (Vercel / Netlify)
1. Set the build command to `npm run build`.
2. Ensure you have added the `VITE_` Environment variables in your hosting provider's dashboard.
3. Overwrite the `VITE_API_URL` to point to your new Google Cloud Run backend endpoint.

---

## 🤝 Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## 📄 License
[MIT](https://choosealicense.com/licenses/mit/) 

---
*Developed with modern web tooling for high-performance QA Teams.*
