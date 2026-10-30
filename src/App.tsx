import { useEffect, useRef, useState } from "react";
import { ArrowRight, AudioLines, Check, LayoutTemplate, ListTodo, Menu, Plus, Search, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SpacesPage, type SpaceInfo } from "@/SpacesPage";
import { HomePage } from "@/HomePage";
import { NoteEditor } from "@/NoteEditor";
import { FilePage } from "@/FilePage";
import { demoParts } from "@/meetingData";
import { SpaceTree } from "@/SpaceTree";
import { MaterialRow } from "@/MaterialRow";
import { TasksBoard } from "@/TasksBoard";
import { SpaceFilter } from "@/SpaceFilter";
import { SpaceLibrary } from "@/SpaceLibrary";
import { RecordingsPage } from "@/RecordingsPage";
import { type FolderInfo, type Kind, type Material, type TemplateInfo } from "@/model";
import { defaultSpaceColor, type SpaceColor } from "@/spaceColors";
import { searchableMaterialText } from "@/materialSearch";
import { deleteFile, saveFile } from "@/fileStorage";

type View = "home" | "spaces" | "overview" | "materials" | "meetings" | "note-editor" | "file-preview" | "topics" | "templates" | "tasks";
type NavigationSnapshot = { view: View; space: string; folderId: string | null; spaceFilter: string; query: string; topic: string; filter: "all" | Kind; activeMeetingId: number | null; activeFileId: number | null; editingNoteId: number | null; noteReturnMeetingId: number | null };
type Breadcrumb = { key: string; label: string; onClick: () => void };

const seed: Material[] = [
  { id: 1, kind: "meeting", title: "Планирование запуска", detail: "2 записи · презентация · 54 мин", date: "Сегодня, 10:42", topic: "Запуск продукта", space: "Рабочее", searchText: "конверсия первого запуска метрики сценарий транскрипт план сегменты запись созвона часть 1 часть 2 презентация запуска pdf" },
  { id: -1, kind: "note", title: "Планирование запуска", detail: "Резюме встречи", date: "Сегодня, 10:42", topic: "Запуск продукта", space: "Рабочее", sourceIds: [1], summaryFor: 1, templateName: "Краткий итог", body: "<p>Согласовали сценарий первого запуска и набор метрик. Следующий шаг — проверить прототип с командой.</p><h2>Ключевые выводы и решения</h2><ul><li>Первый шаг должен объяснять, что пользователь получит после загрузки.</li><li>Успех запуска оценим по завершению сценария и повторному использованию.</li></ul><h2>Задачи</h2><ul><li>Проверить первый шаг пользователя на прототипе.</li><li>Назначить владельцев метрик.</li></ul>" },
  { id: 3, kind: "meeting", title: "Интервью с клиентом — Анна", detail: "1 запись · 38 мин", date: "Вчера, 14:05", topic: "Исследования", space: "Рабочее", folderId: "work-research", searchText: "трудно понять первый шаг инструкции" },
  { id: -3, kind: "note", title: "Интервью с клиентом — Анна", detail: "Резюме встречи", date: "Вчера, 14:05", topic: "Исследования", space: "Рабочее", folderId: "work-research", sourceIds: [3], summaryFor: 3, templateName: "Краткий итог", body: "<p>Первый шаг после загрузки файла остаётся непонятным. Клиенту важно видеть выводы рядом с исходным разговором.</p><h2>Ключевые выводы и решения</h2><ul><li>Показывать следующий шаг сразу после загрузки.</li><li>Сохранять связь итогов с записью и транскриптом.</li></ul><h2>Задачи</h2><ul><li>Проверить, понятен ли следующий шаг после загрузки.</li></ul>" },
  { id: 4, kind: "note", title: "Что мешает первому запуску", detail: "2 встречи", date: "24 октября", topic: "Исследования", space: "Рабочее", folderId: "work-launch", searchText: "клиенты трудности инструкции первый шаг", sourceIds: [1, 3], body: "<h2>Главное</h2><p>После загрузки записи человеку нужен понятный следующий шаг. Выводы полезнее, когда можно вернуться к исходной встрече.</p>" },
  { id: 5, kind: "meeting", title: "Семейный разговор", detail: "1 запись · 26 мин", date: "Вчера, 19:20", topic: "Семья", space: "Личное", searchText: "выходные планы семейная запись транскрипт" },
  { id: -5, kind: "note", title: "Семейный разговор", detail: "Резюме встречи", date: "Вчера, 19:20", topic: "Семья", space: "Личное", sourceIds: [5], summaryFor: 5, templateName: "Краткий итог", body: "<p>Обсудили варианты на выходные и договорились выбрать маршрут после прогноза погоды.</p><h2>Ключевые выводы и решения</h2><ul><li>Маршрут выберем ближе к дате.</li></ul><h2>Задачи</h2><ul><li>Вернуться к выбору маршрута после прогноза погоды.</li></ul>" },
  { id: 6, kind: "note", title: "Идеи на выходные", detail: "1 встреча", date: "23 октября", topic: "Планы", space: "Личное", folderId: "personal-plans", searchText: "поездка прогулка идеи семья", sourceIds: [5], body: "<h2>Варианты</h2><p>Поехать за город или остаться в городе. Вернуться к выбору после прогноза погоды.</p>" },
];

const initialFolders: FolderInfo[] = [
  { id: "work-launch", space: "Рабочее", name: "Запуск продукта", parentId: null },
  { id: "work-research", space: "Рабочее", name: "Исследования", parentId: null },
  { id: "personal-plans", space: "Личное", name: "Планы", parentId: null },
];

const viewNames: Record<View, string> = { home: "Главная", spaces: "Мои пространства", overview: "Обзор", materials: "Материалы", meetings: "Записи", "note-editor": "Редактор документа", "file-preview": "Файл", topics: "Темы", templates: "Шаблоны", tasks: "Задачи" };
const initialSpaces: SpaceInfo[] = [
  { name: "Рабочее", kind: "personal", cover: "work", coverImage: "/covers/work-editorial.jpg", access: "edit", color: "rose" },
  { name: "Личное", kind: "personal", cover: "personal", access: "edit", color: "sage" },
];
const templates: TemplateInfo[] = [
  { name: "Протокол встречи", description: "Решения, задачи и открытые вопросы" },
  { name: "Конспект лекции", description: "Тезисы, определения и примеры", availableIn: ["Рабочее", "Личное"] },
  { name: "Исследовательское интервью", description: "Цитаты, барьеры и наблюдения", availableIn: ["Рабочее"] },
];

function oneSummaryPerMeeting(items: Material[]): Material[] {
  const seen = new Set<number>();
  return items.map((item) => {
    if (item.kind !== "note" || !item.summaryFor) return item;
    if (!seen.has(item.summaryFor)) { seen.add(item.summaryFor); return item; }
    return { ...item, summaryFor: undefined, detail: "Документ" };
  });
}

function draftFromSources(sourceIds: number[], templateName: string, focus: string) {
  const excerpts = sourceIds.flatMap((id) => demoParts(id).flatMap((part) => part.lines.map((line) => line.text))).slice(0, 6);
  const escapeHtml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const body = excerpts.length
    ? `<p>Черновик по транскрипту. Проверьте и дополните выводы.</p>${focus ? `<p>Акцент: ${escapeHtml(focus)}</p>` : ""}<ul>${excerpts.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`
    : `<p>Черновик по шаблону «${escapeHtml(templateName)}». В прототипе автоматическая обработка не выполняется.</p>${focus ? `<p>Акцент: ${escapeHtml(focus)}</p>` : ""}`;
  return { body, searchText: `${templateName} ${focus} ${excerpts.join(" ")}` };
}

function linkedSpace() {
  const name = new URLSearchParams(window.location.search).get("space");
  if (!name) return null;
  try {
    const saved = JSON.parse(localStorage.getItem("lorym-prototype-spaces") ?? "null") as SpaceInfo[] | null;
    return (saved ?? initialSpaces).some((item) => item.name === name && !item.trashed) ? name : null;
  } catch {
    return initialSpaces.some((item) => item.name === name) ? name : null;
  }
}

