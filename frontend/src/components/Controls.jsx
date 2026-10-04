export default function Controls({
  mic,
  camera,
  sharing,
  showChat,
  showParticipants,
  participantCount = 1,
  onToggleMic,
  onToggleCamera,
  onStartShare,
  onStopShare,
  onToggleChat,
  onToggleParticipants,
  onLeave,
  onEndMeeting,
  isHost = false,
  sharerId = null,
  userId = null,
  isRecording = false,
  recordingTime = "00:00",
  onToggleRecord,
}) {
  const isSharer = Boolean(
    sharerId && userId && String(sharerId) === String(userId),
  );

  return (
    <div className="controls">
      {/* Mic Button */}
      <button
        className={mic ? "ctrl-btn active" : "ctrl-btn muted"}
        onClick={onToggleMic}
        title={mic ? "Mute Mic" : "Unmute Mic"}
      >
        {mic ? (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
          </svg>
        ) : (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="1" y1="1" x2="23" y2="23"></line>
            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
            <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
          </svg>
        )}
        <span>{mic ? "Mute" : "Unmute"}</span>
      </button>

      {/* Camera Button */}
      <button
        className={camera ? "ctrl-btn active" : "ctrl-btn muted"}
        onClick={onToggleCamera}
        title={camera ? "Turn Off Camera" : "Turn On Camera"}
      >
        {camera ? (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polygon points="23 7 16 12 23 17 23 7"></polygon>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
          </svg>
        ) : (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
          </svg>
        )}
        <span>{camera ? "Stop Video" : "Start Video"}</span>
      </button>

      {/* Screen Share Button */}
      {!sharerId && (
        <button
          className="ctrl-btn"
          onClick={onStartShare}
          title="Share screen"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
          </svg>
          <span>Share Screen</span>
        </button>
      )}

      {sharerId && (isSharer || isHost) && (
        <button
          className="ctrl-btn active warning"
          onClick={onStopShare}
          title="Stop sharing"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
          </svg>
          <span>Stop Sharing</span>
        </button>
      )}

      {/* Record Meeting Button */}
      {onToggleRecord && (
        <button
          className={
            isRecording ? "ctrl-btn record-active" : "ctrl-btn record-btn"
          }
          onClick={onToggleRecord}
          title={isRecording ? "Stop Recording" : "Start Meeting Recording"}
        >
          {isRecording ? (
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="rec-pulse-dot"></span>
              REC {recordingTime}
            </span>
          ) : (
            <>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <circle cx="12" cy="12" r="4" fill="#ef4444"></circle>
              </svg>
              <span>Record</span>
            </>
          )}
        </button>
      )}

      {/* Participants Button */}
      {onToggleParticipants && (
        <button
          className={showParticipants ? "ctrl-btn active" : "ctrl-btn"}
          onClick={onToggleParticipants}
          title="Toggle Participants List"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          <span>Participants ({participantCount})</span>
        </button>
      )}

      {/* Chat Button */}
      <button
        className={showChat ? "ctrl-btn active" : "ctrl-btn"}
        onClick={onToggleChat}
        title="Toggle Chat"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <span>Chat</span>
      </button>

      {/* Role-based End Meeting / Leave Button */}
      {isHost ? (
        <button
          className="ctrl-btn danger leave-btn"
          onClick={onEndMeeting}
          title="End meeting for all"
        >
          End meeting for all
        </button>
      ) : (
        <button
          className="ctrl-btn danger leave-btn"
          onClick={onLeave}
          title="Leave"
        >
          Leave
        </button>
      )}
    </div>
  );
}
