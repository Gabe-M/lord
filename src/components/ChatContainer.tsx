import { useEffect, useRef } from "react";
import { ChatInput } from "./ChatInput";
import { ChatMessage as ChatMessageComponent } from "./ChatMessage";
import "./ChatContainer.css";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatContainerProps {
  messages: readonly ChatMessage[];
  onSend: (message: string) => void;
}

export function ChatContainer({ messages, onSend }: ChatContainerProps) {
  const historyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const history = historyRef.current;
    if (history) {
      history.scrollTop = history.scrollHeight;
    }
  }, [messages]);

  return (
    <section className="chat-container" aria-label="Conversa">
      <header className="chat-drag-header" data-tauri-drag-region>
        <span className="chat-drag-header__title" data-tauri-drag-region>
          // LORD_COMMS_LINK
        </span>
        <span className="chat-drag-header__grip" data-tauri-drag-region>
          [MOVER]
        </span>
      </header>

      <div
        ref={historyRef}
        className="chat-container__history"
        role="log"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <p className="chat-container__empty">AGUARDANDO CONEXÃO...</p>
        ) : (
          messages.map((message) => (
            <ChatMessageComponent
              key={message.id}
              sender={message.role === "assistant" ? "LORD" : "GABE"}
              message={message.content}
              isLord={message.role === "assistant"}
              typewriterSpeedMs={14}
            />
          ))
        )}
      </div>
      <ChatInput onSend={onSend} />
    </section>
  );
}

export default ChatContainer;