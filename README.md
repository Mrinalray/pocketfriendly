# 💸 PocketFriendly

> **Group Trip Expense Splitter —**
> <p align="center">
  <img src="Assets/logo.png" alt="PocketFriendly Logo" width="1000"/>
</p>
A full-stack Node.js + Express REST API to manage group trip expenses, split bills fairly, and keep track of who owes whom. Built with MongoDB, JWT auth, and email notifications.

---

## 🚀 Features

- 🔐 **User Authentication** — Register, login & secure routes with JWT
- 👥 **Group Management** — Create and manage trip groups
- 💰 **Expense Tracking** — Add, update, and delete shared expenses
- ⚖️ **Smart Splitting** — Automatically calculate who owes whom
- 📧 **Email Notifications** — Notify members via Nodemailer
- 🛡️ **Security** — Rate limiting, Helmet, CORS, bcrypt password hashing
- 🌱 **Seed Utility** — Quickly seed the DB with test data

---

## 🛠️ Tech Stack

| Layer        | Technology                          |
|--------------|-------------------------------------|
| Runtime      | Node.js ≥ 18                        |
| Framework    | Express.js                          |
| Database     | MongoDB (via Mongoose)              |
| Auth         | JSON Web Tokens (JWT) + bcryptjs    |
| Email        | Nodemailer                          |
| Security     | Helmet, express-rate-limit, CORS    |
| Dev Tools    | Nodemon, Morgan                     |
| Frontend     | Vanilla JS, HTML5, CSS3             |

---

## 📁 Project Structure

```
pocketfriendly/
├── config/          # DB connection & config
├── controllers/     # Route handler logic
├── middleware/       # Auth & error middleware
├── models/          # Mongoose schemas (User, Group, Expense)
├── routes/          # API route definitions
├── utils/           # Helpers & seed script
├── index.html       # Frontend entry point
├── script.js        # Frontend JavaScript
├── style.css        # Frontend styles
├── server.js        # App entry point
└── package.json
```

---
## 📸 Dashboard Preview
![Dashboard](Assets/dashboard.png)
## ⚙️ Getting Started

### Prerequisites

- Node.js **v18+**
- MongoDB (local or [MongoDB Atlas](https://www.mongodb.com/atlas))

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Mrinalray/pocketfriendly.git
cd pocketfriendly

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env
```

### Environment Variables

Create a `.env` file in the root directory:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/pocketfriendly
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# Nodemailer (optional)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your_email@gmail.com
MAIL_PASS=your_app_password
```

### Run the App

```bash
# Development (with hot reload)
npm run dev

# Production
npm start

# Seed the database with sample data
npm run seed
```

The server runs at `http://localhost:5000` by default.

---

## 📡 API Endpoints

### Auth
| Method | Endpoint             | Description        |
|--------|----------------------|--------------------|
| POST   | `/api/auth/register` | Register a user    |
| POST   | `/api/auth/login`    | Login & get token  |

### Groups
| Method | Endpoint             | Description           |
|--------|----------------------|-----------------------|
| GET    | `/api/groups`        | Get all user groups   |
| POST   | `/api/groups`        | Create a group        |
| GET    | `/api/groups/:id`    | Get group by ID       |
| DELETE | `/api/groups/:id`    | Delete a group        |

### Expenses
| Method | Endpoint                        | Description              |
|--------|---------------------------------|--------------------------|
| GET    | `/api/expenses/:groupId`        | List expenses in a group |
| POST   | `/api/expenses`                 | Add a new expense        |
| PUT    | `/api/expenses/:id`             | Update an expense        |
| DELETE | `/api/expenses/:id`             | Delete an expense        |
| GET    | `/api/expenses/:groupId/settle` | Get settlement summary   |

> All protected routes require `Authorization: Bearer <token>` in headers.

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add your feature'`
4. Push to branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **ISC License**.

---



---

<p align="center">Made with ❤️ by <a href="https://github.com/Mrinalray">Mrinalray</a></p>
