import { ArrowRight } from "lucide-react";
import { MATERIAL_DRAG_TYPE } from "@/materialDrag";
import { SpaceDot } from "@/SpaceDot";
import type { SpaceColor } from "@/spaceColors";
import type { Kind } from "@/model";

type Props = {
  item: { id: number; kind: Kind; title: string; detail: string; date: string; space: string };
  canMove: boolean;
  showSpace?: boolean;
  spaceColor?: SpaceColor;
  onOpen: () => void;
};

export function MaterialRow({ item, canMove, showSpace = false, spaceColor, onOpen }: Props) {
  return <div className="material-row">
    <button className="material-open" onClick={onOpen} draggable={canMove} onDragStart={(event) => { if (!canMove) return; event.dataTransfer.setData(MATERIAL_DRAG_TYPE, String(item.id)); event.dataTransfer.effectAllowed = "move"; }}>
      <span className="row-main"><strong>{item.title}</strong><small>{showSpace && <SpaceDot name={item.space} color={spaceColor} />}{item.kind === "meeting" ? "Встреча" : item.kind === "file" ? "Файл" : "Документ"}{item.kind !== "file" && ` · ${item.detail}`}</small></span>
      <span className="row-side"><span>{item.date}</span></span>
      <ArrowRight className="row-arrow" size={17} aria-hidden="true" />
    </button>
  </div>;
}
