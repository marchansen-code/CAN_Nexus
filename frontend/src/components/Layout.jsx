import React, { useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import axios from "axios";
import { API, AuthContext } from "@/App";
import { toast } from "sonner";
import { useTheme } from "@/components/ThemeProvider";
import {
  LayoutDashboard,
  Search,
  FileText,
  Upload,
  FolderTree,
  Settings,
  LogOut,
  Menu,
  Users,
  Moon,
  Sun,
  Monitor
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

// Navigation items with role-based visibility
const allNavItems = [
  { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard", roles: ["admin", "editor", "viewer"] },
  { path: "/search", icon: Search, label: "KI-Suche", roles: ["admin", "editor", "viewer"] },
  { path: "/articles", icon: FileText, label: "Artikel", roles: ["admin", "editor", "viewer"] },
  { path: "/documents", icon: Upload, label: "Dokumente", roles: ["admin", "editor"] },
  { path: "/categories", icon: FolderTree, label: "Kategorien", roles: ["admin", "editor"] },
  { path: "/users", icon: Users, label: "Benutzer", roles: ["admin"] },
  { path: "/settings", icon: Settings, label: "Einstellungen", roles: ["admin"] },
];

const Sidebar = ({ className = "", onNavigate, userRole }) => {
  // Filter nav items based on user role
  const navItems = allNavItems.filter(item => item.roles.includes(userRole || "viewer"));

  return (
    <aside className={`h-screen w-64 border-r bg-card flex flex-col ${className}`}>
      {/* Logo */}
      <div className="p-6 border-b">
        <div className="flex items-center gap-3">
          <img 
            src="https://www.canusa.de/_Resources/Static/Packages/Canusa.CanusaDe/Images/logo-canusa.svg" 
            alt="CANUSA" 
            className="h-8"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          <div className="border-l pl-2">
            <span className="text-sm font-semibold text-canusa-dark-blue block">Nexus</span>
            <span className="text-xs text-muted-foreground">The Knowledge Hub</span>
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
                  ? "bg-red-50 text-red-700 border-l-2 border-red-500 -ml-[2px]"
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
          CANUSA Nexus v1.0
        </p>
      </div>
    </aside>
  );
};

const Header = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { theme, setTheme, resolvedTheme } = useTheme();
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

  const cycleTheme = () => {
    const themes = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    setTheme(nextTheme);
    toast.success(`Theme: ${nextTheme === 'system' ? 'Automatisch' : nextTheme === 'dark' ? 'Dunkel' : 'Hell'}`);
  };

  const getThemeIcon = () => {
    if (theme === 'system') return <Monitor className="w-4 h-4" />;
    if (theme === 'dark') return <Moon className="w-4 h-4" />;
    return <Sun className="w-4 h-4" />;
  };

  const getInitials = (name) => {
    return name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";
  };

  const getRoleLabel = (role) => {
    const labels = {
      admin: "Administrator",
      editor: "Editor",
      viewer: "Betrachter"
    };
    return labels[role] || "Betrachter";
  };

  return (
    <header className="h-16 border-b bg-white/80 backdrop-blur-xl sticky top-0 z-40">
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
              <Sidebar onNavigate={() => setMobileOpen(false)} userRole={user?.role} />
            </SheetContent>
          </Sheet>
        </div>

        {/* Mobile Logo */}
        <div className="lg:hidden flex items-center gap-2">
          <span className="font-bold text-red-600">CANUSA</span>
          <span className="text-sm text-muted-foreground">Nexus</span>
        </div>

        {/* Spacer for desktop */}
        <div className="hidden lg:block" />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 h-auto py-2" data-testid="user-menu-trigger">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.picture} alt={user?.name} />
                <AvatarFallback className="bg-red-100 text-red-700 text-sm">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left">
                <span className="text-sm font-medium block">{user?.name}</span>
                <span className="text-xs text-muted-foreground">{getRoleLabel(user?.role)}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
              <p className="text-xs text-red-600 mt-1">{getRoleLabel(user?.role)}</p>
            </div>
            <DropdownMenuSeparator />
            {user?.role === "admin" && (
              <>
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <Settings className="w-4 h-4 mr-2" />
                  Einstellungen
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
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
  const { user } = useContext(AuthContext);
  
  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <Sidebar className="hidden lg:flex" userRole={user?.role} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
