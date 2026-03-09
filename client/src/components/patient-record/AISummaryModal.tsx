import { useState } from "react";
import { Sparkles, Copy, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface AISummaryModalProps {
  open: boolean;
  onClose: () => void;
  documentName: string;
  summary: string;
  isLoading: boolean;
  error: string | null;
}

function parseSummary(text: string) {
  const sections = [
    { key: "resumo", label: "Resumo objetivo" },
    { key: "atencao", label: "Pontos de atenção clínica" },
    { key: "insights", label: "Insights terapêuticos" },
    { key: "followup", label: "Sugestões de follow-up" },
  ];

  const numberedPattern = /(?:^|\n)\s*\d+\.\s+\*\*([^*]+)\*\*/g;
  const parts: { title: string; content: string }[] = [];
  const matches = [...text.matchAll(numberedPattern)];

  if (matches.length >= 2) {
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index! + matches[i][0].length;
      const end = matches[i + 1]?.index ?? text.length;
      parts.push({
        title: matches[i][1].trim(),
        content: text.slice(start, end).trim(),
      });
    }
    return parts;
  }

  return sections.map((s) => {
    const regex = new RegExp(
      `(?:\\d+\\.\\s*)?\\*\\*${s.label}\\*\\*[:\\s]*([\\s\\S]*?)(?=\\n\\s*(?:\\d+\\.\\s*)?\\*\\*|$)`,
      "i"
    );
    const match = text.match(regex);
    return {
      title: s.label,
      content: match ? match[1].trim() : "",
    };
  });
}

export default function AISummaryModal({
  open,
  onClose,
  documentName,
  summary,
  isLoading,
  error,
}: AISummaryModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Copiado!", description: "Resumo copiado para a área de transferência." });
    } catch {
      toast({ title: "Erro", description: "Não foi possível copiar.", variant: "destructive" });
    }
  }

  const sections = summary ? parseSummary(summary) : [];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="p-1.5 bg-purple-100 rounded-lg">
              <Sparkles className="h-4 w-4 text-purple-600" />
            </div>
            <span>
              Resumo IA —{" "}
              <span className="text-muted-foreground font-normal truncate max-w-xs inline-block align-bottom">
                {documentName}
              </span>
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 py-2">
          {isLoading && (
            <div className="space-y-4">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-5 w-52" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-16 w-full" />
            </div>
          )}

          {error && !isLoading && (
            <div className="flex items-start gap-3 p-4 bg-destructive/5 border border-destructive/20 rounded-xl">
              <X className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {!isLoading && !error && sections.length > 0 && (
            <div className="space-y-5">
              {sections.map((section, i) => (
                <div key={i}>
                  <h4 className="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex-shrink-0">
                      {i + 1}
                    </span>
                    {section.title}
                  </h4>
                  <div className="text-sm text-muted-foreground leading-relaxed pl-7 whitespace-pre-wrap">
                    {section.content || (
                      <span className="italic text-neutral-400">Sem informações disponíveis.</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && !error && summary && sections.every((s) => !s.content) && (
            <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {summary}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 flex justify-between items-center pt-4 border-t gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Fechar
          </Button>
          {summary && !error && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-purple-200 text-purple-700 hover:bg-purple-50"
              onClick={handleCopy}
              disabled={isLoading}
              data-testid="button-copy-summary"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? "Copiado!" : "Copiar resumo"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
