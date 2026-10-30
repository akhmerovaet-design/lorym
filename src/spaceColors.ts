export const SPACE_COLORS = [
  { id: "rose", name: "Ягодный", value: "#B65081" },
  { id: "sage", name: "Зелёный", value: "#4C9A67" },
  { id: "sand", name: "Охра", value: "#C89036" },
  { id: "lilac", name: "Сиреневый", value: "#6A71B1" },
  { id: "slate", name: "Бирюзовый", value: "#3F96A0" },
] as const;

export type SpaceColor = (typeof SPACE_COLORS)[number]["id"];

export function defaultSpaceColor(name: string): SpaceColor {
  if (name === "Рабочее") return "rose";
  if (name === "Личное") return "sage";
  const hash = Array.from(name).reduce((value, character) => value * 31 + character.charCodeAt(0), 0);
  return SPACE_COLORS[Math.abs(hash) % SPACE_COLORS.length].id;
}

export function spaceColorValue(color: SpaceColor | undefined, name: string): string {
  const id = color ?? defaultSpaceColor(name);
  return SPACE_COLORS.find((item) => item.id === id)?.value ?? SPACE_COLORS[0].value;
}
