import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { ArrowRight, MoreHorizontal, Plus, Search, Trash2, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SpaceFilter } from "@/SpaceFilter";
import { demoParts, type Part } from "@/meetingData";
import type { Material, SourceFile, TemplateInfo } from "@/model";
import type { SpaceInfo } from "@/SpacesPage";
import { MATERIAL_DRAG_TYPE } from "@/materialDrag";
import { DemoAudioPlayer } from "@/DemoAudioPlayer";
import { KnowledgeBody } from "@/KnowledgeBody";
import { SpaceDot } from "@/SpaceDot";
import { NoteContextActions } from "@/NoteContextActions";

type Hit = { time: string; text: string };
type Recording = { key: string; meeting: Material; index: number; title: string; detail: string; part?: Part; file?: SourceFile };
type Result = Recording & { hit?: Hit };
type Props = {
  meetings: Material[];
  notes: Material[];
  spaces: SpaceInfo[];
  templates: TemplateInfo[];
  spaceFilter: string;
  onSpaceFilter: (value: string) => void;
  focusedMeetingId: number | null;
  onAddRecording: (space: string) => void;
  onOpenNote: (note: Material, meetingId: number) => void;
  onAddSummary: (meeting: Material, template: string, focus: string) => number;
  onRenameNote: (note: Material, title: string) => void;
  onRegenerateNote: (note: Material, template: string, focus: string) => void;
  onDeleteNote: (note: Material) => void;
  onDeleteRecording: (meeting: Material, index: number) => void;
  onCreateTemplate: (name: string, instructions: string) => void;
  searchRef: RefObject<HTMLInputElement | null>;
};

function hitFor(part: Part | undefined, query: string): Hit | undefined {
  const term = query.toLocaleLowerCase("ru").trim();
  if (!term || !part) return undefined;
  const line = part.lines.find((candidate) => matchAt(candidate.text, term)?.index !== undefined);
  return line ? { time: line.time, text: line.text } : undefined;
}

function recordingsFor(meeting: Material): Recording[] {
  const files = meeting.sourceFiles?.filter((file) => file.type.startsWith("audio/") || file.type.startsWith("video/")) ?? [];
  const parts = demoParts(meeting.id);
  const count = Math.max(files.length, parts.length, 1);
  return Array.from({ length: count }, (_, index) => {
    const file = files[index];
    const part = parts[index];
    return { key: `${meeting.id}:${index}`, meeting, index, file, part,
      title: count > 1 ? `${meeting.title} · запись ${index + 1}` : meeting.title,
      detail: part?.duration ?? (file?.type.startsWith("video/") ? "Видео" : file ? "Аудио" : meeting.detail),
    };
  }).filter((recording) => !meeting.deletedRecordingIndexes?.includes(recording.index));
}

function plainText(html: string) {
  const withSpaces = html.replace(/<\/(?:p|h[1-6]|li|div|ul|ol)>/gi, "$& ");
  return (new DOMParser().parseFromString(withSpaces, "text/html").body.textContent ?? "").replace(/\s+/g, " ").trim();
}

function matchAt(text: string, term: string): { index: number; length: number } | null {
  const lower = text.toLocaleLowerCase("ru");
  const exact = lower.indexOf(term);
  if (exact >= 0) return { index: exact, length: term.length };
  if (term.length >= 5) {
    const stem = term.slice(0, -1);
    const index = lower.indexOf(stem);
    if (index >= 0) return { index, length: stem.length };
  }
  return null;
}

function Highlight({ text, query }: { text: string; query: string }) {
  const match = matchAt(text, query.toLocaleLowerCase("ru").trim());
  if (!match) return <>{text}</>;
  return <>{text.slice(0, match.index)}<mark>{text.slice(match.index, match.index + match.length)}</mark>{text.slice(match.index + match.length)}</>;
}

