import React, { useState, useEffect, useCallback, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { API, AuthContext } from "@/App";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Eye,
  Send,
  Clock,
  Tag,
  Upload,
  FileText,
  Loader2,
  Star,
  Users,
  Shield,
  Plus,
  ChevronRight,
  FolderTree,
  Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import RichTextEditor from "@/components/RichTextEditor";

// Hierarchical Category Selector
const CategoryTree = ({ categories, selectedId, onSelect, parentId = null, level = 0 }) => {
  const children = categories.filter(c => c.parent_id === parentId);
  
  if (children.length === 0) return null;
  
  return (
    <div className={level > 0 ? "ml-4 border-l pl-2" : ""}>
      {children.map((cat) => {
        const hasChildren = categories.some(c => c.parent_id === cat.category_id);
        const isSelected = selectedId === cat.category_id;
        
        return (
          <div key={cat.category_id}>
            <button
              type="button"
              onClick={() => onSelect(cat.category_id)}
              className={`w-full text-left px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors flex items-center gap-2 ${
                isSelected ? 'bg-red-50 text-red-700 font-medium' : ''
              }`}
            >
              <FolderTree className="w-4 h-4 shrink-0" />
              <span className="truncate">{cat.name}</span>
            </button>
            <CategoryTree
              categories={categories}
              selectedId={selectedId}
              onSelect={onSelect}
              parentId={cat.category_id}
              level={level + 1}
            />
          </div>
        );
      })}
    </div>
  );
};

const ArticleEditor = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  // Check if this is an edit route (/articles/:id/edit) or new
  const isEdit = window.location.pathname.includes('/edit');
  const articleId = isEdit ? id : (id === "new" ? null : id);
  const isNew = !articleId;

  const [article, setArticle] = useState({
    title: "",
    content: "",
    summary: "",
    category_id: "",
    status: "draft",
    visibility: "all",
    tags: [],
    review_date: null,
    favorited_by: [],
    contact_person_id: ""
  });
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [pdfDialog, setPdfDialog] = useState({ open: false, preview: null });
  const [categoryDialog, setCategoryDialog] = useState({ open: false });
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryParent, setNewCategoryParent] = useState(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [activeEditors, setActiveEditors] = useState([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  // Presence heartbeat
  useEffect(() => {
    if (isNew || !articleId) return;

    const updatePresence = async () => {
      try {
        const response = await axios.post(`${API}/articles/${articleId}/presence`);
        setActiveEditors(response.data.active_editors || []);
      } catch (error) {
        console.error("Presence update failed:", error);
      }
    };

    // Initial presence
    updatePresence();

    // Heartbeat every 10 seconds
    const interval = setInterval(updatePresence, 10000);

    // Cleanup on unmount
    return () => {
      clearInterval(interval);
      axios.delete(`${API}/articles/${articleId}/presence`).catch(() => {});
    };
  }, [articleId, isNew]);

  useEffect(() => {
    fetchCategories();
    if (!isNew && articleId) {
      fetchArticle();
    }
  }, [articleId]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const fetchArticle = async () => {
    try {
      const response = await axios.get(`${API}/articles/${articleId}`);
      setArticle({
        ...response.data,
        review_date: response.data.review_date ? new Date(response.data.review_date) : null
      });
      setIsFavorite(response.data.favorited_by?.includes(user?.user_id));
      
      // Mark as viewed
      axios.post(`${API}/articles/${articleId}/viewed`).catch(() => {});
    } catch (error) {
      console.error("Failed to fetch article:", error);
      toast.error("Artikel konnte nicht geladen werden");
      navigate("/articles");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!article.content || article.content.length < 50) {
      toast.error("Bitte fügen Sie zuerst mehr Inhalt hinzu");
      return;
    }

    setGeneratingSummary(true);
    try {
      const response = await axios.post(`${API}/articles/generate-summary`, {
        content: article.content
      });
      if (response.data.summary) {
        setArticle(prev => ({ ...prev, summary: response.data.summary }));
        toast.success("Zusammenfassung erstellt");
      } else {
        toast.error("Zusammenfassung konnte nicht erstellt werden");
      }
    } catch (error) {
      console.error("Failed to generate summary:", error);
      toast.error("Fehler bei der Zusammenfassungserstellung");
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleSave = async (newStatus) => {
    if (!article.title.trim()) {
      toast.error("Bitte geben Sie einen Titel ein");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...article,
        status: newStatus || article.status,
        review_date: article.review_date?.toISOString() || null
      };

      if (isNew) {
        const response = await axios.post(`${API}/articles`, payload);
        toast.success("Artikel erstellt");
        navigate(`/articles/${response.data.article_id}`);
      } else {
        await axios.put(`${API}/articles/${articleId}`, payload);
        toast.success("Artikel gespeichert");
        setArticle(prev => ({ ...prev, status: newStatus || prev.status }));
      }
    } catch (error) {
      console.error("Failed to save:", error);
      toast.error("Artikel konnte nicht gespeichert werden");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (isNew) return;
    
    try {
      const response = await axios.post(`${API}/articles/${articleId}/favorite`);
      setIsFavorite(response.data.favorited);
      toast.success(response.data.message);
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
      toast.error("Fehler beim Aktualisieren der Favoriten");
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !article.tags.includes(tagInput.trim())) {
      setArticle(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag) => {
    setArticle(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error("Bitte geben Sie einen Namen ein");
      return;
    }

    try {
      const response = await axios.post(`${API}/categories`, {
        name: newCategoryName.trim(),
        parent_id: newCategoryParent === "none" ? null : newCategoryParent
      });
      toast.success("Kategorie erstellt");
      fetchCategories();
      setArticle(prev => ({ ...prev, category_id: response.data.category_id }));
      setCategoryDialog({ open: false });
      setNewCategoryName("");
      setNewCategoryParent(null);
    } catch (error) {
      console.error("Failed to create category:", error);
      toast.error("Kategorie konnte nicht erstellt werden");
    }
  };

  const handlePdfUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error("Bitte laden Sie nur PDF-Dateien hoch");
      return;
    }

    setUploadingPdf(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("target_language", "de");

    try {
      const response = await axios.post(`${API}/documents/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      toast.success("PDF wird verarbeitet...");
      
      const checkStatus = async () => {
        const docResponse = await axios.get(`${API}/documents/${response.data.document_id}`);
        if (docResponse.data.status === "completed") {
          // Show preview dialog instead of directly inserting
          setPdfDialog({ open: true, preview: docResponse.data });
          setUploadingPdf(false);
        } else if (docResponse.data.status === "failed") {
          toast.error("PDF-Verarbeitung fehlgeschlagen: " + (docResponse.data.error_message || ""));
          setUploadingPdf(false);
        } else {
          setTimeout(checkStatus, 2000);
        }
      };
      
      setTimeout(checkStatus, 2000);
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Upload fehlgeschlagen");
      setUploadingPdf(false);
    }
    
    event.target.value = "";
  };

  const insertPdfContent = (doc, includeSummary = false) => {
    let htmlContent = "";
    
    // Add headlines as structure
    if (doc.structured_content?.headlines?.length > 0) {
      doc.structured_content.headlines.forEach(headline => {
        htmlContent += `<h3>${headline}</h3>`;
      });
    }
    
    // Add bullet points
    if (doc.structured_content?.bulletpoints?.length > 0) {
      htmlContent += `<h2>Hauptpunkte</h2><ul>`;
      doc.structured_content.bulletpoints.forEach(point => {
        htmlContent += `<li>${point}</li>`;
      });
      htmlContent += `</ul>`;
    }
    
    // Add tables
    if (doc.structured_content?.tables?.length > 0) {
      doc.structured_content.tables.forEach(table => {
        htmlContent += table.html;
      });
    }
    
    // Add extracted text
    if (doc.extracted_text) {
      const paragraphs = doc.extracted_text.split('\n\n');
      paragraphs.forEach(p => {
        const trimmed = p.trim();
        if (trimmed && !trimmed.startsWith('---')) {
          htmlContent += `<p>${trimmed}</p>`;
        }
      });
    }
    
    // Update article - summary goes to separate field
    setArticle(prev => ({
      ...prev,
      content: prev.content + htmlContent,
      title: prev.title || doc.filename.replace(".pdf", ""),
      summary: includeSummary && doc.summary ? doc.summary : prev.summary
    }));
    
    toast.success("PDF-Inhalt eingefügt");
    setPdfDialog({ open: false, preview: null });
  };

  const getCategoryName = (categoryId) => {
    const cat = categories.find(c => c.category_id === categoryId);
    return cat?.name || "Keine Kategorie";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn" data-testid="article-editor">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/articles")} data-testid="back-btn">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück
          </Button>
          
          {/* Active Editors Indicator */}
          {activeEditors.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
              <Users className="w-4 h-4 text-amber-600" />
              <span className="text-sm text-amber-700">Weitere Bearbeiter:</span>
              <div className="flex -space-x-2">
                {activeEditors.map((editor, i) => (
                  <Avatar key={i} className="w-6 h-6 border-2 border-white">
                    <AvatarImage src={editor.picture} alt={editor.name} />
                    <AvatarFallback className="text-xs bg-amber-100">
                      {editor.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <span className="text-sm font-medium text-amber-800">
                {activeEditors.map(e => e.name.split(' ')[0]).join(', ')}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex gap-2">
          {!isNew && (
            <Button
              variant="outline"
              onClick={handleToggleFavorite}
              className={isFavorite ? "text-amber-600 border-amber-300 bg-amber-50" : ""}
              data-testid="favorite-btn"
            >
              <Star className={`w-4 h-4 mr-2 ${isFavorite ? "fill-amber-500" : ""}`} />
              {isFavorite ? "Favorit" : "Favorisieren"}
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={() => setPdfDialog({ open: true })}
            data-testid="import-pdf-btn"
          >
            <Upload className="w-4 h-4 mr-2" />
            PDF importieren
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleSave()} 
            disabled={saving}
            data-testid="save-draft-btn"
          >
            <Save className="w-4 h-4 mr-2" />
            Speichern
          </Button>
          {article.status === "draft" && (
            <Button 
              variant="outline"
              onClick={() => handleSave("review")} 
              disabled={saving}
              data-testid="submit-review-btn"
            >
              <Eye className="w-4 h-4 mr-2" />
              Zur Review
            </Button>
          )}
          {article.status === "review" && (
            <Button 
              onClick={() => handleSave("published")} 
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700"
              data-testid="publish-btn"
            >
              <Send className="w-4 h-4 mr-2" />
              Veröffentlichen
            </Button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Main Editor */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardContent className="p-6 space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Titel *</Label>
                <Input
                  id="title"
                  value={article.title}
                  onChange={(e) => setArticle(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Artikel-Titel eingeben..."
                  className="text-lg font-semibold"
                  data-testid="article-title-input"
                />
              </div>

              {/* Summary */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="summary">Zusammenfassung</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateSummary}
                    disabled={generatingSummary || !article.content}
                    className="h-7 text-xs"
                  >
                    {generatingSummary ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Generiere...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 mr-1" />
                        Automatisch erstellen
                      </>
                    )}
                  </Button>
                </div>
                <Input
                  id="summary"
                  value={article.summary || ""}
                  onChange={(e) => setArticle(prev => ({ ...prev, summary: e.target.value }))}
                  placeholder="Kurze Zusammenfassung des Artikels..."
                  data-testid="article-summary-input"
                />
              </div>

              {/* Rich Text Editor */}
              <div className="space-y-2">
                <Label>Inhalt</Label>
                <RichTextEditor
                  content={article.content}
                  onChange={(html) => setArticle(prev => ({ ...prev, content: html }))}
                  placeholder="Artikelinhalt eingeben... Nutzen Sie die Werkzeugleiste für Formatierungen, Tabellen und Bilder."
                  data-testid="article-content-editor"
                />
                <p className="text-xs text-muted-foreground">
                  Tipp: Sie können Inhalte aus anderen Quellen (Word, Web) direkt einfügen - die Formatierung wird übernommen.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Select 
                value={article.status} 
                onValueChange={(value) => setArticle(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger data-testid="status-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-500" />
                      Entwurf
                    </div>
                  </SelectItem>
                  <SelectItem value="review">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Review
                    </div>
                  </SelectItem>
                  <SelectItem value="published">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Veröffentlicht
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Visibility */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Sichtbarkeit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select 
                value={article.visibility || "all"} 
                onValueChange={(value) => setArticle(prev => ({ ...prev, visibility: value }))}
              >
                <SelectTrigger data-testid="visibility-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Alle Mitarbeiter
                    </div>
                  </SelectItem>
                  <SelectItem value="editors">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Nur Editoren & Admins
                    </div>
                  </SelectItem>
                  <SelectItem value="admins">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Nur Administratoren
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Category - Hierarchical */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FolderTree className="w-4 h-4" />
                  Kategorie
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 px-2"
                  onClick={() => setCategoryDialog({ open: true })}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between" data-testid="category-select">
                    <span className="truncate">{getCategoryName(article.category_id)}</span>
                    <ChevronRight className="w-4 h-4 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2" align="start">
                  <div className="max-h-64 overflow-auto">
                    <button
                      onClick={() => setArticle(prev => ({ ...prev, category_id: null }))}
                      className={`w-full text-left px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors ${
                        !article.category_id ? 'bg-red-50 text-red-700 font-medium' : ''
                      }`}
                    >
                      Keine Kategorie
                    </button>
                    <CategoryTree
                      categories={categories}
                      selectedId={article.category_id}
                      onSelect={(id) => setArticle(prev => ({ ...prev, category_id: id }))}
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Tags
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Tag hinzufügen..."
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                  data-testid="tag-input"
                />
                <Button variant="outline" size="icon" onClick={handleAddTag}>
                  +
                </Button>
              </div>
              {article.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {article.tags.map((tag, i) => (
                    <Badge 
                      key={i} 
                      variant="secondary"
                      className="cursor-pointer hover:bg-red-100"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Review Date */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Wiedervorlage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start" data-testid="review-date-btn">
                    {article.review_date 
                      ? format(article.review_date, "dd.MM.yyyy", { locale: de })
                      : "Datum wählen..."
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={article.review_date}
                    onSelect={(date) => setArticle(prev => ({ ...prev, review_date: date }))}
                    locale={de}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {article.review_date && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full mt-2 text-muted-foreground"
                  onClick={() => setArticle(prev => ({ ...prev, review_date: null }))}
                >
                  Datum entfernen
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* PDF Import Dialog */}
      <Dialog open={pdfDialog.open} onOpenChange={(open) => setPdfDialog({ open, preview: null })}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {pdfDialog.preview ? `PDF Vorschau: ${pdfDialog.preview.filename}` : "PDF importieren"}
            </DialogTitle>
            <DialogDescription>
              {pdfDialog.preview 
                ? "Überprüfen Sie die extrahierten Inhalte und übernehmen Sie sie in den Artikel."
                : "Laden Sie ein PDF hoch. Inhalt, Tabellen und Struktur werden automatisch extrahiert."
              }
            </DialogDescription>
          </DialogHeader>
          
          {!pdfDialog.preview ? (
            // Upload View
            <div className="space-y-6">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="font-medium mb-2">PDF hochladen</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Das PDF wird analysiert und Inhalt, Tabellen und Struktur werden extrahiert.
                </p>
                <label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handlePdfUpload}
                    className="hidden"
                    disabled={uploadingPdf}
                  />
                  <Button asChild disabled={uploadingPdf}>
                    <span>
                      {uploadingPdf ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Wird verarbeitet...
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
            </div>
          ) : (
            // Preview View
            <div className="flex-1 overflow-auto space-y-4">
              {/* Summary Section - Separate */}
              {pdfDialog.preview.summary && (
                <div className="bg-gradient-to-r from-red-50 to-amber-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-canusa-dark-blue flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-canusa-red" />
                      KI-Zusammenfassung
                    </h4>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setArticle(prev => ({ ...prev, summary: pdfDialog.preview.summary }));
                        toast.success("Zusammenfassung übernommen");
                      }}
                      className="h-7 text-xs"
                    >
                      In Zusammenfassungsfeld übernehmen
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {pdfDialog.preview.summary}
                  </p>
                </div>
              )}

              {/* Document Info */}
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>{pdfDialog.preview.page_count} Seiten</span>
                <span>Sprache: {pdfDialog.preview.original_language || "Deutsch"}</span>
                {pdfDialog.preview.structured_content?.tables?.length > 0 && (
                  <span>{pdfDialog.preview.structured_content.tables.length} Tabelle(n)</span>
                )}
              </div>

              {/* Headlines Preview */}
              {pdfDialog.preview.structured_content?.headlines?.length > 0 && (
                <div className="border rounded-lg p-3">
                  <h4 className="font-medium text-sm mb-2">Erkannte Überschriften</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {pdfDialog.preview.structured_content.headlines.slice(0, 5).map((h, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <ChevronRight className="w-3 h-3" />
                        {h}
                      </li>
                    ))}
                    {pdfDialog.preview.structured_content.headlines.length > 5 && (
                      <li className="text-xs">... und {pdfDialog.preview.structured_content.headlines.length - 5} weitere</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Bullet Points Preview */}
              {pdfDialog.preview.structured_content?.bulletpoints?.length > 0 && (
                <div className="border rounded-lg p-3">
                  <h4 className="font-medium text-sm mb-2">Hauptpunkte</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    {pdfDialog.preview.structured_content.bulletpoints.slice(0, 5).map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                    {pdfDialog.preview.structured_content.bulletpoints.length > 5 && (
                      <li className="text-xs list-none">... und {pdfDialog.preview.structured_content.bulletpoints.length - 5} weitere</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Tables Preview */}
              {pdfDialog.preview.structured_content?.tables?.length > 0 && (
                <div className="border rounded-lg p-3">
                  <h4 className="font-medium text-sm mb-2">Tabellen</h4>
                  <p className="text-sm text-muted-foreground">
                    {pdfDialog.preview.structured_content.tables.length} Tabelle(n) werden übernommen
                  </p>
                </div>
              )}

              {/* Text Preview */}
              {pdfDialog.preview.extracted_text && (
                <div className="border rounded-lg p-3">
                  <h4 className="font-medium text-sm mb-2">Textvorschau</h4>
                  <p className="text-sm text-muted-foreground line-clamp-4">
                    {pdfDialog.preview.extracted_text.substring(0, 500)}...
                  </p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter className="mt-4">
            {pdfDialog.preview ? (
              <>
                <Button variant="outline" onClick={() => setPdfDialog({ open: true, preview: null })}>
                  Anderes PDF
                </Button>
                <Button 
                  onClick={() => insertPdfContent(pdfDialog.preview, false)}
                  className="bg-canusa-red hover:bg-red-600"
                >
                  Inhalt übernehmen
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setPdfDialog({ open: false, preview: null })}>
                Abbrechen
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Category Dialog */}
      <Dialog open={categoryDialog.open} onOpenChange={(open) => setCategoryDialog({ open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neue Kategorie erstellen</DialogTitle>
            <DialogDescription>
              Erstellen Sie eine neue Kategorie für Ihre Wissensartikel.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Kategoriename..."
              />
            </div>
            <div className="space-y-2">
              <Label>Übergeordnete Kategorie</Label>
              <Select value={newCategoryParent || "none"} onValueChange={setNewCategoryParent}>
                <SelectTrigger>
                  <SelectValue placeholder="Keine (Root-Kategorie)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Keine (Root-Kategorie)</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.category_id} value={cat.category_id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialog({ open: false })}>
              Abbrechen
            </Button>
            <Button onClick={handleCreateCategory} className="bg-canusa-red hover:bg-red-600">
              Erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ArticleEditor;
