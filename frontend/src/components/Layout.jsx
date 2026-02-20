import React, { useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import axios from "axios";
import { API, AuthContext } from "@/App";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Search,
  FileText,
  Upload,
  FolderTree,
  Settings,
  LogOut,
  Brain,
  Menu,
  X,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navItems = [
  { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/search", icon: Search, label: "KI-Suche" },
  { path: "/articles", icon: FileText, label: "Artikel" },
  { path: "/documents", icon: Upload, label: "Dokumente" },
  { path: "/categories", icon: FolderTree, label: "Kategorien" },
  { path: "/settings", icon: Settings, label: "Einstellungen" },
];

const Sidebar = ({ className = "", onNavigate }) => {
  return (
    <aside className={`h-screen w-64 border-r bg-card flex flex-col ${className}`}>
      {/* Logo */}
      <div className="p-6 border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-500 flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg font-['Plus_Jakarta_Sans']">Knowledge</h1>
            <p className="text-xs text-muted-foreground">Nexus</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-indigo-50 text-indigo-700 border-l-2 border-indigo-500 -ml-[2px]"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t">
        <p className="text-xs text-muted-foreground text-center">
          Smart Knowledge Nexus v1.0
        </p>
      </div>
    </aside>
  );
};

const Header = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleLogout = async () => {
    try {
      await axios.post(`${API}/auth/logout`);
      toast.success("Erfolgreich abgemeldet");
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
      navigate("/", { replace: true });
    }
  };

  const getInitials = (name) => {
    return name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";
  };

  return (
    <header className="h-16 border-b bg-white/70 backdrop-blur-xl sticky top-0 z-40">
      <div className="h-full px-4 lg:px-8 flex items-center justify-between">
        {/* Mobile Menu */}
        <div className="lg:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <Sidebar onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>

        {/* Mobile Logo */}
        <div className="lg:hidden flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold">Knowledge Nexus</span>
        </div>

        {/* Spacer for desktop */}
        <div className="hidden lg:block" />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 h-auto py-2" data-testid="user-menu-trigger">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.picture} alt={user?.name} />
                <AvatarFallback className="bg-indigo-100 text-indigo-700 text-sm">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline text-sm font-medium">{user?.name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/settings")}>
              <Settings className="w-4 h-4 mr-2" />
              Einstellungen
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600" data-testid="logout-btn">
              <LogOut className="w-4 h-4 mr-2" />
              Abmelden
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <Sidebar className="hidden lg:flex" />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
