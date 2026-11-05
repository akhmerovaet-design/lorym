import { useMemo, useState, type RefObject } from "react";
import { ArrowRight, AudioLines, Plus, Search, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { KnowledgeBody } from "@/KnowledgeBody";
import { NoteContextActions } from "@/NoteContextActions";
import { SpaceDot } from "@/SpaceDot";
import { SpaceFilter } from "@/SpaceFilter";
import { searchableMaterialText } from "@/materialSearch";
import type { Material, TemplateInfo } from "@/model";
import type { SpaceInfo } from "@/SpacesPage";

type Props = {
  notes: Material[];
  meetings: Material[];
  spaces: SpaceInfo[];
  templates: TemplateInfo[];
  spaceFilter: string;
  onSpaceFilter: (value: string) => void;
  onAddNote: (space: string) => void;
  onOpenNote: (note: Material) => void;
  onOpenMeeting: (meeting: Material) => void;
  onRenameNote: (note: Material, title: string) => void;
  onRegenerateNote: (note: Material, template: string, focus: string) => void;
  onDeleteNote: (note: Material) => void;
  onCreateTemplate: (name: string, instructions: string) => void;
  searchRef: RefObject<HTMLInputElement | null>;
  focusedNoteId?: number | null;
};

const months: Record<string, number> = {
  января: 0, февраля: 1, марта: 2, апреля: 3, мая: 4, июня: 5,
  июля: 6, августа: 7, сентября: 8, октября: 9, ноября: 10, декабря: 11,
};

function chronology(note: Material) {
  // New notes use their creation time as an ID. Seed notes have a readable date instead.
  if (note.createdAt) return note.createdAt;
  if (note.id > 1_000_000_000_000 && note.id < 10_000_000_000_000) return note.id;
  const label = note.date.toLocaleLowerCase("ru").trim();
  if (label === "только что") return Number.MAX_SAFE_INTEGER;
  const relative = /^(сегодня|вчера)(?:,\s*(\d{1,2}):(\d{2}))?/.exec(label);
  if (relative) {
    const value = new Date();
    value.setHours(Number(relative[2] ?? 0), Number(relative[3] ?? 0), 0, 0);
    if (relative[1] === "вчера") value.setDate(value.getDate() - 1);
    return value.getTime();
  }
  const absolute = /^(\d{1,2})\s+([а-яё]+)(?:\s+(\d{4}))?/.exec(label);
  if (absolute && months[absolute[2]] !== undefined) {
    const today = new Date();
    const year = Number(absolute[3] ?? today.getFullYear());
    let value = new Date(year, months[absolute[2]], Number(absolute[1])).getTime();
    if (!absolute[3] && value > today.getTime()) value = new Date(year - 1, months[absolute[2]], Number(absolute[1])).getTime();
    return value;
  }
  return 0;
}

function noteDate(note: Material) {
  const timestamp = note.createdAt ?? (note.id > 1_000_000_000_000 && note.id < 10_000_000_000_000 ? note.id : null);
  if (note.date !== "Только что" || !timestamp) return note.date;
  const created = new Date(timestamp);
  const now = new Date();
  if (now.getTime() - created.getTime() < 5 * 60_000 && now.getTime() >= created.getTime()) return "Только что";
  const time = created.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  if (created.toDateString() === now.toDateString()) return `Сегодня, ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (created.toDateString() === yesterday.toDateString()) return `Вчера, ${time}`;
  return created.toLocaleDateString("ru-RU", { day: "numeric", month: "long", ...(created.getFullYear() === now.getFullYear() ? {} : { year: "numeric" as const }) });
}

function noteText(note: Material) {
  if (!note.body) return "";
  const body = new DOMParser().parseFromString(note.body, "text/html").body;
  const paragraphs = Array.from(body.querySelectorAll("p, li"))
    .map((element) => element.textContent?.replace(/\s+/g, " ").trim() ?? "")
    .filter((text) => text && !/^черновик по транскрипту/i.test(text));
  return paragraphs[0] ?? "";
}

export function NotesPage({ notes, meetings, spaces, templates, spaceFilter, onSpaceFilter, onAddNote, onOpenNote, onOpenMeeting, onRenameNote, onRegenerateNote, onDeleteNote, onCreateTemplate, searchRef, focusedNoteId }: Props) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const term = query.trim().toLocaleLowerCase("ru");
  const editableSpaces = spaces.filter((item) => item.access === "edit");
  const results = useMemo(() => notes
    .filter((note) => spaceFilter === "all" || note.space === spaceFilter)
    .filter((note) => !term || searchableMaterialText(note).includes(term))
    .sort((a, b) => chronology(b) - chronology(a) || b.id - a.id), [notes, spaceFilter, term]);
  const selected = results.find((note) => note.id === selectedId) ?? results.find((note) => note.id === focusedNoteId) ?? results[0];
  const selectedSources = selected ? meetings.filter((meeting) => meeting.space === selected.space && selected.sourceIds?.includes(meeting.id)) : [];
  const selectedSpace = spaces.find((item) => item.name === selected?.space);
  const filteredSpace = spaces.find((item) => item.name === spaceFilter);

  return <section className="recordings-page notes-page" aria-label="Заметки">
    <div className="recordings-heading"><h1>Заметки</h1>{spaceFilter === "all" ? editableSpaces.length > 0 && <DropdownMenu><DropdownMenuTrigger asChild><button className="add-button"><Plus size={18} />Новая заметка</button></DropdownMenuTrigger><DropdownMenuContent align="end" className="recording-add-space-menu"><div className="recording-add-space-label">В пространство</div>{editableSpaces.map((item) => <DropdownMenuItem key={item.name} onSelect={() => onAddNote(item.name)}><SpaceDot name={item.name} color={item.color} />{item.name}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu> : filteredSpace?.access === "edit" && <button className="add-button" onClick={() => onAddNote(spaceFilter)}><Plus size={18} />Новая заметка</button>}</div>
    <div className="recordings-controls"><SpaceFilter spaces={spaces} value={spaceFilter} onChange={(value) => { onSpaceFilter(value); setSelectedId(null); }} /></div>
    <div className="recordings-layout">
      <aside className="recordings-list-pane" aria-label="Список заметок">
        <label className="recordings-search"><Search size={19} /><input ref={searchRef} value={query} onChange={(event) => { setQuery(event.target.value); setSelectedId(null); }} placeholder="Поиск по заметкам" aria-label="Поиск по названию и содержимому заметок" />{query && <button aria-label="Очистить поиск" onClick={() => { setQuery(""); setSelectedId(null); }}><X size={16} /></button>}</label>
        <div className="recordings-list">{results.length ? results.map((note) => {
          const space = spaces.find((item) => item.name === note.space);
          const excerpt = noteText(note);
          const row = <button className={`recording-row ${selected?.id === note.id ? "selected" : ""}`} onClick={() => setSelectedId(note.id)} aria-current={selected?.id === note.id ? "true" : undefined}>
            <span className="recording-row-top"><span className="recording-row-title"><SpaceDot name={note.space} color={space?.color} /><strong>{note.title || "Без названия"}</strong></span></span>
            <span className="recording-row-meta">{noteDate(note)}{note.summaryFor ? " · Резюме встречи" : note.detail && note.detail !== "Черновик" ? ` · ${note.detail}` : ""}</span>
            {excerpt && <span className="notes-row-excerpt">{excerpt}</span>}
          </button>;
          return <div className="recording-row-wrap" key={note.id}><NoteContextActions note={note} templates={templates} canEdit={space?.access === "edit"} onRename={onRenameNote} onRegenerate={onRegenerateNote} onDelete={onDeleteNote} onCreateTemplate={onCreateTemplate}>{row}</NoteContextActions></div>;
        }) : <div className="recordings-empty">{term ? "По этому запросу заметок не нашлось." : "В этом пространстве пока нет заметок."}</div>}</div>
      </aside>
      <article className="recording-preview note-preview" aria-label="Просмотр заметки">
        {selected ? <>
          <div className="recording-preview-head"><div><h2><SpaceDot name={selected.space} color={selectedSpace?.color} /><span>{selected.title || "Без названия"}</span></h2><p className="notes-preview-meta">{noteDate(selected)}{selected.summaryFor ? " · Резюме встречи" : selected.templateName ? ` · ${selected.templateName}` : ""}</p></div><button onClick={() => onOpenNote(selected)}>Открыть <ArrowRight size={16} /></button></div>
          <div className="note-preview-content">
            {selectedSources.length > 0 && <div className="notes-preview-sources"><span>Связанные записи</span>{selectedSources.map((meeting) => <button key={meeting.id} onClick={() => onOpenMeeting(meeting)}><AudioLines size={15} />{meeting.title}</button>)}</div>}
            <KnowledgeBody html={selected.body ?? ""} title={selected.title} emptyText={selected.summaryFor ? "Заметка-резюме создана автоматически. В прототипе текст не генерируется; откройте заметку, чтобы добавить содержание." : "Заметка пока пустая. Откройте её, чтобы добавить содержание."} />
          </div>
        </> : <div className="recordings-no-selection">{term ? "Заметки не найдены." : "Выберите заметку слева."}</div>}
      </article>
    </div>
  </section>;
}
