import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { request } from "../lib/api";

export default function Lobby() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [displayName, setDisplayName] = useState(user?.name || "Guest");
  const [hostName, setHostName] = useState("Loading...");
  const [mic, setMic] = useState(true);
  const [camera, setCamera] = useState(true);
  const [audioDevices, setAudioDevices] = useState([]);
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedAudio, setSelectedAudio] = useState("");
  const [selectedVideo, setSelectedVideo] = useState("");
  const [error, setError] = useState("");
  const [loadingRoom, setLoadingRoom] = useState(true);

  // Global cleanup when user leaves the Lobby
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Fetch Room Info
  useEffect(() => {
    let mounted = true;
    request(`/api/v1/rooms/${roomId}`, { token })
      .then((res) => {
        if (!mounted) return;
        if (res.data?.host?.name) {
          setHostName(res.data.host.name);
        } else {
          setHostName("Host");
        }
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.message || "Room not found");
      })
      .finally(() => {
        if (mounted) setLoadingRoom(false);
      });
    return () => {
      mounted = false;
    };
  }, [roomId, token]);

  // Camera & Mic Media Setup
  useEffect(() => {
    let active = true;
    const constraints = {
      audio: selectedAudio ? { deviceId: { exact: selectedAudio } } : true,
      video: selectedVideo ? { deviceId: { exact: selectedVideo } } : true,
    };

    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((stream) => {
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;

        // Enumerate devices
        navigator.mediaDevices.enumerateDevices().then((devices) => {
          if (!active) return;
          const audioInputs = devices.filter((d) => d.kind === "audioinput");
          const videoInputs = devices.filter((d) => d.kind === "videoinput");
          setAudioDevices(audioInputs);
          setVideoDevices(videoInputs);
          if (!selectedAudio && audioInputs.length)
            setSelectedAudio(audioInputs[0].deviceId);
          if (!selectedVideo && videoInputs.length)
            setSelectedVideo(videoInputs[0].deviceId);
        });
      })
      .catch(() => {
        if (active) setError("Camera or microphone access was denied");
      });

    return () => {
      active = false;
    };
  }, [selectedAudio, selectedVideo]);

  const toggleMic = () => {
    const next = !mic;
    streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = next));
    setMic(next);
  };

  const stopCamera = () => {
    const stream = streamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((track) => {
      track.stop();
      stream.removeTrack(track);
    });
    setCamera(false);
  };

  const startCamera = async () => {
    try {
      const constraints = {
        video: selectedVideo ? { deviceId: { exact: selectedVideo } } : true,
      };
      const camStream = await navigator.mediaDevices.getUserMedia(constraints);
      const newTrack = camStream.getVideoTracks()[0];
      if (!streamRef.current) {
        streamRef.current = new MediaStream();
      }
      streamRef.current.addTrack(newTrack);
      if (videoRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      setCamera(true);
    } catch (err) {
      console.error("Camera turn-on error:", err);
    }
  };

  const toggleCamera = () => (camera ? stopCamera() : startCamera());

  const sendRequestToJoin = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    navigate(`/room/${roomId}`, {
      replace: true,
      state: {
        admitted: true,
        mic,
        camera,
        displayName: displayName.trim() || user?.name || "Guest",
      },
    });
  };

  const formattedRoomId = roomId.includes("-")
    ? roomId
    : roomId.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");

  return (
    <div className="auth-page">
      <div className="auth-header" style={{ marginBottom: 24 }}>
        <div className="app-brand-logo">SyncMeet</div>
      </div>

      <div className="lobby-container-card">
        {/* Left Form Column */}
        <div className="lobby-form-col">
          <div className="auth-title-group">
            <h1>Waiting room</h1>
            <p>Check your camera and mic, then ask to join.</p>
          </div>

          <div className="lobby-room-info-box">
            <div className="lobby-room-title">Meeting Room</div>
            <div className="lobby-room-sub">
              Host: <strong>{hostName}</strong> · Room {formattedRoomId}
            </div>
          </div>

          {error && <div className="error-banner">{error}</div>}

          <div className="lobby-input-group">
            <label className="lobby-label">Your name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Guest"
            />
          </div>

          <div className="lobby-select-row">
            <div className="lobby-input-group">
              <label className="lobby-label">Microphone</label>
              <select
                className="lobby-select"
                value={selectedAudio}
                onChange={(e) => setSelectedAudio(e.target.value)}
              >
                {audioDevices.length > 0 ? (
                  audioDevices.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId}>
                      {d.label || `Microphone ${i + 1}`}
                    </option>
                  ))
                ) : (
                  <option value="">Default mic</option>
                )}
              </select>
            </div>

            <div className="lobby-input-group">
              <label className="lobby-label">Camera</label>
              <select
                className="lobby-select"
                value={selectedVideo}
                onChange={(e) => setSelectedVideo(e.target.value)}
              >
                {videoDevices.length > 0 ? (
                  videoDevices.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId}>
                      {d.label || `Camera ${i + 1}`}
                    </option>
                  ))
                ) : (
                  <option value="">Built-in camera</option>
                )}
              </select>
            </div>
          </div>

          <div className="row" style={{ marginTop: 6 }}>
            <button
              className="send-request-btn"
              style={{ flex: 1 }}
              onClick={sendRequestToJoin}
              disabled={loadingRoom}
            >
              Send request
            </button>
            <button
              type="button"
              className="secondary"
              style={{ padding: "14px 20px", borderRadius: 10, fontSize: 15 }}
              onClick={() => navigate("/", { replace: true })}
            >
              Cancel
            </button>
          </div>

          <p className="lobby-help-text">
            The host will see your request and let you in.
          </p>
        </div>

        {/* Right Camera Preview Column */}
        <div className="lobby-preview-col">
          <div className="preview-top-bar">
            <span>Camera preview</span>
          </div>

          <div className="preview-video-container">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                display: camera ? "block" : "none",
                transform: "none",
                WebkitTransform: "none",
              }}
            />
            {!camera && (
              <div className="preview-avatar">
                {(displayName || "G")[0].toUpperCase()}
              </div>
            )}
            <div className="preview-user-pill">{displayName || "Guest"}</div>
          </div>

          <div className="preview-controls-row">
            <button
              type="button"
              className={`circle-control-btn ${!mic ? "off" : ""}`}
              onClick={toggleMic}
              title={mic ? "Mute Microphone" : "Unmute Microphone"}
            >
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
            </button>

            <button
              type="button"
              className={`circle-control-btn ${!camera ? "off" : ""}`}
              onClick={toggleCamera}
              title={camera ? "Turn Off Camera" : "Turn On Camera"}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M23 7l-7 5 7 5V7z"></path>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
