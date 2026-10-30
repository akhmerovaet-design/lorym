import { useState } from "react";
import { ArrowRight, AudioLines, FileText, Link2, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Material } from "@/model";
import { demoParts } from "@/meetingData";
import { KnowledgeBody } from "@/KnowledgeBody";

type Props = {
  meeting: Material;
  notes: Material[];
  canDelete: boolean;
  onDelete: () => void;
  onOpenNote: (note: Material) => void;
  onCreateNote: () => void;
  onIncludePresentation: () => void;
  onExcludePresentation: () => void;
};

function seconds(time: string) {
  const [minutes, rest] = time.split(":").map(Number);
  return minutes * 60 + rest;
}

function timestamp(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

export function MeetingPage({ meeting, notes, canDelete, onDelete, onOpenNote, onCreateNote, onIncludePresentation, onExcludePresentation }: Props) {
  const [tab, setTab] = useState<"summary" | "transcript" | "notes">("summary");
  const [merged, setMerged] = useState(false);
  const [confirmPresentation, setConfirmPresentation] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [summaryId, setSummaryId] = useState<number | null>(null);
  const presentationIncluded = meeting.presentationIncluded ?? false;
  const summaries = notes.filter((note) => note.summaryFor === meeting.id);
  const relatedDocuments = notes.filter((note) => note.summaryFor !== meeting.id);
  const activeSummary = summaries.find((note) => note.id === summaryId) ?? summaries[0];
  const parts = demoParts(meeting.id);
  const uploaded = meeting.sourceFiles ?? [];
  const hasPresentation = meeting.id === 1 || uploaded.some((file) => /\.(pdf|pptx?)$/i.test(file.name));
  const sourceNames = meeting.id === 1
    ? ["Запись созвона, часть 1.mp3", "Запись созвона, часть 2.mp3", "Презентация запуска.pdf"]
    : meeting.id === 3 ? ["Интервью с клиентом.mp3"] : meeting.id === 5 ? ["Семейный разговор.mp3"] : [];
  const allSources = uploaded.length ? uploaded.map((file) => file.name) : sourceNames;
  const mergedLines = parts.flatMap((part, index) => part.lines.map((line) => ({
    time: timestamp(seconds(line.time) + (index === 0 ? 0 : 28 * 60)),
    text: line.text,
  })));

  return <section className="meeting-page" aria-label={`Встреча «${meeting.title}»`}>
    <header className="meeting-heading">
      <div>
        <h1>{meeting.title}</h1>
        <p className="meeting-meta">{meeting.date} <span>·</span> {meeting.topic}</p>
      </div>
      <div className="meeting-heading-actions">{canDelete && <button className="meeting-delete" onClick={() => setConfirmDelete(true)}>Удалить запись</button>}<button className="add-button" onClick={onCreateNote}><Plus size={17} /> Новый документ</button></div>
    </header>

    <div className="meeting-layout">
      <aside className="meeting-sources" aria-label="Исходные файлы встречи">
        <div className="meeting-sources-head"><h2>Источники</h2></div>
        <div className="meeting-source-list">{allSources.map((name, index) => {
          const file = uploaded[index];
          const link = file?.type === "text/uri-list";
          const document = /\.(pdf|pptx?|docx?)$/i.test(name) || (!!file && !file.type.startsWith("audio/") && !file.type.startsWith("video/"));
          return <div className="meeting-source" key={name}>
            <div className="meeting-source-title">{link ? <Link2 size={16} /> : document ? <FileText size={16} /> : <AudioLines size={16} />}<div><strong>{link && file?.url ? <a href={file.url} target="_blank" rel="noopener noreferrer">{name}</a> : name}</strong><small>{link ? "Ссылка" : file && !file.url ? "Файл недоступен после перезагрузки" : document ? "Вложение" : parts[index]?.duration ?? "Запись"}</small></div></div>
            {file?.url && file.type.startsWith("audio/") && <audio controls src={file.url} preload="metadata" />}
            {file?.url && file.type.startsWith("video/") && <video controls src={file.url} preload="metadata" />}
          </div>;
        })}</div>
      </aside>
      <div className="meeting-primary">
        <div className="meeting-tabs" role="tablist" aria-label="Разделы встречи">
          {([["summary", "Резюме встречи"], ["transcript", "Транскрипт"], ["notes", "Связанные документы"]] as const).map(([value, label]) =>
            <button key={value} role="tab" aria-selected={tab === value} className={tab === value ? "active" : ""} onClick={() => setTab(value)}>{label}</button>
          )}
        </div>

        {tab === "summary" && <div className="meeting-copy" role="tabpanel">
          {activeSummary ? <>
            {summaries.length > 1 && <div className="meeting-summary-versions" aria-label="Версии резюме">{summaries.map((item) => <button key={item.id} className={activeSummary.id === item.id ? "active" : ""} onClick={() => setSummaryId(item.id)}>{item.templateName ?? item.title}</button>)}</div>}
            <KnowledgeBody html={activeSummary.body ?? ""} title={activeSummary.title} />
            <div className="meeting-summary-actions"><button className="meeting-text-action" onClick={() => setTab("transcript")}>Проверить по транскрипту <ArrowRight size={15} /></button><button className="meeting-text-action" onClick={() => onOpenNote(activeSummary)}>Открыть в базе знаний <ArrowRight size={15} /></button></div>
          </> : <div className="meeting-pending"><h2>Источник добавлен</h2><p>В рабочем сервисе резюме создаётся автоматически. В этом прототипе обработка не запускается. Откройте пример встречи на главной странице, чтобы посмотреть результат.</p></div>}
          {hasPresentation && <div className="meeting-context-callout">
            <div><strong>{presentationIncluded ? "Использование презентации подтверждено" : "Презентация прикреплена"}</strong><p>{presentationIncluded ? "В прототипе резюме не пересчитывается после подтверждения." : "Она пока не участвует в составлении итога. Поиск по содержимому вложений требует обработки файлов."}</p></div>
            {presentationIncluded ? <button onClick={onExcludePresentation}>Исключить из итога</button> : <button onClick={() => setConfirmPresentation(true)}>Добавить в итог <ArrowRight size={15} /></button>}
          </div>}
        </div>}

        {tab === "transcript" && <div className="meeting-copy" role="tabpanel">
          <div className="meeting-section-top"><div><h2>Транскрипт</h2><p>{parts.length > 1 ? "Две записи одной встречи" : "Расшифровка записи"}</p></div>{parts.length > 1 && <button className="meeting-text-action" onClick={() => setMerged((value) => !value)}>{merged ? "Показать отдельно" : "Объединить части"}</button>}</div>
          {parts.length ? merged && parts.length > 1
            ? <div className="transcript-part"><div className="transcript-part-head"><strong>Общий транскрипт</strong><span>54 мин</span></div>{mergedLines.map((line) => <p key={`${line.time}-${line.text}`}><time>{line.time}</time><span>{line.text}</span></p>)}<small>Исходные транскрипты сохранены отдельно.</small></div>
            : parts.map((part) => <div className="transcript-part" key={part.name}><div className="transcript-part-head"><strong>{part.name}</strong><span>{part.duration}</span></div>{part.lines.map((line) => <p key={line.time}><time>{line.time}</time><span>{line.text}</span></p>)}</div>)
            : <div className="meeting-pending"><h2>Расшифровка пока недоступна</h2><p>В рабочем сервисе она создаётся автоматически. В этом прототипе обработка не запускается. Пример транскрипта можно открыть с главной страницы.</p></div>}
        </div>}

        {tab === "notes" && <div className="meeting-copy" role="tabpanel">
          <div className="meeting-section-top"><div><h2>Связанные документы</h2><p>Здесь собираются выводы из одной или нескольких встреч пространства.</p></div></div>
          {relatedDocuments.length ? <div className="meeting-notes">{relatedDocuments.map((note) => <button key={note.id} onClick={() => onOpenNote(note)}><span><strong>{note.title}</strong><small>{note.sourceIds?.length ?? 0} {(note.sourceIds?.length ?? 0) === 1 ? "встреча" : "встречи"}</small></span><ArrowRight size={17} /></button>)}</div> : <p className="meeting-empty">Связанных документов пока нет.</p>}
          <button className="meeting-text-action" onClick={onCreateNote}><Plus size={16} /> Создать документ по встрече</button>
        </div>}
      </div>

    </div>

    <Dialog open={confirmPresentation} onOpenChange={setConfirmPresentation}><DialogContent className="lorym-dialog"><DialogHeader><DialogTitle>Добавить презентацию в итог?</DialogTitle><DialogDescription>Подтвердите использование вложения для будущего обновления резюме. В прототипе пересчёт не выполняется.</DialogDescription></DialogHeader><div className="dialog-actions"><button className="meeting-dialog-cancel" onClick={() => setConfirmPresentation(false)}>Отмена</button><button className="add-button" onClick={() => { onIncludePresentation(); setConfirmPresentation(false); }}>Подтвердить</button></div></DialogContent></Dialog>
    <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}><DialogContent className="lorym-dialog"><DialogHeader><DialogTitle>Удалить запись?</DialogTitle><DialogDescription>Карточка встречи будет удалена. Связанные документы сохранятся, но ссылка на эту встречу исчезнет.</DialogDescription></DialogHeader><div className="dialog-actions"><button className="meeting-dialog-cancel" onClick={() => setConfirmDelete(false)}>Отмена</button><button className="add-button" onClick={() => { setConfirmDelete(false); onDelete(); }}>Удалить запись</button></div></DialogContent></Dialog>
  </section>;
}
