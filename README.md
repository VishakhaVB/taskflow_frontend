# TaskFlow Frontend

A clean, responsive frontend for **TaskFlow**, a task and project management system built for students and professionals. TaskFlow solves scattered task tracking by centralizing projects, deadlines, and day-to-day work in one intuitive dashboard with secure authentication and real-time data storage.

---

## 🌍 Live Demo

**Frontend:** Coming soon (link will be added)
**Backend (API):** https://taskflow-backend-xoq1.onrender.com

---

## 🖼️ Screenshots

> Add real screenshots once available.

| Dashboard | Projects | Tasks |
|---|---|---|
| ![Dashboard](./assets/screenshots/dashboard.png) | ![Projects](./assets/screenshots/projects.png) | ![Tasks](./assets/screenshots/tasks.png) |

---

## 🧰 Tech Stack

| Category | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | Node.js, Express.js, MongoDB Atlas |
| Auth | JWT |
| API | REST |

---

## ✨ Features

- JWT-based secure authentication (login/signup)
- Create and manage projects
- Assign and track tasks within projects
- Deadline and priority tracking
- Dashboard overview of active tasks
- Responsive UI for desktop and mobile
- REST-driven data flow for scalability

---

## 📁 Folder Structure

```
frontend/
├── components/
│   ├── cards.js
│   ├── header.js
│   ├── modal.js
│   ├── sidebar.js
│   └── README.md
├── css/
│   ├── auth.css
│   ├── dashboard.css
│   └── ...
├── js/
│   ├── api.js
│   ├── app.js
│   ├── dashboard.js
│   └── ...
└── pages/
    ├── index.html
    ├── dashboard.html
    ├── projects.html
    ├── tasks.html
    └── ...
```

---

## ⚙️ Installation & Setup

```bash
# 1) Clone the repository
git clone https://github.com/VishakhaVB/taskflow.git

# 2) Open the frontend folder
cd taskflow/frontend
```

You can open the HTML files directly in the browser or run a local static server.

---

## ▶️ Usage

```bash
# Option 1: Open directly
Open pages/index.html in a browser

# Option 2: Use a local server (recommended)
npx serve .
```

Update the API base URL in `js/api.js` if your backend runs locally.

---

## 🔐 Environment Variables

No frontend environment variables required.

---

## 🚀 Deployment

You can deploy the frontend as a static site on:

- GitHub Pages
- Netlify
- Vercel
- Render (Static Sites)

General steps:

```bash
# 1) Build (not required for pure HTML/CSS/JS)
# 2) Upload or connect the repository to your host
# 3) Set the public root to /frontend
```

---

## 🛣️ Future Enhancements

- Drag-and-drop task reordering
- Activity timeline per project
- Team collaboration and invitations
- Notifications in real time (WebSockets)
- Dark mode and theme switcher

---

## 🤝 Contributing

Contributions are welcome.

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/new-feature`)
3. Commit changes (`git commit -m "Add new feature"`)
4. Push to branch (`git push origin feature/new-feature`)
5. Open a pull request

---

## 📄 License

This project is licensed under the **MIT License**.

---

## 👩‍💻 Author and Contact

**Vishakha Bhilwadkar**
GitHub: https://github.com/VishakhaVB
Email: vishakhabhilwadkar@gmail.com

---

## 🙌 Acknowledgements

- UI inspiration from modern task management tools
- MongoDB Atlas for reliable cloud data storage
