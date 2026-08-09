# Tanio AI

## Introduction

Tanio AI is an AI-powered workspace platform designed to help creators, developers, entrepreneurs, and tabletop RPG enthusiasts generate, organize, and manage AI-generated content in one place.

The platform combines intelligent planning tools with an intuitive workspace system, allowing users to organize projects, generate content, manage workspaces, export documents, and customize their AI experience.

Tanio AI currently consists of two primary modules:

- **Product Architect** – AI-assisted product planning and software development documentation.
- **Tabletop Creator** – AI-powered tools for building tabletop RPG campaigns, NPCs, quests, encounters, locations, and world-building content.

The goal of Tanio AI is to reduce the time spent planning and organizing projects while helping users create high-quality content using artificial intelligence.

---

# 🚀 Beta Features

Tanio AI has entered the **Beta** stage of development.

The core platform is now functional, with development focused on improving the user experience, strengthening AI functionality, expanding content management, adding AI branding tools, and preparing the application for user testing during Software Integration.

---

# ✨ Completed Features

## Platform

- User Registration
- User Login
- JWT Authentication
- Dashboard
- Workspace Management
- Project Management
- Content Library
- User Settings
- Activity Tracking
- Responsive Interface
- Dark Theme UI

---

## Product Architect

Generate AI-powered software planning documents including:

- Product Requirements Documents (PRDs)
- User Personas
- User Stories
- Feature Lists
- Technical Architecture

---

## Tabletop Creator

Generate tabletop RPG content including:

- Campaigns
- NPCs
- Quests
- Encounters
- Locations

---

## AI Features

- OpenAI Integration
- AI-powered document generation
- Persistent AI Preferences
- Adjustable Creativity
- Response Length Settings
- Tone Selection

---

## Content Management

- Organized Content Library
- Workspace Organization
- Project Organization
- Content Version Support
- Markdown Rendering

---

## Exporting

- Export to PDF
- Export to Markdown
- Export to TXT

---

# 🎯 August Beta Development Goals

The following features are being developed or planned during August to prepare Tanio AI for user testing in Software Integration.

## UI and User Experience

- Create Global Content Library
- Move Saved Content into the Content Module
- Build Workspace Page
- Improve Dashboard UI Consistency
- Implement User Profile Page
- Build Settings Page
- Add Loading States and User Feedback

## AI Regeneration

- Add Regenerate Button to Product Architect
- Add Regenerate Button to Tabletop Creator
- Preserve AI Generation History
- Improve AI Generation User Experience
- Optimize AI Request Handling

## AI Branding and Logo Generation

- Generate AI Product Logos
- Customize Logo Generation Prompts
- Save Generated Logos to Projects
- Create Logo Gallery and Version History
- Download Generated Logos

## Planned Beta Improvements

The following features are also being considered for the remaining Beta sprint as development continues:

- Shared Project Collaboration
- Workspace Permissions
- Dashboard Analytics
- AI Usage History
- Improved Export Options
- Performance Optimization
- UI Polish
- Accessibility Improvements
- Bug Fixes
- Deployment Preparation

These features and improvements are intended to strengthen the usability, stability, and overall user experience of Tanio AI before formal user testing begins.

---

# 🛠 Technologies

## Frontend

- React
- React Router
- Tailwind CSS
- Vite
- React Icons

## Backend

- FastAPI
- SQLAlchemy
- Pydantic
- JWT Authentication

## Database

- PostgreSQL

## AI

- OpenAI API

---

# 📂 Project Structure

```text
tanio-ai/
│
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── db/
│   │   ├── models/
│   │   ├── schemas/
│   │   └── main.py
│   │
│   └── requirements.txt
│
└── README.md
```

---

# 🚀 Installation

## Clone the Repository

```bash
git clone https://github.com/albertolawant/fullsail_capstone_project
```

```bash
cd fullsail_capstone_project
```

Create a `.env` file inside the `backend` directory and add your environment variables before running the application.

---

## Backend Setup

Create a virtual environment:

```bash
python -m venv .venv
```

Activate it.

### Windows

```bash
.venv\Scripts\activate
```

### macOS/Linux

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r backend/requirements.txt
```

Run the backend:

```bash
uvicorn app.main:app --reload
```

---

## Frontend Setup

Navigate to the frontend:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

---

# 💻 Development Setup

Required software:

- Git
- Python 3.12+
- Node.js 20+
- npm
- PostgreSQL
- Visual Studio Code (recommended)

Create a `.env` file inside the backend directory.

Example:

```env
OPENAI_API_KEY=your_openai_api_key
DATABASE_URL=your_database_url
SECRET_KEY=your_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

Start the FastAPI backend before launching the React frontend.

---

# 🌳 Git Workflow

Tanio AI follows a Git Flow workflow.

```text
main
│
develop
│
feature/*
```

Development workflow:

1. Create a feature branch from `develop`
2. Implement the feature
3. Commit your changes
4. Merge into `develop`
5. Merge `develop` into `main` for stable releases

Example:

```bash
git checkout develop
git checkout -b feature/new-feature
```

---

# 📈 Project Status

**Development Stage:** **Beta**

Tanio AI has moved from core development into Beta development. The current focus is completing the remaining features and improvements needed before user testing in Software Integration.

## ✅ Completed

- User Authentication
- Dashboard
- Workspace Management
- Project Management
- Content Library
- Product Architect
- Tabletop Creator
- OpenAI Integration
- Export System
- User Settings
- AI Preference System
- Activity Tracking
- Responsive User Interface
- Global Content Library
- Saved Content Integration
- Workspace Page
- Dashboard UI Improvements
- Settings Page

---

## 🚧 Current Beta Focus

- User Profile Page
- Loading States and User Feedback
- AI Content Regeneration
- AI Generation History
- Improved AI Generation UX
- AI Request Optimization
- AI Product Logo Generation
- Logo Prompt Customization
- Logo Project Storage
- Logo Gallery and Version History
- Logo Downloads
- UI Polish
- Bug Fixes
- User Testing Preparation

---

## 📅 Planned Beta Work

Potential remaining Beta work includes:

- Shared Project Collaboration
- Workspace Permissions
- Dashboard Analytics
- AI Usage History
- Improved Export Options
- Performance Optimization
- Accessibility Improvements
- Deployment Preparation

---

## 🔜 Next Stage

After Beta development is completed, Tanio AI will move into **Software Integration**, where the application will undergo user testing, feedback collection, bug fixing, and additional refinement.

---

# 👥 Contributors

## Alberto Lawant

- Backend Development
- Frontend Development
- AI Integration
- Database Design
- API Development

## Byron Guntle

- Frontend Development
- UI/UX Design
- Figma Prototyping
- Documentation

---

# 📄 License

Tanio AI is being developed as part of the Full Sail University Computer Science Capstone.

This project is licensed under the **MIT License**.

See the `LICENSE` file for more information.