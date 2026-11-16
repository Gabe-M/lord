import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "./QuickInput.css";

const CLOSE_DELAY_MS = 8000;

export function QuickInput() {
  const [draft, setDraft] = useState("");
  const [isPersistent, setIsPersistent] = useState(false);
  const [openVersion, setOpenVersion] = useState(0);
  const [targetLabel, setTargetLabel] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const timeoutId = window.setTimeout(() => {
      if (!isPersistent) {
        getCurrentWindow()
          .hide()
          .catch((error) =>
            console.error("Falha ao fechar entrada rápida:", error),
          );
      }
    }, CLOSE_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [isPersistent, openVersion]);

  useEffect(() => {
    const unlisten = listen<string>("quick-input-opened", (event) => {
      setDraft("");
      setIsPersistent(false);
      setTargetLabel(event.payload || null);
      setOpenVersion((version) => version + 1);
      window.requestAnimationFrame(() => inputRef.current?.focus());
    });

    return () => {
      unlisten
        .then((removeListener) => removeListener())
        .catch((error) =>
          console.error("Falha ao remover listener da entrada:", error),
        );
    };
  }, []);

  const close = () => {
    getCurrentWindow()
      .hide()
      .catch((error) => console.error("Falha ao fechar entrada rápida:", error));
  };

  const submit = (newBubble = false) => {
    const message = draft.trim();
    if (!message) return;

    invoke("submit_quick_speech", {
      message,
      newBubble,
      targetLabel,
    }).catch((error) =>
      console.error("Falha ao enviar fala rápida:", error),
    );
  };

  return (
    <main
      className="quick-input"
      onPointerDown={() => setIsPersistent(true)}
    >
      <form
        className="quick-input__form"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <input
          ref={inputRef}
          aria-label="Fala rápida"
          autoComplete="off"
          className="quick-input__field"
          onChange={(event) => setDraft(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && event.shiftKey) {
              event.preventDefault();
              submit(true);
            }
          }}
          placeholder="FALAR COM LORD..."
          type="text"
          value={draft}
        />
        <button className="quick-input__submit" type="submit">
          &gt;
        </button>
      </form>
      <button
        aria-label="Fechar fala rápida"
        className="quick-input__close"
        onClick={close}
        type="button"
      >
        X
      </button>
    </main>
  );
}

export default QuickInput;