export function RecordingsPage({ meetings, notes, spaces, templates, spaceFilter, onSpaceFilter, focusedMeetingId, onAddRecording, onOpenNote, onAddSummary, onRenameNote, onRegenerateNote, onDeleteNote, onDeleteRecording, onCreateTemplate, searchRef }: Props) {
  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [tab, setTab] = useState<"transcript" | "summary">("transcript");
  const [summaryDialog, setSummaryDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Recording | null>(null);
  const [template, setTemplate] = useState(templates[0]?.name ?? "");
  const [summaryPrompt, setSummaryPrompt] = useState("");
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateInstructions, setNewTemplateInstructions] = useState("");
  const [templateError, setTemplateError] = useState("");
  const [demoSeek, setDemoSeek] = useState<{ seconds: number; token: number } | null>(null);
  const demoSeekToken = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const results = useMemo<Result[]>(() => meetings
    .filter((meeting) => spaceFilter === "all" || meeting.space === spaceFilter)
    .flatMap(recordingsFor)
    .map((recording) => ({ ...recording, hit: hitFor(recording.part, query) }))
    .filter((recording) => {
      const term = query.toLocaleLowerCase("ru").trim();
      if (!term) return true;
      const ownText = `${recording.title} ${recording.file?.name ?? ""} ${recording.meeting.topic} ${recording.detail}`.toLocaleLowerCase("ru");
      return !!recording.hit || ownText.includes(term) || notes.some((note) => note.summaryFor === recording.meeting.id && plainText(note.body ?? "").toLocaleLowerCase("ru").includes(term));
    }), [meetings, notes, query, spaceFilter]);
  const selected = results.find((result) => result.key === selectedKey)
    ?? results.find((result) => result.meeting.id === focusedMeetingId)
    ?? results[0];
  const selectedHit = selected?.hit;
  const selectedSummary = notes.find((note) => note.summaryFor === selected?.meeting.id && note.space === selected?.meeting.space);
  const canEditSummary = spaces.some((item) => item.name === selected?.meeting.space && item.access === "edit");
  const playable = selected?.file;
  const demoDuration = selected?.meeting.id === 1 ? (selected.index === 0 ? 1722 : 1560) : (Number(selected?.part?.duration.match(/\d+/)?.[0] ?? 30) * 60);
  const deletingLastRecording = deleteTarget ? recordingsFor(deleteTarget.meeting).length === 1 : false;

  const hitTime = selectedHit?.time;
  useEffect(() => {
    setSelectedKey(focusedMeetingId === null ? null : `${focusedMeetingId}:0`);
  }, [focusedMeetingId]);
  useEffect(() => {
    if (hitTime && tab === "transcript") {
      const timer = window.setTimeout(() => transcriptRef.current?.querySelector(".recording-line.match")?.scrollIntoView({ block: "center", behavior: "smooth" }), 80);
      return () => window.clearTimeout(timer);
    }
  }, [selected?.key, hitTime, tab]);

  function choose(result: Result) {
    setSelectedKey(result.key);
    setDemoSeek(null);
    if (result.hit) setTab("transcript");
  }

  function jump(time: string) {
    const [minutes, seconds] = time.split(":").map(Number);
    const target = (minutes || 0) * 60 + (seconds || 0);
    const element = audioRef.current ?? videoRef.current;
    if (element) element.currentTime = target;
    else setDemoSeek({ seconds: target, token: ++demoSeekToken.current });
  }

  function createSummary() {
    if (!selected) return;
    let chosenTemplate = template;
    if (template === "__new__") {
      const name = newTemplateName.trim();
      const instructions = newTemplateInstructions.trim();
      if (!name || !instructions) { setTemplateError("Укажите название и инструкцию шаблона"); return; }
      if (templates.some((item) => item.name.toLocaleLowerCase("ru") === name.toLocaleLowerCase("ru"))) { setTemplateError("Шаблон с таким названием уже есть"); return; }
      onCreateTemplate(name, instructions);
      chosenTemplate = name;
      setTemplate(name);
      setNewTemplateName("");
      setNewTemplateInstructions("");
    }
    if (!chosenTemplate) return;
    onAddSummary(selected.meeting, chosenTemplate, summaryPrompt.trim());
    setTab("summary");
    setSummaryDialog(false);
    setSummaryPrompt("");
    setTemplateError("");
  }

  return <section className="recordings-page" aria-label="Записи">
    <div className="recordings-heading"><h1>Записи</h1>{spaceFilter === "all" ? <DropdownMenu><DropdownMenuTrigger asChild><button className="add-button"><Plus size={18} /> Добавить запись</button></DropdownMenuTrigger><DropdownMenuContent align="end" className="recording-add-space-menu"><div className="recording-add-space-label">В пространство</div>{spaces.filter((item) => item.access === "edit").map((item) => <DropdownMenuItem key={item.name} onSelect={() => onAddRecording(item.name)}><SpaceDot name={item.name} color={item.color} />{item.name}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu> : <button className="add-button" onClick={() => onAddRecording(spaceFilter)}><Plus size={18} /> Добавить запись</button>}</div>
    <div className="recordings-controls"><SpaceFilter spaces={spaces} value={spaceFilter} onChange={(value) => { onSpaceFilter(value); setSelectedKey(null); }} /></div>
    <div className="recordings-layout">
      <aside className="recordings-list-pane" aria-label="Список записей">
        <label className="recordings-search"><Search size={19} /><input ref={searchRef} value={query} onChange={(event) => { setQuery(event.target.value); setSelectedKey(null); }} placeholder="Найти фрагмент в записи" aria-label="Поиск по содержимому всех записей" />{query && <button aria-label="Очистить поиск" onClick={() => setQuery("")}><X size={16} /></button>}</label>
        {query.trim() && <p className="recordings-search-caption">Поиск по названию и содержимому транскриптов</p>}
        <div className="recordings-list">{results.length ? results.map((result) => {
          const editable = spaces.some((space) => space.name === result.meeting.space && space.access === "edit");
          return <div className="recording-row-wrap" key={result.key}>
            <button className={`recording-row ${selected?.key === result.key ? "selected" : ""}`} onClick={() => choose(result)} aria-current={selected?.key === result.key ? "true" : undefined} draggable={editable} onDragStart={(event) => { event.dataTransfer.setData(MATERIAL_DRAG_TYPE, String(result.meeting.id)); event.dataTransfer.effectAllowed = "move"; }}>
              <span className="recording-row-top"><span className="recording-row-title"><SpaceDot name={result.meeting.space} color={spaces.find((item) => item.name === result.meeting.space)?.color} /><strong>{result.title}{result.part?.duration && <>{" "}<span className="recording-row-duration">{result.part.duration}</span></>}</strong></span></span>
              <span className="recording-row-meta">{result.meeting.date}</span>
              {result.hit && <span className="recording-row-hit"><time>{result.hit.time}</time><span><Highlight text={result.hit.text} query={query} /></span></span>}
            </button>
            {editable && <DropdownMenu><DropdownMenuTrigger asChild><button className="recording-row-more" aria-label={`Действия с записью «${result.title}»`} title="Действия с записью"><MoreHorizontal size={18} /></button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => setDeleteTarget(result)}><Trash2 size={15} /> Удалить запись</DropdownMenuItem></DropdownMenuContent></DropdownMenu>}
          </div>;
        }) : <div className="recordings-empty">По этому запросу записей не нашлось.</div>}</div>
      </aside>
      <article className="recording-preview" aria-label="Предпросмотр записи">
        {selected ? <>
          <div className="recording-preview-head"><h2><SpaceDot name={selected.meeting.space} color={spaces.find((item) => item.name === selected.meeting.space)?.color} /><span>{selected.title}</span></h2></div>
          <div className="recording-preview-tabs">
            <div className="recording-tabs-scroll" role="tablist" aria-label="Содержимое записи">
              <button role="tab" aria-selected={tab === "transcript"} className={`recording-transcript-tab ${tab === "transcript" ? "active" : ""}`} onClick={() => setTab("transcript")}>Транскрипт</button>
              <span className={`recording-summary-tab ${tab === "summary" ? "active" : ""}`} role="presentation">
                {selectedSummary ? <NoteContextActions note={selectedSummary} templates={templates} canEdit={canEditSummary} onRename={onRenameNote} onRegenerate={onRegenerateNote} onDelete={onDeleteNote} onCreateTemplate={onCreateTemplate}>
                  <button role="tab" aria-selected={tab === "summary"} title={canEditSummary ? "Резюме · правый клик для действий" : "Резюме"} onClick={() => setTab("summary")}>Резюме</button>
                </NoteContextActions> : <button role="tab" aria-selected={tab === "summary"} onClick={() => setTab("summary")}>Резюме</button>}
              </span>
            </div>
          </div>
          <div className="recording-player"><div className="recording-player-source"><span>{playable?.name ?? selected.part?.name ?? "Запись встречи"}</span></div>{playable?.url ? playable.type.startsWith("video/") ? <video ref={videoRef} key={playable.url} src={playable.url} controls preload="metadata" /> : <audio ref={audioRef} key={playable.url} src={playable.url} controls preload="metadata" /> : selected.part ? <DemoAudioPlayer key={`${selected.key}:${demoSeek?.token ?? 0}`} durationSeconds={demoDuration} seekRequest={demoSeek} /> : <p className="recording-file-missing">Файл недоступен после перезагрузки.</p>}</div>
          {tab === "transcript" ? <div className="recording-transcript" ref={transcriptRef} role="tabpanel">
            {selected.part ? selected.part.lines.map((line) => <button className={`recording-line ${selectedHit?.time === line.time ? "match" : ""}`} key={line.time} onClick={() => jump(line.time)}><time>{line.time}</time><span><Highlight text={line.text} query={query} /></span></button>) : <div className="recording-content-empty"><h3>Расшифровка пока недоступна</h3><p>В рабочем сервисе она создаётся автоматически. В прототипе обработка не запускается.</p></div>}
          </div> : <div className="recording-summary" role="tabpanel">{selectedSummary ? <div className="recording-summary-body"><KnowledgeBody html={selectedSummary.body ?? ""} title={selectedSummary.title} /><button onClick={() => onOpenNote(selectedSummary, selected.meeting.id)}>Открыть в базе знаний <ArrowRight size={16} /></button></div> : <div className="recording-content-empty"><h3>Резюме пока нет</h3>{canEditSummary && <button onClick={() => setSummaryDialog(true)}>Создать по шаблону <ArrowRight size={16} /></button>}</div>}</div>}
        </> : <div className="recordings-no-selection">Выберите запись слева.</div>}
      </article>
    </div>
    <Dialog open={summaryDialog} onOpenChange={(open) => { setSummaryDialog(open); if (!open) setTemplateError(""); }}>
      <DialogContent className="lorym-dialog recording-summary-dialog">
        <DialogHeader><DialogTitle>Создать резюме встречи</DialogTitle><DialogDescription>Выберите шаблон. Резюме появится рядом с транскриптом.</DialogDescription></DialogHeader>
        <label>Шаблон
          <select value={template} onChange={(event) => { setTemplate(event.target.value); setTemplateError(""); }}>
            {templates.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
            <option value="__new__">+ Новый шаблон</option>
          </select>
        </label>
        {template === "__new__" && <div className="recording-new-template">
          <label>Название шаблона<input value={newTemplateName} onChange={(event) => { setNewTemplateName(event.target.value); setTemplateError(""); }} placeholder="Например, решения по проекту" /></label>
          <label>Инструкция шаблона<textarea value={newTemplateInstructions} onChange={(event) => { setNewTemplateInstructions(event.target.value); setTemplateError(""); }} placeholder="Какие разделы и выводы должны повторяться в каждом резюме" /></label>
        </div>}
        <label>Промпт для этого резюме <span>необязательно</span><textarea value={summaryPrompt} onChange={(event) => setSummaryPrompt(event.target.value)} placeholder="Например, выдели решения, риски и следующие шаги" /></label>
        {templateError && <p className="recording-template-error" role="alert">{templateError}</p>}
        <div className="dialog-actions"><button className="meeting-dialog-cancel" onClick={() => setSummaryDialog(false)}>Отмена</button><button className="add-button" onClick={createSummary} disabled={!template}>{template === "__new__" ? "Сохранить шаблон и создать резюме" : "Создать резюме"}</button></div>
      </DialogContent>
    </Dialog>
    <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
      <DialogContent className="lorym-dialog recording-delete-dialog"><DialogHeader><DialogTitle>Удалить запись?</DialogTitle><DialogDescription>{deletingLastRecording ? "Встреча исчезнет, а связанные документы останутся в базе знаний без ссылки на неё." : "Остальные записи встречи и резюме сохранятся. Резюме не пересчитается автоматически."}</DialogDescription></DialogHeader>
        <div className="dialog-actions"><button className="meeting-dialog-cancel" onClick={() => setDeleteTarget(null)}>Отмена</button><button className="add-button" onClick={() => { if (deleteTarget) onDeleteRecording(deleteTarget.meeting, deleteTarget.index); setDeleteTarget(null); }}>Удалить запись</button></div>
      </DialogContent>
    </Dialog>
  </section>;
}
