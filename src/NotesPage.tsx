import { useMemo, useState, type ReactNode, type RefObject } from "react";
import { ArrowRight, AudioLines, ChevronDown, ChevronRight, File, FileAudio, FileText, Folder, Search, X } from "lucide-react";
import { SpaceFilter } from "@/SpaceFilter";
import { KnowledgeBody } from "@/KnowledgeBody";
import { demoParts } from "@/meetingData";
import { searchableMaterialText } from "@/materialSearch";
import type { FolderInfo, Material, TemplateInfo } from "@/model";
import type { SpaceInfo } from "@/SpacesPage";
import { MATERIAL_DRAG_TYPE } from "@/materialDrag";
import { SpaceDot } from "@/SpaceDot";
import { NoteContextActions } from "@/NoteContextActions";

type Props = {
  notes: Material[];
  meetings: Material[];
  files: Material[];
  folders: FolderInfo[];
  spaces: SpaceInfo[];
  templates: TemplateInfo[];
  spaceFilter: string;
  focusedNoteId: number | null;
  onSpaceFilter: (value: string) => void;
  onOpenNote: (note: Material) => void;
  onOpenMeeting: (meeting: Material) => void;
  onOpenFile: (file: Material) => void;
  onRenameNote: (note: Material, title: string) => void;
  onRegenerateNote: (note: Material, template: string, focus: string) => void;
  onDeleteNote: (note: Material) => void;
  onCreateTemplate: (name: string, instructions: string) => void;
  searchRef: RefObject<HTMLInputElement | null>;
};

function plainText(html: string) {
  return new DOMParser().parseFromString(html, "text/html").body.textContent ?? "";
}

type TreeItem = { key: string; kind: "meeting" | "transcript" | "note" | "file"; material: Material; children: TreeItem[] };
type KnowledgeGroup = { key: string; label: string; items: TreeItem[]; children: KnowledgeGroup[]; space?: SpaceInfo };

function makeKnowledgeTree(items: TreeItem[], folders: FolderInfo[], spaces: SpaceInfo[]) {
  const paths = new Map<string, string>();
  const roots = spaces.map((space) => {
    const root: KnowledgeGroup = { key: `space:${space.name}`, label: space.name, space, items: [], children: [] };
    const byFolder = new Map<string, KnowledgeGroup>();
    const spaceFolders = folders.filter((folder) => folder.space === space.name);
    spaceFolders.forEach((folder) => byFolder.set(folder.id, { key: `folder:${folder.id}`, label: folder.name, items: [], children: [] }));
    spaceFolders.forEach((folder) => {
      const parent = folder.parentId ? byFolder.get(folder.parentId) : undefined;
      (parent ?? root).children.push(byFolder.get(folder.id)!);
    });
    const byTopic = new Map<string, KnowledgeGroup>();
    items.filter((item) => item.material.space === space.name).forEach((item) => {
      const material = item.material;
      const topic = material.topic?.trim() && material.topic !== "Без темы" ? material.topic.trim() : "Не распределено";
      const namedFolder = spaceFolders.find((folder) => folder.name.toLocaleLowerCase("ru") === topic.toLocaleLowerCase("ru"));
      let target = material.folderId ? byFolder.get(material.folderId) : undefined;
      if (!target && namedFolder) target = byFolder.get(namedFolder.id);
      if (!target) {
        const key = topic.toLocaleLowerCase("ru");
        target = byTopic.get(key);
        if (!target) {
          target = { key: `topic:${space.name}:${key}`, label: topic, items: [], children: [] };
          byTopic.set(key, target);
          root.children.push(target);
        }
      }
      target.items.push(item);
      paths.set(item.key, `${space.name} / ${target.label}`);
      item.children.forEach((child) => paths.set(child.key, `${space.name} / ${target.label} / ${material.title}`));
    });
    root.children.sort((a, b) => a.label === "Не распределено" ? 1 : b.label === "Не распределено" ? -1 : a.label.localeCompare(b.label, "ru"));
    return root;
  });
  return { roots, paths };
}

function groupCount(group: KnowledgeGroup): number {
  return group.items.length + group.children.reduce((count, child) => count + groupCount(child), 0);
}

function firstItem(groups: KnowledgeGroup[]): TreeItem | undefined {
  for (const group of groups) {
    const child = firstItem(group.children);
    if (child) return child;
    if (group.items[0]) return group.items[0];
  }
}

