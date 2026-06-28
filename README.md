![Logo](images\logo.png)

# Tanio AI

Tanio AI is an AI-powered workspace platform designed to help creators, developers, entrepreneurs, and tabletop RPG enthusiasts generate, organize, and manage content in one place.

The platform combines powerful AI-assisted planning tools with an intuitive workspace system, allowing users to create projects, organize content, collaborate with others, and export their work.

---

## ✨ Features

### Product Architect
Generate AI-powered project planning content including:

- Product Requirements Documents (PRDs)
- User Personas
- User Stories
- Feature Lists
- Technical Roadmaps
- Development Plans
- SWOT Analysis
- Market Research

### Tabletop Creator
Generate tabletop RPG content including:

- NPCs
- Characters
- Quests
- Encounters
- Locations
- World Building
- Magic Items
- Session Summaries

### Workspace Management

- Multiple Workspaces
- Project Organization
- AI Content History
- Content Versioning
- Export to PDF, DOCX, and TXT
- Project Sharing (planned)

---

# 🛠 Tech Stack

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

# 🚀 Getting Started

## Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/fullsail_capstone_project.git
```

```bash
cd fullsail_capstone_project
```

---

## Backend Setup

Create a virtual environment

```bash
python -m venv .venv
```

Activate it

### Windows

```bash
.venv\Scripts\activate
```

### macOS/Linux

```bash
source .venv/bin/activate
```

Install dependencies

```bash
pip install -r backend/requirements.txt
```

Run the backend

```bash
uvicorn app.main:app --reload
```

---

## Frontend Setup

Navigate to the frontend

```bash
cd frontend
```

Install dependencies

```bash
npm install
```

Start the development server

```bash
npm run dev
```

---

# 🌳 Git Workflow

This project follows a Git Flow workflow.

```
main
│
develop
│
feature/*
```

Development process:

1. Create a feature branch from `develop`
2. Build the feature
3. Commit changes
4. Merge into `develop`
5. Merge `develop` into `main` for stable releases

Example:

```bash
git checkout develop
git checkout -b feature/frontend-ui
```

---

# 📈 Current Status

### ✅ Completed

- Backend project structure
- Frontend project structure
- Dashboard UI skeleton
- Sidebar navigation
- React Router integration
- Reusable React components
- Workspace routing
- Project routing
- Content routing
- Settings routing

### 🚧 In Progress

- Authentication
- Database integration
- Workspace CRUD
- Project CRUD
- OpenAI integration

### 📅 Planned

- Collaboration
- Version History
- Export System
- Analytics Dashboard
- AI Prompt History

---

# 👥 Team

**Alberto Lawant**

- Backend Development
- AI Integration
- Database Design
- Frontend Development

**Byron Guntle**

- Frontend Development
- UI/UX Design
- Figma Prototyping
- Documentation

---

# 📄 License

This project is being developed as a Full Sail University Capstone project.

All rights reserved.