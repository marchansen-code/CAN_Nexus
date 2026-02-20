import React, { useState, useEffect, useCallback, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API, AuthContext } from "@/App";
import { toast } from "sonner";
import {
  Upload,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  Plus,
  RefreshCw,
  Languages,
  Trash2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const StatusIcon = ({ status }) => {
  switch (status) {
    case "pending":
      return <Clock className="w-5 h-5 text-slate-500" />;
    case "processing":
      return <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />;
    case "completed":
      return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
    case "failed":
      return <XCircle className="w-5 h-5 text-red-500" />;
    default:
      return <FileText className="w-5 h-5 text-muted-foreground" />;
  }
};

const StatusBadge = ({ status }) => {
  const styles = {
    pending: "bg-slate-100 text-slate-700 border-slate-200",
    processing: "bg-indigo-50 text-indigo-700 border-indigo-200",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    failed: "bg-red-50 text-red-700 border-red-200"
  };
  
  const labels = {
    pending: "Wartend",
    processing: "Verarbeitung",
    completed: "Abgeschlossen",
    failed: "Fehlgeschlagen"
  };

  return (
    <Badge variant="outline" className={`${styles[status]} border`}>
      {labels[status]}
    </Badge>
  );
};

const Documents = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [targetLanguage, setTargetLanguage] = useState("de");
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [createArticleDialog, setCreateArticleDialog] = useState({ open: false, doc: null });
  const [articleTitle, setArticleTitle] = useState("");
  const [deleteDialog, setDeleteDialog] = useState({ open: false, doc: null });

  const isAdmin = user?.role === "admin";

  const fetchDocuments = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/documents`);
      setDocuments(response.data);
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
    
    // Poll for updates while documents are processing
    const interval = setInterval(() => {
      fetchDocuments();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchDocuments]);

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error("Bitte laden Sie nur PDF-Dateien hoch");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("target_language", targetLanguage);

    try {
      await axios.post(`${API}/documents/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        }
      });
      
      toast.success("Dokument hochgeladen und Verarbeitung gestartet");
      fetchDocuments();
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Upload fehlgeschlagen. Bitte versuchen Sie es erneut.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      event.target.value = "";
    }
  };

  const handleCreateArticle = async () => {
    if (!createArticleDialog.doc) return;

    try {
      const response = await axios.post(
        `${API}/documents/${createArticleDialog.doc.document_id}/create-article`,
        null,
        { params: { title: articleTitle || undefined } }
      );
      toast.success("Artikel erstellt");
      navigate(`/articles/${response.data.article_id}`);
    } catch (error) {
      console.error("Failed to create article:", error);
      toast.error("Artikel konnte nicht erstellt werden");
    }
  };

  const handleDeleteDocument = async () => {
    if (!deleteDialog.doc) return;
    
    try {
      await axios.delete(`${API}/documents/${deleteDialog.doc.document_id}`);
      toast.success("Dokument gelöscht");
      setDocuments(documents.filter(d => d.document_id !== deleteDialog.doc.document_id));
    } catch (error) {
      console.error("Failed to delete:", error);
      toast.error("Dokument konnte nicht gelöscht werden");
    } finally {
      setDeleteDialog({ open: false, doc: null });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="documents-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-['Plus_Jakarta_Sans']">
            Dokumente
          </h1>
          <p className="text-muted-foreground mt-1">
            PDF-Dokumente hochladen und automatisch verarbeiten
          </p>
        </div>
        <Button variant="outline" onClick={fetchDocuments} data-testid="refresh-btn">
          <RefreshCw className="w-4 h-4 mr-2" />
          Aktualisieren
        </Button>
      </div>

      {/* Upload Area */}
      <Card className="border-2 border-dashed">
        <CardContent className="p-8">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mx-auto">
              <Upload className="w-8 h-8 text-indigo-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">PDF-Dokument hochladen</h3>
              <p className="text-muted-foreground text-sm">
                Das Dokument wird automatisch analysiert, zusammengefasst und bei Bedarf übersetzt
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="flex items-center gap-2">
                <Languages className="w-4 h-4 text-muted-foreground" />
                <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                  <SelectTrigger className="w-[180px]" data-testid="language-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="de">Deutsch</SelectItem>
                    <SelectItem value="en">Englisch</SelectItem>
                    <SelectItem value="fr">Französisch</SelectItem>
                    <SelectItem value="es">Spanisch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                  data-testid="file-input"
                />
                <Button 
                  asChild 
                  disabled={uploading}
                  className="bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
                >
                  <span>
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Hochladen...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        PDF auswählen
                      </>
                    )}
                  </span>
                </Button>
              </label>
            </div>

            {uploading && (
              <div className="max-w-md mx-auto">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-sm text-muted-foreground mt-2">{uploadProgress}% hochgeladen</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Hochgeladene Dokumente</h2>
        
        {documents.length > 0 ? (
          <div className="space-y-4">
            {documents.map((doc) => (
              <Card
                key={doc.document_id}
                className="hover:shadow-float transition-all duration-300"
                data-testid={`document-${doc.document_id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <StatusIcon status={doc.status} />
                      <div>
                        <p className="font-semibold">{doc.filename}</p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span>{formatDate(doc.created_at)}</span>
                          {doc.page_count > 0 && <span>{doc.page_count} Seiten</span>}
                          {doc.original_language && (
                            <span>Sprache: {doc.original_language}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={doc.status} />
                      {doc.status === "completed" && (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedDoc(doc)}
                            data-testid={`view-doc-${doc.document_id}`}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Anzeigen
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => {
                              setArticleTitle(doc.filename.replace(".pdf", ""));
                              setCreateArticleDialog({ open: true, doc });
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700"
                            data-testid={`create-article-${doc.document_id}`}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Artikel erstellen
                          </Button>
                        </>
                      )}
                      {doc.status === "failed" && (
                        <p className="text-sm text-red-600 max-w-xs truncate">
                          {doc.error_message}
                        </p>
                      )}
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteDialog({ open: true, doc })}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          data-testid={`delete-doc-${doc.document_id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Keine Dokumente</h3>
              <p className="text-muted-foreground">
                Laden Sie Ihr erstes PDF-Dokument hoch, um es automatisch zu verarbeiten.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Document Preview Dialog */}
      {selectedDoc && (
        <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>{selectedDoc.filename}</DialogTitle>
              <DialogDescription>
                Verarbeitet am {formatDate(selectedDoc.processed_at)}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {selectedDoc.summary && (
                <div>
                  <h4 className="font-semibold mb-2">Zusammenfassung</h4>
                  <p className="text-muted-foreground">{selectedDoc.summary}</p>
                </div>
              )}
              
              {selectedDoc.structured_content?.bulletpoints?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Hauptpunkte</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    {selectedDoc.structured_content.bulletpoints.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {selectedDoc.extracted_text && (
                <div>
                  <h4 className="font-semibold mb-2">Extrahierter Text</h4>
                  <div className="bg-muted p-4 rounded-lg max-h-60 overflow-auto">
                    <pre className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {selectedDoc.extracted_text.substring(0, 3000)}
                      {selectedDoc.extracted_text.length > 3000 && "..."}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Article Dialog */}
      <Dialog 
        open={createArticleDialog.open} 
        onOpenChange={(open) => !open && setCreateArticleDialog({ open: false, doc: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Artikel erstellen</DialogTitle>
            <DialogDescription>
              Erstellen Sie einen Wissensartikel aus dem verarbeiteten Dokument.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="article-title">Artikel-Titel</Label>
              <Input
                id="article-title"
                value={articleTitle}
                onChange={(e) => setArticleTitle(e.target.value)}
                placeholder="Titel eingeben..."
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateArticleDialog({ open: false, doc: null })}>
              Abbrechen
            </Button>
            <Button onClick={handleCreateArticle} className="bg-indigo-600 hover:bg-indigo-700">
              Artikel erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, doc: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dokument löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie das Dokument "{deleteDialog.doc?.filename}" wirklich löschen? 
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDocument} className="bg-red-600 hover:bg-red-700">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Documents;
