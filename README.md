# HireSphere – Campus Placement Management Platform

HireSphere is a **MERN stack web application** designed to streamline university campus placements by replacing manual spreadsheets and email coordination with a centralized system.

The platform allows **placement administrators to manage company drives** while enabling **students to view opportunities and submit applications easily**.

---

## Features

### Admin
- Admin registration with **unique university secret code generation**
- View students registered under the university placement pool
- Create and manage **company placement drives**
- Add **custom application forms** for companies
- View student submissions
- Automatic **email notifications to students** when a new company is posted

### Student
- Register using the **university secret code**
- View available companies
- Submit applications with **resume uploads**
- Fill company-specific application forms
- Manage profile and resume

---

## Tech Stack

**Frontend**
- React.js

**Backend**
- Node.js  
- Express.js

**Database**
- MongoDB (Mongoose)

**Other Tools**
- JWT Authentication  
- Nodemailer (Email Notifications)

---

## Project Structure

```
backend/
│
├── controllers/
├── models/
├── routes/
├── middlewares/
├── config/
└── server.js

frontend/
│
├── components/
├── pages/
├── services/
└── context/
```

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/hiresphere.git
```

### 2. Install dependencies

Backend
```bash
cd backend
npm install
```

Frontend
```bash
cd frontend
npm install
```

### 3. Create `.env` file in backend

```
MONGO_URI=your_mongodb_connection
JWT_SECRET=your_secret
EMAIL_USER=your_email
EMAIL_PASS=your_email_password
```

### 4. Run the application

Backend
```bash
npm start
```

Frontend
```bash
npm run dev
```

---

## Author

Durgesh Khushlani, 2026
