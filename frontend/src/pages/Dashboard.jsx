import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import NotificationBell from "../components/NotificationBell";
import { request } from "../lib/api";
import {
  getRecordings,
  deleteRecording,
  getPersistentRecordings,
  deletePersistentRecording,
} from "../lib/recordings";

export default function Dashboard() {
  const { token, user, logout } = useAuth();
  const { addNotification } = useNotifications();
  const navigate = useNavigate();

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    logout();
    navigate("/login", { replace: true });
  };

  // Modals state
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showRecordingsModal, setShowRecordingsModal] = useState(false);

  // Form & Data state
  const [inputMeetingId, setInputMeetingId] = useState("");
  const [scheduledMeetings, setScheduledMeetings] = useState([]);
  const [recordingsList, setRecordingsList] = useState([]);
  const [playingRec, setPlayingRec] = useState(null);
  const [loadingMeetings, setLoadingMeetings] = useState(true);
  const [copiedPmid, setCopiedPmid] = useState(false);
  const [copiedMeetingId, setCopiedMeetingId] = useState(null);
  const [toastMessage, setToastMessage] = useState("");
  const [error, setError] = useState("");

  // Schedule Form State
  const defaultScheduleTime = () => {
    const d = new Date(Date.now() + 3600000);
    d.setMinutes(0, 0, 0);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  };

  const [scheduleForm, setScheduleForm] = useState({
    title: `${user?.name || "User"}'s Meeting`,
    scheduledAt: defaultScheduleTime(),
    durationMinutes: 30,
  });

  const formattedPmid = user?.personalMeetingId
    ? user.personalMeetingId.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3")
    : "951 745 3380";

  const rawPmid = formattedPmid.replace(/\s+/g, "");

  // Load Scheduled Meetings from Backend
  const loadMeetings = async () => {
    setLoadingMeetings(true);
    try {
      const res = await request("/api/v1/meetings", { token });
      setScheduledMeetings(res.data || []);
    } catch {
      // Ignore background errors
    } finally {
      setLoadingMeetings(false);
    }
  };

  const loadRecordings = async () => {
    const persistent = await getPersistentRecordings();
    setRecordingsList(persistent.length > 0 ? persistent : getRecordings());
  };

  useEffect(() => {
    loadMeetings();
    loadRecordings();
  }, [token]);

  const handleDeleteRec = async (id) => {
    const updated = await deletePersistentRecording(id);
    setRecordingsList(updated || []);
    showToast("Recording deleted");
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const startInstantHost = async () => {
    setError("");
    try {
      const res = await request("/api/v1/rooms", {
        method: "POST",
        token,
        body: { customRoomId: rawPmid },
      });
      const targetId = res.data?.roomId || rawPmid;
      navigate(`/lobby/${targetId}`, { replace: true });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const cleanId = inputMeetingId.replace(/[\s-]/g, "").trim();
    if (!cleanId) return;
    try {
      await request(`/api/v1/rooms/${cleanId}`, { token });
      navigate(`/lobby/${cleanId}`, { replace: true });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const title = scheduleForm.title.trim() || `${user?.name}'s Meeting`;
      await request("/api/v1/meetings/schedule", {
        method: "POST",
        token,
        body: {
          title,
          scheduledAt: new Date(scheduleForm.scheduledAt).toISOString(),
          durationMinutes: Number(scheduleForm.durationMinutes) || 30,
        },
      });
      addNotification({
        title: "Meeting Scheduled",
        message: `"${title}" has been scheduled successfully.`,
        type: "meeting",
      });
      setShowScheduleModal(false);
      showToast("Meeting scheduled successfully!");
      loadMeetings();
    } catch (err) {
      setError(err.message);
    }
  };

  const cancelScheduledMeeting = async (meetingId) => {
    try {
      await request(`/api/v1/meetings/${meetingId}`, {
        method: "DELETE",
        token,
      });
      showToast("Scheduled meeting cancelled");
      loadMeetings();
    } catch (err) {
      showToast("Failed to cancel meeting: " + err.message);
    }
  };

  const copyPmid = () => {
    navigator.clipboard.writeText(rawPmid);
    setCopiedPmid(true);
    showToast("Meeting ID copied!");
    setTimeout(() => setCopiedPmid(false), 2000);
  };

  const copyMeetingLink = (roomId, meetingId) => {
    const cleanId = typeof roomId === "string" ? roomId : String(roomId);
    navigator.clipboard.writeText(cleanId);
    setCopiedMeetingId(meetingId);
    showToast("Meeting ID copied!");
    setTimeout(() => setCopiedMeetingId(null), 2000);
  };

  const userInitial = user?.name ? user.name[0].toUpperCase() : "P";

  return (
    <div className="dashboard-page">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-banner">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          {toastMessage}
        </div>
      )}

      {/* Top Header */}
      <header className="dash-header">
        <div className="app-brand-logo">SyncMeet</div>

        <div className="dash-nav">
          <span
            className="dash-nav-link"
            onClick={() => setShowScheduleModal(true)}
          >
            Schedule
          </span>
          <span
            className="dash-nav-link"
            onClick={() => setShowJoinModal(true)}
          >
            Join
          </span>
          <span className="dash-nav-link" onClick={startInstantHost}>
            Host
          </span>
          <NotificationBell />
          <div
            className="user-avatar-circle"
            title={user?.name}
            onClick={() => setShowAccountModal(true)}
          >
            {userInitial}
          </div>
        </div>
      </header>

      <div className="dash-body">
        {/* Left Sidebar */}
        <aside className="dash-sidebar">
          <div className="sidebar-item active">
            <span>Home</span>
          </div>
          <div className="sidebar-section-title">My products</div>
          <div
            className="sidebar-item"
            onClick={() => setShowScheduleModal(true)}
          >
            <span>Meetings</span>
          </div>
          <div
            className="sidebar-item"
            onClick={() => setShowRecordingsModal(true)}
          >
            <span>Recordings</span>
          </div>

          <div style={{ marginTop: "auto" }}>
            <div
              className="sidebar-item"
              onClick={() => setShowAccountModal(true)}
            >
              <span>My account</span>
            </div>
            <div
              className="sidebar-item"
              onClick={() => setShowAdminModal(true)}
            >
              <span>Admin</span>
            </div>
            <div className="sidebar-item logout-item" onClick={handleLogout}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span>Log out</span>
            </div>
          </div>
        </aside>

        {/* Main Workspace Area */}
        <main className="dash-main">
          <div className="dash-col-left">
            {/* Profile Card */}
            <div className="dash-card">
              <div className="profile-card-header">
                <div className="profile-info-group">
                  <div
                    className="profile-avatar-large"
                    onClick={() => setShowAccountModal(true)}
                    style={{ cursor: "pointer" }}
                  >
                    {userInitial}
                  </div>
                  <div>
                    <h2 className="profile-name">
                      {user?.name || "pratham sawant"}
                    </h2>
                  </div>
                </div>
              </div>
            </div>

            {/* Scheduled Meetings / Activity Card */}
            <div className="dash-card">
              <div className="card-title-row" style={{ marginBottom: 12 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>
                  Scheduled meetings
                </h3>
                <button
                  className="outline"
                  style={{ padding: "4px 10px", fontSize: 12 }}
                  onClick={() => setShowScheduleModal(true)}
                >
                  + Schedule
                </button>
              </div>

              {loadingMeetings ? (
                <div
                  style={{
                    padding: 20,
                    textAlign: "center",
                    color: "#94a3b8",
                    fontSize: 13,
                  }}
                >
                  Loading meetings...
                </div>
              ) : scheduledMeetings.length > 0 ? (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  {scheduledMeetings.map((m) => {
                    const formattedDate = new Date(
                      m.scheduledAt,
                    ).toLocaleString([], {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    const formattedRoom = m.roomId.replace(
                      /(\d{3})(\d{3})(\d{4})/,
                      "$1-$2-$3",
                    );

                    return (
                      <div key={m._id} className="meeting-item-card">
                        <div className="meeting-item-header">
                          <div>
                            <div className="meeting-item-title">{m.title}</div>
                            <div className="meeting-item-time">
                              <span>{formattedDate}</span>
                              <span className="meeting-duration-badge">
                                {m.durationMinutes || 30} mins
                              </span>
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                color: "#64748b",
                                marginTop: 4,
                              }}
                            >
                              Room: {formattedRoom}
                            </div>
                          </div>
                        </div>

                        <div className="meeting-item-actions">
                          <button
                            style={{ padding: "6px 14px", fontSize: 13 }}
                            onClick={() =>
                              navigate(`/lobby/${m.roomId}`, { replace: true })
                            }
                          >
                            Start meeting
                          </button>
                          <button
                            className="outline"
                            style={{ padding: "6px 12px", fontSize: 13 }}
                            onClick={() => copyMeetingLink(m.roomId, m._id)}
                          >
                            {copiedMeetingId === m._id
                              ? "ID Copied!"
                              : "Copy ID"}
                          </button>
                          <button
                            className="secondary danger"
                            style={{
                              padding: "6px 14px",
                              fontSize: 13,
                              background: "transparent",
                              border: "1px solid #ef4444",
                              color: "#f87171",
                            }}
                            onClick={() => cancelScheduledMeeting(m._id)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-activity-box">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ color: "#64748b" }}
                  >
                    <rect
                      x="3"
                      y="4"
                      width="18"
                      height="18"
                      rx="2"
                      ry="2"
                    ></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <p>No upcoming scheduled meetings</p>
                  <button
                    className="outline"
                    style={{ marginTop: 8, fontSize: 13 }}
                    onClick={() => setShowScheduleModal(true)}
                  >
                    Schedule your first meeting
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="dash-col-right">
            {/* Quick Actions Card */}
            <div className="dash-card">
              <div className="quick-actions-grid">
                <div
                  className="action-box"
                  onClick={() => setShowScheduleModal(true)}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ color: "#94a3b8" }}
                  >
                    <rect
                      x="3"
                      y="4"
                      width="18"
                      height="18"
                      rx="2"
                      ry="2"
                    ></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <span>Schedule</span>
                </div>

                <div
                  className="action-box"
                  onClick={() => setShowJoinModal(true)}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ color: "#94a3b8" }}
                  >
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                    <polyline points="10 17 15 12 10 7"></polyline>
                    <line x1="15" y1="12" x2="3" y2="12"></line>
                  </svg>
                  <span>Join</span>
                </div>

                <div
                  className="action-box highlight"
                  onClick={startInstantHost}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ color: "#3b82f6" }}
                  >
                    <polygon points="23 7 16 12 23 17 23 7"></polygon>
                    <rect
                      x="1"
                      y="5"
                      width="15"
                      height="14"
                      rx="2"
                      ry="2"
                    ></rect>
                  </svg>
                  <span>Host</span>
                </div>
              </div>

              <div className="pmid-banner">
                <div>
                  <div className="pmid-label">Personal meeting ID</div>
                  <div className="pmid-value">{formattedPmid}</div>
                </div>
                <button
                  className="outline"
                  style={{ padding: "6px 12px", fontSize: 12 }}
                  onClick={copyPmid}
                >
                  {copiedPmid ? "ID Copied!" : "Copy ID"}
                </button>
              </div>
            </div>

            {/* Meetings Card */}
            <div className="dash-card">
              <div className="card-title-row">
                <span>Quick Test</span>
              </div>

              <button
                className="outline"
                onClick={() => navigate(`/lobby/${rawPmid}`, { replace: true })}
              >
                Test audio and video
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* 1. Join Meeting Modal */}
      {showJoinModal && (
        <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Join a Meeting</h2>
              <button
                className="modal-close-btn"
                onClick={() => {
                  setShowJoinModal(false);
                  setError("");
                }}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: 13, color: "#94a3b8" }}>
              Enter a 10-digit Room ID or Personal Meeting ID to join.
            </p>

            {error && <div className="error-banner">{error}</div>}

            <form
              onSubmit={handleJoinSubmit}
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              <input
                placeholder="e.g. 951 745 3380 or Room ID"
                value={inputMeetingId}
                onChange={(e) => setInputMeetingId(e.target.value)}
                required
                autoFocus
              />
              <div className="row">
                <button type="submit" style={{ flex: 1 }}>
                  Join Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Schedule Meeting Modal */}
      {showScheduleModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowScheduleModal(false)}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Schedule a Meeting</h2>
              <button
                className="modal-close-btn"
                onClick={() => {
                  setShowScheduleModal(false);
                  setError("");
                }}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: 13, color: "#94a3b8" }}>
              Set date, time, and duration for your upcoming meeting.
            </p>

            {error && <div className="error-banner">{error}</div>}

            <form
              onSubmit={handleScheduleSubmit}
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >
              <div>
                <label
                  className="lobby-label"
                  style={{ marginBottom: 6, display: "block" }}
                >
                  Meeting Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Product Review & Sync"
                  value={scheduleForm.title}
                  onChange={(e) =>
                    setScheduleForm({ ...scheduleForm, title: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label
                  className="lobby-label"
                  style={{ marginBottom: 6, display: "block" }}
                >
                  Date & Start Time
                </label>
                <input
                  type="datetime-local"
                  value={scheduleForm.scheduledAt}
                  onChange={(e) =>
                    setScheduleForm({
                      ...scheduleForm,
                      scheduledAt: e.target.value,
                    })
                  }
                  required
                  style={{ colorScheme: "dark" }}
                />
              </div>

              <div>
                <label
                  className="lobby-label"
                  style={{ marginBottom: 6, display: "block" }}
                >
                  Duration
                </label>
                <select
                  className="lobby-select"
                  value={scheduleForm.durationMinutes}
                  onChange={(e) =>
                    setScheduleForm({
                      ...scheduleForm,
                      durationMinutes: e.target.value,
                    })
                  }
                  style={{
                    width: "100%",
                    padding: 12,
                    borderRadius: 8,
                    background: "#181d28",
                    border: "1px solid #2d3444",
                    color: "#fff",
                  }}
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">1 hour</option>
                </select>
              </div>

              <div className="row" style={{ marginTop: 8 }}>
                <button type="submit" style={{ width: "100%" }}>
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. My Account Modal */}
      {showAccountModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowAccountModal(false)}
        >
          <div
            className="account-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>My Account Profile</h2>
              <button
                className="modal-close-btn"
                onClick={() => setShowAccountModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="account-profile-box">
              <div className="account-avatar-large">{userInitial}</div>
              <div>
                <h3
                  style={{
                    fontSize: 18,
                    color: "#fff",
                    margin: 0,
                    fontWeight: 600,
                  }}
                >
                  {user?.name || "User"}
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    color: "#94a3b8",
                    margin: "4px 0 0 0",
                  }}
                >
                  {user?.email}
                </p>
              </div>
            </div>

            <div className="account-details-list">
              <div className="account-detail-row">
                <span className="account-detail-label">
                  Personal Meeting ID:
                </span>
                <strong
                  className="account-detail-val"
                  style={{ color: "#38bdf8" }}
                >
                  {formattedPmid}
                </strong>
              </div>
            </div>

            <div style={{ marginTop: 6 }}>
              <button
                className="logout-action-btn"
                style={{ width: "100%" }}
                onClick={handleLogout}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                Log out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Plan Details Modal */}
      {showPlanModal && (
        <div className="modal-overlay" onClick={() => setShowPlanModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>SyncMeet Workplace Plan</h2>
              <button
                className="modal-close-btn"
                onClick={() => setShowPlanModal(false)}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                background: "#161a22",
                padding: 16,
                borderRadius: 10,
                border: "1px solid #232833",
              }}
            >
              <h3 style={{ fontSize: 16, color: "#38bdf8", marginBottom: 6 }}>
                Active Workspace Features
              </h3>
              <p style={{ fontSize: 13, color: "#94a3b8" }}>
                You are on the full collaboration tier for team communication.
              </p>

              <ul
                style={{
                  marginTop: 12,
                  paddingLeft: 18,
                  color: "#cbd5e1",
                  fontSize: 13,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <li>Unlimited 1-on-1 real-time video meetings</li>
                <li>Group video calls up to 100 participants</li>
                <li>WebRTC Mesh HD Video & Audio streaming</li>
                <li>Screen Sharing & Real-time Text Chat</li>
                <li>Host Waiting Room & Request Approval</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 5. Admin Panel Modal */}
      {showAdminModal && (
        <div className="modal-overlay" onClick={() => setShowAdminModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Workspace Admin Settings</h2>
              <button
                className="modal-close-btn"
                onClick={() => setShowAdminModal(false)}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                background: "#161a22",
                padding: 14,
                borderRadius: 10,
                border: "1px solid #232833",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                fontSize: 13,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Workspace Name:</span>
                <strong style={{ color: "#fff" }}>SyncMeet Workspace</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Workspace Owner:</span>
                <strong style={{ color: "#fff" }}>{user?.name}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Waiting Room Control:</span>
                <strong style={{ color: "#22c55e" }}>Enforced</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Encryption:</span>
                <strong style={{ color: "#38bdf8" }}>
                  DTLS / SRTP (WebRTC)
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Cloud Recordings Modal */}
      {showRecordingsModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowRecordingsModal(false)}
        >
          <div
            className="modal-card"
            style={{ maxWidth: 560 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Cloud Recordings</h2>
              <button
                className="modal-close-btn"
                onClick={() => setShowRecordingsModal(false)}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 16 }}>
              Access past recorded meeting sessions and screen captures.
            </p>

            {recordingsList.length > 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  maxHeight: 380,
                  overflowY: "auto",
                }}
              >
                {recordingsList.map((rec) => (
                  <div
                    key={rec.id}
                    style={{
                      background: "#161a22",
                      padding: 14,
                      borderRadius: 10,
                      border: "1px solid #232833",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div
                        style={{ fontWeight: 600, color: "#fff", fontSize: 14 }}
                      >
                        {rec.title}
                      </div>
                      <div
                        style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}
                      >
                        {rec.date} · {rec.duration} · {rec.size}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        style={{ padding: "6px 12px", fontSize: 12 }}
                        onClick={() => setPlayingRec(rec)}
                      >
                        Play
                      </button>
                      <a
                        href={rec.videoUrl}
                        download={`${rec.title}.webm`}
                        className="button outline"
                        style={{
                          padding: "6px 12px",
                          fontSize: 12,
                          textDecoration: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          borderRadius: 8,
                          border: "1px solid #334155",
                          color: "#e2e8f0",
                          background: "#1e293b",
                        }}
                      >
                        Download
                      </a>
                      <button
                        className="secondary danger"
                        style={{
                          padding: "6px 10px",
                          fontSize: 12,
                          background: "transparent",
                          border: "1px solid #ef4444",
                          color: "#f87171",
                        }}
                        onClick={() => handleDeleteRec(rec.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="empty-activity-box"
                style={{
                  background: "#161a22",
                  padding: 24,
                  borderRadius: 10,
                  border: "1px solid #232833",
                }}
              >
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ color: "#64748b" }}
                >
                  <path d="M23 7l-7 5 7 5V7z"></path>
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                </svg>
                <p style={{ color: "#cbd5e1", marginTop: 8 }}>
                  No cloud recordings found
                </p>
                <span style={{ fontSize: 12, color: "#64748b" }}>
                  Recordings started in meeting rooms will be saved here
                  automatically.
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Video Player Modal */}
      {playingRec && (
        <div className="modal-overlay" onClick={() => setPlayingRec(null)}>
          <div
            className="modal-card"
            style={{ maxWidth: 640 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>{playingRec.title}</h2>
              <button
                className="modal-close-btn"
                onClick={() => setPlayingRec(null)}
              >
                ✕
              </button>
            </div>
            <div style={{ marginTop: 12 }}>
              <video
                src={playingRec.videoUrl}
                controls
                autoPlay
                style={{ width: "100%", borderRadius: 10, background: "#000" }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowLogoutModal(false)}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 380 }}
          >
            <div className="modal-header">
              <h2>Confirm Log out</h2>
              <button
                className="modal-close-btn"
                onClick={() => setShowLogoutModal(false)}
              >
                ✕
              </button>
            </div>
            <p
              style={{
                fontSize: 14,
                color: "#94a3b8",
                marginTop: 8,
                marginBottom: 20,
              }}
            >
              Are you sure you want to log out of SyncMeet?
            </p>
            <div className="row" style={{ gap: 10 }}>
              <button
                type="button"
                className="secondary"
                style={{ flex: 1, padding: "12px 16px" }}
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="danger"
                style={{ flex: 1, padding: "12px 16px" }}
                onClick={confirmLogout}
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
