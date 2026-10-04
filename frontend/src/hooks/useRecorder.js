import { useState, useRef, useEffect } from "react";
import { savePersistentRecording } from "../lib/recordings";

export default function useRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const recordingMetaRef = useRef({});

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatTime = (totalSecs) => {
    const mins = Math.floor(totalSecs / 60)
      .toString()
      .padStart(2, "0");
    const secs = (totalSecs % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const startRecording = async ({ stream, roomId, onSaved }) => {
    try {
      let captureStream = stream;

      // If no direct stream is passed, request screen/canvas capture for recording
      if (!captureStream || captureStream.getVideoTracks().length === 0) {
        captureStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
      }

      chunksRef.current = [];
      const options = MediaRecorder.isTypeSupported(
        "video/webm;codecs=vp9,opus",
      )
        ? { mimeType: "video/webm;codecs=vp9,opus" }
        : MediaRecorder.isTypeSupported("video/webm")
          ? { mimeType: "video/webm" }
          : {};

      const recorder = new MediaRecorder(captureStream, options);
      mediaRecorderRef.current = recorder;

      recordingMetaRef.current = {
        roomId: roomId || "Meeting Session",
        startTime: new Date().toISOString(),
        onSaved,
      };

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        if (timerRef.current) clearInterval(timerRef.current);

        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const videoUrl = URL.createObjectURL(blob);
        const secs =
          recordingMetaRef.current.durationSecs || recordingSeconds || 1;
        const sizeMB = (blob.size / (1024 * 1024)).toFixed(1);

        const recordingEntry = {
          id: `rec_${Date.now()}`,
          title: `Meeting Session - Room ${recordingMetaRef.current.roomId}`,
          roomId: recordingMetaRef.current.roomId,
          date: new Date().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
          duration: formatTime(secs),
          size: `${sizeMB} MB`,
          videoUrl,
        };

        const savedEntry = await savePersistentRecording(recordingEntry, blob);
        recordingMetaRef.current.onSaved?.(savedEntry || recordingEntry);
        setIsRecording(false);
        setRecordingSeconds(0);
      };

      recorder.start(1000);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          const next = prev + 1;
          recordingMetaRef.current.durationSecs = next;
          return next;
        });
      }, 1000);
    } catch (err) {
      console.error("Could not start recording:", err);
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
  };

  return {
    isRecording,
    recordingTime: formatTime(recordingSeconds),
    startRecording,
    stopRecording,
  };
}
