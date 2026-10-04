# SyncMeet

A real-time video meeting app: login, create or join rooms, video call, screen share and chat.

**Stack:** React, Node.js, Express, Socket.IO, WebRTC, MongoDB

## Setup

Create `backend/.env`:

```env
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/syncmeet
JWT_SECRET=your_secret_key
CLIENT_URL=http://localhost:5173
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:4000
```


