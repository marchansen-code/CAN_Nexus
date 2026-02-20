import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Eye,
  Send,
  Clock,
  Tag
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { format } from "date-fns";
import { de } from "date-fns/locale";

const ArticleEditor = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isNew = !id || id === "new";

  const [article, setArticle] = useState({
    title: "",
    content: "",
    summary: "",
    category_id: "",
    status: "draft",
    tags: [],
    review_date: null
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    fetchCategories();
    if (!isNew) {
      fetchArticle();
    }
  }, [id]);

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
      const response = await axios.get(`${API}/articles/${id}`);
      setArticle({
        ...response.data,
        review_date: response.data.review_date ? new Date(response.data.review_date) : null
      });
    } catch (error) {
      console.error("Failed to fetch article:", error);
      toast.error("Artikel konnte nicht geladen werden");
      navigate("/articles");
    } finally {
      setLoading(false);
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
        await axios.put(`${API}/articles/${id}`, payload);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn" data-testid="article-editor">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/articles")} data-testid="back-btn">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück
        </Button>
        <div className="flex gap-2">
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

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Editor */}
        <div className="lg:col-span-2 space-y-6">
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
                <Label htmlFor="summary">Zusammenfassung</Label>
                <Textarea
                  id="summary"
                  value={article.summary || ""}
                  onChange={(e) => setArticle(prev => ({ ...prev, summary: e.target.value }))}
                  placeholder="Kurze Zusammenfassung des Artikels..."
                  rows={3}
                  data-testid="article-summary-input"
                />
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label htmlFor="content">Inhalt</Label>
                <Textarea
                  id="content"
                  value={article.content}
                  onChange={(e) => setArticle(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Artikelinhalt eingeben... (Markdown wird unterstützt)"
                  rows={20}
                  className="font-mono text-sm"
                  data-testid="article-content-input"
                />
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

          {/* Category */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Kategorie</CardTitle>
            </CardHeader>
            <CardContent>
              <Select 
                value={article.category_id || "none"} 
                onValueChange={(value) => setArticle(prev => ({ 
                  ...prev, 
                  category_id: value === "none" ? null : value 
                }))}
              >
                <SelectTrigger data-testid="category-select">
                  <SelectValue placeholder="Kategorie wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Keine Kategorie</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.category_id} value={cat.category_id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
    </div>
  );
};

export default ArticleEditor;
