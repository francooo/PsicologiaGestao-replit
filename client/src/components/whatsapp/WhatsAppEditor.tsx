import { useRef, type ReactNode, type RefObject } from "react";
import { Bold, Italic, Strikethrough } from "lucide-react";
import { parseWhatsApp, type WaNode } from "@shared/whatsapp-message";
import { Textarea } from "@/components/ui/textarea";
import { wrapSelection } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

function renderNodes(nodes: WaNode[]): ReactNode[] {
  return nodes.map((n, i) => {
    if (typeof n === "string") return n;
    const inner = renderNodes(n.children);
    if (n.style === "bold") return <strong key={i}>{inner}</strong>;
    if (n.style === "italic") return <em key={i}>{inner}</em>;
    if (n.style === "strike") return <s key={i}>{inner}</s>;
    return <code key={i} className="font-mono text-[13px]">{inner}</code>;
  });
}

/** The message as the patient will see it: a WhatsApp bubble with the formatting applied. */
export function WhatsAppPreview({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn("rounded-xl bg-[#EFEAE2] p-3", className)}>
      <div className="ml-auto max-w-[92%] rounded-lg rounded-tr-none bg-[#D9FDD3] px-3 py-2 text-[14px] leading-relaxed text-[#111B21] shadow-sm">
        {text.trim() ? (
          <p className="whitespace-pre-wrap break-words">{renderNodes(parseWhatsApp(text))}</p>
        ) : (
          <p className="italic text-[#667781]">Mensagem vazia</p>
        )}
      </div>
    </div>
  );
}

const MARKS = [
  { mark: "*", icon: Bold, label: "Negrito" },
  { mark: "_", icon: Italic, label: "Itálico" },
  { mark: "~", icon: Strikethrough, label: "Tachado" },
];

/** Textarea with Negrito / Itálico / Tachado buttons that apply WhatsApp's own markers. */
export function WhatsAppTextarea({
  value,
  onChange,
  maxLength,
  rows = 9,
  id,
  inputRef,
}: {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  rows?: number;
  id?: string;
  /** To insert text at the cursor from outside (variable chips) */
  inputRef?: RefObject<HTMLTextAreaElement>;
}) {
  const ownRef = useRef<HTMLTextAreaElement>(null);
  const ref = inputRef ?? ownRef;

  const apply = (mark: string) => {
    const el = ref.current;
    if (!el) return;
    const next = wrapSelection(value, el.selectionStart, el.selectionEnd, mark);
    onChange(next.text);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(next.start, next.end);
    });
  };

  return (
    <div className="overflow-hidden rounded-xl border border-cp-border focus-within:ring-2 focus-within:ring-cp-action">
      <div className="flex flex-wrap items-center gap-1 border-b border-cp-divider bg-cp-bg px-2 py-1.5">
        {MARKS.map(({ mark, icon: Icon, label }) => (
          <button
            key={mark}
            type="button"
            onClick={() => apply(mark)}
            title={`${label} (${mark}texto${mark})`}
            aria-label={label}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-cp-ink hover:bg-cp-hover"
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
        {maxLength && (
          <span className={cn("ml-auto pr-1 text-xs", value.length > maxLength ? "text-cp-danger" : "text-cp-subtle")}>
            {value.length}/{maxLength}
          </span>
        )}
      </div>
      <Textarea
        id={id}
        ref={ref}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="resize-y rounded-none border-0 text-[14px] leading-relaxed focus-visible:ring-0 focus-visible:ring-offset-0"
      />
    </div>
  );
}
