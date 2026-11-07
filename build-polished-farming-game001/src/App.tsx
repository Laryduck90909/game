import { useEffect, useRef, useState } from "react";
import { GameScreen } from "./components/GameScreen";
import { StartScreen } from "./components/StartScreen";
import { Sfx } from "./game/audio";
import { loadMute, loadName, sanitizeName, saveMute, saveName } from "./game/storage";

export default function App() {
  const [screen, setScreen] = useState<"menu" | "game">("menu");
  const [name, setName] = useState(loadName);
  const [muted, setMuted] = useState(loadMute);
  const [runId, setRunId] = useState(0);
  const sfxRef = useRef<Sfx | null>(null);
  const [sfx, setSfx] = useState<Sfx | null>(null);

  useEffect(() => {
    sfx?.setMuted(muted);
  }, [muted, sfx]);

  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      saveMute(next);
      sfxRef.current?.setMuted(next);
      return next;
    });
  };

  const play = () => {
    const audio = sfxRef.current ?? new Sfx();
    sfxRef.current = audio;
    audio.unlock();
    audio.setMuted(muted);
    setSfx(audio);
    saveName(name);
    setRunId((n) => n + 1);
    setScreen("game");
  };

  return (
    <div className="app-root" dir="rtl">
      {screen === "game" && sfx ? (
        <GameScreen
          key={runId}
          name={sanitizeName(name)}
          muted={muted}
          sfx={sfx}
          onToggleMute={toggleMute}
          onMenu={() => setScreen("menu")}
        />
      ) : (
        <StartScreen name={name} muted={muted} onName={setName} onToggleMute={toggleMute} onPlay={play} />
      )}
    </div>
  );
}
