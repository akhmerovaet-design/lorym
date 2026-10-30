import { useState, type DragEvent } from "react";
import { ChevronDown, Eye, Plus } from "lucide-react";
import type { SpaceInfo } from "@/SpacesPage";
import { MATERIAL_DRAG_TYPE } from "@/materialDrag";
import { SpaceDot } from "@/SpaceDot";

type Props = {
  spaces: SpaceInfo[];
  currentSpace: string;
  isSpaceView: boolean;
  isCatalogView: boolean;
  onNavigate: (space: string) => void;
  onOpenCatalog: () => void;
  onAdd: () => void;
  onDropMaterial: (id: number, destination: string) => void;
};

export function SpaceTree({ spaces, currentSpace, isSpaceView, isCatalogView, onNavigate, onOpenCatalog, onAdd, onDropMaterial }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  function acceptDrop(event: DragEvent<HTMLButtonElement>, name: string, access: SpaceInfo["access"]) {
    if (access !== "edit" || !event.dataTransfer.types.includes(MATERIAL_DRAG_TYPE)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropTarget(name);
  }

  return <div className="space-tree-section">
    <div className={`space-tree-parent ${isCatalogView ? "active" : ""}`}>
      <button className="space-tree-parent-label" aria-current={isCatalogView ? "page" : undefined} onClick={onOpenCatalog}>Все пространства</button>
      <button className="space-tree-toggle" aria-label={expanded ? "Свернуть пространства" : "Развернуть пространства"} aria-expanded={expanded} aria-controls="sidebar-spaces" onClick={() => setExpanded((value) => !value)}><ChevronDown size={16} /></button>
    </div>
    {expanded && <div className="space-tree" id="sidebar-spaces" aria-label="Список пространств">
      {spaces.map((space) => {
        const active = isSpaceView && currentSpace === space.name;
        return <button key={space.name} className={`space-tree-heading ${active ? "active" : ""} ${dropTarget === space.name ? "drop-target" : ""}`} aria-current={active ? "page" : undefined} onClick={() => onNavigate(space.name)}
          onDragEnter={(event) => acceptDrop(event, space.name, space.access)}
          onDragOver={(event) => acceptDrop(event, space.name, space.access)}
          onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDropTarget(null); }}
          onDrop={(event) => { event.preventDefault(); setDropTarget(null); if (space.access !== "edit") return; const id = Number(event.dataTransfer.getData(MATERIAL_DRAG_TYPE)); if (Number.isSafeInteger(id) && id > 0) onDropMaterial(id, space.name); }}>
          <SpaceDot name={space.name} color={space.color} className="space-tree-dot" decorative />
          <span className="space-tree-name">{space.name}</span>
          {space.access === "view" && <Eye className="space-tree-access" size={15} aria-label="Только просмотр" />}
        </button>;
      })}
      <button className="space-tree-add" aria-label="Добавить пространство" onClick={onAdd}><Plus size={16} strokeWidth={1.7} aria-hidden="true" />Добавить</button>
    </div>}
  </div>;
}
