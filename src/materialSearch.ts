import { demoParts } from "@/meetingData";
import type { Material } from "@/model";

export function searchableMaterialText(item: Material) {
  const body = item.body ? new DOMParser().parseFromString(item.body, "text/html").body.textContent ?? "" : "";
  const transcript = item.kind === "meeting" ? demoParts(item.id).flatMap((part) => part.lines.map((line) => line.text)).join(" ") : "";
  return [item.title, item.detail, item.topic, item.searchText, body, transcript, item.sourceFiles?.map((file) => file.name).join(" ")].filter(Boolean).join(" ").toLocaleLowerCase("ru");
}
