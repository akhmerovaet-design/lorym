import type { SpaceColor } from "@/spaceColors";
import { spaceColorValue } from "@/spaceColors";

type Props = { name: string; color?: SpaceColor; className?: string; decorative?: boolean };

export function SpaceDot({ name, color, className = "", decorative = false }: Props) {
  return <span className={`space-dot ${className}`} style={{ backgroundColor: spaceColorValue(color, name) }} role={decorative ? undefined : "img"} aria-label={decorative ? undefined : `Пространство «${name}»`} aria-hidden={decorative ? true : undefined} title={name} />;
}
