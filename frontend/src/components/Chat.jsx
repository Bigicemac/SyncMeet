import { useEffect, useRef, useState } from "react";

export default function Chat({ messages, onSend }) {
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
    <>
      <div className="messages">
        {messages.map((m, i) => (
          <div key={i} className="msg">
            <strong>{m.name}</strong>
            <small>
              {new Date(m.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </small>
            <div>{m.text}</div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form className="chat-form" onSubmit={submit}>
        <input
          placeholder="Message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit">Send</button>
      </form>
    </>
  );
}
