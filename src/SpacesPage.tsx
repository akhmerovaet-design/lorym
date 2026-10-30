import { useState } from "react";
import { ArrowRight, Building2, Check, Copy, Download, Eye, FolderOpen, Link2, Mail, MoreHorizontal, Pencil, Plus, RotateCcw, Search, Star, Trash2, UserRoundPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SpaceDot } from "@/SpaceDot";
import { SPACE_COLORS, defaultSpaceColor, type SpaceColor } from "@/spaceColors";

export type SpaceInfo = {
  name: string;
  kind: "personal" | "organization";
  organization?: string;
  cover: "work" | "personal" | "team" | "research" | "new";
  coverImage?: string;
  access: "view" | "edit";
  color?: SpaceColor;
  invitations?: { email: string; access: "view" | "edit" }[];
  starred?: boolean;
  trashed?: boolean;
};

type Props = {
  spaces: SpaceInfo[];
  trashedSpaces: SpaceInfo[];
  materials: SearchMaterial[];
  onOpen: (name: string) => void;
  onOpenMaterial: (id: number) => void;
  onCreate: (space: SpaceInfo) => void;
  onUpdate: (space: SpaceInfo) => void;
  onRename: (oldName: string, nextName: string) => void;
  onTrash: (name: string) => void;
  onRestore: (name: string) => void;
  onDeleteForever: (name: string) => void;
  onMove: (name: string, direction: -1 | 1) => void;
  onDownload: (name: string) => void;
  createFromSidebar: boolean;
  onCreateHandled: () => void;
};

type SearchMaterial = {
  id: number;
  kind: "meeting" | "note" | "file";
  title: string;
  detail: string;
  date: string;
  topic: string;
  space: string;
  searchText?: string;
};

type SpaceFilter = "all" | "personal" | "organization" | "trash";

