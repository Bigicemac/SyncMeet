import { useEffect, useRef, useState } from "react";

export default function ChatPanel({ messages, onSend, onClose }) {
  const [text, setText] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const submit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text);
    setText("");
  };

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <h3>In-call Messages</h3>
        {onClose && (
          <button className="icon-btn close-btn" onClick={onClose}>
            ✕
          </button>
        )}
      </div>

      <div className="messages">
        {messages.map((m, i) => (
          <div key={m.id || i} className="msg">
            <div className="msg-info">
              <strong>{m.name}</strong>
              <small>
                {new Date(m.timestamp || m.at || Date.now()).toLocaleTimeString(
                  [],
                  { hour: "2-digit", minute: "2-digit" },
                )}
              </small>
            </div>
            <div className="msg-body">{m.text}</div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form className="chat-form" onSubmit={submit}>
        <input
          placeholder="Send a message to everyone..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
