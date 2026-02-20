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
  Calendar,
  Users,
  Eye,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const StatusBadge = ({ status }) => {
  const styles = {
    draft: "bg-slate-100 text-slate-700 border-slate-300",
    review: "bg-amber-100 text-amber-700 border-amber-300",
    published: "bg-emerald-100 text-emerald-700 border-emerald-300"
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

const ArticleView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [article, setArticle] = useState(null);
  const [category, setCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const [author, setAuthor] = useState(null);
  const [contactPerson, setContactPerson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeEditors, setActiveEditors] = useState([]);

  const canEdit = user?.role === "admin" || user?.role === "editor";

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [articleRes, categoriesRes, usersRes] = await Promise.all([
        axios.get(`${API}/articles/${id}`),
        axios.get(`${API}/categories`),
        axios.get(`${API}/users`)
      ]);

      setArticle(articleRes.data);
      setCategories(categoriesRes.data);
      setIsFavorite(articleRes.data.favorited_by?.includes(user?.user_id));
      
      // Find category
      if (articleRes.data.category_id) {
        const cat = categoriesRes.data.find(c => c.category_id === articleRes.data.category_id);
        setCategory(cat);
      }

      // Find author
      const articleAuthor = usersRes.data.find(u => u.user_id === articleRes.data.created_by);
      setAuthor(articleAuthor);

      // Find contact person
      if (articleRes.data.contact_person_id) {
        const contact = usersRes.data.find(u => u.user_id === articleRes.data.contact_person_id);
        setContactPerson(contact);
      }

      // Mark as viewed
      axios.post(`${API}/articles/${id}/viewed`).catch(() => {});

      // Get active editors
      try {
        const presenceRes = await axios.post(`${API}/articles/${id}/presence`);
        setActiveEditors(presenceRes.data.active_editors || []);
      } catch (e) {
        console.error("Presence error:", e);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
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

  const getInitials = (name) => {
    return name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";
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
    <div className="animate-fadeIn" data-testid="article-view">
      {/* Navigation Bar */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <Button variant="ghost" onClick={() => navigate("/articles")} data-testid="back-btn">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück zu Artikeln
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleFavorite}
            className={isFavorite ? "text-amber-600 border-amber-300 bg-amber-50" : ""}
            data-testid="favorite-btn"
          >
            <Star className={`w-4 h-4 mr-1.5 ${isFavorite ? "fill-amber-500" : ""}`} />
            {isFavorite ? "Favorit" : "Favorisieren"}
          </Button>
          {canEdit && (
            <Button 
              onClick={() => navigate(`/articles/${id}/edit`)} 
              className="bg-canusa-red hover:bg-red-600"
              data-testid="edit-btn"
            >
              <Edit className="w-4 h-4 mr-1.5" />
              Bearbeiten
            </Button>
          )}
        </div>
      </div>

      {/* Active Editors Warning */}
      {activeEditors.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg mb-6">
          <Users className="w-4 h-4 text-amber-600" />
          <span className="text-sm text-amber-700">
            Wird gerade von {activeEditors.map(e => e.name).join(', ')} bearbeitet.
          </span>
        </div>
      )}

      {/* Article Content - Full Width */}
      <article className="max-w-none">
        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <StatusBadge status={article.status} />
          {category && (
            <Badge variant="outline" className="gap-1 bg-slate-50">
              <FolderTree className="w-3 h-3" />
              {category.name}
            </Badge>
          )}
          {article.view_count > 0 && (
            <Badge variant="outline" className="gap-1 bg-blue-50 text-blue-700 border-blue-200">
              <Eye className="w-3 h-3" />
              {article.view_count} Aufrufe
            </Badge>
          )}
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-canusa-dark-blue mb-4">
          {article.title}
        </h1>

        {/* Summary */}
        {article.summary && (
          <div className="bg-slate-50 dark:bg-slate-900 border-l-4 border-canusa-red p-4 rounded-r-lg mb-6">
            <p className="text-lg text-muted-foreground leading-relaxed">
              {article.summary}
            </p>
          </div>
        )}

        {/* Author & Date Info */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            <span>Erstellt: {formatDate(article.created_at)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>Aktualisiert: {formatDate(article.updated_at)}</span>
          </div>
        </div>

        {/* Tags */}
        {article.tags?.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <Tag className="w-4 h-4 text-muted-foreground" />
            {article.tags.map((tag, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <Separator className="my-6" />

        {/* Article Content */}
        <div 
          className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-h4:text-lg prose-p:leading-7 prose-p:my-3 prose-a:text-red-600 prose-a:no-underline hover:prose-a:underline prose-img:rounded-lg prose-img:shadow-md prose-table:border-collapse prose-td:border prose-td:border-slate-300 prose-td:p-3 prose-th:border prose-th:border-slate-300 prose-th:p-3 prose-th:bg-slate-100 dark:prose-th:bg-slate-800 prose-blockquote:border-l-4 prose-blockquote:border-red-500 prose-blockquote:bg-slate-50 dark:prose-blockquote:bg-slate-900 prose-blockquote:py-1 prose-blockquote:px-4 prose-ul:my-3 prose-ol:my-3 prose-li:my-1"
          dangerouslySetInnerHTML={{ __html: article.content }}
          data-testid="article-content"
        />

        {/* Review Date */}
        {article.review_date && (
          <div className="mt-8 flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
            <Clock className="w-5 h-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-800">Wiedervorlage</p>
              <p className="text-sm text-amber-700">
                Überprüfung am {formatDate(article.review_date)} vorgemerkt.
              </p>
            </div>
          </div>
        )}

        <Separator className="my-8" />

        {/* Author & Contact Person Section */}
        <div className="bg-muted/50 rounded-lg p-6">
          <div className="flex flex-wrap gap-8">
            {/* Author */}
            {author && (
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={author.picture} alt={author.name} />
                  <AvatarFallback className="bg-red-100 text-red-700">
                    {getInitials(author.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Verfasst von</p>
                  <p className="font-medium">{author.name}</p>
                  <p className="text-sm text-muted-foreground">{author.email}</p>
                </div>
              </div>
            )}

            {/* Contact Person */}
            {contactPerson && (
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={contactPerson.picture} alt={contactPerson.name} />
                  <AvatarFallback className="bg-blue-100 text-blue-700">
                    {getInitials(contactPerson.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Ansprechpartner</p>
                  <p className="font-medium">{contactPerson.name}</p>
                  <p className="text-sm text-muted-foreground">{contactPerson.email}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </article>
    </div>
  );
};

export default ArticleView;
