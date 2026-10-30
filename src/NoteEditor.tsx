import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, AudioLines, Bold, Italic, List, ListOrdered, Plus, Redo2, Undo2, Underline, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Material } from "@/model";
import { SpaceDot } from "@/SpaceDot";
import type { SpaceColor } from "@/spaceColors";

type Props = {
  note: Material;
  spaceColor?: SpaceColor;
  meetings: Material[];
  topics: string[];
  onChange: (changes: Partial<Material>) => void;
  onDone: () => void;
  onOpenMeeting: (meeting: Material) => void;
};

export function NoteEditor({ note, spaceColor, meetings, topics, onChange, onDone, onOpenMeeting }: Props) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const initialBody = useRef(note.body ?? "");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selection, setSelection] = useState<number[]>([]);
  const selectedMeetings = meetings.filter((meeting) => note.sourceIds?.includes(meeting.id));

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.innerHTML = initialBody.current;
  }, []);

  function saveBody() {
    onChange({ body: bodyRef.current?.innerHTML ?? "", searchText: bodyRef.current?.innerText ?? "" });
  }
  function command(name: string, value?: string) {
    bodyRef.current?.focus();
    document.execCommand(name, false, value);
    saveBody();
  }
  function tool(label: string, icon: ReactNode, name: string, value?: string) {
    return <button type="button" className="note-tool" aria-label={label} title={label} onMouseDown={(event) => event.preventDefault()} onClick={() => command(name, value)}>{icon}</button>;
  }
  function openPicker() {
    setSelection(note.sourceIds ?? []);
    setPickerOpen(true);
  }
  function confirmSources() {
    const validIds = selection.filter((id) => meetings.some((meeting) => meeting.id === id));
    onChange({ sourceIds: validIds, detail: `${validIds.length} ${validIds.length === 1 ? "встреча" : validIds.length < 5 ? "встречи" : "встреч"}` });
    setPickerOpen(false);
  }
  function removeSource(id: number) {
    const next = (note.sourceIds ?? []).filter((sourceId) => sourceId !== id);
    onChange({ sourceIds: next, detail: `${next.length} ${next.length === 1 ? "встреча" : next.length < 5 ? "встречи" : "встреч"}` });
  }

  return <section className="note-editor" aria-label="Редактор документа">
    <div className="note-editor-top">
      <span className="note-save-state">Сохранено в браузере</span>
      <button className="note-done" onClick={onDone}>Готово</button>
    </div>

    <div className="note-editor-layout">
      <aside className="note-context" aria-label="Источники документа">
        <div className="note-context-head"><h2>{note.summaryFor ? "Исходная встреча" : "Источники"}</h2>{!note.summaryFor && <button onClick={openPicker} aria-label="Добавить встречи" title="Добавить встречи"><Plus size={18} /></button>}</div>
        <div className="note-source-list">{selectedMeetings.map((meeting) => <div className="note-source-item" key={meeting.id}><AudioLines size={16} strokeWidth={1.7} aria-hidden="true" /><button className="note-source-open" onClick={() => onOpenMeeting(meeting)}><strong>{meeting.title}</strong><small>{meeting.date}</small></button>{!note.summaryFor && <button className="note-source-remove" aria-label={`Убрать встречу «${meeting.title}»`} title="Убрать из документа" onClick={() => removeSource(meeting.id)}><X size={14} /></button>}</div>)}</div>
        {!selectedMeetings.length && !note.summaryFor && <button className="note-source-empty" onClick={openPicker}>Добавить встречу <ArrowRight size={15} /></button>}
        {!note.summaryFor && <label className="note-topic-field">Тема<input list="note-topic-suggestions" value={note.topic === "Без темы" ? "" : note.topic} onChange={(event) => onChange({ topic: event.target.value.trimStart() || "Без темы", folderId: null })} placeholder="Например, экономика" /><datalist id="note-topic-suggestions">{topics.filter((topic) => topic !== "Без темы").map((topic) => <option key={topic} value={topic} />)}</datalist></label>}
      </aside>
      <div className="note-editor-divider" aria-hidden="true" />
      <div className="note-editor-main">
        <div className="note-title-row"><SpaceDot name={note.space} color={spaceColor} /><textarea className="note-title-input" aria-label="Название документа" value={note.title} onChange={(event) => onChange({ title: event.target.value })} placeholder="Новый документ" rows={1} /></div>
        <div className="note-toolbar" role="toolbar" aria-label="Форматирование документа">
          <div className="note-tool-group">{tool("Отменить", <Undo2 size={18} />, "undo")}{tool("Повторить", <Redo2 size={18} />, "redo")}</div>
          <div className="note-tool-group">{tool("Обычный текст", <span className="note-tool-text">Текст</span>, "formatBlock", "p")}{tool("Заголовок", <span className="note-tool-text note-tool-heading">H2</span>, "formatBlock", "h2")}</div>
          <div className="note-tool-group">{tool("Жирный", <Bold size={18} />, "bold")}{tool("Курсив", <Italic size={18} />, "italic")}{tool("Подчёркнутый", <Underline size={18} />, "underline")}</div>
          <div className="note-tool-group">{tool("Маркированный список", <List size={18} />, "insertUnorderedList")}{tool("Нумерованный список", <ListOrdered size={18} />, "insertOrderedList")}</div>
        </div>
        <div className="note-writing-area"><div ref={bodyRef} className="note-content" contentEditable suppressContentEditableWarning role="textbox" aria-label="Текст документа" aria-multiline="true" data-placeholder="Начните писать…" onInput={saveBody} onPaste={(event) => { event.preventDefault(); document.execCommand("insertText", false, event.clipboardData.getData("text/plain")); }} /></div>
      </div>
    </div>

    <Dialog open={pickerOpen} onOpenChange={setPickerOpen}><DialogContent className="lorym-dialog note-source-dialog"><DialogHeader><DialogTitle>Источники документа</DialogTitle><DialogDescription>Можно выбрать несколько встреч из пространства «{note.space}».</DialogDescription></DialogHeader><div className="note-source-options">{meetings.length ? meetings.map((meeting) => <label key={meeting.id}><input type="checkbox" checked={selection.includes(meeting.id)} onChange={(event) => setSelection((previous) => event.target.checked ? [...previous, meeting.id] : previous.filter((id) => id !== meeting.id))} /><span><strong>{meeting.title}</strong><small>{meeting.date} · {meeting.topic}</small></span></label>) : <p>В этом пространстве пока нет встреч.</p>}</div><div className="dialog-actions"><button className="meeting-dialog-cancel" onClick={() => setPickerOpen(false)}>Отмена</button><button className="add-button" onClick={confirmSources}>Сохранить выбор</button></div></DialogContent></Dialog>
  </section>;
}
