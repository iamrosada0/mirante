

# Mirante - Project Management App

**Mirante** is a full-featured project management application developed as part of a practical coding challenge. Built with **Next.js** and **Firebase**, it offers a modern UI and powerful tools for team collaboration, task tracking, and project organization.

## 📌 Description

Mirante allows users to create, organize, collaborate on, and monitor the progress of projects. It supports task assignments, deadlines, status updates, and real-time collaboration — all in a clean and responsive interface.

## 🚀 Features

### 🔐 Authentication

- Secure authentication using Firebase Auth
- User registration, login, and logout

### 🖥️ UI Pages

- **Home/Dashboard**: View all your projects and progress summaries
- **Project Details**: Overview with description, members, tasks, and deadlines
- **Project Editor**: Create/edit projects (title, description, dates, members)
- **Task Editor**: Create/edit tasks (title, description, responsible, status, due dates)
- **Drag & Drop**: Reorder tasks and set priorities easily

### ✅ Functional Highlights

- Create and manage projects and tasks
- Assign tasks with statuses: In Progress, Completed, Overdue
- Real-time updates with Firestore
- Notifications for deadlines and changes
- Comments and task updates for collaboration
- Role-based permissions (admin, member, viewer)

## 🧰 Tech Stack

- **Frontend**: React.js / Next.js
- **Auth**: Firebase Authentication
- **Database**: Firebase Firestore
- **UI**: Tailwind CSS, Shadcn UI
- **Testing**: React Testing Library, Jest

## ⚙️ Getting Started

### Prerequisites

- Node.js >= 18
- Firebase project with Auth & Firestore enabled

### Clone the repository

```bash
git clone https://github.com/iamrosada0/mirante.git
cd mirante
npm install
````

### Configure Environment Variables

Create a `.env.local` file and add your Firebase configuration:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### Start the development server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to use the app locally.

## 🧪 Testing

```bash
npm run test
```

Run unit and integration tests using Jest and React Testing Library.

## 🚀 Deployment

Recommended deployment options:

* [Vercel](https://vercel.com/) – optimized for Next.js
* Firebase Hosting
* Netlify

## 📇 Contact

* **Developer:** Luis De Água Rosada
* **Repository:** [github.com/iamrosada0/mirante](https://github.com/iamrosada0/mirante)
* **Challenge Contact:**

  * [Aristides Chalo on LinkedIn](https://www.linkedin.com/in/aristideschalo)
  * 📧 [aristides.chalo@statementmc.com](mailto:aristides.chalo@statementmc.com)

---

Feel free to fork, contribute, or suggest improvements!



