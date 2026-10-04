# SyncMeet

a real-time collaboration workspace where authenticated users can create and join rooms to communicate and collaborate. The platform should combine live video, audio, screen sharing, participant management, and real-time chat into a single interactive workspace.

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


