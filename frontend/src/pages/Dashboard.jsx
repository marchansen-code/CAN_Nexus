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
  Eye
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const StatCard = ({ title, value, icon: Icon, trend, color }) => (
  <Card className="hover:shadow-float transition-all duration-300">
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-3xl font-bold mt-2 font-['Plus_Jakarta_Sans']">{value}</p>
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
    <div className="space-y-8 animate-fadeIn" data-testid="dashboard">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-['Plus_Jakarta_Sans']">
            Willkommen zurück, {user?.name?.split(" ")[0]}
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
          <Button onClick={() => navigate("/articles/new")} className="bg-indigo-600 hover:bg-indigo-700" data-testid="new-article-btn">
            <Plus className="w-4 h-4 mr-2" />
            Neuer Artikel
          </Button>
        </div>
      </div>

      {/* Stats Grid - Bento Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Artikel gesamt"
          value={stats?.total_articles || 0}
          icon={FileText}
          color="bg-indigo-100 text-indigo-600"
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
          icon={Upload}
          trend={stats?.pending_documents > 0 ? `${stats.pending_documents} in Verarbeitung` : undefined}
          color="bg-slate-100 text-slate-600"
        />
      </div>

      {/* Quick Actions + Recent Articles */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg font-['Plus_Jakarta_Sans']">Schnellzugriff</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-4"
              onClick={() => navigate("/search")}
              data-testid="quick-search-btn"
            >
              <Search className="w-5 h-5 mr-3 text-indigo-500" />
              <div className="text-left">
                <p className="font-medium">KI-Suche</p>
                <p className="text-xs text-muted-foreground">Stellen Sie Fragen an Ihre Wissensdatenbank</p>
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
                <p className="font-medium">Kategorien verwalten</p>
                <p className="text-xs text-muted-foreground">Struktur Ihrer Wissensbasis</p>
              </div>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Articles */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-['Plus_Jakarta_Sans']">Neueste Artikel</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/articles")} data-testid="view-all-articles-btn">
              Alle anzeigen
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {stats?.recent_articles?.length > 0 ? (
              <div className="space-y-4">
                {stats.recent_articles.map((article) => (
                  <div
                    key={article.article_id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/articles/${article.article_id}`)}
                    data-testid={`article-${article.article_id}`}
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{article.title}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(article.updated_at)}
                        </span>
                        <StatusBadge status={article.status} />
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
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
      </div>

      {/* Workflow Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-['Plus_Jakarta_Sans']">Workflow-Übersicht</CardTitle>
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
