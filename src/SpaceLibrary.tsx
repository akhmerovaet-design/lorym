import { useEffect, useRef, useState, type MouseEvent } from "react";
import { ArrowRight, AudioLines, Check, ChevronRight, File, FileText, Folder, FolderOpen, Grid2X2, ImagePlus, List, MessageCircle, MoreHorizontal, Pencil, Plus, Search, Upload, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { folderPath, type Material, type FolderInfo } from "@/model";
import type { SpaceInfo } from "@/SpacesPage";
import { SpaceDot } from "@/SpaceDot";
import { SpaceSettingsDrawer } from "@/SpaceSettingsDrawer";
import { MATERIAL_DRAG_TYPE } from "@/materialDrag";
import { searchableMaterialText } from "@/materialSearch";
import { prepareCoverImage } from "@/coverImage";

type Props = {
  space: string;
  folderId: string | null;
  onFolderChange: (id: string | null) => void;
  spaceInfo?: SpaceInfo;
  spaceNames: string[];
  materials: Material[];
  folders: FolderInfo[];
  onOpenMaterial: (item: Material) => void;
  onUploadFile: (folderId: string | null) => void;
  onNewNote: (folderId: string | null) => void;
  onAddFolder: (name: string, parentId: string | null) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onMoveToFolder: (id: number, folderId: string | null) => void;
  onUpdateSpace: (space: SpaceInfo) => void;
  onRenameSpace: (oldName: string, nextName: string) => void;
  onOpenTemplates: () => void;
};

type SortOrder = "recent" | "name" | "type";
type AssistantMessage = { role: "user" | "assistant"; text: string; sourceId?: number };

export function SpaceLibrary({ space, folderId, onFolderChange, spaceInfo, spaceNames, materials, folders, onOpenMaterial, onUploadFile, onNewNote, onAddFolder, onRenameFolder, onDeleteFolder, onMoveToFolder, onUpdateSpace, onRenameSpace, onOpenTemplates }: Props) {
  const [layout, setLayout] = useState<"grid" | "list">("list");
  const [sort, setSort] = useState<SortOrder>("recent");
  const [query, setQuery] = useState("");
  const [folderDialog, setFolderDialog] = useState<"create" | "rename" | null>(null);
  const [editingFolder, setEditingFolder] = useState<FolderInfo | null>(null);
  const [folderName, setFolderName] = useState("");
  const [folderError, setFolderError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<FolderInfo | null>(null);
  const [addMenu, setAddMenu] = useState<{ left: number; top: number } | null>(null);
  const [addMenuSection, setAddMenuSection] = useState<"root" | "create">("root");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [coverError, setCoverError] = useState("");
  const [coverBusy, setCoverBusy] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantDrafts, setAssistantDrafts] = useState<Record<string, string>>({});
  const [assistantThreads, setAssistantThreads] = useState<Record<string, AssistantMessage[]>>({});
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const assistantMessagesRef = useRef<HTMLDivElement>(null);
  const editable = spaceInfo?.access === "edit";
  const activeFolder = folders.find((item) => item.id === folderId);
  const term = query.trim().toLocaleLowerCase("ru");
  const folderRows = folders.map((folder) => ({ folder, path: folderPath(folders, folder.id) })).sort((a, b) => a.path.localeCompare(b.path, "ru"));
  const shownMaterials = materials.filter((item) => {
    if (item.summaryFor && materials.some((meeting) => meeting.kind === "meeting" && meeting.id === item.summaryFor)) return false;
    if (term) return searchableMaterialText(item).includes(term) || (item.kind === "meeting" && materials.some((note) => note.summaryFor === item.id && searchableMaterialText(note).includes(term)));
    return folderId === null || (item.folderId ?? null) === folderId;
  }).sort((a, b) => sort === "name" ? a.title.localeCompare(b.title, "ru") : sort === "type" ? a.kind.localeCompare(b.kind) || a.title.localeCompare(b.title, "ru") : 0);
  function materialPreview(item: Material) {
    const bodies = item.kind === "meeting" ? materials.filter((related) => related.summaryFor === item.id).map((related) => related.body) : [item.body];
    const paragraphs = bodies.flatMap((body) => Array.from(body?.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi) ?? [], (match) => match[1].replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()));
    return paragraphs.find((paragraph) => paragraph && !/^черновик по транскрипту/i.test(paragraph)) ?? "";
  }
  const firstMeeting = materials.find((item) => item.kind === "meeting");
  const assistantMessages = assistantThreads[space] ?? [];
  const assistantQuestion = assistantDrafts[space] ?? "";
  useEffect(() => { if (assistantMessagesRef.current) assistantMessagesRef.current.scrollTop = assistantMessagesRef.current.scrollHeight; }, [assistantMessages.length]);
  useEffect(() => {
    if (!addMenu) return;
    addMenuRef.current?.querySelector("button")?.focus();
    const closeOnPointer = (event: PointerEvent) => {
      if (addMenuRef.current?.contains(event.target as Node) || addButtonRef.current?.contains(event.target as Node)) return;
      setAddMenu(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setAddMenu(null); };
    document.addEventListener("pointerdown", closeOnPointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("pointerdown", closeOnPointer); document.removeEventListener("keydown", closeOnEscape); };
  }, [addMenu, addMenuSection]);
  useEffect(() => {
    if (!assistantOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setAssistantOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [assistantOpen]);
  function sendAssistantQuestion() {
    const question = assistantQuestion.trim();
    if (!question) return;
    const answer = firstMeeting
      ? "Пока это пример ответа по материалам пространства. Откройте источник, чтобы проверить контекст встречи."
      : "Пока в этом пространстве нет встреч для ответа. Добавьте запись или документ.";
    setAssistantThreads((current) => ({ ...current, [space]: [...(current[space] ?? []), { role: "user", text: question }, { role: "assistant", text: answer, sourceId: firstMeeting?.id }] }));
    setAssistantDrafts((current) => ({ ...current, [space]: "" }));
  }
  function openFolder(id: string | null) { onFolderChange(id); setQuery(""); }
  function openAddMenu(left: number, top: number) {
    setAddMenuSection("root");
    setAddMenu({ left: Math.max(12, Math.min(left, window.innerWidth - 220)), top: Math.max(12, Math.min(top, window.innerHeight - 150)) });
  }
  function openAddMenuFromArea(event: MouseEvent<HTMLDivElement>) {
    if (!editable || !(event.target instanceof Element) || event.target.closest("button, input, select, textarea, a, .library-folder, .library-material")) return;
    openAddMenu(event.clientX, event.clientY);
  }
  function startFolderDialog(mode: "create" | "rename", folder?: FolderInfo) {
    setEditingFolder(folder ?? null);
    setFolderName(folder?.name ?? "");
    setFolderError("");
    setFolderDialog(mode);
  }
  function saveFolder() {
    const name = folderName.trim();
    if (!name) { setFolderError("Введите название папки"); return; }
    const parentId = folderDialog === "rename" ? editingFolder?.parentId ?? null : folderId;
    if (folders.some((item) => item.parentId === parentId && item.id !== editingFolder?.id && item.name.toLocaleLowerCase("ru") === name.toLocaleLowerCase("ru"))) {
      setFolderError("В этой папке уже есть такое название"); return;
    }
    if (folderDialog === "rename" && editingFolder) onRenameFolder(editingFolder.id, name);
    else onAddFolder(name, folderId);
    setFolderDialog(null);
  }
  async function uploadCover(file?: File) {
    if (!file || !spaceInfo) return;
    setCoverError("");
    setCoverBusy(true);
    try {
      onUpdateSpace({ ...spaceInfo, coverImage: await prepareCoverImage(file) });
    } catch (error) {
      setCoverError(error instanceof Error ? error.message : "Не удалось открыть изображение");
    } finally {
      setCoverBusy(false);
    }
  }
  return <section className="space-library" aria-label={`Пространство «${space}»`}>
    <div className={`space-library-cover cover-${spaceInfo?.cover ?? "new"} ${spaceInfo?.coverImage ? "has-image" : ""}`}>
      {spaceInfo?.coverImage && <img className="space-library-cover-image" src={spaceInfo.coverImage} alt="" />}
      {editable && spaceInfo && <div className="space-library-cover-actions">
        <input ref={coverInputRef} type="file" accept="image/*" className="sr-only" aria-label={`Выбрать обложку для пространства «${space}»`} onChange={(event) => { void uploadCover(event.target.files?.[0]); event.target.value = ""; }} />
        <button type="button" disabled={coverBusy} onClick={() => coverInputRef.current?.click()}><ImagePlus size={16} />{coverBusy ? "Загрузка…" : spaceInfo.coverImage ? "Сменить обложку" : "Добавить обложку"}</button>
        {spaceInfo.coverImage && <button type="button" className="cover-remove" disabled={coverBusy} aria-label={`Удалить обложку пространства «${space}»`} onClick={() => { setCoverError(""); onUpdateSpace({ ...spaceInfo, coverImage: "" }); }}><X size={17} /></button>}
      </div>}
    </div>
    {coverError && <p className="space-cover-error" role="alert">{coverError}</p>}
    <header className="space-library-header">
      <div><div className="space-library-title"><SpaceDot name={space} color={spaceInfo?.color} decorative /><h1>{space}</h1>{editable && <button type="button" className="space-library-edit" aria-label={`Редактировать пространство «${space}»`} onClick={() => setSettingsOpen(true)}><Pencil size={15} strokeWidth={1.7} /><span>Редактировать</span></button>}</div>{spaceInfo?.kind === "organization" && <p>{spaceInfo.organization}</p>}</div>
      <div className="space-library-actions">
        {editable && <button ref={addButtonRef} className="add-button" aria-haspopup="menu" aria-expanded={!!addMenu} onClick={() => { if (addMenu) setAddMenu(null); else { const rect = addButtonRef.current?.getBoundingClientRect(); if (rect) openAddMenu(rect.right - 206, rect.bottom + 8); } }}><Plus size={18} />Добавить</button>}
        <button className="library-assistant" onClick={() => setAssistantOpen(true)}><MessageCircle size={17} />Спросить</button>
      </div>
    </header>

    <div className="space-library-toolbar">
      <div className="library-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск в пространстве" aria-label="Поиск в пространстве" />{query && <button aria-label="Очистить поиск" onClick={() => setQuery("")}><X size={16} /></button>}</div>
      <div className="library-tools">
        <label className="library-sort"><span className="sr-only">Сортировка</span><select value={sort} aria-label="Сортировка" onChange={(event) => setSort(event.target.value as SortOrder)}><option value="recent">Недавние</option><option value="name">По названию</option><option value="type">По типу</option></select></label>
        <div className="library-layout" aria-label="Вид материалов"><button className={layout === "grid" ? "active" : ""} aria-label="Плитка" aria-pressed={layout === "grid"} onClick={() => setLayout("grid")}><Grid2X2 size={17} /></button><button className={layout === "list" ? "active" : ""} aria-label="Список" aria-pressed={layout === "list"} onClick={() => setLayout("list")}><List size={18} /></button></div>
      </div>
    </div>
    <div className={`library-sections ${folders.length > 0 ? "has-folders" : ""}`} onClick={openAddMenuFromArea}>
    {folders.length > 0 && <nav className="library-folder-rail" aria-label="Папки пространства"><div className="library-folders">
      <button className={`library-folder-all ${folderId === null ? "active" : ""}`} aria-current={folderId === null ? "page" : undefined} onClick={() => openFolder(null)}>Все материалы</button>
      {folderRows.map(({ folder: item, path }) => <div className={`library-folder ${folderId === item.id ? "active" : ""}`} key={item.id}>
        <button className="library-folder-open" aria-current={folderId === item.id ? "page" : undefined} onClick={() => openFolder(item.id)}><Folder size={16} strokeWidth={1.65} /><strong title={path}>{path}</strong></button>
        {editable && <DropdownMenu><DropdownMenuTrigger asChild><button className="library-item-more" aria-label={`Действия с папкой «${item.name}»`}><MoreHorizontal size={18} /></button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => startFolderDialog("rename", item)}>Переименовать</DropdownMenuItem><DropdownMenuItem onSelect={() => setDeleteTarget(item)}>Удалить папку</DropdownMenuItem></DropdownMenuContent></DropdownMenu>}
      </div>)}
    </div></nav>}

    <div className="library-group library-material-group"><div className="library-group-heading"><h2>{term ? "Результаты поиска" : activeFolder ? activeFolder.name : "Материалы"}</h2></div>
      {shownMaterials.length > 0 ? <div className={`library-materials ${layout}`}>{shownMaterials.map((item) => <div className={`library-material ${item.kind}`} key={item.id}>
        <button className="library-material-open" onClick={() => onOpenMaterial(item)} draggable={editable && !item.summaryFor} onDragStart={(event) => { if (!editable || item.summaryFor) return; event.dataTransfer.setData(MATERIAL_DRAG_TYPE, String(item.id)); event.dataTransfer.effectAllowed = "move"; }}>
          <span className="library-material-type">{item.kind === "meeting" ? <AudioLines size={21} strokeWidth={1.6} /> : item.kind === "file" ? <File size={21} strokeWidth={1.6} /> : <FileText size={21} strokeWidth={1.6} />}<span className="library-material-kind">{item.kind === "meeting" ? "Встреча" : item.kind === "file" ? "Файл" : item.summaryFor ? "Резюме встречи" : "Документ"}</span>{!term && folderId === null && item.folderId && <span className="library-material-folder">/ {folderPath(folders, item.folderId)}</span>}</span>
          <span className="library-material-heading"><strong>{item.title}</strong><small>{item.date}</small></span>{materialPreview(item) && <span className="library-material-preview">{materialPreview(item)}</span>}<span className="library-material-bottom"><ArrowRight size={16} /></span>
        </button>
        {editable && <DropdownMenu><DropdownMenuTrigger asChild><button className="library-item-more" aria-label={`Переместить «${item.title}»`}><MoreHorizontal size={18} /></button></DropdownMenuTrigger><DropdownMenuContent align="end" className="library-move-menu"><div className="material-move-label">Переместить в папку</div><DropdownMenuItem onSelect={() => onMoveToFolder(item.id, null)}>Без папки</DropdownMenuItem>{folders.map((folder) => <DropdownMenuItem key={folder.id} onSelect={() => onMoveToFolder(item.id, folder.id)}>{folderPath(folders, folder.id)}{item.folderId === folder.id && <Check size={14} />}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>}
      </div>)}</div> : <div className="library-empty"><FolderOpen size={30} strokeWidth={1.2} aria-hidden="true" /><p>{term ? "Ничего не найдено" : folderId ? "Папка пока пуста" : "Здесь пока пусто"}</p>{editable && !term && <button onClick={() => onUploadFile(folderId)}>Загрузить файлы</button>}</div>}
    </div>
    </div>

    {addMenu && <div ref={addMenuRef} className="library-add-menu" role="menu" aria-label={`Добавить в пространство «${space}»`} style={{ left: addMenu.left, top: addMenu.top }}>
      {addMenuSection === "root" ? <>
        <button role="menuitem" onClick={() => { setAddMenu(null); onUploadFile(folderId); }}><Upload size={17} />Загрузить файлы</button>
        <button role="menuitem" onClick={() => setAddMenuSection("create")}><Plus size={17} />Создать<ChevronRight className="library-add-chevron" size={16} /></button>
      </> : <>
        <button className="library-add-back" role="menuitem" onClick={() => setAddMenuSection("root")}>← Создать</button>
        <button role="menuitem" onClick={() => { setAddMenu(null); onNewNote(folderId); }}><FileText size={17} />Документ</button>
        <button role="menuitem" onClick={() => { setAddMenu(null); startFolderDialog("create"); }}><Folder size={17} />Папку</button>
      </>}
    </div>}

    {settingsOpen && spaceInfo && <SpaceSettingsDrawer space={spaceInfo} spaceNames={spaceNames} onClose={() => setSettingsOpen(false)} onSave={(next, oldName) => { onUpdateSpace({ ...next, name: oldName }); if (next.name !== oldName) onRenameSpace(oldName, next.name); }} />}

    <Dialog open={folderDialog !== null} onOpenChange={(open) => { if (!open) setFolderDialog(null); }}><DialogContent className="lorym-dialog library-folder-dialog"><DialogHeader><DialogTitle>{folderDialog === "rename" ? "Переименовать папку" : "Новая папка"}</DialogTitle><DialogDescription>Папки помогают собрать материалы одной темы в пространстве.</DialogDescription></DialogHeader><label>Название<input autoFocus value={folderName} onChange={(event) => { setFolderName(event.target.value); setFolderError(""); }} onKeyDown={(event) => { if (event.key === "Enter") saveFolder(); }} placeholder="Название папки" /></label>{folderError && <p className="form-error" role="alert">{folderError}</p>}<div className="dialog-actions"><button className="meeting-dialog-cancel" onClick={() => setFolderDialog(null)}>Отмена</button><button className="add-button" onClick={saveFolder}>{folderDialog === "rename" ? "Сохранить" : "Создать папку"}</button></div></DialogContent></Dialog>
    <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}><DialogContent className="lorym-dialog library-folder-dialog"><DialogHeader><DialogTitle>Удалить «{deleteTarget?.name}»?</DialogTitle><DialogDescription>Материалы и вложенные папки переместятся на уровень выше.</DialogDescription></DialogHeader><div className="dialog-actions"><button className="meeting-dialog-cancel" onClick={() => setDeleteTarget(null)}>Отмена</button><button className="add-button" onClick={() => { if (deleteTarget) onDeleteFolder(deleteTarget.id); setDeleteTarget(null); }}>Удалить папку</button></div></DialogContent></Dialog>
    {assistantOpen && <aside className="library-chat-panel" aria-label={`Чат по материалам пространства «${space}»`}>
      <header className="library-chat-head"><div><h2>Лора</h2><span><SpaceDot name={space} color={spaceInfo?.color} />Только «{space}»</span></div><button className="library-chat-close" onClick={() => setAssistantOpen(false)} aria-label="Закрыть чат"><X size={19} /></button></header>
      <div className="library-chat-messages" ref={assistantMessagesRef} role="log" aria-live="polite">
        {assistantMessages.length === 0 && <div className="library-chat-intro"><p>Спросите о решениях и фрагментах встреч или попросите собрать конспект по шаблону. Ответы связаны с исходными материалами.</p><button className="library-template-link" onClick={() => { setAssistantOpen(false); onOpenTemplates(); }}>Шаблоны документов <ArrowRight size={14} /></button></div>}
        {assistantMessages.map((message, index) => <div key={index} className={`library-chat-message ${message.role}`}><p>{message.text}</p>{message.sourceId && <button onClick={() => { const source = materials.find((item) => item.id === message.sourceId); if (source) { setAssistantOpen(false); onOpenMaterial(source); } }}>Источник: {materials.find((item) => item.id === message.sourceId)?.title ?? "Встреча"}<ArrowRight size={14} /></button>}</div>)}
      </div>
      <form className="library-chat-bottom" onSubmit={(event) => { event.preventDefault(); sendAssistantQuestion(); }}><textarea autoFocus rows={3} value={assistantQuestion} onChange={(event) => setAssistantDrafts((current) => ({ ...current, [space]: event.target.value }))} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendAssistantQuestion(); } }} placeholder="Например: что решили по запуску?" aria-label="Сообщение помощнику" /><div className="library-chat-compose-actions"><span>Enter — отправить · Esc — закрыть</span><button type="submit" disabled={!assistantQuestion.trim()}>Отправить</button></div></form>
    </aside>}
  </section>;
}
