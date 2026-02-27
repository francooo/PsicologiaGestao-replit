import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";

const MAX_FILE_SIZE_MB = 90;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Upload, Download, Trash2, FileText, FileImage, File, FolderOpen, Loader2, Paperclip } from "lucide-react";
import { type PatientDocument } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DocumentsTabProps {
    patientId: number;
}

const docTypeMap: Record<string, string> = {
    consent: "Termo de Consentimento",
    contract: "Contrato",
    report: "Relatório",
    exam: "Exame",
    other: "Outro",
};

const docTypeColors: Record<string, string> = {
    consent: "border-purple-200 bg-purple-50 text-purple-700",
    contract: "border-blue-200 bg-blue-50 text-blue-700",
    report: "border-emerald-200 bg-emerald-50 text-emerald-700",
    exam: "border-orange-200 bg-orange-50 text-orange-700",
    other: "border-neutral-200 bg-neutral-50 text-neutral-600",
};

function FileIcon({ mimeType }: { mimeType: string }) {
    if (mimeType.includes("pdf")) return <FileText className="h-8 w-8 text-red-400" />;
    if (mimeType.includes("image")) return <FileImage className="h-8 w-8 text-blue-400" />;
    return <File className="h-8 w-8 text-neutral-400" />;
}

function SkeletonDocs() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-neutral-100 animate-pulse rounded-xl" />
            ))}
        </div>
    );
}

interface UploadDialogState {
    open: boolean;
    file: File | null;
    documentType: string;
    documentName: string;
    fileSizeError: string | null;
}