export function NotesPage({ notes, meetings, files, folders, spaces, templates, spaceFilter, focusedNoteId, onSpaceFilter, onOpenNote, onOpenMeeting, onOpenFile, onRenameNote, onRegenerateNote, onDeleteNote, onCreateTemplate, searchRef }: Props) {
  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  const term = query.toLocaleLowerCase("ru").trim();
  const items = useMemo(() => {
    const scopedMeetings = meetings.filter((meeting) => spaceFilter === "all" || meeting.space === spaceFilter);
    const scopedNotes = notes.filter((note) => spaceFilter === "all" || note.space === spaceFilter);
    const scopedFiles = files.filter((file) => spaceFilter === "all" || file.space === spaceFilter);
    const meetingIds = new Set(scopedMeetings.map((meeting) => meeting.id));
    const matches = (material: Material) => !term || `${searchableMaterialText(material)} ${plainText(material.body ?? "")}`.toLocaleLowerCase("ru").includes(term);
    const result: TreeItem[] = [];
    scopedMeetings.forEach((meeting) => {
      const summaries = scopedNotes.filter((note) => note.summaryFor === meeting.id);
      const transcriptText = demoParts(meeting.id).flatMap((part) => part.lines.map((line) => line.text)).join(" ");
      const meetingMatch = matches(meeting);
      const transcriptMatch = !term || transcriptText.toLocaleLowerCase("ru").includes(term);
      const matchingSummaries = summaries.filter(matches);
      if (term && !meetingMatch && !transcriptMatch && !matchingSummaries.length) return;
      const children: TreeItem[] = [];
      if (meetingMatch || transcriptMatch) children.push({ key: `transcript:${meeting.id}`, kind: "transcript", material: meeting, children: [] });
      (meetingMatch ? summaries : matchingSummaries).forEach((note) => children.push({ key: `note:${note.id}`, kind: "note", material: note, children: [] }));
      result.push({ key: `meeting:${meeting.id}`, kind: "meeting", material: meeting, children });
    });
    scopedNotes.filter((note) => !note.summaryFor || !meetingIds.has(note.summaryFor)).filter(matches).forEach((note) => result.push({ key: `note:${note.id}`, kind: "note", material: note, children: [] }));
    scopedFiles.filter(matches).forEach((file) => result.push({ key: `file:${file.id}`, kind: "file", material: file, children: [] }));
    return result;
  }, [notes, meetings, files, spaceFilter, term]);
  const visibleSpaces = spaces.filter((item) => spaceFilter === "all" || item.name === spaceFilter);
  const tree = useMemo(() => makeKnowledgeTree(items, folders, visibleSpaces), [items, folders, visibleSpaces]);
  const selected = items.flatMap((item) => [item, ...item.children]).find((item) => item.key === (selectedKey ?? (focusedNoteId === null ? null : `note:${focusedNoteId}`))) ?? firstItem(tree.roots);
  const selectedSources = meetings.filter((meeting) => selected?.kind === "note" && selected.material.sourceIds?.includes(meeting.id));
  function toggleGroup(key: string) {
    setCollapsed((previous) => { const next = new Set(previous); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  }
  function renderItem(item: TreeItem, depth: number): ReactNode {
    const meeting = item.kind === "meeting";
    const icon = meeting ? <AudioLines size={15} strokeWidth={1.6} /> : item.kind === "file" ? <File size={15} strokeWidth={1.6} /> : <FileText size={15} strokeWidth={1.6} />;
    const label = item.kind === "transcript" ? "Транскрипт" : item.material.title;
    const active = selected?.key === item.key || item.children.some((child) => child.key === selected?.key);
    const itemButton = <button className="knowledge-tree-item" onClick={() => setSelectedKey(item.key)} aria-current={active ? "true" : undefined} draggable={item.kind !== "transcript" && !item.material.summaryFor && spaces.some((space) => space.name === item.material.space && space.access === "edit")} onDragStart={(event) => { event.dataTransfer.setData(MATERIAL_DRAG_TYPE, String(item.material.id)); event.dataTransfer.effectAllowed = "move"; }}>
      {icon}<span>{label}</span>
    </button>;
    return <div key={item.key}>
      <div className={`knowledge-tree-line ${active ? "selected" : ""}`} style={{ paddingLeft: `${24 + depth * 16}px` }}>
        <span className="knowledge-tree-disclosure-placeholder" aria-hidden="true" />
        {item.kind === "note" ? <NoteContextActions note={item.material} templates={templates} canEdit={spaces.some((space) => space.name === item.material.space && space.access === "edit")} onRename={onRenameNote} onRegenerate={onRegenerateNote} onDelete={onDeleteNote} onCreateTemplate={onCreateTemplate}>{itemButton}</NoteContextActions> : itemButton}
      </div>
    </div>;
  }
  function renderGroup(group: KnowledgeGroup, depth = 0): ReactNode {
    const count = groupCount(group);
    if (query.trim() && count === 0) return null;
    const expanded = query.trim() ? true : !collapsed.has(group.key);
    return <div className="knowledge-tree-group" key={group.key}>
      <button className={`knowledge-tree-heading ${depth === 0 ? "space" : "collection"}`} style={{ paddingLeft: `${12 + depth * 16}px` }} aria-expanded={expanded} onClick={() => toggleGroup(group.key)}>
        {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        {group.space ? <SpaceDot name={group.space.name} color={group.space.color} /> : <Folder size={16} strokeWidth={1.6} />}
        <strong>{group.label}</strong><span>{count}</span>
      </button>
      {expanded && <div className="knowledge-tree-children">
        {group.children.map((child) => renderGroup(child, depth + 1))}
        {group.items.map((item) => renderItem(item, depth))}
      </div>}
    </div>;
  }

  function openSelected() {
    if (!selected) return;
    if (selected.kind === "meeting" || selected.kind === "transcript") onOpenMeeting(selected.material);
    else if (selected.kind === "file") onOpenFile(selected.material);
    else onOpenNote(selected.material);
  }
  const selectedMaterial = selected?.material;
  const selectedPath = selected ? tree.paths.get(selected.key) : "";
  const previewLabel = selected?.kind === "transcript" ? "Транскрипт" : selected?.kind === "meeting" ? "Встреча" : selected?.kind === "file" ? "Файл" : selectedMaterial?.summaryFor ? "Резюме встречи" : "Документ";
  const previewTitle = selected?.kind === "transcript" ? "Транскрипт" : selectedMaterial?.title;
  const transcriptParts = selected?.kind === "transcript" ? demoParts(selected.material.id) : [];

  return <section className="notes-page knowledge-page" aria-label="База знаний">
    <div className="recordings-heading"><h1>База знаний</h1></div>
    <div className="recordings-controls"><SpaceFilter spaces={spaces} value={spaceFilter} onChange={(value) => { onSpaceFilter(value); setSelectedKey(null); }} /></div>
    <div className="recordings-layout knowledge-layout">
      <aside className="recordings-list-pane" aria-label="Дерево базы знаний">
        <label className="recordings-search"><Search size={19} /><input ref={searchRef} value={query} onChange={(event) => { setQuery(event.target.value); setSelectedKey(null); }} placeholder="Поиск по знаниям" aria-label="Поиск по содержимому базы знаний" />{query && <button aria-label="Очистить поиск" onClick={() => { setQuery(""); setSelectedKey(null); }}><X size={16} /></button>}</label>
        <div className="knowledge-tree" aria-label="Дерево знаний">{items.length ? tree.roots.map((root) => renderGroup(root)) : <div className="recordings-empty">{term ? "По этому запросу ничего не найдено." : "Здесь пока нет материалов."}</div>}</div>
      </aside>
      <article className="recording-preview note-preview" aria-label="Предпросмотр материала">
        {selected && selectedMaterial ? <>
          <div className="recording-preview-head"><div><span className="knowledge-preview-kind">{selectedPath} · {previewLabel}</span><h2><SpaceDot name={selectedMaterial.space} color={spaces.find((item) => item.name === selectedMaterial.space)?.color} /><span>{previewTitle}</span></h2></div><button onClick={openSelected}>Открыть <ArrowRight size={16} /></button></div>
          <div className="note-preview-content">
            {selected.kind === "meeting" ? <>
              <div className="knowledge-meeting-links">{selected.children.some((child) => child.kind === "transcript") && <button onClick={() => setSelectedKey(`transcript:${selectedMaterial.id}`)}>Транскрипт <ArrowRight size={14} /></button>}{selected.children.filter((child) => child.kind === "note").map((child) => <button key={child.key} onClick={() => setSelectedKey(child.key)}>Резюме <ArrowRight size={14} /></button>)}</div>
            </> : selected.kind === "transcript" ? transcriptParts.length ? <div className="knowledge-transcript">{transcriptParts.map((part) => <section key={part.name}>{transcriptParts.length > 1 && <h3>{part.name}</h3>}{part.lines.map((line, index) => <div key={`${part.name}:${index}`}><time>{line.time}</time><p>{line.text}</p></div>)}</section>)}</div> : <p className="knowledge-body-empty">Транскрипт появится после обработки записи.</p>
              : selected.kind === "file" ? <div className="knowledge-file-preview"><File size={24} strokeWidth={1.5} /><p>{selectedMaterial.fileName ?? selectedMaterial.title}</p><span>Файл хранится в пространстве «{selectedMaterial.space}».</span></div>
              : <>
                {selectedSources.length > 0 && <div className="knowledge-preview-sources">{selectedSources.map((meeting) => <button key={meeting.id} onClick={() => onOpenMeeting(meeting)} aria-label={`Посмотреть источник: ${meeting.title}`}><FileAudio size={16} strokeWidth={1.7} aria-hidden="true" /><span>Посмотреть источник:</span><span className="knowledge-source-title">{meeting.title}</span></button>)}</div>}
                <KnowledgeBody html={selectedMaterial.body ?? ""} title={selectedMaterial.title} emptyText="Документ пока пустой. Откройте редактор, чтобы добавить содержание." />
              </>}
          </div>
        </> : <div className="recordings-no-selection">Выберите материал слева.</div>}
      </article>
    </div>

  </section>;
}
