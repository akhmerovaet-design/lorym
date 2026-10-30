import { useEffect, useState } from "react";
import { Download, FileText } from "lucide-react";
import { readFile } from "@/fileStorage";
import type { Material } from "@/model";
import { SpaceDot } from "@/SpaceDot";
import type { SpaceColor } from "@/spaceColors";

type Props = { file: Material; spaceColor?: SpaceColor };

function formatSize(bytes?: number) {
  if (!bytes) return "";
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} КБ` : `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

export function FilePage({ file, spaceColor }: Props) {
  const [url, setUrl] = useState("");
  const [text, setText] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const type = file.fileType ?? "";
  const name = file.fileName ?? file.title;
  const isText = type.startsWith("text/") || /\.(txt|md|csv|json)$/i.test(name);
  const isPdf = type === "application/pdf" || /\.pdf$/i.test(name);
  const isImage = type.startsWith("image/");

  useEffect(() => {
    let active = true;
    let objectUrl = "";
    readFile(file.id).then(async (blob) => {
      if (!active) return;
      if (!blob) { setMissing(true); return; }
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
      if (isText) setText(await blob.text());
    }).catch(() => { if (active) setMissing(true); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [file.id, isText]);

  return <section className="file-page" aria-label={`Файл «${file.title}»`}>
    <header className="file-heading">
      <div className="file-heading-title"><SpaceDot name={file.space} color={spaceColor} /><h1>{file.title}</h1></div>
      {url && <a className="file-download" href={url} download={name}><Download size={17} />Скачать</a>}
    </header>
    <p className="file-meta"><FileText size={16} />{name}{file.fileSize ? <span>· {formatSize(file.fileSize)}</span> : null}</p>
    {missing ? <div className="file-preview-empty">Файл не удалось открыть в этом браузере.</div>
      : !url ? <div className="file-preview-empty">Открываем файл…</div>
      : isPdf ? <iframe className="file-preview-pdf" src={url} title={`Просмотр ${name}`} />
      : isImage ? <div className="file-preview-image"><img src={url} alt={name} /></div>
      : isText ? <pre className="file-preview-text">{text ?? "Открываем файл…"}</pre>
      : <div className="file-preview-empty"><FileText size={29} strokeWidth={1.4} /><p>Предпросмотр этого формата недоступен.</p><a href={url} download={name}>Скачать файл</a></div>}
  </section>;
}
