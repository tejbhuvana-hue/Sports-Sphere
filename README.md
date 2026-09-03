
# SportsSphere — Unified Sports Networking & Management Platform

SportsSphere is a sports networking platform connecting Athletes, Coaches, Clubs, Associations, Sponsors, and Scouts.

---

## 🏗️ Architecture

```
React.js SPA (Vite)
       ↓ (REST APIs + Token Auth)
Django REST Framework
       ↓
Django Backend & Business Logic
       ↓
SQLite Database (Development)
```

---

## 🚀 Quick Start Guide

### 1. Backend (Django + Django REST Framework)

```powershell
# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Run database migrations
python manage.py migrate

# Start Django development server
python manage.py runserver 127.0.0.1:8000
```

The Django REST API will be available at `http://127.0.0.1:8000/api/`.

### 2. Frontend (React.js + Vite)

```powershell
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

The React frontend application will be running at `http://127.0.0.1:5173/`.

---

## 🔑 Superuser Admin Credentials

- **Username**: `teja`
- **Password**: *(as configured)*
- **Admin Portal**: Accessible at `http://127.0.0.1:5173/admin-dashboard` (and `/admin-login`)

---

## 📁 Directory Structure

```
SSphere/
│
├── core/                  # Django backend app (Models, Views/APIs, Serializers, URLs, Permissions)
│   ├── models.py          # 22 Domain models
│   ├── views.py           # DRF API Viewsets & Endpoints
│   ├── serializers.py     # Model serializers & validations
│   ├── urls.py            # API routing table
│   ├── permissions.py     # Custom permission classes
│   ├── consumers.py       # WebSocket channels consumers
│   ├── routing.py         # WebSocket routing
│   ├── admin.py           # Django admin registrations
│   └── tests.py           # Test suite
│
├── frontend/              # React single-page application (Vite)
│   ├── src/
│   │   ├── components/    # Reusable UI & Modal components
│   │   ├── pages/         # Application pages & Admin views
│   │   ├── layouts/       # Public and authenticated layouts
│   │   ├── context/       # AuthContext and ThemeContext
│   │   ├── services/      # Axios API client
│   │   ├── assets/        # Master styling & icons
│   │   ├── App.jsx        # Route definitions
│   │   └── main.jsx       # Entry point
│   ├── package.json
│   └── vite.config.js
│
├── media/                 # User uploaded media (images, videos, documents)
├── sports_sphere/         # Django project configuration (settings, urls, wsgi, asgi)
├── db.sqlite3             # SQLite development database
├── manage.py              # Django management utility
├── requirements.txt       # Python dependencies
├── .gitignore             # Git ignore configuration
└── README.md              # Project documentation
```
