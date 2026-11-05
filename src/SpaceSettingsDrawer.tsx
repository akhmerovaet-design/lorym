import { useRef, useState } from "react";
import { Check, Copy, ImagePlus, Link2, Plus, Trash2, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { SPACE_COLORS, defaultSpaceColor } from "@/spaceColors";
import { prepareCoverImage } from "@/coverImage";
import type { SpaceInfo } from "@/SpacesPage";

type Props = {
  space: SpaceInfo;
  spaceNames: string[];
  onClose: () => void;
  onSave: (next: SpaceInfo, oldName: string) => void;
};

export function SpaceSettingsDrawer({ space, spaceNames, onClose, onSave }: Props) {
  const [name, setName] = useState(space.name);
  const [kind, setKind] = useState(space.kind);
  const [organization, setOrganization] = useState(space.organization ?? "");
  const [color, setColor] = useState(space.color ?? defaultSpaceColor(space.name));
  const [coverImage, setCoverImage] = useState(space.coverImage ?? "");
  const [invitations, setInvitations] = useState(space.invitations ?? []);
  const [email, setEmail] = useState("");
  const [inviteAccess, setInviteAccess] = useState<"view" | "edit">("view");
  const [error, setError] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [coverError, setCoverError] = useState("");
  const [copied, setCopied] = useState(false);
  const imageInput = useRef<HTMLInputElement>(null);
  const link = `${window.location.origin}${window.location.pathname}?space=${encodeURIComponent(space.name)}`;

  async function uploadCover(file?: File) {
    if (!file) return;
    setCoverError("");
    try {
      setCoverImage(await prepareCoverImage(file));
    } catch (error) { setCoverError(error instanceof Error ? error.message : "Не удалось открыть изображение"); }
  }

  function addInvitation() {
    const nextEmail = email.trim().toLocaleLowerCase("ru");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) { setInviteError("Введите корректный email"); return; }
    if (invitations.some((item) => item.email === nextEmail)) { setInviteError("Этот адрес уже добавлен"); return; }
    setInvitations((current) => [...current, { email: nextEmail, access: inviteAccess }]);
    setEmail("");
    setInviteError("");
  }

  function save() {
    const nextName = name.trim();
    if (!nextName) { setError("Введите название пространства"); return; }
    if (spaceNames.some((item) => item !== space.name && item.toLocaleLowerCase("ru") === nextName.toLocaleLowerCase("ru"))) { setError("Такое пространство уже есть"); return; }
    if (kind === "organization" && !organization.trim()) { setError("Укажите организацию"); return; }
    onSave({ ...space, name: nextName, kind, organization: kind === "organization" ? organization.trim() : undefined, color, coverImage, invitations }, space.name);
    onClose();
  }

  async function copyLink() {
    try { await navigator.clipboard.writeText(link); setCopied(true); }
    catch { setCopied(false); }
  }

  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="space-settings-drawer" showCloseButton={false}>
      <header className="space-settings-head"><div><DialogTitle>Редактировать пространство</DialogTitle><DialogDescription className="sr-only">Настройки пространства «{space.name}»</DialogDescription></div><button type="button" className="space-settings-close" onClick={onClose} aria-label="Закрыть"><X size={20} /></button></header>
      <div className="space-settings-body">
        <section className="space-settings-section"><h3>Обложка</h3><div className={`space-settings-cover cover-${space.cover}`}>
          {coverImage && <img src={coverImage} alt="" />}
        </div><input ref={imageInput} className="sr-only" type="file" accept="image/*" onChange={(event) => { void uploadCover(event.target.files?.[0]); event.target.value = ""; }} />
          <div className="space-settings-cover-actions"><button type="button" onClick={() => imageInput.current?.click()}><ImagePlus size={16} />{coverImage ? "Сменить обложку" : "Загрузить обложку"}</button>{coverImage && <button type="button" onClick={() => setCoverImage("")}>Убрать</button>}</div>{coverError && <p className="space-settings-error" role="alert">{coverError}</p>}
        </section>

        <section className="space-settings-section"><label className="space-settings-label" htmlFor="space-settings-name">Название</label><input id="space-settings-name" value={name} onChange={(event) => { setName(event.target.value); setError(""); }} onKeyDown={(event) => { if (event.key === "Enter") save(); }} autoFocus />
          <div className="space-settings-color-head">Цвет точки</div><div className="space-settings-colors" role="group" aria-label="Цвет пространства">{SPACE_COLORS.map((option) => <button type="button" key={option.id} className={color === option.id ? "selected" : ""} aria-label={option.name} aria-pressed={color === option.id} onClick={() => setColor(option.id)}><span style={{ backgroundColor: option.value }} />{color === option.id && <Check size={15} />}</button>)}</div>
        </section>

        <section className="space-settings-section"><h3>Организация</h3><div className="space-settings-kind" role="group" aria-label="Тип пространства"><button type="button" className={kind === "personal" ? "selected" : ""} aria-pressed={kind === "personal"} onClick={() => { setKind("personal"); setError(""); }}>Личное</button><button type="button" className={kind === "organization" ? "selected" : ""} aria-pressed={kind === "organization"} onClick={() => setKind("organization")}>Организация</button></div>{kind === "organization" && <label className="space-settings-label space-settings-organization">Название организации<input value={organization} onChange={(event) => { setOrganization(event.target.value); setError(""); }} placeholder="Название организации" /></label>}</section>

        <section className="space-settings-section"><h3>Доступ</h3><div className="space-settings-invitations">{invitations.map((item) => <div className="space-settings-invitation" key={item.email}><span title={item.email}>{item.email}</span><select aria-label={`Доступ для ${item.email}`} value={item.access} onChange={(event) => setInvitations((current) => current.map((entry) => entry.email === item.email ? { ...entry, access: event.target.value as "view" | "edit" } : entry))}><option value="view">Просмотр</option><option value="edit">Редактирование</option></select><button type="button" aria-label={`Убрать ${item.email}`} onClick={() => setInvitations((current) => current.filter((entry) => entry.email !== item.email))}><Trash2 size={16} /></button></div>)}</div>
          <div className="space-settings-invite"><input type="email" value={email} onChange={(event) => { setEmail(event.target.value); setInviteError(""); }} onKeyDown={(event) => { if (event.key === "Enter") addInvitation(); }} placeholder="Email участника" aria-label="Email участника" /><select value={inviteAccess} onChange={(event) => setInviteAccess(event.target.value as "view" | "edit")} aria-label="Доступ нового участника"><option value="view">Просмотр</option><option value="edit">Редактирование</option></select><button type="button" onClick={addInvitation} aria-label="Добавить участника"><Plus size={18} /></button></div>{inviteError && <p className="space-settings-error" role="alert">{inviteError}</p>}<p className="space-settings-hint">В прототипе приглашения сохраняются без отправки письма.</p>
          <button type="button" className="space-settings-copy" onClick={() => void copyLink()}><Link2 size={16} />{copied ? "Ссылка скопирована" : "Скопировать ссылку"}<Copy size={15} /></button>
        </section>
        {error && <p className="space-settings-error" role="alert">{error}</p>}
      </div>
      <footer className="space-settings-footer"><button type="button" onClick={onClose}>Отмена</button><button type="button" onClick={save}>Сохранить</button></footer>
    </DialogContent>
  </Dialog>;
}
