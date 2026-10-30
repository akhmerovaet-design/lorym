import type { SpaceInfo } from "@/SpacesPage";

type Props = {
  spaces: SpaceInfo[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
};

export function SpaceFilter({ spaces, value, onChange, label = "Пространство" }: Props) {
  return <label className="space-filter">
    <span>{label}</span>
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="all">Все пространства</option>
      {spaces.map((space) => <option key={space.name} value={space.name}>{space.name}</option>)}
    </select>
  </label>;
}
