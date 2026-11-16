import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { PointerEvent } from "react";
import "./SpeechBubble.css";

const DEFAULT_RESPONSE = "ENTENDIDO. ESTOU PROCESSANDO SUA SOLICITAÇÃO...";

export function SpeechBubble() {
  const [response, setResponse] = useState(DEFAULT_RESPONSE);
  const [isLocked, setIsLocked] = useState(false);
  const windowLabel = getCurrentWindow().label;

  useEffect(() => {
    const unlisten = listen<{ label: string; response: string }>(
      "quick-speech-response",
      (event) => {
        if (event.payload.label === windowLabel) {
          setResponse(event.payload.response);
        }
      },
    );
    const unlistenLock = listen<{ label: string; locked: boolean }>(
      "quick-speech-lock",
      (event) => {
        if (event.payload.label === windowLabel) {
          setIsLocked(event.payload.locked);
        }
      },
    );

    return () => {
      unlisten
        .then((removeListener) => removeListener())
        .catch((error) =>
          console.error("Falha ao remover listener da fala:", error),
        );
      unlistenLock
        .then((removeListener) => removeListener())
        .catch((error) =>
          console.error("Falha ao remover listener do lock:", error),
        );
    };
  }, []);

  const openInput = () => {
    invoke("open_quick_speech", { label: windowLabel }).catch((error) =>
      console.error("Falha ao abrir entrada do balão:", error),
    );
  };

  const toggleLock = () => {
    invoke<boolean>("toggle_quick_speech_lock", { label: windowLabel })
      .then(setIsLocked)
      .catch((error) => console.error("Falha ao alternar lock:", error));
  };

  const detach = () => {
    invoke("detach_quick_speech", { label: windowLabel }).catch((error) =>
      console.error("Falha ao desanexar balão:", error),
    );
  };

  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.target instanceof HTMLElement && event.target.closest("button")) {
      return;
    }

    detach();
    getCurrentWindow()
      .startDragging()
      .catch((error) => console.error("Falha ao mover balão:", error));
  };

  const close = () => {
    getCurrentWindow()
      .hide()
      .catch((error) => console.error("Falha ao fechar balão:", error));
  };

  return (
    <main className="speech-bubble" onPointerDown={handlePointerDown}>
      <button
        aria-label="Fechar resposta"
        className="speech-bubble__close"
        onClick={close}
        type="button"
      >
        X
      </button>
      <div className="speech-bubble__tag">LORD</div>
      <p>{response}</p>
      <div className="speech-bubble__actions">
        <button onClick={openInput} type="button">
          MSG
        </button>
        <button onClick={toggleLock} type="button">
          {isLocked ? "UNLOCK" : "LOCK"}
        </button>
      </div>
    </main>
  );
}

export default SpeechBubble;
