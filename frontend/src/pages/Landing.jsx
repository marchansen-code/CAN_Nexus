import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Brain, Search, FileText, Zap, Shield, Globe } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  const handleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const features = [
    {
      icon: FileText,
      title: "PDF Import",
      description: "Automatische Verarbeitung und Strukturierung von PDF-Dokumenten mit KI-Zusammenfassung."
    },
    {
      icon: Search,
      title: "KI-Suche",
      description: "Semantische Suche mit natürlicher Sprache und generativen Antworten."
    },
    {
      icon: Zap,
      title: "Automatisierung",
      description: "Workflow-Management mit automatischer Übersetzung und Wiedervorlage."
    },
    {
      icon: Shield,
      title: "Governance",
      description: "Statusbasiertes Redaktionssystem mit Draft, Review und Published."
    },
    {
      icon: Globe,
      title: "Multichannel",
      description: "REST-API und Widget für Integration in externe Systeme."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500 flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg font-['Plus_Jakarta_Sans']">Smart Knowledge</h1>
                <p className="text-xs text-muted-foreground -mt-0.5">Nexus</p>
              </div>
            </div>
            <Button onClick={handleLogin} className="bg-indigo-600 hover:bg-indigo-700" data-testid="login-btn">
              Anmelden mit Google
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-emerald-50 opacity-50" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium">
                <Zap className="w-4 h-4" />
                KI-gestütztes Wissensmanagement
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground font-['Plus_Jakarta_Sans']">
                Ihr Wissen,{" "}
                <span className="text-indigo-600">intelligent</span>{" "}
                organisiert
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl">
                Transformieren Sie Ihre Dokumentenbasis in eine durchsuchbare Wissensdatenbank. 
                Mit automatischer PDF-Verarbeitung, semantischer Suche und KI-generierten Antworten.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button 
                  size="lg" 
                  onClick={handleLogin} 
                  className="bg-indigo-600 hover:bg-indigo-700 h-12 px-8"
                  data-testid="hero-login-btn"
                >
                  Kostenlos starten
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="h-12 px-8"
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Mehr erfahren
                </Button>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-2xl opacity-10 blur-2xl" />
              <div className="relative bg-white rounded-2xl shadow-float p-6 border">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 pb-4 border-b">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <Search className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <div className="h-10 bg-slate-100 rounded-lg flex items-center px-4">
                        <span className="text-muted-foreground text-sm">Wie funktioniert der Rückgabeprozess?</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3 animate-fadeIn">
                    <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                      <p className="text-sm text-indigo-900 font-medium mb-2">KI-Antwort</p>
                      <p className="text-sm text-indigo-800">
                        Der Rückgabeprozess besteht aus drei Schritten: 1. Antrag stellen über das Portal, 
                        2. Genehmigung abwarten, 3. Artikel an angegebene Adresse senden...
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Basierend auf 3 Wissensartikeln
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight font-['Plus_Jakarta_Sans']">
              Alles was Sie brauchen
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Eine Plattform für Ihr gesamtes Unternehmenswissen - von der Dokumentenerfassung bis zur intelligenten Abfrage.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-white p-6 rounded-xl border shadow-subtle hover:shadow-float transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2 font-['Plus_Jakarta_Sans']">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-12 text-white">
            <h2 className="text-3xl font-bold mb-4 font-['Plus_Jakarta_Sans']">
              Bereit für intelligentes Wissensmanagement?
            </h2>
            <p className="text-indigo-100 mb-8 max-w-xl mx-auto">
              Starten Sie noch heute und erleben Sie, wie KI Ihr Wissensmanagement transformiert.
            </p>
            <Button 
              size="lg" 
              onClick={handleLogin}
              className="bg-white text-indigo-600 hover:bg-indigo-50 h-12 px-8"
              data-testid="cta-login-btn"
            >
              Jetzt kostenlos starten
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold">Smart Knowledge Nexus</span>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Smart Knowledge Nexus. Alle Rechte vorbehalten.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
