# Online College Document Request and Tracking System

This repository contains an online system for college students to request official documents (such as bonafide certificates, transcripts, completion certificates) and for administrators to review, approve, and prepare those documents. The system includes a Node.js + Express backend and a React frontend.

## Project structure

- `backend/` — Express API server, MongoDB models, routes, and seed scripts
- `frontend/` — React single-page application (Create React App)
- `build/` — production frontend build (if produced)
- `uploads/` — stored uploaded documents (development)

## Key features

- Student authentication and profiles
- Request creation with optional file upload
- Admin dashboard for request management
- Email notifications for status changes and ready documents
- File storage served from backend `/uploads` endpoint

## Tech stack

- Backend: Node.js, Express, Mongoose (MongoDB), nodemailer
- Frontend: React, React Router, Axios, Bootstrap

## Requirements

- Node.js (v16+ recommended)
- npm
- MongoDB (local or Atlas)

## Backend — setup & run

1. Open a terminal and go to `backend/`:

```powershell
cd backend
```

2. Install dependencies:

```powershell
npm install
```

3. Create a `.env` file in `backend/` with the following variables (example):

```
MONGO_URI=mongodb://localhost:27017/college-portal
JWT_SECRET=your_jwt_secret
PORT=5000
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-email-password-or-app-password
FRONTEND_URL=http://localhost:3000
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

4. Seed example users and documents (optional):

```powershell
npm run seed
npm run seed:documents
```

5. Start the backend in development mode:

```powershell
npm run dev
```

The server listens on `PORT` (default 5000) and provides endpoints under `/api`.

## Frontend — setup & run

1. Open a new terminal and go to `frontend/`:

```powershell
cd frontend
```

2. Install dependencies:

```powershell
npm install
```

3. (Optional) Create `frontend/.env` and set the API URL:

```
REACT_APP_API_URL=http://localhost:5000/api
```

4. Start the frontend:

```powershell
npm start
```

The React dev server runs on port 3000 by default.

## API overview (selected endpoints)

- `POST /api/auth/login` — login and receive JWT
- `GET /api/users/me` — get current user (send `x-auth-token` header)
- `POST /api/requests` — create a new document request
- `GET /api/requests` — list requests (admin/student depends on token)
- `POST /api/documents` — upload/create documents (admin)

(See `backend/routes/` for full list and details.)

## Environment variables summary

Backend:
- `MONGO_URI` — MongoDB connection string
- `JWT_SECRET` — JWT signing secret
- `PORT` — backend port
- `EMAIL_USER` / `EMAIL_PASS` — credentials for sending email notifications
- `FRONTEND_URL` — used in email links
- `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` — for PDF hosting

Frontend:
- `REACT_APP_API_URL` — base URL of backend API

## Contributing

Fork, create a branch, and open a pull request. Include clear descriptions and keep frontend and backend changes separated.

## License

Add an appropriate license file (e.g., MIT) for the project.
