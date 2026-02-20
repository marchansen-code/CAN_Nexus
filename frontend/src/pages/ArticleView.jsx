import React, { useState, useEffect, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { API, AuthContext } from "@/App";
import { toast } from "sonner";
import {
  ArrowLeft,
  Edit,
  Star,
  Clock,
  Tag,
  FolderTree,
  User,
  Eye,
  Calendar,
  Share2,
  Users
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

const StatusBadge = ({ status }) => {
  const styles = {
    draft: "status-draft",
    review: "status-review",
    published: "status-published"
  };
  
  const labels = {
    draft: "Entwurf",
    review: "Review",
    published: "Veröffentlicht"
  };

  return (
    <Badge variant="outline" className={`${styles[status]} border`}>
      {labels[status]}
    </Badge>
  );
};

const VisibilityBadge = ({ visibility }) => {
  const config = {
    all: { label: "Alle Mitarbeiter", icon: Users, color: "bg-blue-50 text-blue-700 border-blue-200" },
    editors: { label: "Editoren & Admins", icon: Eye, color: "bg-amber-50 text-amber-700 border-amber-200" },
    admins: { label: "Nur Admins", icon: Eye, color: "bg-red-50 text-red-700 border-red-200" }
  };
  
  const { label, icon: Icon, color } = config[visibility] || config.all;

  return (
    <Badge variant="outline" className={`${color} border gap-1`}>
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
};

const ArticleView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [article, setArticle] = useState(null);
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeEditors, setActiveEditors] = useState([]);

  const canEdit = user?.role === "admin" || user?.role === "editor";

  useEffect(() => {
    fetchArticle();
  }, [id]);

  const fetchArticle = async () => {
    try {
      const response = await axios.get(`${API}/articles/${id}`);
      setArticle(response.data);
      setIsFavorite(response.data.favorited_by?.includes(user?.user_id));
      
      // Mark as viewed
      axios.post(`${API}/articles/${id}/viewed`).catch(() => {});
      
      // Fetch category if exists
      if (response.data.category_id) {
        try {
          const catResponse = await axios.get(`${API}/categories`);
          const cat = catResponse.data.find(c => c.category_id === response.data.category_id);
          setCategory(cat);
        } catch (e) {
          console.error("Failed to fetch category:", e);
        }
      }

      // Get active editors
      try {
        const presenceResponse = await axios.post(`${API}/articles/${id}/presence`);
        setActiveEditors(presenceResponse.data.active_editors || []);
      } catch (e) {
        console.error("Failed to get presence:", e);
      }
    } catch (error) {
      console.error("Failed to fetch article:", error);
      toast.error("Artikel konnte nicht geladen werden");
      navigate("/articles");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    try {
      const response = await axios.post(`${API}/articles/${id}/favorite`);
      setIsFavorite(response.data.favorited);
      toast.success(response.data.message);
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
      toast.error("Fehler beim Aktualisieren der Favoriten");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!article) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn" data-testid="article-view">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/articles")} data-testid="back-btn">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück zur Übersicht
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleToggleFavorite}
            className={isFavorite ? "text-amber-600 border-amber-300 bg-amber-50" : ""}
            data-testid="favorite-btn"
          >
            <Star className={`w-4 h-4 mr-2 ${isFavorite ? "fill-amber-500" : ""}`} />
            {isFavorite ? "Favorit" : "Favorisieren"}
          </Button>
          {canEdit && (
            <Button 
              onClick={() => navigate(`/articles/${id}/edit`)} 
              className="bg-canusa-red hover:bg-red-600"
              data-testid="edit-btn"
            >
              <Edit className="w-4 h-4 mr-2" />
              Bearbeiten
            </Button>
          )}
        </div>
      </div>

      {/* Active Editors Warning */}
      {activeEditors.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
          <Users className="w-5 h-5 text-amber-600" />
          <span className="text-amber-700">
            <strong>Hinweis:</strong> Dieser Artikel wird gerade von {activeEditors.map(e => e.name).join(', ')} bearbeitet.
          </span>
        </div>
      )}

      {/* Article Header */}
      <Card>
        <CardContent className="p-8">
          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <StatusBadge status={article.status} />
            <VisibilityBadge visibility={article.visibility} />
            {category && (
              <Badge variant="outline" className="gap-1">
                <FolderTree className="w-3 h-3" />
                {category.name}
              </Badge>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            {article.title}
          </h1>

          {/* Summary */}
          {article.summary && (
            <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
              {article.summary}
            </p>
          )}

          {/* Author & Date Info */}
          <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Erstellt: {formatDate(article.created_at)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Aktualisiert: {formatDate(article.updated_at)}</span>
            </div>
          </div>

          {/* Tags */}
          {article.tags?.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-6">
              <Tag className="w-4 h-4 text-muted-foreground" />
              {article.tags.map((tag, i) => (
                <Badge key={i} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Article Content */}
      <Card>
        <CardContent className="p-8">
          <div 
            className="prose prose-slate max-w-none prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:leading-7 prose-a:text-red-600 prose-img:rounded-lg prose-table:border-collapse prose-td:border prose-td:border-slate-300 prose-td:p-2 prose-th:border prose-th:border-slate-300 prose-th:p-2 prose-th:bg-slate-100"
            dangerouslySetInnerHTML={{ __html: article.content }}
            data-testid="article-content"
          />
        </CardContent>
      </Card>

      {/* Review Date */}
      {article.review_date && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800">Wiedervorlage</p>
                <p className="text-sm text-amber-700">
                  Dieser Artikel ist zur Überprüfung am {formatDate(article.review_date)} vorgemerkt.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ArticleView;
