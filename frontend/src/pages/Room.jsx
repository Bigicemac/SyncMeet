import {
  useEffect, useState
} from "react";
import {
  useLocation, useNavigate, useParams
} from "react-router-dom";
import {
  useAuth
} from "../context/AuthContext";
import useRoom from "../hooks/useRoom";
import useRecorder from "../hooks/useRecorder";
import VideoTile from "../components/VideoTile";
import ChatPanel from "../components/ChatPanel";
import ParticipantsPanel from "../components/ParticipantsPanel";
import Controls from "../components/Controls";
import NotificationBell from "../components/NotificationBell";

export default function Room() {
  const { roomId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [pinnedId, setPinnedId] = useState(null); // ID of pinned participant ('local' or remote userId)

  useEffect(() => {
    if (!state?.admitted) {
      navigate(`/lobby/${roomId}`, { replace: true });
    }
  }, [state, roomId, navigate]);

  const recorder = useRecorder();

  const currentUserId = user?.id || user?._id;
  const currentUserName = user?.name || "User";

  const room = useRoom({
    roomId,
    token,
    currentUserId,
    currentUserName,
    initialMic: state?.mic ?? true,
    initialCamera: state?.camera ?? true,
    onKicked: () => navigate("/", { replace: true }),
  });
  const isHost = Boolean(
    room.hostId &&
    currentUserId &&
    String(room.hostId) === String(currentUserId),
  );
  const others = room.participants.filter(
    (p) => String(p.userId) !== String(currentUserId),
  );

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  // Compile list of all tiles
  const allTiles = [
    {
      id: "local",
      userId: currentUserId,
      stream: room.localStream,
      name: `${user?.name || "You"} (You)`,
      muted: true,
      mic: room.mic,
      camera: room.camera,
      sharing: room.sharing,
      isHost: isHost,
      isLocal: true,
    },
    ...others.map((p) => ({
      id: p.userId,
      userId: p.userId,
      stream: room.remoteStreams[p.userId],
      name: p.name,
      muted: false,
      mic: p.mic,
      camera: p.camera,
      sharing: p.screen,
      isHost: String(p.userId) === String(room.hostId),
      isLocal: false,
      onKick: isHost ? () => room.kick(p.userId) : undefined,
      onMute: isHost ? () => room.muteParticipant(p.userId) : undefined,
    })),
  ];

  const pinnedTile = allTiles.find((t) => t.id === pinnedId);

  // Waiting Room State
  if (room.isWaiting) {
    const formattedRoomId = roomId
      ? roomId.replace(/^(\d{3})(\d{3})(\d{4})$/, "$1-$2-$3")
      : roomId;

    return (
      <div className="wait-screen">
        <div className="wait-card">
          <div className="wait-spinner" />
          <h1>Waiting for the host</h1>
          <p>
            The host has been notified. You'll join automatically once you're
            admitted.
          </p>
          <div className="wait-chip">Meeting Room · {formattedRoomId}</div>
          <button
            className="wait-leave"
            onClick={() => navigate("/", { replace: true })}
          >
            Leave meeting
          </button>
        </div>
      </div>
    );
  }

  // Error / Rejected State
  if (room.error) {
    return (
      <div className="wait-screen">
        <div className="wait-card">
          <h1 style={{ color: "#f87171", margin: 0 }}>
            {room.error.includes("rejected")
              ? "Host declined entry"
              : "Unable to Join"}
          </h1>
          <p style={{ marginTop: 12 }}>{room.error}</p>
          <button
            className="wait-leave"
            style={{ marginTop: 28 }}
            onClick={() => navigate("/", { replace: true })}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const activeRemoteSharer = others.find((p) => p.screen);
  const activeRemoteSharerName = activeRemoteSharer?.name || "";
  const canToggleShare = room.sharing || isHost || !activeRemoteSharer;

  return (
    <div className="room">
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

      <div className="stage">
        {/* Top Header Controls Bar */}
        <div className="room-top-bar">
          <div className="room-title-info">
            <span className="room-live-badge">● LIVE</span>
            <span
              className="room-id-tag"
              style={{ cursor: "pointer" }}
              title="Click to copy Meeting ID"
              onClick={() => {
                const cleanId =
                  typeof roomId === "string"
                    ? roomId.replace(/[\s-]/g, "")
                    : String(roomId);
                navigator.clipboard.writeText(cleanId);
                showToast("Meeting ID copied to clipboard!");
              }}
            >
              Room ID: {roomId}
            </span>
            <span
              className="room-id-tag"
              style={{
                background: "rgba(37, 99, 235, 0.15)",
                color: "#60a5fa",
                border: "1px solid rgba(59, 130, 246, 0.3)",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              👥 {allTiles.length}{" "}
              {allTiles.length === 1 ? "Participant" : "Participants"}
            </span>
          </div>

          <div className="room-view-controls">
            <button
              className={`view-mode-btn ${!pinnedId ? "active" : ""}`}
              onClick={() => setPinnedId(null)}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
              Grid View
            </button>
            {pinnedTile && (
              <button className="view-mode-btn active spotlight">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  style={{ marginRight: 4 }}
                >
                  <line x1="12" y1="17" x2="12" y2="22"></line>
                  <path d="M5 17h14l-1.5-6 1.5-4H5l1.5 4z"></path>
                </svg>
                Pinned: {pinnedTile.name.split(" ")[0]}
              </button>
            )}
            <NotificationBell />
          </div>
        </div>

        {/* Host Join Requests Notification Bar */}
        {isHost && room.waitingQueue.length > 0 && (
          <div className="host-requests-wrapper">
            {room.waitingQueue.map((reqUser) => (
              <div key={reqUser.userId} className="host-request-clean">
                <div className="host-request-text">
                  <span className="host-request-name">{reqUser.name}</span>
                  <span className="host-request-msg">
                    wants to join the meeting
                  </span>
                </div>
                <div className="host-request-btns">
                  <button
                    className="btn-admit-clean"
                    onClick={() => room.admitParticipant(reqUser.userId)}
                  >
                    Admit
                  </button>
                  <button
                    className="btn-decline-clean"
                    onClick={() => room.rejectParticipant(reqUser.userId)}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Video Stage Layout (Grid vs Spotlight Pinned) */}
        {pinnedTile ? (
          <div className="spotlight-layout">
            <div className="spotlight-main">
              <VideoTile
                {...pinnedTile}
                isPinned={true}
                onPin={() => setPinnedId(null)}
              />
            </div>
            <div className="filmstrip-sidebar">
              {allTiles
                .filter((t) => t.id !== pinnedId)
                .map((t) => (
                  <VideoTile
                    key={t.id}
                    {...t}
                    isPinned={false}
                    onPin={() => setPinnedId(t.id)}
                    className="thumbnail-tile"
                  />
                ))}
            </div>
          </div>
        ) : (
          <div className="grid">
            {allTiles.map((t) => (
              <VideoTile
                key={t.id}
                {...t}
                isPinned={false}
                onPin={() => setPinnedId(t.id)}
              />
            ))}
          </div>
        )}
      </div>

      {showChat && (
        <aside className="side">
          <ChatPanel
            messages={room.messages}
            onSend={room.sendMessage}
            onClose={() => setShowChat(false)}
          />
        </aside>
      )}

      {showParticipants && (
        <aside className="side">
          <ParticipantsPanel
            participants={allTiles}
            isHost={isHost}
            currentUserId={user?.id}
            onKick={(userId) => room.kick(userId)}
            onMute={(userId) => room.muteParticipant(userId)}
            onMuteAll={() => room.muteAll()}
            onClose={() => setShowParticipants(false)}
          />
        </aside>
      )}

      <Controls
        mic={room.mic}
        camera={room.camera}
        sharing={room.sharing}
        showChat={showChat}
        showParticipants={showParticipants}
        participantCount={allTiles.length}
        onToggleMic={room.toggleMic}
        onToggleCamera={room.toggleCamera}
        onStartShare={room.startShare}
        onStopShare={room.stopShare}
        onToggleChat={() => {
          setShowChat(!showChat);
          if (!showChat) setShowParticipants(false);
        }}
        onToggleParticipants={() => {
          setShowParticipants(!showParticipants);
          if (!showParticipants) setShowChat(false);
        }}
        onLeave={() => {
          if (recorder.isRecording) recorder.stopRecording();
          navigate("/", { replace: true });
        }}
        onEndMeeting={() => {
          if (recorder.isRecording) recorder.stopRecording();
          room.endMeeting();
          navigate("/", { replace: true });
        }}
        isHost={isHost}
        sharerId={room.sharerId}
        userId={user?.id}
        isRecording={recorder.isRecording}
        recordingTime={recorder.recordingTime}
        onToggleRecord={() => {
          if (recorder.isRecording) {
            recorder.stopRecording();
            showToast("Meeting recording saved to Cloud Recordings!");
          } else {
            recorder.startRecording({
              stream: room.localStream,
              roomId,
              onSaved: () =>
                showToast(
                  "Recording saved! Check Cloud Recordings in Dashboard.",
                ),
            });
            showToast("Recording started...");
          }
        }}
      />
    </div>
  );
}
