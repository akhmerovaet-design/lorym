import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Link2, Mic, Square, SquarePen, Upload } from "lucide-react";

type Props = {
  canEdit: boolean;
  onUploadFiles: (files: File[]) => void;
  onAddLink: () => void;
  onCreateNote: () => void;
  onChooseSpace: () => void;
  onOpenSpaces: () => void;
  onOpenMeetings: () => void;
  onOpenNotes: () => void;
  onOpenTemplates: () => void;
  onOpenTasks: () => void;
  onOpenExampleMeeting: () => void;
  onOpenExampleNote: () => void;
};

export function HomePage({ canEdit, onUploadFiles, onAddLink, onCreateNote, onChooseSpace, onOpenSpaces, onOpenMeetings, onOpenNotes, onOpenTemplates, onOpenTasks }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [recordError, setRecordError] = useState("");

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [recording]);

  useEffect(() => () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  function selectFiles() {
    if (!canEdit) { onChooseSpace(); return; }
    fileRef.current?.click();
  }

  async function toggleRecording() {
    if (recording) {
      recorderRef.current?.stop();
      setRecording(false);
      return;
    }
    if (!canEdit) { onChooseSpace(); return; }
    setRecordError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setRecordError("Запись недоступна в этом браузере.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const type = recorder.mimeType || "audio/webm";
        const extension = type.includes("mp4") ? "m4a" : "webm";
        const file = new File(chunksRef.current, `Запись ${new Date().toLocaleString("ru-RU")}.${extension}`, { type });
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (file.size) onUploadFiles([file]);
      };
      recorder.start();
      setSeconds(0);
      setRecording(true);
    } catch {
      setRecordError("Разрешите доступ к микрофону, чтобы начать запись.");
    }
  }

  const time = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return <div className="home-page">
    <section className="home-start" aria-labelledby="home-title">
      <div className="home-start-main">
        <div className="home-intro">
          <h1 id="home-title">Соберите материалы в&nbsp;базу знаний</h1>
          <p>Запись превращается в транскрипт и резюме встречи. В базе знаний можно собрать конспект из нескольких встреч и найти нужный вывод.</p>
        </div>
        <div className="home-actions" aria-label="Добавить материал">
          <input ref={fileRef} className="sr-only" type="file" accept="audio/*,video/*,.pdf,.ppt,.pptx" multiple onChange={(event) => { const files = Array.from(event.target.files ?? []); if (files.length) onUploadFiles(files); event.target.value = ""; }} />
          <button className="home-action home-action-primary" onClick={selectFiles}><Upload size={25} strokeWidth={1.65} /><span>Загрузить аудио<br />или видео</span></button>
          <button className="home-action" onClick={onAddLink}><Link2 size={25} strokeWidth={1.65} /><span>Вставить ссылку</span></button>
          <button className="home-action" onClick={onCreateNote}><SquarePen size={25} strokeWidth={1.65} /><span>Новый документ</span></button>
        </div>
      </div>
      <div className="home-record">
        <div className={`home-record-icon ${recording ? "is-recording" : ""}`}><Mic size={37} strokeWidth={1.6} /></div>
        <div className="home-record-copy"><h2>{recording ? "Идёт запись" : "Запишите мысль прямо сейчас"}</h2><p>{recording ? time : "После остановки выберите пространство для записи."}</p></div>
        {recordError && <p className="home-record-error" role="alert">{recordError}</p>}
        <button className="home-record-button" onClick={toggleRecording}>{recording ? <><Square size={16} fill="currentColor" /> Завершить запись</> : "Начать запись"}</button>
      </div>
    </section>
    <nav className="home-navigation" aria-label="Переход к разделам">
      {[
        { label: "Все пространства", onClick: onOpenSpaces },
        { label: "Записи", onClick: onOpenMeetings },
        { label: "База знаний", onClick: onOpenNotes },
        { label: "Шаблоны", onClick: onOpenTemplates },
        { label: "Задачи", onClick: onOpenTasks },
      ].map(({ label, onClick }) => <button key={label} onClick={onClick}>{label}<ArrowUpRight size={15} strokeWidth={1.7} /></button>)}
    </nav>
  </div>;
}
