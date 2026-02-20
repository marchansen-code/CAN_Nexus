import React, { useState, useEffect, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { API, AuthContext } from "@/App";
import { toast } from "sonner";
import {
  Plus,
  Search,
  FileText,
  Clock,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  FolderTree,
  TrendingUp,
  Folder,
  FolderOpen
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

// Category Tree Item
const CategoryItem = ({ category, categories, selectedCategoryId, onSelect, expandedCategories, toggleExpand }) => {
  const childCategories = categories.filter(c => c.parent_id === category.category_id);
  const hasChildren = childCategories.length > 0;
  const isExpanded = expandedCategories.has(category.category_id);
  const isSelected = selectedCategoryId === category.category_id;

  return (
    <div>
      <button
        onClick={() => {
          onSelect(category.category_id);
          if (hasChildren) toggleExpand(category.category_id);
        }}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
          isSelected 
            ? 'bg-red-50 text-red-700 font-medium' 
            : 'hover:bg-muted text-foreground'
        }`}
      >
        {hasChildren ? (
          isExpanded ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />
        ) : (
          <span className="w-4" />
        )}
        {isExpanded ? (
          <FolderOpen className="w-4 h-4 shrink-0 text-amber-500" />
        ) : (
          <Folder className="w-4 h-4 shrink-0 text-amber-500" />
        )}
        <span className="truncate flex-1">{category.name}</span>
      </button>
      
      {isExpanded && hasChildren && (
        <div className="ml-4 mt-1 border-l border-slate-200 pl-2">
          {childCategories.map(child => (
            <CategoryItem
              key={child.category_id}
              category={child}
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onSelect={onSelect}
              expandedCategories={expandedCategories}
              toggleExpand={toggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const Articles = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [topArticles, setTopArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [deleteDialog, setDeleteDialog] = useState({ open: false, article: null });

  const canEdit = user?.role === "admin" || user?.role === "editor";

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [articlesRes, categoriesRes, topRes] = await Promise.all([
        axios.get(`${API}/articles`),
        axios.get(`${API}/categories`),
        axios.get(`${API}/articles/top-viewed?limit=10`)
      ]);
      setArticles(articlesRes.data);
      setCategories(categoriesRes.data);
      setTopArticles(topRes.data);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Daten konnten nicht geladen werden");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.article) return;
    
    try {
      await axios.delete(`${API}/articles/${deleteDialog.article.article_id}`);
      toast.success("Artikel gelöscht");
      setArticles(articles.filter(a => a.article_id !== deleteDialog.article.article_id));
    } catch (error) {
      console.error("Failed to delete:", error);
      toast.error("Artikel konnte nicht gelöscht werden");
    } finally {
      setDeleteDialog({ open: false, article: null });
    }
  };

  const toggleExpand = (categoryId) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  // Get filtered articles based on selection
  const filteredArticles = articles.filter(article => {
    const matchesSearch = !searchTerm || 
      article.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategoryId || 
      article.category_id === selectedCategoryId;
    return matchesSearch && matchesCategory;
  });

  // Get subcategories for selected category
  const childCategories = selectedCategoryId 
    ? categories.filter(c => c.parent_id === selectedCategoryId)
    : [];

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.category_id === categoryId);
    return category?.name || "Ohne Kategorie";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
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

  return (
    <div className="space-y-6 animate-fadeIn h-full" data-testid="articles-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Wissensartikel</h1>
          <p className="text-muted-foreground mt-1">Verwalten Sie Ihre Wissensbasis</p>
        </div>
        {canEdit && (
          <Button 
            onClick={() => navigate("/articles/new")} 
            className="bg-canusa-red hover:bg-red-600"
            data-testid="create-article-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Neuer Artikel
          </Button>
        )}
      </div>

      {/* Top 10 Articles */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-canusa-red" />
            Top 10 - Meistgesehene Artikel
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {topArticles.map((article, index) => (
              <Link
                key={article.article_id}
                to={`/articles/${article.article_id}`}
                className="shrink-0 flex items-center gap-2 px-3 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
              >
                <span className="w-6 h-6 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </span>
                <span className="text-sm font-medium max-w-[200px] truncate">{article.title}</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {article.view_count || 0}
                </span>
              </Link>
            ))}
            {topArticles.length === 0 && (
              <p className="text-sm text-muted-foreground">Noch keine Artikel</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Split Layout */}
      <div className="flex gap-6 h-[calc(100vh-22rem)]">
        {/* Left: Categories Tree */}
        <Card className="w-72 shrink-0 flex flex-col">
          <CardHeader className="py-3 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <FolderTree className="w-5 h-5 text-amber-500" />
              Kategorien
            </CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-1">
              <button
                onClick={() => setSelectedCategoryId(null)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                  selectedCategoryId === null 
                    ? 'bg-red-50 text-red-700 font-medium' 
                    : 'hover:bg-muted text-foreground'
                }`}
              >
                <FileText className="w-4 h-4" />
                Alle Artikel
              </button>
              <Separator className="my-2" />
              {rootCategories.map(cat => (
                <CategoryItem
                  key={cat.category_id}
                  category={cat}
                  categories={categories}
                  selectedCategoryId={selectedCategoryId}
                  onSelect={setSelectedCategoryId}
                  expandedCategories={expandedCategories}
                  toggleExpand={toggleExpand}
                />
              ))}
              {rootCategories.length === 0 && (
                <p className="text-sm text-muted-foreground px-3">Keine Kategorien</p>
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Right: Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Artikel suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="search-articles-input"
              />
            </div>
          </div>

          {/* Current Location */}
          {selectedCategoryId && (
            <div className="mb-4 flex items-center gap-2 text-sm">
              <button 
                onClick={() => setSelectedCategoryId(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                Alle
              </button>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{getCategoryName(selectedCategoryId)}</span>
            </div>
          )}

          {/* Subcategories (if any) */}
          {childCategories.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {childCategories.map(cat => (
                <button
                  key={cat.category_id}
                  onClick={() => setSelectedCategoryId(cat.category_id)}
                  className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors text-sm"
                >
                  <Folder className="w-4 h-4 text-amber-500" />
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* Articles List */}
          <ScrollArea className="flex-1">
            {filteredArticles.length > 0 ? (
              <div className="space-y-3 pr-2">
                {filteredArticles.map((article) => (
                  <Card
                    key={article.article_id}
                    className="hover:shadow-md transition-all duration-200"
                    data-testid={`article-card-${article.article_id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div 
                          className="flex-1 cursor-pointer min-w-0"
                          onClick={() => navigate(`/articles/${article.article_id}`)}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                            <h3 className="font-semibold truncate">{article.title}</h3>
                            <StatusBadge status={article.status} />
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(article.updated_at)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {article.view_count || 0}
                            </span>
                            {!selectedCategoryId && article.category_id && (
                              <span className="truncate max-w-[150px]">{getCategoryName(article.category_id)}</span>
                            )}
                          </div>
                        </div>
                        {canEdit && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`article-menu-${article.article_id}`}>
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/articles/${article.article_id}`)}>
                                <Eye className="w-4 h-4 mr-2" />
                                Anzeigen
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/articles/${article.article_id}/edit`)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Bearbeiten
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => setDeleteDialog({ open: true, article })}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Löschen
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="p-12 text-center">
                  <FileText className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Keine Artikel gefunden</h3>
                  <p className="text-muted-foreground mb-6">
                    {searchTerm || selectedCategoryId
                      ? "Versuchen Sie andere Suchkriterien"
                      : "Erstellen Sie Ihren ersten Wissensartikel"}
                  </p>
                  {canEdit && (
                    <Button onClick={() => navigate("/articles/new")}>
                      <Plus className="w-4 h-4 mr-2" />
                      Artikel erstellen
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, article: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Artikel löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie den Artikel "{deleteDialog.article?.title}" wirklich löschen? 
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Articles;
