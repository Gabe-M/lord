import { useEffect, useState } from "react";
import "./ChatMessage.css";

export interface ChatMessageProps {
  sender: string;
  message: string;
  isLord?: boolean;
  typewriterSpeedMs?: number;
  showCursor?: boolean;
}

export function ChatMessage({
  sender,
  message,
  isLord = false,
  typewriterSpeedMs = 14,
  showCursor = false,
}: ChatMessageProps) {
  const [displayedText, setDisplayedText] = useState(
    isLord ? "" : message
  );
  const [isFinished, setIsFinished] = useState(!isLord);

  useEffect(() => {
    if (!isLord) {
      setDisplayedText(message);
      setIsFinished(true);
      return;
    }

    setDisplayedText("");
    setIsFinished(false);
    let currentIndex = 0;

    const interval = window.setInterval(() => {
      currentIndex += 1;
      setDisplayedText(message.slice(0, currentIndex));

      if (currentIndex >= message.length) {
        window.clearInterval(interval);
        setIsFinished(true);
      }
    }, typewriterSpeedMs);

    return () => window.clearInterval(interval);
  }, [message, isLord, typewriterSpeedMs]);

  return (
    <article
      className={`chat-message-wrapper ${isLord ? "is-lord" : "is-user"}`}
    >
      <div className="chat-nametag">{sender}</div>
      <div className="chat-box-border">
        <div className="chat-box-inner">
          <p className="chat-content">
            {displayedText}
            {(!isFinished || showCursor) && (
              <span className="terminal-cursor" aria-hidden="true" />
            )}
          </p>
        </div>
      </div>
    </article>
  );
}

export default ChatMessage;