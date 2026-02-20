import React, { useState, useContext, useEffect } from "react";
import axios from "axios";
import { AuthContext, API } from "@/App";
import { toast } from "sonner";
import {
  Settings as SettingsIcon,
  User,
  Code,
  Copy,
  Check,
  ExternalLink,
  Globe,
  Shield,
  LogIn
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

const Settings = () => {
  const { user } = useContext(AuthContext);
  const [copied, setCopied] = useState(null);
  const [stayLoggedIn, setStayLoggedIn] = useState(false);
  const [updatingSession, setUpdatingSession] = useState(false);

  const backendUrl = process.env.REACT_APP_BACKEND_URL;

  // Load preference from localStorage
  useEffect(() => {
    const savedPref = localStorage.getItem('stayLoggedIn');
    setStayLoggedIn(savedPref === 'true');
  }, []);

  const handleStayLoggedInChange = async (checked) => {
    setUpdatingSession(true);
    try {
      // Save preference locally
      localStorage.setItem('stayLoggedIn', checked.toString());
      setStayLoggedIn(checked);
      
      // Update session on backend
      await axios.post(`${API}/auth/extend-session`, {
        extend: checked
      });
      
      toast.success(checked 
        ? "Angemeldet bleiben aktiviert (30 Tage)" 
        : "Session-Dauer zurückgesetzt (7 Tage)"
      );
    } catch (error) {
      console.error("Failed to update session:", error);
      toast.error("Einstellung konnte nicht gespeichert werden");
    } finally {
      setUpdatingSession(false);
    }
  };

  const widgetCode = `<!-- Smart Knowledge Nexus Widget -->
<div id="knowledge-widget"></div>
<script>
(function() {
  var container = document.getElementById('knowledge-widget');
  var input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Suchen...';
  input.style.cssText = 'width:100%;padding:12px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;';
  
  input.addEventListener('keypress', async function(e) {
    if (e.key === 'Enter') {
      var q = e.target.value;
      var res = await fetch('${backendUrl}/api/widget/search?q=' + encodeURIComponent(q));
      var data = await res.json();
      // Handle results
      console.log(data);
    }
  });
  
  container.appendChild(input);
})();
</script>`;

  const copyToClipboard = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      toast.success("In Zwischenablage kopiert");
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      toast.error("Kopieren fehlgeschlagen");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn" data-testid="settings-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-['Plus_Jakarta_Sans']">
          Einstellungen
        </h1>
        <p className="text-muted-foreground mt-1">
          Konfigurieren Sie Ihre Wissensdatenbank
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2">
            <User className="w-4 h-4" />
            Profil
          </TabsTrigger>
          <TabsTrigger value="api" className="gap-2">
            <Code className="w-4 h-4" />
            API & Widget
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profil-Informationen</CardTitle>
              <CardDescription>
                Ihre Kontodaten aus der Google-Anmeldung
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                {user?.picture && (
                  <img 
                    src={user.picture} 
                    alt={user.name} 
                    className="w-16 h-16 rounded-full"
                  />
                )}
                <div>
                  <p className="font-semibold text-lg">{user?.name}</p>
                  <p className="text-muted-foreground">{user?.email}</p>
                  <Badge variant="outline" className="mt-2">
                    {user?.role === "admin" ? "Administrator" : "Editor"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Tab */}
        <TabsContent value="api" className="space-y-6">
          {/* API Endpoints */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                REST-API Endpunkte
              </CardTitle>
              <CardDescription>
                Integrieren Sie die Wissensdatenbank in Ihre Systeme
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">Widget-Suche</p>
                    <code className="text-sm text-muted-foreground">
                      GET {backendUrl}/api/widget/search?q=QUERY
                    </code>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => copyToClipboard(`${backendUrl}/api/widget/search?q=`, 'search')}
                  >
                    {copied === 'search' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">Artikel abrufen</p>
                    <code className="text-sm text-muted-foreground">
                      GET {backendUrl}/api/widget/article/ARTICLE_ID
                    </code>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => copyToClipboard(`${backendUrl}/api/widget/article/`, 'article')}
                  >
                    {copied === 'article' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Widget Code */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5" />
                Einbettbares Widget
              </CardTitle>
              <CardDescription>
                Kopieren Sie diesen Code, um das Such-Widget in Ihre Website einzubetten
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{widgetCode}</code>
                </pre>
                <Button 
                  variant="secondary"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(widgetCode, 'widget')}
                >
                  {copied === 'widget' ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Kopiert
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Kopieren
                    </>
                  )}
                </Button>
              </div>
              
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>Hinweis:</strong> Stellen Sie sicher, dass Ihre Domäne in den CORS-Einstellungen 
                  freigegeben ist, um das Widget nutzen zu können.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* API Documentation Link */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">API-Dokumentation</h3>
                  <p className="text-sm text-muted-foreground">
                    Vollständige Dokumentation aller verfügbaren Endpunkte
                  </p>
                </div>
                <Button variant="outline" asChild>
                  <a href={`${backendUrl}/docs`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Öffnen
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
