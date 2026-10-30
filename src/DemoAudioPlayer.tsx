import { useEffect, useState } from "react";
import { Pause, Play, RotateCcw, RotateCw } from "lucide-react";

type Props = {
  durationSeconds: number;
  seekRequest?: { seconds: number; token: number } | null;
};

function time(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(Math.floor(value % 60)).padStart(2, "0")}`;
}

export function DemoAudioPlayer({ durationSeconds, seekRequest }: Props) {
  const [position, setPosition] = useState(() => Math.min(durationSeconds, seekRequest?.seconds ?? 0));
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setPosition((current) => {
      const next = Math.min(durationSeconds, current + speed);
      if (next >= durationSeconds) setPlaying(false);
      return next;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [playing, speed, durationSeconds]);

  return <div className="demo-audio-player" aria-label="Макет аудиопроигрывателя без звука">
    <input type="range" min={0} max={durationSeconds} value={position} onChange={(event) => setPosition(Number(event.target.value))} aria-label="Позиция записи" style={{ "--progress": `${position / durationSeconds * 100}%` } as React.CSSProperties} />
    <div className="demo-audio-controls">
      <span className="demo-audio-time">{time(position)} <span>/</span> {time(durationSeconds)}</span>
      <div className="demo-audio-transport">
        <button type="button" aria-label="Назад на 15 секунд" onClick={() => setPosition((current) => Math.max(0, current - 15))}><RotateCcw size={19} /><small>15</small></button>
        <button type="button" className="demo-audio-play" aria-label={playing ? "Пауза" : "Воспроизвести макет"} onClick={() => { if (position >= durationSeconds) setPosition(0); setPlaying((current) => !current); }}>{playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}</button>
        <button type="button" aria-label="Вперёд на 15 секунд" onClick={() => setPosition((current) => Math.min(durationSeconds, current + 15))}><RotateCw size={19} /><small>15</small></button>
      </div>
      <div className="demo-audio-end"><button type="button" aria-label={`Скорость ${speed}x`} onClick={() => setSpeed((current) => current === 1 ? 1.25 : current === 1.25 ? 1.5 : current === 1.5 ? 2 : 1)}>{speed}×</button></div>
    </div>
  </div>;
}
