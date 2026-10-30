import { useState, type ReactNode } from "react";
import { ContextMenu as ContextMenuPrimitive } from "radix-ui";
import { RefreshCw, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Material, TemplateInfo } from "@/model";

type Props = {
  note: Material;
  templates: TemplateInfo[];
  canEdit: boolean;
  onRename: (note: Material, title: string) => void;
  onRegenerate: (note: Material, template: string, focus: string) => void;
  onDelete: (note: Material) => void;
  onCreateTemplate: (name: string, instructions: string) => void;
  children: ReactNode;
};

export function NoteContextActions({ note, templates, canEdit, onRename, onRegenerate, onDelete, onCreateTemplate, children }: Props) {
  const [dialog, setDialog] = useState<"rename" | "regenerate" | "delete" | null>(null);
  const [title, setTitle] = useState(note.title);
  const [template, setTemplate] = useState(note.templateName ?? templates[0]?.name ?? "");
  const [focus, setFocus] = useState("");
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateInstructions, setNewTemplateInstructions] = useState("");
  const [error, setError] = useState("");
  if (!canEdit) return <>{children}</>;

  function open(next: "rename" | "regenerate" | "delete") {
    setTitle(note.title);
    setTemplate(note.templateName ?? templates[0]?.name ?? "");
    setFocus("");
    setNewTemplateName("");
    setNewTemplateInstructions("");
    setError("");
    setDialog(next);
  }

  function saveRename() {
    const value = title.trim();
    if (!value) { setError("Введите название"); return; }
    onRename(note, value);
    setDialog(null);
  }

  function regenerate() {
    let chosen = template;
    if (template === "__new__") {
      chosen = newTemplateName.trim();
      if (!chosen || !newTemplateInstructions.trim()) { setError("Укажите название и инструкцию шаблона"); return; }
      if (templates.some((item) => item.name.toLocaleLowerCase("ru") === chosen.toLocaleLowerCase("ru"))) { setError("Шаблон с таким названием уже есть"); return; }
      onCreateTemplate(chosen, newTemplateInstructions.trim());
    }
    if (!chosen) { setError("Выберите шаблон"); return; }
    onRegenerate(note, chosen, focus.trim());
    setDialog(null);
  }

  return <>
    <ContextMenuPrimitive.Root>
      <ContextMenuPrimitive.Trigger asChild>{children}</ContextMenuPrimitive.Trigger>
      <ContextMenuPrimitive.Portal>
        <ContextMenuPrimitive.Content className="note-context-menu" aria-label={`Действия с документом «${note.title}»`}>
          <ContextMenuPrimitive.Item onSelect={() => open("rename")}><Pencil size={15} /> Переименовать</ContextMenuPrimitive.Item>
          <ContextMenuPrimitive.Item disabled={!note.sourceIds?.length} onSelect={() => open("regenerate")}><RefreshCw size={15} /> Перегенерировать</ContextMenuPrimitive.Item>
          <ContextMenuPrimitive.Separator />
          <ContextMenuPrimitive.Item className="destructive" onSelect={() => open("delete")}><Trash2 size={15} /> Удалить</ContextMenuPrimitive.Item>
        </ContextMenuPrimitive.Content>
      </ContextMenuPrimitive.Portal>
    </ContextMenuPrimitive.Root>

    <Dialog open={dialog === "rename"} onOpenChange={(value) => { if (!value) setDialog(null); }}>
      <DialogContent className="lorym-dialog note-action-dialog"><DialogHeader><DialogTitle>Переименовать документ</DialogTitle><DialogDescription>Новое название появится в базе знаний и документе.</DialogDescription></DialogHeader>
        <label>Название<input value={title} onChange={(event) => { setTitle(event.target.value); setError(""); }} onKeyDown={(event) => { if (event.key === "Enter") saveRename(); }} autoFocus /></label>
        {error && <p className="note-action-error" role="alert">{error}</p>}
        <div className="dialog-actions"><button className="meeting-dialog-cancel" onClick={() => setDialog(null)}>Отмена</button><button className="add-button" onClick={saveRename}>Сохранить</button></div>
      </DialogContent>
    </Dialog>

    <Dialog open={dialog === "regenerate"} onOpenChange={(value) => { if (!value) setDialog(null); }}>
      <DialogContent className="lorym-dialog note-action-dialog"><DialogHeader><DialogTitle>Перегенерировать {note.summaryFor ? "резюме" : "документ"}</DialogTitle><DialogDescription>Текущий текст будет заменён. Связь с источниками сохранится. В прототипе создаётся черновик по демонстрационному транскрипту.</DialogDescription></DialogHeader>
        <label>Шаблон<select value={template} onChange={(event) => { setTemplate(event.target.value); setError(""); }}>{templates.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}<option value="__new__">+ Новый шаблон</option></select></label>
        {template === "__new__" && <div className="recording-new-template"><label>Название шаблона<input value={newTemplateName} onChange={(event) => setNewTemplateName(event.target.value)} /></label><label>Инструкция шаблона<textarea value={newTemplateInstructions} onChange={(event) => setNewTemplateInstructions(event.target.value)} /></label></div>}
        <label>На чём сделать акцент <span>необязательно</span><textarea value={focus} onChange={(event) => setFocus(event.target.value)} placeholder="Например, решения и открытые вопросы" /></label>
        {error && <p className="note-action-error" role="alert">{error}</p>}
        <div className="dialog-actions"><button className="meeting-dialog-cancel" onClick={() => setDialog(null)}>Отмена</button><button className="add-button" onClick={regenerate}>Перегенерировать</button></div>
      </DialogContent>
    </Dialog>

    <Dialog open={dialog === "delete"} onOpenChange={(value) => { if (!value) setDialog(null); }}>
      <DialogContent className="lorym-dialog note-action-dialog"><DialogHeader><DialogTitle>Удалить {note.summaryFor ? "резюме" : "документ"}?</DialogTitle><DialogDescription>{note.summaryFor ? "Исходная запись и транскрипт сохранятся." : "Этот документ исчезнет из базы знаний."}</DialogDescription></DialogHeader>
        <div className="dialog-actions"><button className="meeting-dialog-cancel" onClick={() => setDialog(null)}>Отмена</button><button className="add-button" onClick={() => { onDelete(note); setDialog(null); }}>Удалить</button></div>
      </DialogContent>
    </Dialog>
  </>;
}
