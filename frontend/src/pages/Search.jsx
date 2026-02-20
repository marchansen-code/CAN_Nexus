import React, { useState } from "react";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import {
  Search as SearchIcon,
  Brain,
  FileText,
  ExternalLink,
  Loader2,
  Sparkles
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

const Search = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await axios.post(`${API}/search`, {
        query: query.trim(),
        top_k: 5
      });
      setResult(response.data);
    } catch (error) {
      console.error("Search failed:", error);
      toast.error("Suche fehlgeschlagen. Bitte versuchen Sie es erneut.");
    } finally {
      setLoading(false);
    }
  };

  const exampleQueries = [
    "Wie funktioniert der Rückgabeprozess?",
    "Was sind die Garantiebedingungen?",
    "Wie kann ich mein Passwort zurücksetzen?",
    "Welche Zahlungsmethoden werden akzeptiert?"
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn" data-testid="search-page">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium">
          <Sparkles className="w-4 h-4" />
          KI-gestützte Suche
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight font-['Plus_Jakarta_Sans']">
          Was möchten Sie wissen?
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Stellen Sie Ihre Frage in natürlicher Sprache. Unsere KI durchsucht die 
          Wissensdatenbank und generiert eine präzise Antwort.
        </p>
      </div>

      {/* Search Input */}
      <form onSubmit={handleSearch} className="relative">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Stellen Sie Ihre Frage..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-14 pl-12 pr-32 text-lg rounded-xl border-2 focus:border-indigo-500 focus:ring-indigo-500"
            data-testid="search-input"
          />
          <Button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600 hover:bg-indigo-700"
            data-testid="search-submit-btn"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Suchen"
            )}
          </Button>
        </div>
      </form>

      {/* Example Queries */}
      {!result && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground text-center">Beispielfragen:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {exampleQueries.map((q, i) => (
              <button
                key={i}
                onClick={() => setQuery(q)}
                className="px-4 py-2 rounded-full bg-muted hover:bg-muted/80 text-sm transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <Card className="border-2 border-indigo-100 ai-glow">
          <CardContent className="p-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                <Brain className="w-6 h-6 text-indigo-600 animate-pulse" />
              </div>
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-indigo-100 rounded animate-pulse w-3/4" />
                <div className="h-4 bg-indigo-100 rounded animate-pulse w-1/2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-6 animate-fadeIn">
          {/* AI Answer */}
          <Card className="border-2 border-indigo-100 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 p-4">
              <div className="flex items-center gap-3 text-white">
                <Brain className="w-6 h-6" />
                <span className="font-semibold">KI-Antwort</span>
              </div>
            </div>
            <CardContent className="p-6">
              <div className="prose-knowledge whitespace-pre-wrap" data-testid="ai-answer">
                {result.answer}
              </div>
            </CardContent>
          </Card>

          {/* Sources */}
          {result.sources?.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5 text-muted-foreground" />
                Quellen ({result.sources.length})
              </h3>
              <div className="grid gap-4">
                {result.sources.map((source, index) => (
                  <Card
                    key={index}
                    className="hover:shadow-float transition-all duration-300 cursor-pointer"
                    onClick={() => navigate(`/articles/${source.article_id}`)}
                    data-testid={`source-${index}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{source.title}</h4>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                source.score >= 0.8 ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                                source.score >= 0.6 ? 'bg-amber-50 text-amber-700 border-amber-300' :
                                'bg-slate-50 text-slate-700 border-slate-300'
                              }`}
                            >
                              {Math.round(source.score * 100)}% Relevanz
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {source.content_snippet?.includes('...') ? (
                              <span dangerouslySetInnerHTML={{ 
                                __html: source.content_snippet
                                  .replace(/\.\.\./g, '<span class="text-xs text-muted-foreground/50">...</span>')
                              }} />
                            ) : (
                              source.content_snippet
                            )}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* No Sources Found */}
          {result.sources?.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">
                  Keine passenden Artikel gefunden. Erstellen Sie einen neuen Wissensartikel.
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => navigate("/articles/new")}
                >
                  Artikel erstellen
                </Button>
              </CardContent>
            </Card>
          )}

          {/* New Search */}
          <div className="text-center">
            <Button
              variant="outline"
              onClick={() => {
                setResult(null);
                setQuery("");
              }}
              data-testid="new-search-btn"
            >
              Neue Suche
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Search;
