🧠 AI Presentation & Document Generator

Generate PowerPoint slides and Word-style documents instantly using AI.
Fully customizable, secure user dashboard, and a modern UI. 🚀

✨ Features
🧠 AI-Generated Content
Enter topic + number of slides/pages
Google Gemini generates:
Slide titles + bullet points
Structured document sections (intro, body, conclusion, etc.)
User can edit AI output before downloading
📊 PPTX Generator

Build .pptx files using python-pptx
Supports multiple layouts:
Title slide
Bullet slides
Multi-column templates
Customization:
Fonts & font colors
Backgrounds / themes
Instant download from dashboard

📄 Word-Style Document Generator

Create structured academic or professional docs
Configurable number of sections/pages
Download/export via backend

🔐 Authentication + Dashboard
JWT email/password login
Each user sees only their own history
Download past files anytime from dashboard

🏗️ Tech Stack
Layer	Technology
Frontend	React (Vite), JavaScript, CSS
Backend	FastAPI, Uvicorn
Auth	FastAPI-Users + JWT
AI	Google Gemini API
Database	SQLite (default for demo)
Files	python-pptx, xlsxwriter
Deploy	Render (backend), Vercel (frontend)

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
│   └── .env                   # Backend config (NOT committed)
│
└── frontend/ai-doc-frontend/
    ├── src/
    ├── package.json
    ├── vite.config.js
    └── .env                   # Frontend config (NOT committed)


⚙️ Local Setup (Backend + Frontend)
✅ Prerequisites
Python 3.12+
Node.js 18+ and npm
A Google Gemini API key

1️⃣ Clone the Repository
git clone https://github.com/<your-username>/ai-presentation-doc-generator.git
cd ai-presentation-doc-generator


2️⃣ Backend Setup (FastAPI)
a) Create and activate virtual environment
cd backend
# Create venv
python -m venv venv
# Activate (Windows)
venv\Scripts\activate
# Activate (macOS / Linux)
source venv/bin/activate

b) Install Python dependencies
requirements.txt contains all required packages
(FastAPI, Uvicorn, FastAPI-Users, python-pptx, xlsxwriter, google-generativeai, etc.):
pip install -r requirements.txt


c) Create backend/.env
Create a file named .env inside the backend/ folder:

DATABASE_URL=sqlite:///./ppt_generator.db
GEMINI_API_KEY=your_gemini_api_key_here
SECRET=your_jwt_secret_here
FRONTEND_URL=http://localhost:3000

d) Run the backend
uvicorn main:app --reload
Backend URL: http://127.0.0.1:8000
Swagger Docs: http://127.0.0.1:8000/api/v1/docs

3️⃣ Frontend Setup (React + Vite)
cd ../frontend/ai-doc-frontend

a) Install Node dependencies
package.json contains all React/Vite dependencies:

npm install

b) Create frontend/.env
Create a file named .env inside frontend/ai-doc-frontend/:

VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1

c) Run the frontend
npm run dev

Frontend URL: http://localhost:3000

The frontend will now call the backend via VITE_API_BASE_URL.


🔌 Core API Endpoints
| Method | Endpoint                              | Description                      |
| ------ | ------------------------------------- | -------------------------------- |
| POST   | `/api/v1/presentations/`              | Generate PPT (AI / custom input) |
| GET    | `/api/v1/presentations/{id}`          | Get PPT metadata                 |
| GET    | `/api/v1/presentations/{id}/download` | Download `.pptx` file            |
| POST   | `/api/v1/documents/`                  | Generate Word-style document     |
| GET    | `/api/v1/documents/{id}/export`       | Download document                |
| GET    | `/api/v1/dashboard/items`             | List user’s PPTs + docs          |
| POST   | `/auth/jwt/login`                     | Email/password login             |
| POST   | `/auth/register`                      | Create account                   |
| GET    | `/users/me`                           | Get current user profile         |


