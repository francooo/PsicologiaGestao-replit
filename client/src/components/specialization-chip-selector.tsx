import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SpecializationChipSelectorProps {
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  readonly?: boolean;
}

interface AreaItem {
  id: number;
  name: string;
  isCustom: boolean;
}

type GroupedAreas = Record<string, AreaItem[]>;

export default function SpecializationChipSelector({
  selectedIds,
  onChange,
  readonly = false,
}: SpecializationChipSelectorProps) {
  const [search, setSearch] = useState("");
  const [customName, setCustomName] = useState("");
  const [addingCustom, setAddingCustom] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: grouped = {} } = useQuery<GroupedAreas>({
    queryKey: ["/api/specialization-areas"],
  });

  const addCustomMutation = useMutation({
    mutationFn: (name: string) =>
      apiRequest("POST", "/api/specialization-areas", { name, category: "Personalizada" }).then((r) => r.json()),
    onSuccess: (newArea: AreaItem) => {
      queryClient.invalidateQueries({ queryKey: ["/api/specialization-areas"] });
      if (!selectedIds.includes(newArea.id)) {
        onChange([...selectedIds, newArea.id]);
      }
      setCustomName("");
      setAddingCustom(false);
    },
    onError: () => toast({ title: "Erro ao adicionar especialização", variant: "destructive" }),
  });

  const allAreas: AreaItem[] = useMemo(() => Object.values(grouped).flat(), [grouped]);

  const filtered = useMemo(() => {
    if (!search.trim()) return grouped;
    const q = search.toLowerCase();
    const result: GroupedAreas = {};
    for (const [cat, items] of Object.entries(grouped)) {
      const matching = items.filter((a) => a.name.toLowerCase().includes(q));
      if (matching.length > 0) result[cat] = matching;
    }
    return result;
  }, [grouped, search]);

  const toggle = (id: number) => {
    if (readonly) return;
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((i) => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const handleAddCustom = () => {
    const trimmed = customName.trim();
    if (!trimmed) return;
    addCustomMutation.mutate(trimmed);
  };

  const selectedAreas = allAreas.filter((a) => selectedIds.includes(a.id));

  return (
    <div className="space-y-3">
      {/* Selected chips summary */}
      {selectedAreas.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedAreas.map((a) => (
            <span
              key={a.id}
              data-testid={`chip-selected-${a.id}`}
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/30",
                !readonly && "cursor-pointer hover:bg-primary/20"
              )}
              onClick={() => toggle(a.id)}
            >
              {a.name}
              {!readonly && <X className="w-3 h-3" />}
            </span>
          ))}
        </div>
      )}

      {!readonly && (
        <>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-dark" />
            <Input
              placeholder="Buscar área de atuação..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
              data-testid="input-specialization-search"
            />
          </div>

          {/* Grouped chips */}
          <div className="max-h-48 overflow-y-auto pr-1 space-y-3">
            {Object.entries(filtered).map(([cat, items]) => (
              <div key={cat}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-dark mb-1.5">{cat}</p>
                <div className="flex flex-wrap gap-1.5">
                  {items.map((area) => {
                    const isSelected = selectedIds.includes(area.id);
                    return (
                      <button
                        key={area.id}
                        type="button"
                        data-testid={`chip-area-${area.id}`}
                        onClick={() => toggle(area.id)}
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors",
                          isSelected
                            ? "bg-primary text-white border-primary"
                            : "bg-white text-neutral-darkest border-neutral-light hover:border-primary/50 hover:text-primary"
                        )}
                      >
                        {area.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {Object.keys(filtered).length === 0 && (
              <p className="text-sm text-neutral-dark py-2">Nenhuma área encontrada.</p>
            )}
          </div>

          {/* Add custom */}
          {!addingCustom ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs text-primary hover:text-primary/80 hover:bg-primary/5 px-2 h-7"
              onClick={() => setAddingCustom(true)}
              data-testid="button-add-custom-area"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Adicionar personalizada
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Input
                placeholder="Nome da especialização..."
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddCustom()}
                className="h-8 text-sm flex-1"
                data-testid="input-custom-area-name"
                autoFocus
              />
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs"
                onClick={handleAddCustom}
                disabled={!customName.trim() || addCustomMutation.isPending}
                data-testid="button-confirm-custom-area"
              >
                Adicionar
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => { setAddingCustom(false); setCustomName(""); }}
                data-testid="button-cancel-custom-area"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {readonly && selectedAreas.length === 0 && (
        <p className="text-sm text-neutral-dark">Nenhuma área de atuação cadastrada.</p>
      )}
    </div>
  );
}
