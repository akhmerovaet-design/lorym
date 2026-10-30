import { useState } from "react";
import { Pencil, Plus, X } from "lucide-react";
import type { SpaceInfo } from "@/SpacesPage";
import { SpaceDot } from "@/SpaceDot";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type Task = { id: number; title: string; space: string; status: string };
type Column = { id: string; label: string };
type Props = { spaces: SpaceInfo[]; spaceFilter: string };

const defaultColumns: Column[] = [
  { id: "planned", label: "Очередь" },
  { id: "doing", label: "В работе" },
  { id: "done", label: "Готово" },
];

const initialTasks: Task[] = [
  { id: 1, title: "Проверить прототип первого запуска", space: "Рабочее", status: "planned" },
  { id: 2, title: "Назначить владельцев метрик", space: "Рабочее", status: "doing" },
  { id: 5, title: "Выбрать маршрут на выходные", space: "Личное", status: "planned" },
];

export function TasksBoard({ spaces, spaceFilter }: Props) {
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("lorym-prototype-tasks") ?? "null") as Task[] | null;
      return Array.isArray(saved) ? saved : initialTasks;
    } catch { return initialTasks; }
  });
  const [columns, setColumns] = useState<Column[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("lorym-prototype-task-columns") ?? "null") as Column[] | null;
      return Array.isArray(saved) && saved.length > 0 ? saved : defaultColumns;
    } catch { return defaultColumns; }
  });
  const [creatingIn, setCreatingIn] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [renamingColumn, setRenamingColumn] = useState<string | null>(null);
  const [renamedColumnName, setRenamedColumnName] = useState("");
  const [deletingColumn, setDeletingColumn] = useState<Column | null>(null);

  const writable = spaces.filter((item) => item.access === "edit");
  const selectedSpace = writable.find((item) => item.name === destination);
  const filtered = tasks.filter((task) => spaces.some((space) => space.name === task.space) && (spaceFilter === "all" || task.space === spaceFilter));
  const canCreate = writable.length > 0 && (spaceFilter === "all" || writable.some((item) => item.name === spaceFilter));

  function updateTasks(next: Task[]) {
    setTasks(next);
    localStorage.setItem("lorym-prototype-tasks", JSON.stringify(next));
  }
  function updateColumns(next: Column[]) {
    setColumns(next);
    localStorage.setItem("lorym-prototype-task-columns", JSON.stringify(next));
  }
  function changeStatus(id: number, status: string) {
    const task = tasks.find((item) => item.id === id);
    if (!task || !writable.some((space) => space.name === task.space)) return;
    updateTasks(tasks.map((item) => item.id === id ? { ...item, status } : item));
  }
  function beginTask(columnId: string) {
    setCreatingIn(columnId);
    setTitle("");
    setDestination(spaceFilter === "all" ? writable[0]?.name ?? "" : spaceFilter);
  }
  function createTask() {
    const space = spaceFilter === "all" ? destination || writable[0]?.name : spaceFilter;
    if (!title.trim() || !space || !creatingIn || !writable.some((item) => item.name === space)) return;
    updateTasks([{ id: Math.max(0, ...tasks.map((task) => task.id)) + 1, title: title.trim(), space, status: creatingIn }, ...tasks]);
    setTitle("");
    setCreatingIn(null);
  }
  function addColumn() {
    const label = newColumnName.trim();
    if (!label || columns.some((item) => item.label.toLocaleLowerCase() === label.toLocaleLowerCase())) return;
    updateColumns([...columns, { id: `column-${crypto.randomUUID()}`, label }]);
    setNewColumnName("");
    setAddingColumn(false);
  }
  function renameColumn() {
    const label = renamedColumnName.trim();
    if (!label || !renamingColumn || columns.some((item) => item.id !== renamingColumn && item.label.toLocaleLowerCase() === label.toLocaleLowerCase())) return;
    updateColumns(columns.map((item) => item.id === renamingColumn ? { ...item, label } : item));
    setRenamingColumn(null);
  }
  function deleteColumn() {
    if (!deletingColumn || columns.length < 2) return;
    const next = columns.filter((item) => item.id !== deletingColumn.id);
    const fallbackId = next[0].id;
    updateTasks(tasks.map((task) => task.status === deletingColumn.id ? { ...task, status: fallbackId } : task));
    updateColumns(next);
    if (creatingIn === deletingColumn.id) setCreatingIn(null);
    setDeletingColumn(null);
  }

  return <section className="tasks-section" aria-label="Доска задач">
    <div className="task-board">{columns.map((column) => {
      const items = filtered.filter((task) => task.status === column.id);
      return <div key={column.id} className="task-column" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const id = Number(event.dataTransfer.getData("text/plain")); if (Number.isFinite(id)) changeStatus(id, column.id); }}>
        <div className="task-column-head">
          {renamingColumn === column.id ? <input autoFocus className="task-column-rename" value={renamedColumnName} onChange={(event) => setRenamedColumnName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") renameColumn(); if (event.key === "Escape") setRenamingColumn(null); }} onBlur={renameColumn} aria-label="Название колонки" /> : <h2>{column.label}</h2>}
          <button className="task-column-control" aria-label={`Переименовать колонку «${column.label}»`} title="Переименовать" onClick={() => { setRenamingColumn(column.id); setRenamedColumnName(column.label); }}><Pencil size={15} strokeWidth={1.7} /></button>
          <button className="task-column-control" aria-label={`Удалить колонку «${column.label}»`} title="Удалить колонку" disabled={columns.length === 1} onClick={() => setDeletingColumn(column)}><X size={17} strokeWidth={1.7} /></button>
        </div>
        {canCreate && <button className="task-add-in-column" onClick={() => beginTask(column.id)}><Plus size={15} strokeWidth={1.8} /> Добавить задачу</button>}
        {creatingIn === column.id && <div className="task-create">
          <div className="task-title-field">
            {selectedSpace && (spaceFilter === "all" && writable.length > 1 ? <DropdownMenu>
              <DropdownMenuTrigger asChild><button type="button" className="task-space-picker" aria-label={`Пространство «${selectedSpace.name}». Выбрать другое`} title={`Пространство: ${selectedSpace.name}. Нажмите, чтобы изменить`}><SpaceDot name={selectedSpace.name} color={selectedSpace.color} decorative /></button></DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="task-space-menu" aria-label="Пространство задачи">{writable.map((item) => <DropdownMenuItem key={item.name} onSelect={() => setDestination(item.name)} className={item.name === destination ? "selected" : ""}><SpaceDot name={item.name} color={item.color} decorative />{item.name}</DropdownMenuItem>)}</DropdownMenuContent>
            </DropdownMenu> : <SpaceDot name={selectedSpace.name} color={selectedSpace.color} />)}
            <input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") createTask(); if (event.key === "Escape") setCreatingIn(null); }} placeholder="Название задачи" aria-label="Название задачи" />
          </div>
          <div className="task-form-actions"><button onClick={createTask} disabled={!title.trim()}>Добавить</button><button className="task-cancel" onClick={() => setCreatingIn(null)}>Отмена</button></div>
        </div>}
        <div className="task-column-items">{items.map((task) => {
          const editable = writable.some((space) => space.name === task.space);
          return <article key={task.id} className="task-card" draggable={editable} onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", String(task.id)); }}>
            <div className="task-card-title"><SpaceDot name={task.space} color={spaces.find((item) => item.name === task.space)?.color} /><strong>{task.title}</strong></div>
          </article>;
        })}</div>
      </div>;
    })}
      <div className={`task-add-column ${addingColumn ? "editing" : ""}`}>
        {addingColumn ? <div className="task-column-create"><input autoFocus value={newColumnName} onChange={(event) => setNewColumnName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addColumn(); if (event.key === "Escape") setAddingColumn(false); }} placeholder="Название колонки" aria-label="Название новой колонки" /><div className="task-form-actions"><button onClick={addColumn} disabled={!newColumnName.trim() || columns.some((item) => item.label.toLocaleLowerCase() === newColumnName.trim().toLocaleLowerCase())}>Добавить</button><button className="task-cancel" onClick={() => setAddingColumn(false)}>Отмена</button></div></div> : <button onClick={() => setAddingColumn(true)}><Plus size={18} strokeWidth={1.8} /> Добавить колонку</button>}
      </div>
    </div>
    <Dialog open={!!deletingColumn} onOpenChange={(open) => { if (!open) setDeletingColumn(null); }}><DialogContent className="lorym-dialog task-delete-dialog"><DialogHeader><DialogTitle>Удалить колонку «{deletingColumn?.label}»?</DialogTitle><DialogDescription>{deletingColumn && tasks.some((task) => task.status === deletingColumn.id) ? `Задачи из неё перейдут в колонку «${columns.find((item) => item.id !== deletingColumn.id)?.label}».` : "Колонка исчезнет с доски."}</DialogDescription></DialogHeader><div className="task-dialog-actions"><button onClick={() => setDeletingColumn(null)}>Отмена</button><button onClick={deleteColumn}>Удалить колонку</button></div></DialogContent></Dialog>
  </section>;
}
