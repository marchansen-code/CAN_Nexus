import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API, AuthContext } from "@/App";
import { toast } from "sonner";
import {
  FileText,
  Upload,
  FolderTree,
  Search,
  TrendingUp,
  Clock,
  ChevronRight,
  Plus,
  Eye,
  Star,
  User,
  History
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const StatCard = ({ title, value, icon: Icon, trend, color }) => (
  <Card className="hover:shadow-float transition-all duration-300">
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
          {trend && (
            <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {trend}
            </p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </CardContent>
  </Card>
);

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

const ArticleCard = ({ article, onClick }) => {
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };

  return (
    <div
      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="space-y-1 min-w-0 flex-1">
        <p className="font-medium truncate">{article.title}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          {formatDate(article.updated_at)}
        </div>
      </div>
      <StatusBadge status={article.status} />
    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${API}/stats`);
        setStats(response.data);
      } catch (error) {
        console.error("Failed to fetch stats:", error);
        toast.error("Statistiken konnten nicht geladen werden");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn" data-testid="dashboard">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Willkommen, {user?.name?.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground mt-1">
            Hier ist eine Übersicht Ihrer Wissensdatenbank
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate("/documents")} data-testid="upload-doc-btn">
            <Upload className="w-4 h-4 mr-2" />
            PDF hochladen
          </Button>
          <Button onClick={() => navigate("/articles/new")} className="bg-canusa-red hover:bg-red-600" data-testid="new-article-btn">
            <Plus className="w-4 h-4 mr-2" />
            Neuer Artikel
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Artikel gesamt"
          value={stats?.total_articles || 0}
          icon={FileText}
          color="bg-red-100 text-red-600"
        />
        <StatCard
          title="Veröffentlicht"
          value={stats?.published_articles || 0}
          icon={Eye}
          color="bg-emerald-100 text-emerald-600"
        />
        <StatCard
          title="Kategorien"
          value={stats?.total_categories || 0}
          icon={FolderTree}
          color="bg-amber-100 text-amber-600"
        />
        <StatCard
          title="Dokumente"
          value={stats?.total_documents || 0}
          trend={stats?.pending_documents > 0 ? `${stats.pending_documents} in Verarbeitung` : undefined}
          icon={Upload}
          color="bg-slate-100 text-slate-600"
        />
      </div>

      {/* User Stats Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="w-5 h-5" />
            Ihre Statistik
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <Avatar className="w-16 h-16">
              <AvatarImage src={user?.picture} alt={user?.name} />
              <AvatarFallback className="bg-red-100 text-red-700 text-xl">
                {user?.name?.split(" ").map(n => n[0]).join("").slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-3xl font-bold">{stats?.user_stats?.articles_created || 0}</p>
                <p className="text-sm text-muted-foreground">Artikel erstellt</p>
              </div>
              <div>
                <p className="text-3xl font-bold">{stats?.user_stats?.documents_uploaded || 0}</p>
                <p className="text-sm text-muted-foreground">PDFs hochgeladen</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Favorites */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              Favoriten
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.favorite_articles?.length > 0 ? (
              <div className="space-y-2">
                {stats.favorite_articles.slice(0, 5).map((article) => (
                  <ArticleCard
                    key={article.article_id}
                    article={article}
                    onClick={() => navigate(`/articles/${article.article_id}`)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Star className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Keine Favoriten</p>
                <p className="text-xs">Markieren Sie Artikel mit ⭐</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recently Viewed */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="w-5 h-5 text-blue-500" />
              Zuletzt angesehen
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.recently_viewed?.length > 0 ? (
              <div className="space-y-2">
                {stats.recently_viewed.slice(0, 5).map((article) => (
                  <ArticleCard
                    key={article.article_id}
                    article={article}
                    onClick={() => navigate(`/articles/${article.article_id}`)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <History className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Keine Ansichten</p>
                <p className="text-xs">Öffnen Sie Artikel zum Anzeigen</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Schnellzugriff</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-4"
              onClick={() => navigate("/search")}
              data-testid="quick-search-btn"
            >
              <Search className="w-5 h-5 mr-3 text-red-500" />
              <div className="text-left">
                <p className="font-medium">KI-Suche</p>
                <p className="text-xs text-muted-foreground">Fragen an die Wissensdatenbank</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-4"
              onClick={() => navigate("/documents")}
              data-testid="quick-upload-btn"
            >
              <Upload className="w-5 h-5 mr-3 text-emerald-500" />
              <div className="text-left">
                <p className="font-medium">PDF importieren</p>
                <p className="text-xs text-muted-foreground">Dokumente automatisch verarbeiten</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-4"
              onClick={() => navigate("/categories")}
              data-testid="quick-categories-btn"
            >
              <FolderTree className="w-5 h-5 mr-3 text-amber-500" />
              <div className="text-left">
                <p className="font-medium">Kategorien</p>
                <p className="text-xs text-muted-foreground">Struktur verwalten</p>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Articles */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Neueste Artikel</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate("/articles")} data-testid="view-all-articles-btn">
            Alle anzeigen
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {stats?.recent_articles?.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.recent_articles.map((article) => (
                <ArticleCard
                  key={article.article_id}
                  article={article}
                  onClick={() => navigate(`/articles/${article.article_id}`)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">Noch keine Artikel vorhanden</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => navigate("/articles/new")}
              >
                Ersten Artikel erstellen
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Workflow Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Workflow-Übersicht</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Entwürfe</span>
                <span className="text-2xl font-bold text-slate-900">{stats?.draft_articles || 0}</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full">
                <div 
                  className="h-2 bg-slate-500 rounded-full transition-all"
                  style={{ width: `${stats?.total_articles ? (stats.draft_articles / stats.total_articles) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-amber-700">In Review</span>
                <span className="text-2xl font-bold text-amber-900">{stats?.review_articles || 0}</span>
              </div>
              <div className="h-2 bg-amber-200 rounded-full">
                <div 
                  className="h-2 bg-amber-500 rounded-full transition-all"
                  style={{ width: `${stats?.total_articles ? (stats.review_articles / stats.total_articles) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-emerald-700">Veröffentlicht</span>
                <span className="text-2xl font-bold text-emerald-900">{stats?.published_articles || 0}</span>
              </div>
              <div className="h-2 bg-emerald-200 rounded-full">
                <div 
                  className="h-2 bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${stats?.total_articles ? (stats.published_articles / stats.total_articles) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
