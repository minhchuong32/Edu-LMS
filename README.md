# 🎓 EduLMS – Learning Management System

![React](https://img.shields.io/badge/React-19.0-blue)
![Node.js](https://img.shields.io/badge/Node.js-Express-green)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-green)
![JWT](https://img.shields.io/badge/Auth-JWT-orange)
![TailwindCSS](https://img.shields.io/badge/Styling-TailwindCSS-38B2AC)
![License](https://img.shields.io/badge/License-MIT-success)

EduLMS is a modern, production-ready Learning Management System (LMS) designed for High Schools (THPT) to digitize academic administration, teaching, learning, attendance, grading, and school-parent-student communication on a unified digital platform.

The application follows a decoupled **Client–Server architecture**, separating the frontend (`edulms-frontend`) and backend (`edulms-backend`) into independent services. It provides secure authentication, fine-grained Role-Based Access Control (RBAC), real-time notifications, conduct & attendance tracking, online assignment submissions, auto-calculated GPA gradebooks, and comprehensive administrative tools.

---

# ✨ Features

## 👨‍💼 Administrator

- **Academic Structure Management**: Manage Grade Levels (10, 11, 12), Classes, Subjects, and Academic Years.
- **User & Role Management**: Provision accounts for Teachers, Students, and Parents with RBAC.
- **Homeroom Teacher Assignment**: Assign Homeroom Teachers (GVCN) to classes with roster management.
- **Teaching Assignment**: Assign Subject Teachers to specific classes and semesters.
- **System Configuration & Dashboard**: Monitor overall system metrics, statistics, and system logs.

---

## 👨‍🏫 Teacher

- **Subject & Classroom Portal**: Access assigned classes, lesson materials, and syllabus.
- **Digital Gradebook (Sổ Điểm Điện Tử)**: Input & calculate grades with strict coefficient rules (Coefficient 1: Oral/15m, Coefficient 2: 1-period exam, Coefficient 3: Semester final).
- **Attendance & Conduct Management**: Mark attendance per period (Periods 1-10) and record student conduct/discipline points.
- **Assignment & Quiz Management**: Create homework assignments, accept PDF/file uploads, and grade student submissions.
- **Class Roster & Student Progress**: Monitor class roster, student academic records, and semester summaries.

---

## 👨‍🎓 Student

- **Student Workspace**: Overview of enrolled courses, timetable, and academic performance.
- **Assignment Submission**: View pending assignments, submit homework files/notes, and check teacher feedback.
- **Digital Scorecard (Bảng Điểm Cá Nhân)**: Track realtime GPA, individual subject scores, and semester rankings.
- **Timetable & Attendance Status**: Check daily timetable schedule (Periods 1-10) and attendance history.
- **Education Portal & System Guides**: Access official Department of Education announcements, news articles, and user manuals.

---

## 👨‍👩‍👧 Parent

- **Parent Portal**: Connect parent accounts directly to student profiles using Student Code (Mã Học Sinh).
- **Real-time Monitoring**: Monitor children's daily attendance, conduct score, and exam results.
- **Direct School Connection**: Receive official announcements and notifications from Homeroom Teachers.

---

# 🚀 Key Features

- **JWT Authentication & Token Renewal**: Access Token and Refresh Token security mechanism.
- **Role-Based Access Control (RBAC)**: Strict permission boundaries for Admin, Teacher, Student, and Parent.
- **Standardized High School Gradebook**: Automatic GPA calculation with exact Vietnamese Ministry of Education coefficients.
- **Attendance & Schedule System**: Period-based attendance tracking (Periods 1 to 10) with weekly timetables.
- **Class Roster & Transfer (Roster Management)**: Manage class lists and student class transfers effortlessly.
- **Education Portal & Public Guides**: Dedicated news portal linked with official education news articles and PDF policy guidelines.
- **Responsive & Modern UI**: Sleek dark/light theme options built with React 19, Tailwind CSS, and Lucide React icons.
- **Excel Data Export & Import**: Batch import/export student rosters and grade sheets via XLSX files.

---

# 🏗️ System Architecture

```text
       React 19 + Vite + Tailwind CSS (edulms-frontend)
                             │
                             ▼
                     Axios HTTP Client
                             │
                             ▼
             Express.js REST API (edulms-backend)
                             │
      ┌──────────────────────┴──────────────────────┐
      │  • JWT Authentication & Middleware          │
      │  • Express Validators & Controllers         │
      │  • Multer + Cloudinary Storage             │
      │  • Excel / Data Processing (XLSX)           │
      └──────────────────────┬──────────────────────┘
                             ▼
                MongoDB Database (Mongoose ODM)
```

---

# 🛠 Tech Stack

| Category | Technology | Description |
|-----------|------------|-------------|
| **Frontend Framework** | React 19, Vite | Fast HMR SPA building |
| **Styling & UI** | Tailwind CSS, Lucide React | Modern responsive design & vector icons |
| **Routing & Forms** | React Router DOM v7, React Hook Form | Declarative routing & structured forms |
| **Backend Framework** | Node.js, Express 5 | High-performance RESTful API server |
| **Database** | MongoDB, Mongoose ODM | Document-oriented database & schema modeling |
| **Authentication** | JWT (jsonwebtoken), bcryptjs | Secure password hashing & token validation |
| **File Storage** | Multer, Cloudinary | Media & document upload storage |
| **Data Import/Export** | SheetJS (XLSX) | Excel parsing and report generation |
| **HTTP Client** | Axios | Interceptor-based API request handler |
| **Deployment** | Docker, Docker Compose | Containerized application delivery |

---

# 📂 Project Structure

```text
Edu-LMS
│
├── edulms-backend/               # Express REST API Server
│   ├── src/
│   │   ├── config/               # Database & Cloudinary configurations
│   │   ├── controllers/          # Business logic controllers
│   │   ├── middleware/           # Auth, RBAC & error handling middlewares
│   │   ├── models/               # Mongoose schemas (User, Class, Grade, Subject, Gradebook...)
│   │   ├── routes/               # API route definitions
│   │   ├── services/             # Core service logic
│   │   └── server.js             # Express app entry point
│   ├── scripts/                  # Data seeding scripts
│   ├── package.json
│   └── .env.example
│
├── edulms-frontend/              # React 19 + Vite Client Application
│   ├── src/
│   │   ├── components/           # Common UI components (Header, Footer, Button, Modal...)
│   │   ├── context/              # React Context (AuthContext...)
│   │   ├── features/             # Feature modules (Admin, Teacher, Student, Auth...)
│   │   ├── pages/                # Public & Protected pages (EduPortal, SystemGuide, Terms...)
│   │   ├── router/               # App Router & ProtectedRoute wrappers
│   │   ├── services/             # API Axios client services
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.js
│
├── docker-compose.yml            # Docker orchestration configuration
└── README.md                     # Project documentation
```

---

# 🔐 Authentication

EduLMS implements secure authentication using JSON Web Tokens (JWT).

- **Access Token Authentication**: Short-lived tokens attached via Authorization headers.
- **Refresh Token Support**: Secure token refresh mechanism.
- **Role-Based Authorization**: Protected endpoints restricted to specific user roles.
- **Axios Interceptors**: Automatic token injection and session expiration handling.

### Supported User Roles:

1. **Administrator** (`admin`): Full system control & academic configuration.
2. **Teacher** (`teacher`): Subject teaching, grading, attendance & homeroom management.
3. **Student** (`student`): Coursework, assignment submission & score tracking.
4. **Parent** (`parent`): Academic monitoring & communication.

---

# 📚 Main Modules

## 1. User & Authentication Module
- Login, Register & Password Management
- User Profiles & Avatar Customization
- Student Code (Mã Học Sinh) Activation Flow

## 2. Academic Structure & Class Management
- Grade Levels (Khối 10, 11, 12) & Class Tree Structure
- Homeroom Teacher (GVCN) Assignment
- Student Class Roster & Transfer Management

## 3. Digital Gradebook & Evaluation (Sổ Điểm Điện Tử)
- Automated GPA Calculations
- Coefficient Rules: Coefficient 1 (Oral/15m), Coefficient 2 (1-period), Coefficient 3 (Semester)
- Student Conduct & Attendance Ratings

## 4. Assignment & Material System
- Teacher Lesson & PDF/Video Material Uploads
- Homework Assignment Creation & Submission Tracking
- Online Grading & Student Feedback

## 5. Public Education Portal & Guides
- Official Department of Education Announcements
- Direct Links to Authentic Educational News Articles
- Role-Based Interactive System Usage Manuals
- Production-Ready Privacy Policy & Terms of Service

---

# ⚙️ Installation & Setup

## Prerequisites

- **Node.js**: `v18.0.0` or higher
- **MongoDB**: `v6.0` or higher (Local instance or MongoDB Atlas)
- **npm**: `v9.0` or higher

---

## 1. Clone Repository

```bash
git clone https://github.com/minhchuong32/Edu-LMS.git
cd Edu-LMS
```

---

## 2. Backend Setup

```bash
cd edulms-backend
npm install
```

Create a `.env` file inside `edulms-backend`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/edulms
JWT_SECRET=your_super_secret_jwt_key
JWT_REFRESH_SECRET=your_super_secret_refresh_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Seed initial database data (optional):

```bash
npm run seed
```

Start the backend development server:

```bash
npm run dev
```

Backend API server will run at:

```
http://localhost:5000
```

---

## 3. Frontend Setup

```bash
cd ../edulms-frontend
npm install
```

Create a `.env` file inside `edulms-frontend`:

```env
VITE_API_URL=http://localhost:5000/api
```

Start the frontend development server:

```bash
npm run dev
```

Frontend application will run at:

```
http://localhost:5173
```

---

# 🐳 Docker Deployment

You can deploy the complete stack (Frontend, Backend, and MongoDB) using Docker Compose:

```bash
docker compose up --build -d
```

### Services Overview:

| Service | Container Name | URL / Port |
|----------|----------------|------------|
| **Frontend** | `edulms-frontend` | http://localhost:5173 |
| **Backend API** | `edulms-backend` | http://localhost:5000 |
| **Database** | `mongodb` | localhost:27017 |

---

# 📡 API Endpoints Overview

| Module | HTTP Method | Endpoint | Description |
|----------|-------------|----------|-------------|
| **Auth** | `POST` | `/api/auth/login` | Authenticate user & receive tokens |
| **Auth** | `POST` | `/api/auth/refresh` | Renew access token using refresh token |
| **Users** | `GET` | `/api/users` | List users with role filtering |
| **Grades** | `GET` / `POST` | `/api/academic/grades` | Manage grade levels |
| **Classes** | `GET` / `POST` | `/api/academic/classes` | Manage classes & homeroom teachers |
| **Subjects** | `GET` / `POST` | `/api/academic/subjects` | Manage curriculum subjects |
| **Assignments** | `GET` / `POST` | `/api/assignments` | Manage homework & submissions |
| **Gradebook** | `GET` / `PUT` | `/api/gradebook` | View & update digital gradebook scores |

---

# 📈 Future Roadmap

- 📱 Mobile App integration built with React Native.
- 🤖 AI-assisted essay grading and student performance analytics.
- 📹 Integrated Live Online Classroom & Video Conferencing.
- 🔔 Firebase Cloud Messaging (FCM) push notifications.
- 📊 Advanced PDF & Excel report export for school principals.

---

# 👨‍💻 Author

**Phạm Hán Minh Chương**

- **GitHub**: [minhchuong32](https://github.com/minhchuong32)
- **Email**: chuongminh3225@gmail.com

---

# 📄 License

This project is developed for educational and research purposes under the **MIT License**.
