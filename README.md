# SyncMeet — Real-time Collaboration & Video Meeting Workspace

SyncMeet is a full-stack, real-time collaboration and video meeting platform built with Node.js, Express, Socket.IO, WebRTC mesh networking, and React + Vite.

---

## Architecture & Communication

1. **REST API (Express)**: Handles user registration, authentication (JWT), room creation, and room lookup.
2. **Socket.IO (Real-time Signaling)**: Handles real-time room joining, chat messaging, media toggling (mic, camera, screen share), host actions (kick participant), and WebRTC SDP offer/answer/ICE candidate signaling.
3. **WebRTC Mesh Networking**: Audio, video, and screen sharing streams travel peer-to-peer (browser-to-browser) directly without passing media through the server.

---

## Tech Stack

* **Backend**: Node.js, Express 5, Socket.IO 4, Mongoose 9, MongoDB Atlas, Helmet, Express Rate Limit, JWT, Bcrypt
* **Frontend**: React 18, Vite 5, React Router DOM 6, Socket.IO Client 4, Vanilla CSS (Dark Glassmorphism)
* **DevOps**: Docker, Docker Compose, Nginx (Alpine)

---

## How to Run Locally

### Option A: Standard NPM Commands (Recommended for Development)

1. **Start Backend**:
   ```bash
   npm start
   ```
   *Runs on `http://localhost:4000`*

2. **Start Frontend** (in a second terminal):
   ```bash
   cd frontend
   npm run dev
   ```
   *Runs on `http://localhost:5173`*

---

### Option B: Docker Compose (Full Stack Production Containerization)

Ensure Docker Desktop is running, then run:

```bash
docker compose up --build
```

Access the application at `http://localhost:5173`.

---

## Environment Variables

### Backend (`backend/.env`)
```env
PORT=4000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/?appName=Cluster0
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:4000
```

---

## Socket.IO Real-time Events

### Client ➔ Server
* `join-room` `{ roomId }` (with acknowledgment callback)
* `leave-room`
* `chat-message` `{ text }`
* `media-state` `{ mic, camera, screen }`
* `kick-participant` `{ userId }`
* `offer` / `answer` / `ice-candidate` `{ to, data }`

### Server ➔ Client
* `participant-joined` `participantObject`
* `participant-left` `{ userId }`
* `media-state` `{ userId, mic, camera, screen }`
* `chat-message` `{ userId, name, text, timestamp }`
* `kicked`
* `offer` / `answer` / `ice-candidate` `{ from, userId, data }`
