import { Fragment, type ReactNode } from "react";

type Props = { html: string; title?: string; emptyText?: string };

function repeatsTitle(heading: string, title: string) {
  const cleanHeading = heading.replace(/\s+/g, " ").trim().toLocaleLowerCase("ru");
  const cleanTitle = title.replace(/\s+/g, " ").trim().toLocaleLowerCase("ru");
  if (!cleanHeading || !cleanTitle.startsWith(cleanHeading)) return false;
  return !cleanTitle.slice(cleanHeading.length) || /^[:：—–-]/.test(cleanTitle.slice(cleanHeading.length).trimStart());
}

function renderNode(node: Node, key: number): ReactNode {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent;
  if (!(node instanceof Element)) return null;
  const children = Array.from(node.childNodes).map((child, index) => renderNode(child, index));
  switch (node.tagName) {
    case "H1": case "H2": case "H3": case "H4": case "H5": case "H6": return <h3 key={key}>{children}</h3>;
    case "P": return <p key={key}>{children}</p>;
    case "DIV": return <div key={key} className="knowledge-body-block">{children}</div>;
    case "UL": return <ul key={key}>{children}</ul>;
    case "OL": return <ol key={key}>{children}</ol>;
    case "LI": return <li key={key}>{children}</li>;
    case "B": case "STRONG": return <strong key={key}>{children}</strong>;
    case "I": case "EM": return <em key={key}>{children}</em>;
    case "U": return <u key={key}>{children}</u>;
    case "BR": return <br key={key} />;
    default: return <Fragment key={key}>{children}</Fragment>;
  }
}

export function KnowledgeBody({ html, title = "", emptyText = "Содержание пока не добавлено." }: Props) {
  const body = new DOMParser().parseFromString(html, "text/html").body;
  let removedRepeatedHeading = false;
  const blocks = Array.from(body.childNodes).filter((node) => {
    if (!removedRepeatedHeading && node instanceof Element && /^H[1-6]$/.test(node.tagName) && repeatsTitle(node.textContent ?? "", title)) {
      removedRepeatedHeading = true;
      return false;
    }
    return node.textContent?.trim() || (node instanceof Element && node.tagName === "BR");
  });
  if (!blocks.length) return <p className="knowledge-body-empty">{emptyText}</p>;
  return <div className="knowledge-body">{blocks.map((block, index) => renderNode(block, index))}</div>;
}