function linkedRecordingId() {
  const value = new URLSearchParams(window.location.search).get("recording");
  if (value === null) return null;
  const id = Number(value);
  return value && Number.isSafeInteger(id) && id > 0 ? id : null;
}

function firstActiveSpace() {
  try {
    const saved = JSON.parse(localStorage.getItem("lorym-prototype-spaces") ?? "null") as SpaceInfo[] | null;
    return (saved ?? initialSpaces).find((item) => !item.trashed)?.name ?? "";
  } catch { return initialSpaces[0].name; }
}

function App() {
  const [space, setSpace] = useState(() => linkedSpace() ?? firstActiveSpace());
  const [view, setView] = useState<View>(() => linkedRecordingId() ? "meetings" : linkedSpace() ? "overview" : firstActiveSpace() ? "home" : "spaces");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [navigationHistory, setNavigationHistory] = useState<NavigationSnapshot[]>([]);
  const [spaceFilter, setSpaceFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("");
  const [filter, setFilter] = useState<"all" | Kind>("all");
  const [materials, setMaterials] = useState<Material[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("lorym-prototype-notes") ?? "[]") as Material[];
      const savedMeetings = JSON.parse(localStorage.getItem("lorym-prototype-meetings") ?? "[]") as Material[];
      const savedFiles = JSON.parse(localStorage.getItem("lorym-prototype-files-meta") ?? "[]") as Material[];
      const locations = JSON.parse(localStorage.getItem("lorym-prototype-material-locations") ?? "{}") as Record<string, string>;
      const noteOverrides = JSON.parse(localStorage.getItem("lorym-prototype-seed-notes") ?? "{}") as Record<string, Partial<Material>>;
      const meetingOverrides = JSON.parse(localStorage.getItem("lorym-prototype-seed-meetings") ?? "{}") as Record<string, Partial<Material>>;
      const folderLocations = JSON.parse(localStorage.getItem("lorym-prototype-material-folders") ?? "{}") as Record<string, string | null>;
      const deletedSeedNotes = new Set(JSON.parse(localStorage.getItem("lorym-prototype-deleted-seed-notes") ?? "[]") as number[]);
      const deletedSeedMeetings = new Set(JSON.parse(localStorage.getItem("lorym-prototype-deleted-seed-meetings") ?? "[]") as number[]);
      const savedSpaces = JSON.parse(localStorage.getItem("lorym-prototype-spaces") ?? "null") as SpaceInfo[] | null;
      const available = savedSpaces?.map((item) => item.name) ?? initialSpaces.map((item) => item.name);
      const restored = [...saved.filter((item) => item.kind === "note" && item.id > 6 && available.includes(item.space)), ...savedMeetings.filter((item) => item.kind === "meeting" && item.id > 6 && available.includes(item.space)), ...savedFiles.filter((item) => item.kind === "file" && available.includes(item.space)), ...seed.map((item) => ({ ...item, ...(item.kind === "note" ? noteOverrides[item.id] : meetingOverrides[item.id]), space: locations[item.id] ?? item.space, folderId: folderLocations[item.id] !== undefined ? folderLocations[item.id] : item.folderId })).filter((item) => available.includes(item.space) && !(item.kind === "note" && deletedSeedNotes.has(item.id)) && !(item.kind === "meeting" && deletedSeedMeetings.has(item.id)))];
      const meetingIds = new Set(restored.filter((item) => item.kind === "meeting").map((item) => item.id));
      return oneSummaryPerMeeting(restored.map((item) => {
        if (item.kind !== "note") return item;
        const sourceIds = item.sourceIds?.filter((id) => meetingIds.has(id));
        return { ...item, sourceIds, summaryFor: item.summaryFor && meetingIds.has(item.summaryFor) ? item.summaryFor : undefined };
      }));
    } catch { return seed; }
  });
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [activeMeetingId, setActiveMeetingId] = useState<number | null>(() => linkedRecordingId());
  const [activeFileId, setActiveFileId] = useState<number | null>(null);
  const [noteReturnMeetingId, setNoteReturnMeetingId] = useState<number | null>(null);
  const [allSpaces, setAllSpaces] = useState<SpaceInfo[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("lorym-prototype-spaces") ?? "null") as SpaceInfo[] | null;
      return saved?.map((item) => ({ ...item, color: item.color ?? defaultSpaceColor(item.name), coverImage: item.name === "Рабочее" && item.coverImage === undefined ? "/covers/work-editorial.jpg" : item.coverImage })) || initialSpaces;
    }
    catch { return initialSpaces; }
  });
  const spaces = allSpaces.filter((item) => !item.trashed);
  const trashedSpaces = allSpaces.filter((item) => item.trashed);
  const [folders, setFolders] = useState<FolderInfo[]>(() => {
    try { return JSON.parse(localStorage.getItem("lorym-prototype-folders") ?? "null") || initialFolders; }
    catch { return initialFolders; }
  });
  const [spaceCreateRequested, setSpaceCreateRequested] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState<TemplateInfo[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("lorym-prototype-templates") ?? "null") as TemplateInfo[] | null;
      return Array.isArray(saved) && saved.every((item) => typeof item.name === "string" && typeof item.description === "string") ? saved : templates;
    } catch { return templates; }
  });
  const [templateOpen, setTemplateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateInstructions, setTemplateInstructions] = useState("");
  const [pendingMove, setPendingMove] = useState<{ id: number; destination: string } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<"file" | "document-upload" | "link" | "note">("file");
  const [newTitle, setNewTitle] = useState("");
  const [createError, setCreateError] = useState("");
  const [targetSpace, setTargetSpace] = useState("Рабочее");
  const [targetFolderId, setTargetFolderId] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [draggingFile, setDraggingFile] = useState(false);
  const recordingInputRef = useRef<HTMLInputElement>(null);
  const recordingTargetRef = useRef<{ space: string; folderId: string }>({ space: "Рабочее", folderId: "" });
  const [processingRecord, setProcessingRecord] = useState<{ id: number; title: string; source: "file" | "link" } | null>(null);
  const [processingStage, setProcessingStage] = useState(0);
  const [mobileNav, setMobileNav] = useState(false);
  const [toast, setToast] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!processingRecord) return;
    const timers = [850, 2050, 3300].map((delay, index) => window.setTimeout(() => setProcessingStage(index + 1), delay));
    return () => timers.forEach(window.clearTimeout);
  }, [processingRecord]);

  useEffect(() => {
    localStorage.setItem("lorym-prototype-notes", JSON.stringify(materials.filter((item) => item.kind === "note" && item.id > 6)));
    localStorage.setItem("lorym-prototype-meetings", JSON.stringify(materials.filter((item) => item.kind === "meeting" && item.id > 6).map((item) => ({ ...item, sourceFiles: item.sourceFiles?.map((file) => ({ ...file, url: file.url.startsWith("blob:") ? "" : file.url })) }))));
    localStorage.setItem("lorym-prototype-files-meta", JSON.stringify(materials.filter((item) => item.kind === "file")));
    localStorage.setItem("lorym-prototype-seed-notes", JSON.stringify(Object.fromEntries(materials.filter((item) => item.kind === "note" && item.id <= 6).map((item) => [item.id, { title: item.title, detail: item.detail, body: item.body, searchText: item.searchText, sourceIds: item.sourceIds, templateName: item.templateName, summaryFor: item.summaryFor }]))));
    localStorage.setItem("lorym-prototype-seed-meetings", JSON.stringify(Object.fromEntries(materials.filter((item) => item.kind === "meeting" && item.id <= 6).map((item) => [item.id, { presentationIncluded: item.presentationIncluded, deletedRecordingIndexes: item.deletedRecordingIndexes, detail: item.detail }]))));
    localStorage.setItem("lorym-prototype-material-locations", JSON.stringify(Object.fromEntries(materials.filter((item) => item.id <= 6).map((item) => [item.id, item.space]))));
    localStorage.setItem("lorym-prototype-material-folders", JSON.stringify(Object.fromEntries(materials.filter((item) => item.id <= 6).map((item) => [item.id, item.folderId ?? null]))));
  }, [materials]);
  useEffect(() => { try { localStorage.setItem("lorym-prototype-spaces", JSON.stringify(allSpaces)); } catch { notify("Не удалось сохранить обложку в браузере"); } }, [allSpaces]);
  useEffect(() => { localStorage.setItem("lorym-prototype-folders", JSON.stringify(folders)); }, [folders]);
  useEffect(() => { localStorage.setItem("lorym-prototype-templates", JSON.stringify(savedTemplates)); }, [savedTemplates]);

  const scoped = materials.filter((item) => item.space === space && spaces.some((target) => target.name === item.space));
  const canEditSpace = spaces.find((item) => item.name === space)?.access === "edit";
  const defaultEditableSpace = canEditSpace ? space : spaces.find((item) => item.access === "edit")?.name ?? "";
  const editingNote = materials.find((item) => item.id === editingNoteId && item.kind === "note");
  const activeFile = materials.find((item) => item.id === activeFileId && item.kind === "file");
  const globalList = ["materials", "meetings", "topics"].includes(view);
  const createSpace = globalList && spaceFilter !== "all" ? spaceFilter : space;
  const canCreateMaterial = spaces.some((item) => item.name === createSpace && item.access === "edit");
  const listSource = globalList ? materials.filter((item) => spaces.some((target) => target.name === item.space) && (spaceFilter === "all" || item.space === spaceFilter)) : scoped;
  const topics = Array.from(new Set(listSource.map((item) => item.topic).filter((value) => value !== "Без темы")));
  const visible = listSource.filter((item) => {
    const matchesView = view === "meetings" ? item.kind === "meeting" : true;
    const matchesKind = filter === "all" || item.kind === filter;
    const matchesTopic = !topic || item.topic === topic;
    return matchesView && matchesKind && matchesTopic && searchableMaterialText(item).includes(query.toLocaleLowerCase("ru").trim());
  });
  const displayed = visible;
  const filteredTemplates = savedTemplates.filter((item) => spaceFilter === "all" || !item.availableIn || item.availableIn.includes(spaceFilter));

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3400);
  }
  function rememberNavigation() {
    const snapshot: NavigationSnapshot = { view, space, folderId, spaceFilter, query, topic, filter, activeMeetingId, activeFileId, editingNoteId, noteReturnMeetingId };
    setNavigationHistory((previous) => [...previous, snapshot]);
  }
  function changeView(next: View, force = false) {
    if (next !== view || force) rememberNavigation();
    setView(next);
    setTopic("");
    setFilter("all");
    setQuery("");
    setMobileNav(false);
    window.scrollTo(0, 0);
  }
  function changeFolder(next: string | null) {
    if (next === folderId) return;
    rememberNavigation();
    setFolderId(next);
    window.scrollTo(0, 0);
  }
  function openSpaceFolder(name: string, nextFolderId: string | null) {
    if (view === "overview" && name === space) {
      changeFolder(nextFolderId);
      return;
    }
    setSpace(name);
    setFolderId(nextFolderId);
    changeView("overview");
  }
  function goBack() {
    const previous = navigationHistory.at(-1);
    if (previous) {
      setNavigationHistory((items) => items.slice(0, -1));
      setView(previous.view);
      setSpace(previous.space);
      setFolderId(previous.folderId);
      setSpaceFilter(previous.spaceFilter);
      setQuery(previous.query);
      setTopic(previous.topic);
      setFilter(previous.filter);
      setActiveMeetingId(previous.activeMeetingId);
      setActiveFileId(previous.activeFileId);
      setEditingNoteId(previous.editingNoteId);
      setNoteReturnMeetingId(previous.noteReturnMeetingId);
    } else if (view === "overview" && folderId) setFolderId(null);
    else if (view === "overview") setView("spaces");
    else if (view === "file-preview") setView("overview");
    else if (view === "note-editor") setView("overview");
    else setView("home");
    setMobileNav(false);
    window.scrollTo(0, 0);
  }
  function openCollection(next: "materials" | "meetings" | "templates" | "tasks") {
    setSpaceFilter("all");
    if (next === "meetings") setActiveMeetingId(null);
    changeView(next);
  }
  function openSpace(name: string) {
    const anotherLocation = name !== space || folderId !== null;
    setSpace(name);
    setFolderId(null);
    changeView("overview", anotherLocation);
  }
  function startSpaceCreation() {
    changeView("spaces");
    setSpaceCreateRequested(true);
  }
  function moveMaterial(id: number, destination: string) {
    const source = materials.find((item) => item.id === id);
    if (!source || !spaces.some((item) => item.name === source.space && item.access === "edit") || !spaces.some((item) => item.name === destination && item.access === "edit")) return;
    if (source.summaryFor) { notify("Резюме перемещается вместе со встречей"); return; }
    setMaterials((previous) => previous.map((item) => {
      if (item.id === id && item.kind === "note") {
        const sourceIds = (item.sourceIds ?? []).filter((sourceId) => previous.some((meeting) => meeting.id === sourceId && meeting.space === destination));
        return { ...item, space: destination, folderId: null, sourceIds, summaryFor: sourceIds.includes(item.summaryFor ?? -1) ? item.summaryFor : undefined, detail: sourceIds.length ? `${sourceIds.length} ${sourceIds.length === 1 ? "встреча" : "встречи"}` : "Черновик" };
      }
      if (item.id === id) return { ...item, space: destination, folderId: null };
      if (source.kind === "meeting" && item.kind === "note" && item.summaryFor === id && item.space === source.space) {
        return { ...item, space: destination, folderId: null };
      }
      if (source.kind === "meeting" && item.kind === "note" && item.space !== destination && item.sourceIds?.includes(id)) {
        const sourceIds = item.sourceIds.filter((sourceId) => sourceId !== id);
        return { ...item, sourceIds, summaryFor: item.summaryFor === id ? undefined : item.summaryFor, detail: sourceIds.length ? `${sourceIds.length} ${sourceIds.length === 1 ? "встреча" : "встречи"}` : "Черновик" };
      }
      return item;
    }));
    notify(`Перемещено в «${destination}»`);
  }
  function requestMove(id: number, destination: string) {
    const item = materials.find((material) => material.id === id);
    if (!item || item.space === destination) return;
    if (item.summaryFor) { notify("Резюме перемещается вместе со встречей"); return; }
    const hasLinks = item.kind === "note"
      ? (item.sourceIds?.length ?? 0) > 0
      : materials.some((material) => material.kind === "note" && material.space === item.space && material.sourceIds?.includes(id));
    if (hasLinks) {
      setPendingMove({ id, destination });
      return;
    }
    moveMaterial(id, destination);
  }
  function startFromHome(mode: "file" | "link" | "note") {
    if (!defaultEditableSpace) {
      changeView("spaces");
      notify("Выберите пространство, которое можно редактировать");
      return;
    }
    if (mode === "note") { createNote("Новый документ", defaultEditableSpace); return; }
    openCreate(mode, defaultEditableSpace);
  }
  function openCreate(mode: "file" | "document-upload" | "link" | "note", initialSpace = space, files: File[] = [], folderId = "") {
    if (mode === "file") {
      recordingTargetRef.current = { space: initialSpace, folderId };
      if (files.length) addRecordingFiles(files, initialSpace, folderId);
      else recordingInputRef.current?.click();
      return;
    }
    setCreateMode(mode);
    setTargetSpace(initialSpace);
    setTargetFolderId(folderId);
    setSelectedFiles(files);
    setNewTitle("");
    setCreateError("");
    setCreateOpen(true);
  }
  function createNote(initialTitle = "Новый конспект", targetSpace = space, sourceIds: number[] = [], folderId: string | null = null) {
    if (!spaces.some((item) => item.name === targetSpace && item.access === "edit")) {
      changeView("spaces");
      notify("Выберите пространство, которое можно редактировать");
      return;
    }
    const id = Date.now();
    const sources = materials.filter((item) => item.kind === "meeting" && sourceIds.includes(item.id) && item.space === targetSpace);
    const sharedTopic = sources.length && sources.every((item) => item.topic === sources[0].topic) ? sources[0].topic : "Без темы";
    const sharedFolder = sources.length && sources.every((item) => item.folderId === sources[0].folderId) ? sources[0].folderId : null;
    const note: Material = { id, kind: "note", title: initialTitle, detail: sourceIds.length ? `${sourceIds.length} ${sourceIds.length === 1 ? "встреча" : sourceIds.length < 5 ? "встречи" : "встреч"}` : "Черновик", date: "Только что", topic: sharedTopic, space: targetSpace, folderId: folderId ?? sharedFolder, sourceIds, body: "" };
    setMaterials((previous) => [note, ...previous]);
    setSpace(targetSpace);
    setEditingNoteId(id);
    changeView("note-editor");
  }
  function addSummary(meeting: Material, templateName: string, focus: string) {
    const current = materials.find((item) => item.kind === "note" && item.summaryFor === meeting.id);
    const id = current?.id ?? Date.now();
    const draft = draftFromSources([meeting.id], templateName, focus);
    const note: Material = { id, kind: "note", title: current?.title ?? meeting.title, detail: "Резюме встречи", date: "Только что", topic: meeting.topic, space: meeting.space, folderId: meeting.folderId ?? null, sourceIds: [meeting.id], summaryFor: meeting.id, templateName, ...draft };
    setMaterials((previous) => current ? previous.map((item) => item.id === current.id ? note : item) : [note, ...previous]);
    notify("Резюме встречи создано как черновик");
    return id;
  }
  function renameNote(note: Material, title: string) {
    if (!spaces.some((item) => item.name === note.space && item.access === "edit")) return;
    setMaterials((previous) => previous.map((item) => item.id === note.id ? { ...item, title } : item));
    notify("Название изменено");
  }
  function regenerateNote(note: Material, templateName: string, focus: string) {
    if (!spaces.some((item) => item.name === note.space && item.access === "edit") || !note.sourceIds?.length) return;
    const draft = draftFromSources(note.sourceIds, templateName, focus);
    setMaterials((previous) => previous.map((item) => item.id === note.id ? { ...item, ...draft, templateName, date: "Только что" } : item));
    notify("Черновик обновлён по шаблону");
  }
  function deleteNote(note: Material) {
    if (!spaces.some((item) => item.name === note.space && item.access === "edit")) return;
    if (note.id <= 6) {
      const deleted = new Set(JSON.parse(localStorage.getItem("lorym-prototype-deleted-seed-notes") ?? "[]") as number[]);
      deleted.add(note.id);
      localStorage.setItem("lorym-prototype-deleted-seed-notes", JSON.stringify([...deleted]));
    }
    setMaterials((previous) => previous.filter((item) => item.id !== note.id));
    notify("Документ удалён");
  }
  function deleteRecording(meeting: Material, index: number) {
    if (!spaces.some((item) => item.name === meeting.space && item.access === "edit")) return;
    const mediaFiles = meeting.sourceFiles?.filter((file) => file.type.startsWith("audio/") || file.type.startsWith("video/")) ?? [];
    const total = Math.max(mediaFiles.length, demoParts(meeting.id).length, 1);
    const hidden = new Set(meeting.deletedRecordingIndexes ?? []);
    if (hidden.has(index) || index < 0 || index >= total) return;
    const remaining = total - hidden.size - 1;
    if (remaining > 0) {
      if (mediaFiles.length) {
        const removed = mediaFiles[index];
        setMaterials((previous) => previous.map((item) => item.id === meeting.id ? { ...item, sourceFiles: item.sourceFiles?.filter((file) => file !== removed) } : item));
        if (removed?.url.startsWith("blob:")) URL.revokeObjectURL(removed.url);
      } else {
        setMaterials((previous) => previous.map((item) => item.id === meeting.id ? { ...item, deletedRecordingIndexes: [...hidden, index], detail: `${remaining} ${remaining === 1 ? "запись" : "записи"}` } : item));
      }
      notify("Запись удалена");
      return;
    }
    if (meeting.id <= 6) {
      const deleted = new Set(JSON.parse(localStorage.getItem("lorym-prototype-deleted-seed-meetings") ?? "[]") as number[]);
      deleted.add(meeting.id);
      localStorage.setItem("lorym-prototype-deleted-seed-meetings", JSON.stringify([...deleted]));
    }
    meeting.sourceFiles?.forEach((file) => { if (file.url.startsWith("blob:")) URL.revokeObjectURL(file.url); });
    setMaterials((previous) => previous.filter((item) => item.id !== meeting.id).map((item) => {
      if (item.kind !== "note" || !item.sourceIds?.includes(meeting.id)) return item;
      const sourceIds = item.sourceIds.filter((id) => id !== meeting.id);
      return { ...item, sourceIds, summaryFor: item.summaryFor === meeting.id ? undefined : item.summaryFor, detail: item.summaryFor === meeting.id || !sourceIds.length ? "Документ" : `${sourceIds.length} ${sourceIds.length === 1 ? "встреча" : "встречи"}` };
    }));
    setActiveMeetingId((current) => current === meeting.id ? null : current);
    setNoteReturnMeetingId((current) => current === meeting.id ? null : current);
    setNavigationHistory((previous) => previous.map((item) => ({ ...item, activeMeetingId: item.activeMeetingId === meeting.id ? null : item.activeMeetingId, noteReturnMeetingId: item.noteReturnMeetingId === meeting.id ? null : item.noteReturnMeetingId })));
    notify("Запись и встреча удалены. Документы сохранены");
  }
  function updateNote(changes: Partial<Material>) {
    setMaterials((previous) => previous.map((item) => item.id === editingNoteId ? { ...item, ...changes } : item));
  }
  function uploadFromHome(files: File[]) {
    if (!files.length) return;
    if (!defaultEditableSpace) {
      changeView("spaces");
      notify("Выберите пространство, которое можно редактировать");
      return;
    }
    openCreate("file", defaultEditableSpace, files);
  }

  function addRecordingFiles(files: File[], destination: string, destinationFolderId = "") {
    if (!files.length) return;
    if (!spaces.some((item) => item.name === destination && item.access === "edit")) { notify("Выберите доступное пространство"); return; }
    const isRecording = (file: File) => /^(audio|video)\//.test(file.type) || /\.(mp3|wav|m4a|aac|ogg|webm|mp4|mov)$/i.test(file.name);
    if (files.some((file) => !isRecording(file) && !/\.(pdf|pptx?)$/i.test(file.name))) { notify("Подойдут аудио, видео и презентация к встрече"); return; }
    const recording = files.find(isRecording);
    if (!recording) { notify("Выберите аудио или видео встречи"); return; }
    const id = Date.now();
    const item: Material = {
      id, kind: "meeting", title: recording.name.replace(/\.[^.]+$/, ""),
      detail: `${files.length} ${files.length === 1 ? "файл" : files.length < 5 ? "файла" : "файлов"}`,
      date: "Только что", topic: "Без темы", space: destination, folderId: destinationFolderId || null,
      searchText: files.map((file) => file.name).join(" "),
      sourceFiles: files.map((file) => ({ name: file.name, url: URL.createObjectURL(file), type: file.type })),
    };
    setMaterials((previous) => [item, ...previous]);
    setProcessingStage(0);
    setProcessingRecord({ id, title: item.title, source: "file" });
    openDetail(item);
  }
  function addSpace(next: SpaceInfo) {
    setAllSpaces((previous) => [...previous, next]);
    notify("Пространство создано");
  }
  function updateSpace(next: SpaceInfo) {
    setAllSpaces((previous) => previous.map((item) => item.name === next.name ? next : item));
  }
  function renameSpace(oldName: string, nextName: string) {
    setAllSpaces((previous) => previous.map((item) => item.name === oldName ? { ...item, name: nextName } : item));
    setFolders((previous) => previous.map((item) => item.space === oldName ? { ...item, space: nextName } : item));
    setMaterials((previous) => previous.map((item) => item.space === oldName ? { ...item, space: nextName } : item));
    setSavedTemplates((previous) => previous.map((item) => item.availableIn?.includes(oldName) ? { ...item, availableIn: item.availableIn.map((name) => name === oldName ? nextName : name) } : item));
    try {
      const saved = JSON.parse(localStorage.getItem("lorym-prototype-tasks") ?? "null") as { space: string }[] | null;
      if (Array.isArray(saved)) localStorage.setItem("lorym-prototype-tasks", JSON.stringify(saved.map((item) => item.space === oldName ? { ...item, space: nextName } : item)));
    } catch { /* Tasks remain in their last saved state if local storage is unavailable. */ }
    if (space === oldName) setSpace(nextName);
    if (spaceFilter === oldName) setSpaceFilter(nextName);
    if (targetSpace === oldName) setTargetSpace(nextName);
    setNavigationHistory((previous) => previous.map((item) => ({ ...item, space: item.space === oldName ? nextName : item.space, spaceFilter: item.spaceFilter === oldName ? nextName : item.spaceFilter })));
    notify("Пространство переименовано");
  }
  function trashSpace(name: string) {
    setAllSpaces((previous) => previous.map((item) => item.name === name ? { ...item, trashed: true } : item));
    if (space === name) setSpace(spaces.find((item) => item.name !== name)?.name ?? "");
    if (spaceFilter === name) setSpaceFilter("all");
    if (spaces.length === 1) changeView("spaces");
    notify("Пространство перемещено в корзину");
  }
  function restoreSpace(name: string) {
    setAllSpaces((previous) => previous.map((item) => item.name === name ? { ...item, trashed: false } : item));
    notify("Пространство восстановлено");
  }
  function deleteSpaceForever(name: string) {
    materials.filter((item) => item.space === name && item.kind === "file").forEach((item) => { void deleteFile(item.id); });
    setAllSpaces((previous) => previous.filter((item) => item.name !== name));
    setFolders((previous) => previous.filter((item) => item.space !== name));
    setMaterials((previous) => previous.filter((item) => item.space !== name));
    setSavedTemplates((previous) => previous.map((item) => item.availableIn?.includes(name) ? { ...item, availableIn: item.availableIn.filter((value) => value !== name) } : item));
    try {
      const saved = JSON.parse(localStorage.getItem("lorym-prototype-tasks") ?? "null") as { space: string }[] | null;
      if (Array.isArray(saved)) localStorage.setItem("lorym-prototype-tasks", JSON.stringify(saved.filter((item) => item.space !== name)));
    } catch { /* Local task storage may be unavailable. */ }
    notify("Пространство удалено из прототипа");
  }
  function moveSpace(name: string, direction: -1 | 1) {
    setAllSpaces((previous) => {
      const items = [...previous];
      const index = items.findIndex((item) => item.name === name);
      let destination = index + direction;
      while (destination >= 0 && destination < items.length && items[destination].trashed) destination += direction;
      if (index < 0 || destination < 0 || destination >= items.length) return previous;
      [items[index], items[destination]] = [items[destination], items[index]];
      return items;
    });
  }
  function downloadSpace(name: string) {
    const current = spaces.find((item) => item.name === name);
    if (!current) return;
    const exportData = {
      space: current,
      folders: folders.filter((item) => item.space === name),
      materials: materials.filter((item) => item.space === name).map((item) => ({ ...item, sourceFiles: item.sourceFiles?.map((file) => ({ name: file.name, type: file.type })) })),
      note: "Экспорт прототипа в JSON. Аудио и видеофайлы не включены.",
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${name}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("Данные пространства скачаны в JSON");
  }
  function openDetail(item: Material, returnMeetingId: number | null = null) {
    setSpace(item.space);
    if (item.kind === "file") {
      setActiveFileId(item.id);
      changeView("file-preview");
      return;
    }
    if (item.kind === "note") {
      setEditingNoteId(item.id);
      setNoteReturnMeetingId(returnMeetingId);
      changeView("note-editor");
      return;
    }
    setActiveMeetingId(item.id);
    setSpaceFilter("all");
    changeView("meetings", view === "meetings");
  }
  function openKnowledgeNote(note: Material) { openDetail(note); }
  function openGlobalMaterial(id: number) {
    const item = materials.find((candidate) => candidate.id === id);
    if (!item) return;
    openDetail(item);
  }
  async function addMaterial() {
    if (!spaces.some((item) => item.name === targetSpace && item.access === "edit")) {
      setCreateError("Выберите пространство для добавления");
      return;
    }
    if (createMode === "document-upload") {
      if (!selectedFiles.length) { setCreateError("Выберите файлы для загрузки"); return; }
      const baseId = Date.now() * 1000;
      const uploaded: number[] = [];
      try {
        const nextFiles: Material[] = [];
        for (const [index, file] of selectedFiles.entries()) {
          const id = baseId + index;
          await saveFile(id, file);
          uploaded.push(id);
          const isText = file.type.startsWith("text/") || /\.(txt|md|csv|json)$/i.test(file.name);
          const searchText = isText ? (await file.text()).slice(0, 20_000) : "";
          nextFiles.push({ id, kind: "file", title: file.name, detail: "Файл", date: "Только что", topic: "Без темы", space: targetSpace, folderId: targetFolderId || null, fileName: file.name, fileType: file.type, fileSize: file.size, searchText });
        }
        setMaterials((previous) => [...nextFiles, ...previous]);
        setCreateOpen(false); setSelectedFiles([]); setCreateError("");
        notify(nextFiles.length === 1 ? "Файл добавлен в пространство" : `${nextFiles.length} файла добавлены в пространство`);
      } catch {
        await Promise.allSettled(uploaded.map((id) => deleteFile(id)));
        setCreateError("Не удалось сохранить файл в браузере. Проверьте свободное место и попробуйте снова.");
      }
      return;
    }
    if (createMode === "file") {
      if (!selectedFiles.length) { setCreateError("Выберите файл"); return; }
      if (selectedFiles.some((file) => !(/^(audio|video)\//.test(file.type) || /\.(mp3|wav|m4a|aac|ogg|webm|mp4|mov|pdf|pptx?)$/i.test(file.name)))) { setCreateError("Подойдут аудио, видео, PDF или презентация PowerPoint"); return; }
      if (!selectedFiles.some((file) => /^(audio|video)\//.test(file.type) || /\.(mp3|wav|m4a|aac|ogg|webm|mp4|mov)$/i.test(file.name))) { setCreateError("Для записи нужно аудио или видео. Презентацию можно добавить вместе с ним."); return; }
    }
    const recordingFile = selectedFiles.find((file) => /^(audio|video)\//.test(file.type) || /\.(mp3|wav|m4a|aac|ogg|webm|mp4|mov)$/i.test(file.name));
    const value = createMode === "file" ? recordingFile?.name : newTitle.trim();
    if (!value) { setCreateError(createMode === "file" ? "Выберите файл" : "Вставьте ссылку"); return; }
    let linkUrl: URL | null = null;
    if (createMode === "link") {
      try { linkUrl = new URL(value); } catch { setCreateError("Проверьте адрес ссылки, например https://example.com/recording"); return; }
      if (!(["https:", "http:"].includes(linkUrl.protocol))) { setCreateError("Подойдёт ссылка, которая начинается с https:// или http://"); return; }
    }
    const isNote = createMode === "note";
    if (isNote) {
      setCreateOpen(false);
      setNewTitle("");
      createNote(value, targetSpace, [], targetFolderId || null);
      return;
    }
    const item: Material = {
      id: Date.now(), kind: "meeting",
      title: createMode === "link" ? `Запись с ${linkUrl!.hostname.replace(/^www\./, "")}` : createMode === "file" && selectedFiles.length > 1 ? `${value.replace(/\.[^.]+$/, "")} и ещё ${selectedFiles.length - 1}` : value.replace(/\.[^.]+$/, ""),
      detail: createMode === "file" ? `${selectedFiles.length} ${selectedFiles.length === 1 ? "файл" : selectedFiles.length < 5 ? "файла" : "файлов"}` : "Ссылка на запись",
      date: "Только что", topic: "Без темы", space: targetSpace, folderId: targetFolderId || null,
      searchText: createMode === "link" ? value : selectedFiles.map((file) => file.name).join(" "),
      sourceFiles: createMode === "file"
        ? selectedFiles.map((file) => ({ name: file.name, url: URL.createObjectURL(file), type: file.type }))
        : [{ name: value, url: value, type: "text/uri-list" }],
    };
    setMaterials((previous) => [item, ...previous]);
    setCreateOpen(false); setNewTitle(""); setSelectedFiles([]); setCreateError("");
    openDetail(item);
    setProcessingStage(0);
    setProcessingRecord({ id: item.id, title: item.title, source: createMode === "link" ? "link" : "file" });
  }
  function addFolder(name: string, parentId: string | null) {
    setFolders((previous) => [...previous, { id: crypto.randomUUID(), space, name, parentId }]);
    notify("Папка создана");
  }
  function renameFolder(id: string, name: string) {
    setFolders((previous) => previous.map((item) => item.id === id ? { ...item, name } : item));
  }
  function deleteFolder(id: string) {
    const folder = folders.find((item) => item.id === id);
    if (!folder) return;
    setFolders((previous) => previous.filter((item) => item.id !== id).map((item) => item.parentId === id ? { ...item, parentId: folder.parentId } : item));
    setMaterials((previous) => previous.map((item) => item.folderId === id ? { ...item, folderId: folder.parentId } : item));
    notify("Папка удалена, материалы сохранены");
  }
  function moveToFolder(id: number, folderId: string | null) {
    const item = materials.find((candidate) => candidate.id === id);
    if (!item || (folderId && !folders.some((folder) => folder.id === folderId && folder.space === item.space))) return;
    setMaterials((previous) => previous.map((candidate) => candidate.id === id ? { ...candidate, folderId } : candidate));
    notify("Материал перемещён");
  }
  function changeCover(image: string | undefined) {
    setAllSpaces((previous) => previous.map((item) => item.name === space ? { ...item, coverImage: image ?? "" } : item));
    notify(image ? "Обложка обновлена" : "Обложка убрана");
  }
  function changeSpaceColor(color: SpaceColor) {
    setAllSpaces((previous) => previous.map((item) => item.name === space ? { ...item, color } : item));
  }
  function openTemplate(name = "", instructions = "") {
    setEditingTemplate(name || null);
    setTemplateName(name);
    setTemplateInstructions(instructions);
    setTemplateOpen(true);
  }
  function saveTemplate() {
    if (!templateName.trim()) { notify("Введите название шаблона"); return; }
    if (savedTemplates.some((item) => item.name.toLocaleLowerCase("ru") === templateName.trim().toLocaleLowerCase("ru") && item.name !== editingTemplate)) { notify("Шаблон с таким названием уже есть"); return; }
    const next: TemplateInfo = { name: templateName.trim(), description: templateInstructions.trim() || "Пользовательский формат", availableIn: savedTemplates.find((item) => item.name === editingTemplate)?.availableIn };
    setSavedTemplates((previous) => editingTemplate
      ? previous.map((item) => item.name === editingTemplate ? next : item)
      : [...previous, next]);
    setTemplateOpen(false);
    notify(editingTemplate ? "Шаблон обновлён" : "Шаблон создан");
  }
  function createTemplateFromRecording(name: string, instructions: string) {
    setSavedTemplates((previous) => [...previous, { name, description: instructions }]);
    notify("Шаблон сохранён в аккаунте");
  }

  const breadcrumbs: Breadcrumb[] = [{ key: "home", label: "Главная", onClick: () => view === "home" ? window.scrollTo(0, 0) : changeView("home") }];
  function addSpaceBreadcrumbs(name: string, targetFolderId: string | null) {
    breadcrumbs.push({ key: "spaces", label: "Мои пространства", onClick: () => changeView("spaces") });
    breadcrumbs.push({ key: `space-${name}`, label: name, onClick: () => openSpaceFolder(name, null) });
    const chain: FolderInfo[] = [];
    const seen = new Set<string>();
    let current = folders.find((item) => item.id === targetFolderId && item.space === name);
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      chain.unshift(current);
      current = folders.find((item) => item.id === current?.parentId && item.space === name);
    }
    chain.forEach((folder) => breadcrumbs.push({ key: `folder-${folder.id}`, label: folder.name, onClick: () => openSpaceFolder(name, folder.id) }));
  }
  if (view === "spaces") breadcrumbs.push({ key: "spaces", label: "Мои пространства", onClick: () => window.scrollTo(0, 0) });
  else if (view === "overview") addSpaceBreadcrumbs(space, folderId);
  else if (view === "file-preview" && activeFile) {
    addSpaceBreadcrumbs(activeFile.space, activeFile.folderId ?? null);
    breadcrumbs.push({ key: `file-${activeFile.id}`, label: activeFile.title, onClick: () => window.scrollTo(0, 0) });
  } else if (view === "note-editor" && editingNote) {
    addSpaceBreadcrumbs(editingNote.space, editingNote.folderId ?? null);
    breadcrumbs.push({ key: `note-${editingNote.id}`, label: editingNote.title || "Новый документ", onClick: () => window.scrollTo(0, 0) });
  } else if (view === "topics") {
    breadcrumbs.push({ key: "materials", label: "Материалы", onClick: () => changeView("materials") });
    breadcrumbs.push({ key: "topics", label: "Темы", onClick: () => window.scrollTo(0, 0) });
  } else if (view !== "home") breadcrumbs.push({ key: view, label: viewNames[view], onClick: () => window.scrollTo(0, 0) });

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? "is-open" : ""}`}>
      <div className="sidebar-head">
        <button className="wordmark" onClick={() => changeView("home")}>lorym.</button>
        <button className="mobile-close" aria-label="Закрыть меню" onClick={() => setMobileNav(false)}><X size={21} /></button>
      </div>
      <nav className="side-nav sidebar-global" aria-label="Навигация">
        <button className={`nav-item ${view === "home" ? "active" : ""}`} onClick={() => changeView("home")}>Главная</button>
        <SpaceTree spaces={spaces} currentSpace={space} isSpaceView={["overview", "note-editor", "file-preview"].includes(view)} isCatalogView={view === "spaces"} onNavigate={openSpace} onOpenCatalog={() => changeView("spaces")} onAdd={startSpaceCreation} onDropMaterial={requestMove} />
        <div className="sidebar-nav-gap" />
        <button className={`nav-item nav-item-with-icon ${view === "meetings" ? "active" : ""}`} onClick={() => openCollection("meetings")}><AudioLines size={18} strokeWidth={1.7} aria-hidden="true" />Записи</button>
        <button className={`nav-item nav-item-with-icon ${view === "templates" ? "active" : ""}`} onClick={() => openCollection("templates")}><LayoutTemplate size={18} strokeWidth={1.7} aria-hidden="true" />Шаблоны</button>
        <button className={`nav-item nav-item-with-icon ${view === "tasks" ? "active" : ""}`} onClick={() => openCollection("tasks")}><ListTodo size={18} strokeWidth={1.7} aria-hidden="true" />Задачи</button>
      </nav>
      <div className="sidebar-bottom"><span className="avatar">Э</span><span>Елизавета</span><span className="plan">Личный план</span></div>
    </aside>
    {mobileNav && <button className="nav-scrim" aria-label="Закрыть меню" onClick={() => setMobileNav(false)} />}

    <div className={`workspace ${view === "spaces" ? "catalog-workspace" : ""} ${view === "note-editor" ? "note-workspace" : ""}`}>
      <header className="topbar">
        <button className="menu-button" aria-label="Открыть меню" onClick={() => setMobileNav(true)}><Menu size={21} /></button>
        <span className="top-location">{["spaces", "home", "materials", "meetings", "templates", "tasks", "topics"].includes(view) ? viewNames[view] : <>{space}<span className="slash">/</span>{viewNames[view]}</>}</span>
        <div className="top-actions">{view !== "spaces" && view !== "home" && view !== "templates" && view !== "note-editor" && <button className="top-search" aria-label="Перейти к поиску" onClick={() => searchRef.current?.focus()}><Search size={18} /></button>}<span className="top-avatar">Э</span></div>
      </header>

      <main className="main-content">
        <nav className="page-breadcrumbs" aria-label="Хлебные крошки"><ol>{breadcrumbs.map((item, index) => <li key={item.key}>{index > 0 && <span className="breadcrumb-slash" aria-hidden="true">/</span>}<button type="button" onClick={item.onClick} aria-current={index === breadcrumbs.length - 1 ? "page" : undefined} title={item.label}>{item.label}</button></li>)}</ol></nav>
        {view === "home" ? <HomePage
          canEdit={!!defaultEditableSpace}
          onUploadFiles={uploadFromHome}
          onAddLink={() => startFromHome("link")}
          onCreateNote={() => startFromHome("note")}
          onChooseSpace={() => { changeView("spaces"); notify("Выберите пространство, которое можно редактировать"); }}
          onOpenSpaces={() => changeView("spaces")}
          onOpenMeetings={() => openCollection("meetings")}
          onOpenTemplates={() => openCollection("templates")}
          onOpenTasks={() => openCollection("tasks")}
          onOpenExampleMeeting={() => openDetail(materials.find((item) => item.id === 1 && item.kind === "meeting") ?? materials.find((item) => item.kind === "meeting")!)}
          onOpenExampleNote={() => openDetail(materials.find((item) => item.id === 4 && item.kind === "note") ?? materials.find((item) => item.kind === "note")!)}
        /> : view === "spaces" ? <SpacesPage
          key={spaceCreateRequested ? "sidebar-create" : "catalog"}
          spaces={spaces} trashedSpaces={trashedSpaces}
          materials={materials.filter((item) => spaces.some((target) => target.name === item.space))}
          onOpen={openSpace} onOpenMaterial={openGlobalMaterial} onCreate={addSpace} onUpdate={updateSpace}
          onRename={renameSpace} onTrash={trashSpace} onRestore={restoreSpace} onDeleteForever={deleteSpaceForever}
          onMove={moveSpace} onDownload={downloadSpace} createFromSidebar={spaceCreateRequested}
          onCreateHandled={() => setSpaceCreateRequested(false)}
        /> : view === "overview" ? <SpaceLibrary
          key={space} space={space} folderId={folderId} onFolderChange={changeFolder}
          spaceInfo={spaces.find((item) => item.name === space)} materials={scoped}
          folders={folders.filter((item) => item.space === space)} onOpenMaterial={openDetail}
          onUploadFile={(folderId) => openCreate("document-upload", space, [], folderId ?? "")}
          onAddRecording={(folderId) => openCreate("file", space, [], folderId ?? "")}
          onNewNote={(folderId) => createNote("Новый документ", space, [], folderId)}
          onAddFolder={addFolder} onRenameFolder={renameFolder} onDeleteFolder={deleteFolder}
          onMoveToFolder={moveToFolder} onChangeCover={changeCover} onChangeColor={changeSpaceColor}
          onOpenTemplates={() => openCollection("templates")}
        /> : view === "meetings" ? <RecordingsPage
          meetings={materials.filter((item) => item.kind === "meeting" && spaces.some((target) => target.name === item.space))}
          notes={materials.filter((item) => item.kind === "note" && spaces.some((target) => target.name === item.space))}
          spaces={spaces} templates={savedTemplates} spaceFilter={spaceFilter} onSpaceFilter={setSpaceFilter}
          focusedMeetingId={activeMeetingId} onAddRecording={(target) => openCreate("file", target || space)}
          onOpenKnowledgeNote={openKnowledgeNote} onAddSummary={addSummary}
          onRenameNote={renameNote} onRegenerateNote={regenerateNote} onDeleteNote={deleteNote}
          onDeleteRecording={deleteRecording}
          onCreateTemplate={createTemplateFromRecording} searchRef={searchRef}
        /> : view === "note-editor" && editingNote ? <NoteEditor
          key={editingNote.id} note={editingNote} spaceColor={spaces.find((item) => item.name === editingNote.space)?.color}
          meetings={materials.filter((item) => item.kind === "meeting" && item.space === editingNote.space)}
          topics={Array.from(new Set(materials.filter((item) => item.space === editingNote.space && item.topic !== "Без темы").map((item) => item.topic)))}
          onChange={updateNote} onDone={goBack} onOpenMeeting={(meeting) => openDetail(meeting)}
        /> : view === "file-preview" && activeFile ? <FilePage file={activeFile} spaceColor={spaces.find((item) => item.name === activeFile.space)?.color}
        /> : <>
        <div className="page-head">
          <h1>{viewNames[view]}</h1>
          {(view === "templates" || (view !== "tasks" && (globalList ? canCreateMaterial : canEditSpace))) && <button className="add-button" onClick={() => { if (view === "templates") openTemplate(); else openCreate("file", createSpace); }}><Plus size={18} />{view === "templates" ? "Новый шаблон" : "Добавить запись"}</button>}
        </div>
        {["materials", "meetings", "templates", "tasks", "topics"].includes(view) && <SpaceFilter spaces={spaces} value={spaceFilter} onChange={(name) => { setSpaceFilter(name); setTopic(""); }} label={view === "templates" ? "Доступны в" : "Пространство"} />}

        {view === "tasks" ? <TasksBoard spaces={spaces} spaceFilter={spaceFilter} /> : view !== "templates" && <>
          <div className="search-bar"><Search size={20} /><Input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти во встречах, документах и вложениях" aria-label={globalList ? "Поиск по материалам" : "Поиск по пространству"} />{query && <button onClick={() => setQuery("")} aria-label="Очистить поиск"><X size={17} /></button>}</div>
          {view === "topics" ? <section className="topics-view"><div className="section-heading"><h2>Темы</h2></div><div className="topic-list">{topics.map((name) => <button key={name} className={topic === name ? "selected" : ""} onClick={() => setTopic(topic === name ? "" : name)}><span>{name}</span><ArrowRight size={16} /></button>)}</div></section> : null}

          <div className="content-grid solo-content">
            <section className="library">
              {(view === "materials" || view === "topics") && <>{view === "topics" && <div className="section-heading"><h2>{topic || "Материалы"}</h2></div>}<div className="list-tools"><div className="segmented" aria-label="Тип материала">{(["all", "meeting", "note", "file"] as const).map((key) => <button key={key} aria-pressed={filter === key} className={filter === key ? "selected" : ""} onClick={() => setFilter(key)}>{key === "all" ? "Все" : key === "meeting" ? "Встречи" : key === "file" ? "Файлы" : "Документы"}</button>)}</div><div className="material-list-meta">{view === "materials" && <button onClick={() => changeView("topics")}>Темы <ArrowRight size={15} /></button>}{topic && <button onClick={() => setTopic("")}>Сбросить тему <X size={14} /></button>}</div></div></>}
              <div className="materials-list">{displayed.length ? displayed.map((item) => <MaterialRow key={item.id} item={item} canMove={spaces.some((target) => target.name === item.space && target.access === "edit")} showSpace={globalList && spaceFilter === "all"} spaceColor={spaces.find((target) => target.name === item.space)?.color} onOpen={() => openDetail(item)} />) : <div className="empty-state">{listSource.length === 0 ? "Здесь пока нет материалов." : "Ничего не найдено. Попробуйте другой запрос."}</div>}</div>
            </section>
          </div>
        </>}

        {view === "templates" && <section className="templates-view"><div className="template-list">{filteredTemplates.map((template) => <button key={template.name} onClick={() => openTemplate(template.name, template.description)}><span><strong>{template.name}</strong><small>{template.description}</small></span><ArrowRight size={18} /></button>)}</div></section>}
        </>}
      </main>
    </div>

    <input ref={recordingInputRef} type="file" multiple className="sr-only" accept="audio/*,video/*,.pdf,.ppt,.pptx" aria-label="Выбрать запись" onChange={(event) => { const files = Array.from(event.target.files ?? []); const target = recordingTargetRef.current; addRecordingFiles(files, target.space, target.folderId); event.target.value = ""; }} />

    <Dialog open={!!processingRecord} onOpenChange={(open) => { if (!open) setProcessingRecord(null); }}>
      <DialogContent className="lorym-dialog processing-dialog">
        <DialogHeader>
          <DialogTitle>{processingStage === 3 ? "Запись добавлена" : "Расшифровка записи"}</DialogTitle>
          <DialogDescription>{processingRecord?.title}</DialogDescription>
        </DialogHeader>
        <div className="processing-track" role="progressbar" aria-label="Этап обработки" aria-valuemin={0} aria-valuemax={3} aria-valuenow={processingStage}><span style={{ width: `${Math.max(8, (processingStage / 3) * 100)}%` }} /></div>
        <ol className="processing-steps">
          {[processingRecord?.source === "link" ? "Получение ссылки" : "Загрузка файла", "Расшифровка", "Резюме встречи"].map((label, index) => <li key={label} className={index === 0 && processingStage > 0 ? "complete" : processingStage === index ? "current" : ""}><span className="processing-step-mark">{index === 0 && processingStage > 0 ? <Check size={15} /> : String(index + 1).padStart(2, "0")}</span><span>{label}</span></li>)}
        </ol>
        <p className="processing-note">{processingStage === 3 ? "Это демонстрация процесса. Транскрипт и резюме в прототипе не создаются." : "Демонстрация процесса: реальная расшифровка в прототипе не выполняется."}</p>
        <div className="dialog-actions"><Button onClick={() => setProcessingRecord(null)}>{processingStage === 3 ? "Открыть запись" : "Перейти к записи"}</Button></div>
      </DialogContent>
    </Dialog>

    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
      <DialogContent className={`lorym-dialog create-dialog ${createMode === "document-upload" ? "document-upload-dialog" : ""}`}>
        <DialogHeader>
          <DialogTitle>{createMode === "note" ? "Новый документ" : createMode === "document-upload" ? "Загрузить файл" : "Добавить запись"}</DialogTitle>
          {createMode === "document-upload" ? <DialogDescription className="sr-only">Файлы будут добавлены в открытое пространство и папку.</DialogDescription> : <DialogDescription>{createMode === "note" ? "Документ будет сохранён в выбранном пространстве." : createMode === "link" ? "Ссылка создаст встречу в выбранном пространстве. В прототипе обработка не запускается." : "Аудио и презентацию одного созвона можно добавить вместе. В прототипе файлы доступны до перезагрузки, расшифровка не запускается."}</DialogDescription>}
        </DialogHeader>
        {createMode === "note" && <label className="create-space">Пространство
          <select value={targetSpace} onChange={(event) => { setTargetSpace(event.target.value); setTargetFolderId(""); }}>
            {spaces.filter((item) => item.access === "edit").map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
          </select>
        </label>}
        {createMode === "file" || createMode === "document-upload" ? <>
          <input ref={fileRef} type="file" multiple className="sr-only" tabIndex={-1} aria-hidden="true" accept={createMode === "file" ? "audio/*,video/*,.pdf,.ppt,.pptx" : ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.csv,.json,image/*"} onChange={(event) => { setSelectedFiles(Array.from(event.target.files ?? [])); setCreateError(""); event.target.value = ""; }} />
          {createMode === "document-upload" ? <div className={`upload-area ${draggingFile ? "dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDraggingFile(true); }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDraggingFile(false); }} onDrop={(event) => { event.preventDefault(); setDraggingFile(false); setSelectedFiles(Array.from(event.dataTransfer.files)); setCreateError(""); }}>
            <Upload size={30} strokeWidth={1.6} aria-hidden="true" />
            <strong>Перетащите файлы сюда</strong>
            <span>PDF, Word, презентации, таблицы и изображения</span>
            <Button type="button" onClick={() => fileRef.current?.click()}>Выбрать файлы</Button>
          </div> : <button className={`upload-area ${draggingFile ? "dragging" : ""}`} onClick={() => fileRef.current?.click()} onDragOver={(event) => { event.preventDefault(); setDraggingFile(true); }} onDragLeave={() => setDraggingFile(false)} onDrop={(event) => { event.preventDefault(); setDraggingFile(false); setSelectedFiles(Array.from(event.dataTransfer.files)); setCreateError(""); }}>
            <Upload size={22} strokeWidth={1.7} />
            <strong>Выбрать файлы</strong>
            <span>или перетащить сюда аудио, видео, презентацию</span>
          </button>}
          {selectedFiles.length > 0 && <div className="create-file-list" aria-label="Выбранные файлы">{selectedFiles.map((file, index) => <div key={`${file.name}-${index}`}><span>{file.name}</span><button aria-label={`Убрать ${file.name}`} onClick={() => setSelectedFiles((previous) => previous.filter((_, fileIndex) => fileIndex !== index))}><X size={16} /></button></div>)}</div>}
        </> : <label className="create-field">{createMode === "link" ? "Ссылка на запись" : "Название документа"}<Input value={newTitle} onChange={(event) => { setNewTitle(event.target.value); setCreateError(""); }} placeholder={createMode === "link" ? "https://…" : "Например, решения по запуску"} /></label>}
        {createError && <p className="create-error" role="alert">{createError}</p>}
        {(createMode !== "document-upload" || selectedFiles.length > 0) && <div className="dialog-actions"><Button variant="ghost" onClick={() => setCreateOpen(false)}>Отмена</Button><Button onClick={() => void addMaterial()}>{createMode === "note" ? "Создать документ" : createMode === "document-upload" ? "Загрузить файлы" : "Добавить запись"}</Button></div>}
      </DialogContent>
    </Dialog>

    <Dialog open={!!pendingMove} onOpenChange={(open) => { if (!open) setPendingMove(null); }}><DialogContent className="lorym-dialog move-dialog"><DialogHeader><DialogTitle>Переместить материал?</DialogTitle><DialogDescription>{materials.find((item) => item.id === pendingMove?.id)?.kind === "meeting" ? "Резюме встречи переместится вместе с ней. Связи с другими документами прежнего пространства будут удалены." : "Связи с источниками прежнего пространства будут удалены: документы хранятся в одном пространстве со своими источниками."}</DialogDescription></DialogHeader>{pendingMove && materials.find((item) => item.id === pendingMove.id)?.kind === "meeting" && <div className="move-affected-documents">{materials.filter((item) => item.kind === "note" && item.summaryFor !== pendingMove.id && item.sourceIds?.includes(pendingMove.id)).map((item) => <div key={item.id}>{item.title}</div>)}</div>}<div className="dialog-actions"><Button variant="ghost" onClick={() => setPendingMove(null)}>Отмена</Button><Button onClick={() => { if (pendingMove) moveMaterial(pendingMove.id, pendingMove.destination); setPendingMove(null); }}>Переместить в «{pendingMove?.destination}»</Button></div></DialogContent></Dialog>

    <Dialog open={templateOpen} onOpenChange={setTemplateOpen}><DialogContent className="lorym-dialog template-dialog"><DialogHeader><DialogTitle>{editingTemplate ? "Редактировать шаблон" : "Новый шаблон"}</DialogTitle><DialogDescription>Шаблон хранится в аккаунте. Готовые документы после его изменения не меняются.</DialogDescription></DialogHeader><div className="template-fields"><label>Название<Input value={templateName} onChange={(event) => setTemplateName(event.target.value)} placeholder="Например, протокол встречи" /></label><label>Инструкция<textarea value={templateInstructions} onChange={(event) => setTemplateInstructions(event.target.value)} placeholder="Какие выводы собрать и как их структурировать" rows={6} /></label></div><div className="dialog-actions"><Button variant="ghost" onClick={() => setTemplateOpen(false)}>Отмена</Button><Button onClick={saveTemplate}>Сохранить шаблон</Button></div></DialogContent></Dialog>
    {toast && <div className="toast" role="status"><Check size={16} />{toast}</div>}
  </div>;
}

export default App;