export function SpacesPage({ spaces, trashedSpaces, materials, onOpen, onOpenMaterial, onCreate, onUpdate, onRename, onTrash, onRestore, onDeleteForever, onMove, onDownload, createFromSidebar, onCreateHandled }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<SpaceFilter>("all");
  const [createOpen, setCreateOpen] = useState(createFromSidebar);
  const [trashTarget, setTrashTarget] = useState<string | null>(null);
  const [deleteForeverTarget, setDeleteForeverTarget] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [renameError, setRenameError] = useState("");
  const [actionStatus, setActionStatus] = useState("");
  const [shareTarget, setShareTarget] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareError, setShareError] = useState("");
  const [organizationDraft, setOrganizationDraft] = useState("");
  const [editingOrganization, setEditingOrganization] = useState(false);
  const [organizationError, setOrganizationError] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteAccess, setInviteAccess] = useState<"view" | "edit">("view");
  const [inviteError, setInviteError] = useState("");
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"personal" | "organization">("personal");
  const [organization, setOrganization] = useState("");
  const [error, setError] = useState("");
  const shown = spaces.filter((item) => filter === "all" || item.kind === filter);
  const searchTerm = search.trim().toLocaleLowerCase("ru");
  const foundSpaces = searchTerm ? spaces.filter((item) => `${item.name} ${item.organization ?? ""}`.toLocaleLowerCase("ru").includes(searchTerm)) : [];
  const foundMaterials = searchTerm ? materials.filter((item) => spaces.some((space) => space.name === item.space) && `${item.title} ${item.detail} ${item.topic} ${item.space} ${item.searchText ?? ""}`.toLocaleLowerCase("ru").includes(searchTerm)) : [];
  const shareUrl = shareTarget ? `${window.location.origin}${window.location.pathname}?space=${encodeURIComponent(shareTarget)}` : "";
  const sharedSpace = spaces.find((item) => item.name === shareTarget);
  const knownOrganizations = Array.from(new Set(spaces.map((item) => item.organization).filter((value): value is string => !!value)));

  function startCreate() {
    setName("");
    setKind("personal");
    setOrganization("");
    setError("");
    setCreateOpen(true);
  }
  function closeCreate() {
    setCreateOpen(false);
    onCreateHandled();
  }
  function submitCreate() {
    const nextName = name.trim();
    if (!nextName) { setError("Введите название пространства"); return; }
    if ([...spaces, ...trashedSpaces].some((item) => item.name.toLocaleLowerCase("ru") === nextName.toLocaleLowerCase("ru"))) { setError("Такое пространство уже есть"); return; }
    if (kind === "organization" && !organization.trim()) { setError("Укажите организацию"); return; }
    onCreate({ name: nextName, kind, organization: kind === "organization" ? organization.trim() : undefined, cover: "new", access: "edit", color: defaultSpaceColor(nextName) });
    closeCreate();
    setFilter("all");
  }
  function confirmTrash() {
    if (!trashTarget) return;
    onTrash(trashTarget);
    setTrashTarget(null);
  }
  function startRename(space: SpaceInfo) {
    setRenameTarget(space.name);
    setRenameDraft(space.name);
    setRenameError("");
  }
  function saveRename() {
    if (!renameTarget) return;
    const nextName = renameDraft.trim();
    if (!nextName) { setRenameError("Введите название пространства"); return; }
    if ([...spaces, ...trashedSpaces].some((item) => item.name !== renameTarget && item.name.toLocaleLowerCase("ru") === nextName.toLocaleLowerCase("ru"))) { setRenameError("Такое пространство уже есть"); return; }
    if (nextName !== renameTarget) onRename(renameTarget, nextName);
    setRenameTarget(null);
  }
  function spaceUrl(name: string) {
    return `${window.location.origin}${window.location.pathname}?space=${encodeURIComponent(name)}`;
  }
  async function copyLink(name: string) {
    try {
      await navigator.clipboard.writeText(spaceUrl(name));
      setActionStatus("Ссылка скопирована");
      window.setTimeout(() => setActionStatus(""), 2800);
      return true;
    } catch {
      setActionStatus("Не удалось скопировать ссылку");
      window.setTimeout(() => setActionStatus(""), 2800);
      return false;
    }
  }
  async function copyShareLink() {
    if (!shareTarget) return;
    const copied = await copyLink(shareTarget);
    setShareCopied(copied);
    setShareError(copied ? "" : "Не удалось скопировать ссылку. Выделите её в поле и скопируйте вручную.");
  }
  function openShare(space: SpaceInfo) {
    setShareTarget(space.name);
    setShareCopied(false);
    setShareError("");
    setOrganizationDraft(space.organization ?? "");
    setEditingOrganization(false);
    setOrganizationError("");
    setInviteEmail("");
    setInviteAccess("view");
    setInviteError("");
  }
  function saveOrganization() {
    if (!sharedSpace) return;
    const name = organizationDraft.trim();
    if (!name) { setOrganizationError("Введите название организации"); return; }
    onUpdate({ ...sharedSpace, kind: "organization", organization: name });
    setEditingOrganization(false);
    setOrganizationError("");
    setFilter("all");
  }
  function addInvitation() {
    if (!sharedSpace) return;
    const email = inviteEmail.trim().toLocaleLowerCase("ru");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setInviteError("Введите корректный email"); return; }
    if (sharedSpace.invitations?.some((item) => item.email === email)) { setInviteError("Этот адрес уже добавлен"); return; }
    onUpdate({ ...sharedSpace, invitations: [...(sharedSpace.invitations ?? []), { email, access: inviteAccess }] });
    setInviteEmail("");
    setInviteError("");
  }
  function removeInvitation(email: string) {
    if (!sharedSpace) return;
    onUpdate({ ...sharedSpace, invitations: (sharedSpace.invitations ?? []).filter((item) => item.email !== email) });
  }

  return <div className="spaces-page">
    <div className="spaces-heading">
      <h1>Пространства</h1>
    </div>
    <div className="global-search"><Search size={20} aria-hidden="true" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск по всем пространствам" aria-label="Поиск по всем пространствам" />{search && <button onClick={() => setSearch("")} aria-label="Очистить поиск"><X size={17} /></button>}</div>
    {searchTerm ? <section className="global-results" aria-live="polite">
      <div className="global-results-heading"><h2>Результаты поиска</h2></div>
      {foundSpaces.length + foundMaterials.length > 0 ? <div className="global-results-list">
        {foundSpaces.map((item) => <button key={`space-${item.name}`} className="global-result" onClick={() => onOpen(item.name)}><span><strong>{item.name}</strong><small>Пространство · {item.kind === "personal" ? "Личное" : item.organization}</small></span><ArrowRight size={18} aria-hidden="true" /></button>)}
        {foundMaterials.map((item) => <button key={`material-${item.id}`} className="global-result" onClick={() => onOpenMaterial(item.id)}><span><strong>{item.title}</strong><small>{item.kind === "meeting" ? "Встреча" : item.kind === "file" ? "Файл" : "Документ"} · <SpaceDot name={item.space} color={spaces.find((space) => space.name === item.space)?.color} />{item.topic}</small></span><span className="global-result-date">{item.date}</span><ArrowRight size={18} aria-hidden="true" /></button>)}
      </div> : <p className="global-results-empty">Ничего не найдено. Попробуйте другое слово или тему.</p>}
    </section> : <>
    <div className="spaces-toolbar">
      <div className="space-filters" aria-label="Фильтр пространств">
        {(["all", "personal", "organization", "trash"] as const).map((value) => <button key={value} className={filter === value ? "selected" : ""} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value === "all" ? "Все" : value === "personal" ? "Личные" : value === "organization" ? "Организации" : "Корзина"}</button>)}
      </div>
      <button className="add-button" onClick={startCreate}><Plus size={18} />Новое пространство</button>
    </div>
    {filter === "trash" ? <div className="space-trash-list">{trashedSpaces.length ? trashedSpaces.map((item) => <div className="space-trash-row" key={item.name}><span><Trash2 size={18} /><strong>{item.name}</strong></span><div className="space-trash-actions"><button onClick={() => onRestore(item.name)}><RotateCcw size={16} />Восстановить</button><button onClick={() => setDeleteForeverTarget(item.name)}><Trash2 size={16} />Удалить навсегда</button></div></div>) : <p className="spaces-empty">Корзина пуста.</p>}</div> : <TooltipProvider delayDuration={220}><div className="space-grid">
      {shown.map((item) => {
        return <article className="space-card" key={item.name}>
          <button type="button" className="space-card-hitarea" onClick={() => onOpen(item.name)} aria-label={`Открыть пространство «${item.name}»`} />
          <div className={`space-cover cover-${item.cover} ${item.coverImage ? "has-image" : ""}`}>
            {item.coverImage && <img className="space-cover-image" src={item.coverImage} alt="" />}
            {!item.coverImage && <span className="cover-art" aria-hidden="true">
              <span className="cover-page cover-page-back" />
              <span className="cover-page cover-page-front">
                <span className="cover-page-visual"><i /><i /><i /></span>
                <span className="cover-page-lines"><i /><i /><i /></span>
              </span>
              <span className="cover-source-strip"><i /><i /><i /><i /><i /><i /><i /></span>
            </span>}
          </div>
          <div className="space-card-body">
            <div className="space-card-title"><SpaceDot name={item.name} color={item.color} decorative /><h2>{item.name}</h2>{item.starred && <Star className="space-card-star" size={15} fill="currentColor" aria-label="В избранном" />}{item.access === "view" && <Tooltip><TooltipTrigger asChild><span className="space-access" tabIndex={0} role="img" aria-label="Доступ только на просмотр"><Eye size={17} strokeWidth={1.7} /></span></TooltipTrigger><TooltipContent side="top">Только просмотр</TooltipContent></Tooltip>}</div>
            <div className="space-card-actions"><span className="space-open">Открыть <ArrowRight size={17} /></span>{item.access === "edit" && <DropdownMenu><DropdownMenuTrigger asChild><button className="space-more" aria-label={`Действия с пространством «${item.name}»`}><MoreHorizontal size={19} /></button></DropdownMenuTrigger><DropdownMenuContent align="end" className="space-menu">
              <DropdownMenuItem onClick={() => onDownload(item.name)}><Download size={16} />Скачать</DropdownMenuItem>
              <DropdownMenuItem onClick={() => startRename(item)}><Pencil size={16} />Переименовать</DropdownMenuItem>
              <DropdownMenuSub><DropdownMenuSubTrigger><SpaceDot name={item.name} color={item.color} decorative />Цвет пространства</DropdownMenuSubTrigger><DropdownMenuSubContent className="space-menu">{SPACE_COLORS.map((option) => <DropdownMenuItem key={option.id} onSelect={() => onUpdate({ ...item, color: option.id })}><SpaceDot name={item.name} color={option.id} decorative />{option.name}{(item.color ?? defaultSpaceColor(item.name)) === option.id && <Check size={15} className="space-color-check" />}</DropdownMenuItem>)}</DropdownMenuSubContent></DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuSub><DropdownMenuSubTrigger><UserRoundPlus size={16} />Поделиться</DropdownMenuSubTrigger><DropdownMenuSubContent className="space-menu"><DropdownMenuItem onClick={() => openShare(item)}><UserRoundPlus size={16} />Поделиться</DropdownMenuItem><DropdownMenuItem onClick={() => void copyLink(item.name)}><Link2 size={16} />Копировать ссылку</DropdownMenuItem></DropdownMenuSubContent></DropdownMenuSub>
              <DropdownMenuSub><DropdownMenuSubTrigger><FolderOpen size={16} />Упорядочить</DropdownMenuSubTrigger><DropdownMenuSubContent className="space-menu"><DropdownMenuItem onClick={() => onUpdate({ ...item, starred: !item.starred })}><Star size={16} />{item.starred ? "Убрать из избранного" : "Добавить в избранное"}</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem disabled={spaces[0]?.name === item.name} onClick={() => onMove(item.name, -1)}>Поднять выше</DropdownMenuItem><DropdownMenuItem disabled={spaces.at(-1)?.name === item.name} onClick={() => onMove(item.name, 1)}>Опустить ниже</DropdownMenuItem></DropdownMenuSubContent></DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setTrashTarget(item.name)}><Trash2 size={16} />Отправить в корзину</DropdownMenuItem>
            </DropdownMenuContent></DropdownMenu>}</div>
          </div>
        </article>;
      })}
    </div></TooltipProvider>}
    {filter !== "trash" && shown.length === 0 && <p className="spaces-empty">В этой категории пока нет пространств.</p>}
    </>}
    {actionStatus && <div className="spaces-action-status" role="status">{actionStatus}</div>}

    <Dialog open={createOpen} onOpenChange={(open) => { if (!open) closeCreate(); }}><DialogContent className="lorym-dialog space-create-dialog"><DialogHeader><DialogTitle>Новое пространство</DialogTitle><DialogDescription>Записи, резюме и конспекты этой сферы будут храниться вместе.</DialogDescription></DialogHeader><div className="space-form"><label>Название<Input value={name} onChange={(event) => { setName(event.target.value); setError(""); }} placeholder="Например, Исследования" /></label><div className="space-kind" aria-label="Тип пространства"><button className={kind === "personal" ? "selected" : ""} aria-pressed={kind === "personal"} onClick={() => { setKind("personal"); setError(""); }}>Личное</button><button className={kind === "organization" ? "selected" : ""} aria-pressed={kind === "organization"} onClick={() => { setKind("organization"); setError(""); }}>Организация</button></div>{kind === "organization" && <label>Организация<Input value={organization} onChange={(event) => { setOrganization(event.target.value); setError(""); }} placeholder="Название организации" /></label>}{error && <p className="form-error" role="alert">{error}</p>}</div><div className="dialog-actions"><Button variant="ghost" onClick={closeCreate}>Отмена</Button><Button onClick={submitCreate}>Создать пространство</Button></div></DialogContent></Dialog>

    <Dialog open={!!shareTarget} onOpenChange={(open) => { if (!open) setShareTarget(null); }}>
      <DialogContent className="lorym-dialog space-share-dialog">
        <DialogHeader><DialogTitle>Поделиться пространством</DialogTitle><DialogDescription>«{shareTarget}»</DialogDescription></DialogHeader>
        <section className="space-share-section" aria-label="Организация">
          <h3><Building2 size={17} /> Организация</h3>
          {sharedSpace?.organization && !editingOrganization ? <div className="space-share-organization"><strong>{sharedSpace.organization}</strong><button onClick={() => setEditingOrganization(true)}>Изменить</button></div> : editingOrganization ? <div className="space-share-org-form"><input value={organizationDraft} onChange={(event) => { setOrganizationDraft(event.target.value); setOrganizationError(""); }} list="space-organizations" placeholder="Название организации" aria-label="Название организации" /><datalist id="space-organizations">{knownOrganizations.map((value) => <option key={value} value={value} />)}</datalist><button onClick={saveOrganization}>Сохранить</button></div> : <button className="space-share-add-org" onClick={() => setEditingOrganization(true)}><Plus size={16} /> Добавить организацию</button>}
          {organizationError && <p className="form-error" role="alert">{organizationError}</p>}
        </section>
        <section className="space-share-section" aria-label="Участники">
          <h3><Mail size={17} /> Участники</h3>
          <div className="space-share-invite-form"><input type="email" value={inviteEmail} onChange={(event) => { setInviteEmail(event.target.value); setInviteError(""); }} onKeyDown={(event) => { if (event.key === "Enter") addInvitation(); }} placeholder="Email участника" aria-label="Email участника" /><select value={inviteAccess} onChange={(event) => setInviteAccess(event.target.value as "view" | "edit")} aria-label="Уровень доступа"><option value="view">Просмотр</option><option value="edit">Редактирование</option></select><button onClick={addInvitation}>Пригласить</button></div>
          {inviteError && <p className="form-error" role="alert">{inviteError}</p>}
          {!!sharedSpace?.invitations?.length && <div className="space-share-invitations">{sharedSpace.invitations.map((invitation) => <div className="space-share-invitation" key={invitation.email}><span><strong>{invitation.email}</strong><small>{invitation.access === "edit" ? "Редактирование" : "Просмотр"} · ожидает отправки</small></span><button onClick={() => removeInvitation(invitation.email)} aria-label={`Убрать ${invitation.email}`}><X size={16} /></button></div>)}</div>}
          <p className="space-share-note">В прототипе письма не отправляются.</p>
        </section>
        <section className="space-share-section" aria-label="Ссылка на пространство">
          <h3><Link2 size={17} /> Ссылка</h3>
          <div className="space-share-link"><input value={decodeURI(shareUrl)} readOnly aria-label="Ссылка на пространство" onClick={(event) => event.currentTarget.select()} /><button onClick={copyShareLink} aria-label={shareCopied ? "Ссылка скопирована" : "Скопировать ссылку"}>{shareCopied ? <Check size={17} /> : <Copy size={17} />}</button></div>
          {shareError && <p className="form-error" role="alert">{shareError}</p>}
        </section>
      </DialogContent>
    </Dialog>

    <Dialog open={!!renameTarget} onOpenChange={(open) => { if (!open) setRenameTarget(null); }}><DialogContent className="lorym-dialog space-rename-dialog"><DialogHeader><DialogTitle>Переименовать пространство</DialogTitle><DialogDescription>Новое название появится в материалах и навигации.</DialogDescription></DialogHeader><label>Название<Input value={renameDraft} onChange={(event) => { setRenameDraft(event.target.value); setRenameError(""); }} onKeyDown={(event) => { if (event.key === "Enter") saveRename(); }} autoFocus /></label>{renameError && <p className="form-error" role="alert">{renameError}</p>}<div className="dialog-actions"><Button variant="ghost" onClick={() => setRenameTarget(null)}>Отмена</Button><Button onClick={saveRename}>Сохранить</Button></div></DialogContent></Dialog>

    <Dialog open={!!trashTarget} onOpenChange={(open) => { if (!open) setTrashTarget(null); }}><DialogContent className="lorym-dialog space-trash-dialog"><DialogHeader><DialogTitle>В корзину — «{trashTarget}»?</DialogTitle><DialogDescription>Пространство исчезнет из навигации. Его можно восстановить на странице пространств.</DialogDescription></DialogHeader><div className="dialog-actions"><Button variant="ghost" onClick={() => setTrashTarget(null)}>Отмена</Button><Button onClick={confirmTrash}>В корзину</Button></div></DialogContent></Dialog>

    <Dialog open={!!deleteForeverTarget} onOpenChange={(open) => { if (!open) setDeleteForeverTarget(null); }}><DialogContent className="lorym-dialog space-trash-dialog"><DialogHeader><DialogTitle>Удалить «{deleteForeverTarget}» навсегда?</DialogTitle><DialogDescription>Пространство и его материалы нельзя будет восстановить.</DialogDescription></DialogHeader><div className="dialog-actions"><Button variant="ghost" onClick={() => setDeleteForeverTarget(null)}>Отмена</Button><Button onClick={() => { if (deleteForeverTarget) onDeleteForever(deleteForeverTarget); setDeleteForeverTarget(null); }}>Удалить навсегда</Button></div></DialogContent></Dialog>
  </div>;
}
