import { useEffect, useRef, useState } from "react";

export default function VideoTile({
  stream,
  name,
  muted,
  mic,
  camera,
  sharing,
  isHost,
  isLocal,
  onKick,
  onMute,
  isPinned,
  onPin,
  className = "",
}) {
  const videoRef = useRef(null);
  const tileRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream || null;
      }
      if (camera || sharing) videoRef.current.play().catch(() => {});
    }
  }, [stream, camera, sharing]);

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (!tileRef.current?.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const isMirrored = !sharing;

  const toggleFullscreen = (e) => {
    e.stopPropagation();
    if (!document.fullscreenElement) {
      tileRef.current?.requestFullscreen?.() ??
        tileRef.current?.webkitRequestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  // Show overflow menu only if host can mute this remote tile
  const showMenu = !isLocal && Boolean(onMute);

  return (
    <div
      ref={tileRef}
      className={`tile ${isPinned ? "pinned-tile" : ""} ${className}`}
      onDoubleClick={onPin}
      title="Double click to pin / unpin"
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted || !mic}
        className={sharing ? "screen-share" : "camera-feed"}
        style={{
          display: !camera && !sharing ? "none" : "block",
          transform: isMirrored ? "scaleX(-1)" : "none",
          WebkitTransform: isMirrored ? "scaleX(-1)" : "none",
        }}
      />
      {!camera && !sharing && (
        <div className="avatar">{name?.[0]?.toUpperCase()}</div>
      )}

      {/* Muted badge */}
      {!mic && (
        <div className="tile-muted-badge" title="Microphone muted">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
            <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </div>
      )}

      <div className="label">
        {name}
        {isHost ? " (Host)" : ""}
        {sharing ? " · sharing screen" : ""}
      </div>

      <div className="tile-top-actions">
        {onPin && (
          <button
            className={`pin-action-btn ${isPinned ? "active" : ""}`}
            title={isPinned ? "Unpin view" : "Pin participant view"}
            onClick={(e) => {
              e.stopPropagation();
              onPin();
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              style={{ marginRight: 4 }}
            >
              <line x1="12" y1="17" x2="12" y2="22" />
              <path d="M5 17h14l-1.5-6 1.5-4H5l1.5 4z" />
            </svg>
            {isPinned ? "Pinned" : "Pin"}
          </button>
        )}
        <button
          className="fullscreen-action-btn"
          title="Toggle Fullscreen"
          onClick={toggleFullscreen}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
          >
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
        </button>

        {/* ── Overflow menu (⋯) for host controls ── */}
        {showMenu && (
          <div className="tile-overflow-wrap">
            <button
              className="tile-overflow-btn"
              title="More options"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((v) => !v);
              }}
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

            {menuOpen && (
              <div
                className="tile-overflow-menu"
                onClick={(e) => e.stopPropagation()}
              >
                {onMute && (
                  <button
                    className="overflow-item"
                    onClick={() => {
                      onMute();
                      setMenuOpen(false);
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
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                    {mic ? "Mute" : "Muted"}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
