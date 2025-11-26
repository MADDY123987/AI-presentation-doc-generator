🧠 AI Presentation & Document Generator

Generate PowerPoint slides and Word-style documents instantly using AI.
Fully customizable. Secure user dashboard. Modern UI. 🚀

✨ Key Features
🧠 AI-Generated Content

Enter a topic + number of slides/pages

Google Gemini automatically generates:

Slide titles + bullet points

Structured document sections

Option to edit any auto-generated content before downloading

📊 PPTX Generator

Build .pptx files using python-pptx

Supports structured layouts:

Title slide

Bullet slide

Multi-column layouts (templates)

Customization:

Fonts, font colors, and backgrounds

Instant download from dashboard

📄 Word-Style Document Generator

Create structured academic or professional documents

Configurable number of sections/pages

Download/export via backend

🔐 Secure Authentication + Dashboard

JWT email/password login

Per-user storage (each user sees only their own history)

Google / GitHub OAuth available (optional toggle)

Download past files anytime

🏗️ Tech Stack
Layer	Technology
Frontend	React (Vite), JavaScript, CSS
Backend	FastAPI, Uvicorn
Auth	FastAPI-Users + JWT
AI	Google Gemini API
Database	SQLite (local / demo)
File Generation	python-pptx, xlsxwriter
Deployment	Render (backend), Vercel (frontend)
🗂️ Project Structure
ai-presentation-doc-generator/
├── backend/
│   ├── main.py
│   ├── core/
│   ├── models/
│   ├── routers/
│   ├── services/
│   ├── storage/               # Generated docs + PPTs
│   ├── ppt_generator.db       # SQLite database
│   ├── requirements.txt
│   └── .env (not committed)
│
└── frontend/ai-doc-frontend/
    ├── src/
    ├── package.json
    ├── vite.config.js
    └── .env (not committed)

⚙️ Backend Setup
📌 1. Requirements

Python 3.12+

Gemini API Key

(Optional) PostgreSQL — SQLite by default for demo

📌 2. Setup Virtual Environment & Install
cd backend
pip install -r requirements.txt

📌 3. Environment Variables (backend/.env)
DATABASE_URL=sqlite:///./ppt_generator.db
GEMINI_API_KEY=your_gemini_api_key_here
SECRET=your_jwt_secret_here
FRONTEND_URL=http://localhost:3000

📌 4. Run Backend
uvicorn main:app --reload


Backend URL:

http://127.0.0.1:8000


Docs:

http://127.0.0.1:8000/api/v1/docs

🎨 Frontend Setup
📌 Install & Run
cd frontend/ai-doc-frontend
npm install
npm run dev


Frontend URL:

http://localhost:3000

📌 .env configuration
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1

🔌 Core API Endpoints
Method	Endpoint	Description
POST	/api/v1/presentations/	Generate PPT (AI or custom)
GET	/api/v1/presentations/{id}	View stored PPT metadata
GET	/api/v1/presentations/{id}/download	Download PPTX
POST	/api/v1/documents/	Generate Word-style document
GET	/api/v1/documents/{id}/export	Download document
GET	/api/v1/dashboard/items	Lists user’s PPTs + docs
POST	/auth/jwt/login	Email/password login
POST	/auth/register	Create account
GET	/users/me	Get authenticated user info
🚀 Deployment Guide (Simple)
Backend on Render

Build:

pip install -r backend/requirements.txt


Start:

cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT

Frontend on Vercel

Configure:

VITE_API_BASE_URL=https://<your-render-backend>/api/v1


Deploy → Done ✨