export default function DocumentsTab({ patientId }: DocumentsTabProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [uploadDialog, setUploadDialog] = useState<UploadDialogState>({
        open: false,
        file: null,
        documentType: "other",
        documentName: "",
        fileSizeError: null,
    });

    const [typeFilter, setTypeFilter] = useState("all");
    const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const { data: documents, isLoading } = useQuery<PatientDocument[]>({
        queryKey: [`/api/patients/${patientId}/documents`],
        enabled: !!patientId,
    });

    const deleteMutation = useMutation({
        mutationFn: async (docId: number) => {
            const res = await fetch(`/api/patients/documents/${docId}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (!res.ok) throw new Error("Erro ao excluir");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/documents`] });
            queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/counts`] });
            toast({ title: "Documento removido", description: "O documento foi excluído." });
            setDeleteTarget(null);
        },
        onError: () => {
            toast({ title: "Erro", description: "Não foi possível excluir o documento.", variant: "destructive" });
        },
    });

    // Open the upload dialog
    function openUploadDialog() {
        setUploadDialog({ open: true, file: null, documentType: "other", documentName: "", fileSizeError: null });
    }

    // When user picks a file inside the dialog
    function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        // Client-side size validation
        if (file.size > MAX_FILE_SIZE_BYTES) {
            setUploadDialog((prev) => ({
                ...prev,
                file: null,
                fileSizeError: `O arquivo "${file.name}" tem ${(file.size / 1024 / 1024).toFixed(1)}MB e excede o limite de ${MAX_FILE_SIZE_MB}MB.`,
            }));
            // reset input so user can pick another file
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        setUploadDialog((prev) => ({
            ...prev,
            file,
            fileSizeError: null,
            documentName: prev.documentName || file.name.replace(/\.[^/.]+$/, ""), // strip extension as default name
        }));
    }

    // Actually upload after user confirms in dialog
    async function handleConfirmUpload() {
        if (!uploadDialog.file) return;
        setIsUploading(true);

        try {
            const formData = new FormData();
            formData.append("file", uploadDialog.file);
            formData.append("documentType", uploadDialog.documentType);
            formData.append("documentName", uploadDialog.documentName || uploadDialog.file.name);

            const res = await fetch(`/api/patients/${patientId}/documents`, {
                method: "POST",
                body: formData,
                credentials: "include",
            });

            if (!res.ok) throw new Error("Upload falhou");

            queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/documents`] });
            queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/counts`] });
            toast({
                title: "Upload concluído",
                description: `"${uploadDialog.documentName || uploadDialog.file.name}" adicionado com sucesso.`,
            });
            setUploadDialog({ open: false, file: null, documentType: "other", documentName: "", fileSizeError: null });
        } catch {
            toast({ title: "Erro no upload", description: "Não foi possível fazer o upload.", variant: "destructive" });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }

    const filtered = (documents || []).filter(
        (d) => typeFilter === "all" || d.documentType === typeFilter
    );

    if (isLoading) return <SkeletonDocs />;

    return (
        <div>
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-2 mb-5">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="h-9 w-full sm:w-56 text-sm">
                        <SelectValue placeholder="Filtrar por tipo" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos os tipos</SelectItem>
                        {Object.entries(docTypeMap).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 h-9 border-primary/30 text-primary hover:bg-primary/5 ml-auto"
                    onClick={openUploadDialog}
                    id="btn-upload-document"
                >
                    <Upload className="h-4 w-4" />
                    Upload
                </Button>
            </div>

            {/* Documents Grid */}
            {filtered.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-neutral-200 rounded-xl">
                    <FolderOpen className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
                    <p className="text-sm font-medium text-neutral-500">Nenhum documento encontrado</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {typeFilter !== "all"
                            ? `Nenhum documento do tipo "${docTypeMap[typeFilter]}" encontrado`
                            : "Faça upload de um documento para começar"}
                    </p>
                    <Button
                        variant="outline"
                        size="sm"
                        className="mt-4 gap-1.5"
                        onClick={openUploadDialog}
                    >
                        <Upload className="h-3.5 w-3.5" />
                        Fazer Upload
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filtered.map((doc) => (
                        <div
                            key={doc.id}
                            className="flex items-center gap-3 p-4 bg-white border border-neutral-100 rounded-xl shadow-sm hover:shadow-md transition-shadow group"
                        >
                            <FileIcon mimeType={doc.mimeType} />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{doc.documentName}</p>
                                <div className="flex items-center flex-wrap gap-1.5 mt-1">
                                    <Badge
                                        variant="outline"
                                        className={`text-xs ${docTypeColors[doc.documentType] ?? docTypeColors.other}`}
                                    >
                                        {docTypeMap[doc.documentType] ?? doc.documentType}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                        {format(new Date(doc.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <a
                                    href={`/api/patients/documents/${doc.id}/download`}
                                    className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                                    title="Download"
                                >
                                    <Download className="h-3.5 w-3.5" />
                                </a>
                                <button
                                    className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                                    onClick={() => setDeleteTarget(doc.id)}
                                    title="Excluir"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ─── Upload Dialog ─────────────────────────────────────── */}
            <Dialog
                open={uploadDialog.open}
                onOpenChange={(open) =>
                    !isUploading && setUploadDialog((p) => ({ ...p, open }))
                }
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Adicionar Documento</DialogTitle>
                        <DialogDescription>
                            Selecione o arquivo, defina o tipo e o nome antes de enviar.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-1">
                        {/* File picker */}
                        <div>
                            <Label className="text-sm mb-1.5 block">Arquivo *</Label>
                            <div
                                className={`flex items-center gap-3 p-3 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${uploadDialog.fileSizeError
                                    ? "border-destructive/40 bg-destructive/5"
                                    : "border-neutral-200 hover:border-primary/40 hover:bg-primary/5"
                                    }`}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Paperclip className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                {uploadDialog.file ? (
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">
                                            {uploadDialog.file.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {(uploadDialog.file.size / 1024).toFixed(0)} KB
                                        </p>
                                    </div>
                                ) : (
                                    <span className="text-sm text-muted-foreground">
                                        Clique para selecionar um arquivo
                                    </span>
                                )}
                            </div>
                            {uploadDialog.fileSizeError && (
                                <p className="text-xs text-destructive mt-1.5 flex items-start gap-1">
                                    <span className="font-semibold">Arquivo muito grande:</span>
                                    {uploadDialog.fileSizeError}
                                </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                                Limite: {MAX_FILE_SIZE_MB}MB. Formatos aceitos: PDF, imagens, Word, Excel.
                            </p>
                            {/* Hidden real file input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                                onChange={handleFileSelected}
                            />
                        </div>

                        {/* Document Type */}
                        <div>
                            <Label htmlFor="upload-doc-type" className="text-sm mb-1.5 block">
                                Tipo de Documento *
                            </Label>
                            <Select
                                value={uploadDialog.documentType}
                                onValueChange={(v) =>
                                    setUploadDialog((p) => ({ ...p, documentType: v }))
                                }
                            >
                                <SelectTrigger id="upload-doc-type" className="w-full">
                                    <SelectValue placeholder="Selecione o tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(docTypeMap).map(([k, v]) => (
                                        <SelectItem key={k} value={k}>
                                            <span className="flex items-center gap-2">
                                                <span
                                                    className={`inline-block w-2 h-2 rounded-full ${k === "consent" ? "bg-purple-400" :
                                                        k === "contract" ? "bg-blue-400" :
                                                            k === "report" ? "bg-emerald-400" :
                                                                k === "exam" ? "bg-orange-400" :
                                                                    "bg-neutral-400"
                                                        }`}
                                                />
                                                {v}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Document Name */}
                        <div>
                            <Label htmlFor="upload-doc-name" className="text-sm mb-1.5 block">
                                Nome do Documento
                                <span className="text-muted-foreground font-normal ml-1">(opcional)</span>
                            </Label>
                            <Input
                                id="upload-doc-name"
                                placeholder="Ex: Termo assinado – Janeiro 2025"
                                value={uploadDialog.documentName}
                                onChange={(e) =>
                                    setUploadDialog((p) => ({ ...p, documentName: e.target.value }))
                                }
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Deixe em branco para usar o nome do arquivo.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setUploadDialog((p) => ({ ...p, open: false }))}
                            disabled={isUploading}
                        >
                            Cancelar
                        </Button>
                        <Button
                            className="bg-primary hover:bg-primary/90 gap-2"
                            onClick={handleConfirmUpload}
                            disabled={!uploadDialog.file || !!uploadDialog.fileSizeError || isUploading}
                            id="btn-confirm-upload"
                        >
                            {isUploading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Upload className="h-4 w-4" />
                            )}
                            {isUploading ? "Enviando..." : "Enviar Documento"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ─── Delete Confirmation ───────────────────────────────── */}
            <AlertDialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. O arquivo será removido permanentemente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/90"
                            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
