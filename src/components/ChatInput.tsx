import { useState } from "react";
import type { FormEvent } from "react";
import "./ChatInput.css";

interface ChatInputProps {
  onSend: (message: string) => void;
}

export function ChatInput({ onSend }: ChatInputProps) {
  const [draft, setDraft] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message) return;

    onSend(message);
    setDraft("");
  };

  return (
    <form className="chat-input" onSubmit={handleSubmit}>
      <input
        aria-label="Mensagem"
        autoComplete="off"
        className="chat-input__field"
        onChange={(event) => setDraft(event.currentTarget.value)}
        placeholder="DIGITE SUA MENSAGEM..."
        type="text"
        value={draft}
      />
      <button className="chat-input__submit" type="submit">
        ENVIAR
      </button>
    </form>
  );
}

export default ChatInput;
