import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Lock, Mail, BookOpen, Search, Users, FileText } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [stayLoggedIn, setStayLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Bitte E-Mail und Passwort eingeben");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/login`, {
        email,
        password,
        stay_logged_in: stayLoggedIn
      });
      
      toast.success(`Willkommen, ${response.data.name}!`);
      navigate("/dashboard", { state: { user: response.data }, replace: true });
    } catch (error) {
      console.error("Login failed:", error);
      const message = error.response?.data?.detail || "Anmeldung fehlgeschlagen";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute -bottom-40 right-1/3 w-72 h-72 bg-red-500/10 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      {/* Header */}
      <header className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/20">
            <span className="text-white font-bold text-lg">C</span>
          </div>
          <div>
            <span className="font-bold text-xl text-white">CANUSA</span>
            <span className="text-slate-400 ml-2 text-sm">Nexus</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Side - Branding */}
          <div className="hidden lg:block space-y-8">
            <div>
              <h1 className="text-4xl font-bold text-white mb-4">
                The Knowledge Hub
              </h1>
              <p className="text-lg text-slate-300">
                Ihre zentrale Wissensplattform für schnellen Zugriff auf alle wichtigen Informationen.
              </p>
            </div>

            {/* Feature Cards */}
            <div className="grid gap-4">
              <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                <div className="p-2 rounded-lg bg-red-500/20">
                  <Search className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Schnelle Suche</h3>
                  <p className="text-sm text-slate-400">Finden Sie Artikel in Sekundenschnelle mit der Live-Suche</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <BookOpen className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Wissensartikel</h3>
                  <p className="text-sm text-slate-400">Strukturierte Artikel mit Kategorien und Tags</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                <div className="p-2 rounded-lg bg-emerald-500/20">
                  <FileText className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">PDF-Import</h3>
                  <p className="text-sm text-slate-400">Importieren Sie PDFs und wandeln Sie sie in Artikel um</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="w-full max-w-md mx-auto">
            <Card className="border-0 shadow-2xl shadow-black/50 bg-white/95 backdrop-blur-xl">
              <CardHeader className="space-y-1 pb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg">
                    <Lock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Anmelden</CardTitle>
                    <CardDescription>CANUSA Nexus</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      E-Mail-Adresse
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@canusa.de"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                        data-testid="login-email"
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Passwort
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                        data-testid="login-password"
                        autoComplete="current-password"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="stay-logged-in" 
                      checked={stayLoggedIn}
                      onCheckedChange={setStayLoggedIn}
                      data-testid="stay-logged-in"
                    />
                    <label 
                      htmlFor="stay-logged-in" 
                      className="text-sm text-slate-600 cursor-pointer select-none"
                    >
                      Angemeldet bleiben (30 Tage)
                    </label>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-11 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium shadow-lg shadow-red-500/25 transition-all hover:shadow-red-500/40"
                    disabled={loading}
                    data-testid="login-submit"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Wird angemeldet...
                      </>
                    ) : (
                      "Anmelden"
                    )}
                  </Button>
                </form>

                <div className="mt-6 pt-6 border-t">
                  <p className="text-xs text-center text-slate-500">
                    Zugang nur für autorisierte Mitarbeiter.<br />
                    Bei Problemen wenden Sie sich an Ihren Administrator.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center">
        <p className="text-sm text-slate-500">
          CANUSA Touristik GmbH & Co. KG
        </p>
      </footer>
    </div>
  );
};

export default Login;
