import { useState } from "react";

export default function ParticipantsPanel({
  participants,
  isHost,
  currentUserId,
  onKick,
  onMute,
  onClose,
}) {
  const [openMenuId, setOpenMenuId] = useState(null);

  return (
    <div className="participants-panel">
      <div className="participants-header">
        <h3>Participants ({participants.length})</h3>
        {onClose && (
          <button
            className="icon-btn close-btn"
            onClick={onClose}
            title="Close participants"
          >
            ✕
          </button>
        )}
      </div>

      <div className="participants-list">
        {participants.map((p) => {
          const participantId = p.userId || p.id;
          const isMe =
            p.isLocal ||
            p.id === "local" ||
            (currentUserId && String(participantId) === String(currentUserId));
          const canControl = isHost && !isMe && !p.isHost;
          const userInitial = p.name ? p.name[0].toUpperCase() : "U";

          return (
            <div key={p.id} className="participant-item">
              <div className="participant-avatar">{userInitial}</div>

              <div className="participant-info">
                <div className="participant-name">
                  {p.name}
                  {p.isHost && <span className="role-tag host-tag">Host</span>}
                  {isMe && <span className="role-tag you-tag">You</span>}
                </div>
                <div className="participant-status-tags">
                  {p.sharing && (
                    <span className="status-tag sharing">Sharing Screen</span>
                  )}
                  {!p.mic && (
                    <span className="status-tag muted-tag">Muted</span>
                  )}
                </div>
              </div>

              <div className="participant-actions">
                {/* Mic indicator */}
                <span
                  className={`status-icon ${p.mic ? "on" : "off"}`}
                  title={p.mic ? "Mic On" : "Mic Off"}
                >
                  {p.mic ? (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    </svg>
                  ) : (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="2"
                    >
                      <line x1="1" y1="1" x2="23" y2="23" />
                      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                    </svg>
                  )}
                </span>

                {/* Camera indicator */}
                <span
                  className={`status-icon ${p.camera ? "on" : "off"}`}
                  title={p.camera ? "Camera On" : "Camera Off"}
                >
                  {p.camera ? (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polygon points="23 7 16 12 23 17 23 7" />
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                    </svg>
                  ) : (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="2"
                    >
                      <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  )}
                </span>

                {/* ── Overflow ⋯ menu for host ── */}
                {canControl && (
                  <div className="participant-overflow-wrap">
                    <button
                      className="participant-overflow-btn"
                      title="More options"
                      onClick={() =>
                        setOpenMenuId(
                          openMenuId === participantId ? null : participantId,
                        )
                      }
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <circle cx="5" cy="12" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="19" cy="12" r="2" />
                      </svg>
                    </button>

                    {openMenuId === participantId && (
                      <div className="participant-overflow-menu">
                        {onMute && (
                          <button
                            className="overflow-item"
                            onClick={() => {
                              onMute(participantId);
                              setOpenMenuId(null);
                            }}
                          >
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                            </svg>
                            {p.mic ? "Mute" : "Already Muted"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
