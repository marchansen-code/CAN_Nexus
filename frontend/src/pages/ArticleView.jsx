import React, { useState, useEffect, useContext } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
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
  TrendingUp,
  ChevronRight,
  ChevronDown,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

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

// Category Tree Item Component
const CategoryItem = ({ category, categories, articles, selectedCategoryId, onCategoryClick, level = 0 }) => {
  const [isOpen, setIsOpen] = useState(selectedCategoryId === category.category_id);
  const childCategories = categories.filter(c => c.parent_id === category.category_id);
  const categoryArticles = articles.filter(a => a.category_id === category.category_id);
  const hasChildren = childCategories.length > 0 || categoryArticles.length > 0;
  const isSelected = selectedCategoryId === category.category_id;

  return (
    <div className={level > 0 ? "ml-3" : ""}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          onCategoryClick(category.category_id);
        }}
        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors text-left ${
          isSelected ? 'bg-red-50 text-red-700 font-medium' : 'text-foreground'
        }`}
      >
        {hasChildren ? (
          isOpen ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />
        ) : (
          <span className="w-3" />
        )}
        <FolderTree className="w-4 h-4 shrink-0 text-muted-foreground" />
        <span className="truncate flex-1">{category.name}</span>
        {categoryArticles.length > 0 && (
          <span className="text-xs text-muted-foreground">({categoryArticles.length})</span>
        )}
      </button>
      
      {isOpen && hasChildren && (
        <div className="mt-0.5 border-l border-slate-200 ml-2">
          {childCategories.map(child => (
            <CategoryItem
              key={child.category_id}
              category={child}
              categories={categories}
              articles={articles}
              selectedCategoryId={selectedCategoryId}
              onCategoryClick={onCategoryClick}
              level={level + 1}
            />
          ))}
          {categoryArticles.map(article => (
            <Link
              key={article.article_id}
              to={`/articles/${article.article_id}`}
              className="flex items-center gap-2 px-2 py-1.5 ml-3 rounded text-sm hover:bg-muted transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="truncate text-muted-foreground hover:text-foreground">{article.title}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

const ArticleView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [article, setArticle] = useState(null);
  const [category, setCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const [allArticles, setAllArticles] = useState([]);
  const [topArticles, setTopArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeEditors, setActiveEditors] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);

  const canEdit = user?.role === "admin" || user?.role === "editor";

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      // Fetch article, categories, all articles, and top articles in parallel
      const [articleRes, categoriesRes, articlesRes, topRes] = await Promise.all([
        axios.get(`${API}/articles/${id}`),
        axios.get(`${API}/categories`),
        axios.get(`${API}/articles`),
        axios.get(`${API}/articles/top-viewed?limit=10`)
      ]);

      setArticle(articleRes.data);
      setCategories(categoriesRes.data);
      setAllArticles(articlesRes.data);
      setTopArticles(topRes.data);
      setIsFavorite(articleRes.data.favorited_by?.includes(user?.user_id));
      
      if (articleRes.data.category_id) {
        setSelectedCategoryId(articleRes.data.category_id);
        const cat = categoriesRes.data.find(c => c.category_id === articleRes.data.category_id);
        setCategory(cat);
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

  const rootCategories = categories.filter(c => !c.parent_id);

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
    <div className="flex gap-6 animate-fadeIn h-[calc(100vh-7rem)]" data-testid="article-view">
      {/* Main Content - Full Width */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <Button variant="ghost" onClick={() => navigate("/articles")} data-testid="back-btn">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück
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
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg mb-4">
            <Users className="w-4 h-4 text-amber-600" />
            <span className="text-sm text-amber-700">
              Wird gerade von {activeEditors.map(e => e.name).join(', ')} bearbeitet.
            </span>
          </div>
        )}

        {/* Article Content - Scrollable */}
        <ScrollArea className="flex-1">
          <article className="max-w-none pr-4">
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
              <div className="bg-slate-50 border-l-4 border-canusa-red p-4 rounded-r-lg mb-6">
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

            {/* Article Content - Full Width Prose */}
            <div 
              className="prose prose-slate max-w-none prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-h4:text-lg prose-p:leading-7 prose-p:my-3 prose-a:text-red-600 prose-a:no-underline hover:prose-a:underline prose-img:rounded-lg prose-img:shadow-md prose-table:border-collapse prose-td:border prose-td:border-slate-300 prose-td:p-3 prose-th:border prose-th:border-slate-300 prose-th:p-3 prose-th:bg-slate-100 prose-blockquote:border-l-4 prose-blockquote:border-red-500 prose-blockquote:bg-slate-50 prose-blockquote:py-1 prose-blockquote:px-4 prose-ul:my-3 prose-ol:my-3 prose-li:my-1"
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
          </article>
        </ScrollArea>
      </div>

      {/* Right Sidebar - Top Articles & Categories */}
      <aside className="w-72 shrink-0 hidden xl:flex flex-col border-l pl-6">
        {/* Top 10 Articles */}
        <div className="mb-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-canusa-dark-blue mb-3">
            <TrendingUp className="w-4 h-4 text-canusa-red" />
            Top 10 Artikel
          </h3>
          <ScrollArea className="h-56">
            <div className="space-y-1 pr-2">
              {topArticles.map((art, index) => (
                <Link
                  key={art.article_id}
                  to={`/articles/${art.article_id}`}
                  className={`flex items-start gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors ${
                    art.article_id === id ? 'bg-red-50 text-red-700' : ''
                  }`}
                >
                  <span className="shrink-0 w-5 h-5 rounded bg-slate-100 text-xs flex items-center justify-center font-medium text-slate-600">
                    {index + 1}
                  </span>
                  <span className="truncate flex-1">{art.title}</span>
                </Link>
              ))}
              {topArticles.length === 0 && (
                <p className="text-sm text-muted-foreground px-2">Noch keine Artikel</p>
              )}
            </div>
          </ScrollArea>
        </div>

        <Separator className="mb-6" />

        {/* Categories Tree */}
        <div className="flex-1 min-h-0">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-canusa-dark-blue mb-3">
            <FolderTree className="w-4 h-4 text-canusa-red" />
            Kategorien
          </h3>
          <ScrollArea className="h-[calc(100%-2rem)]">
            <div className="space-y-0.5 pr-2">
              {rootCategories.map(cat => (
                <CategoryItem
                  key={cat.category_id}
                  category={cat}
                  categories={categories}
                  articles={allArticles}
                  selectedCategoryId={selectedCategoryId}
                  onCategoryClick={setSelectedCategoryId}
                />
              ))}
              {rootCategories.length === 0 && (
                <p className="text-sm text-muted-foreground px-2">Keine Kategorien</p>
              )}
            </div>
          </ScrollArea>
        </div>
      </aside>
    </div>
  );
};

export default ArticleView;
