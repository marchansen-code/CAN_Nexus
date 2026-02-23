import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { API, AuthContext } from "@/App";
import { toast } from "sonner";
import {
  Users,
  Shield,
  ShieldCheck,
  Eye,
  Edit,
  Search,
  UserPlus,
  Mail,
  Calendar,
  Ban,
  UserX,
  Trash2,
  Lock,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const RoleBadge = ({ role }) => {
  const styles = {
    admin: "bg-red-50 text-red-700 border-red-200",
    editor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    viewer: "bg-slate-100 text-slate-700 border-slate-200"
  };
  
  const labels = {
    admin: "Administrator",
    editor: "Editor",
    viewer: "Betrachter"
  };

  const icons = {
    admin: ShieldCheck,
    editor: Edit,
    viewer: Eye
  };

  const Icon = icons[role] || Eye;

  return (
    <Badge variant="outline" className={`${styles[role]} border gap-1`}>
      <Icon className="w-3 h-3" />
      {labels[role]}
    </Badge>
  );
};

const UserManagement = () => {
  const { user: currentUser } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editDialog, setEditDialog] = useState({ open: false, user: null });
  const [selectedRole, setSelectedRole] = useState("");
  const [deleteDialog, setDeleteDialog] = useState({ open: false, user: null });
  const [createDialog, setCreateDialog] = useState(false);
  const [passwordDialog, setPasswordDialog] = useState({ open: false, user: null });
  const [newUser, setNewUser] = useState({ email: "", name: "", password: "", role: "viewer" });
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`);
      setUsers(response.data);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast.error("Benutzer konnten nicht geladen werden");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (user) => {
    setSelectedRole(user.role);
    setEditDialog({ open: true, user });
  };

  const handleSaveRole = async () => {
    if (!editDialog.user) return;

    try {
      await axios.put(`${API}/users/${editDialog.user.user_id}/role`, {
        role: selectedRole
      });
      toast.success("Benutzerrolle aktualisiert");
      fetchUsers();
      setEditDialog({ open: false, user: null });
    } catch (error) {
      console.error("Failed to update role:", error);
      toast.error("Rolle konnte nicht aktualisiert werden");
    }
  };

  const handleToggleBlock = async (user) => {
    try {
      const response = await axios.put(`${API}/users/${user.user_id}/block`);
      toast.success(response.data.message === "User blocked" ? "Benutzer gesperrt" : "Benutzer entsperrt");
      fetchUsers();
    } catch (error) {
      console.error("Failed to toggle block:", error);
      toast.error("Aktion fehlgeschlagen");
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteDialog.user) return;
    
    try {
      await axios.delete(`${API}/users/${deleteDialog.user.user_id}`);
      toast.success("Benutzer gelöscht");
      setUsers(users.filter(u => u.user_id !== deleteDialog.user.user_id));
    } catch (error) {
      console.error("Failed to delete user:", error);
      toast.error("Benutzer konnte nicht gelöscht werden");
    } finally {
      setDeleteDialog({ open: false, user: null });
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.name || !newUser.password) {
      toast.error("Bitte alle Felder ausfüllen");
      return;
    }
    if (newUser.password.length < 6) {
      toast.error("Passwort muss mindestens 6 Zeichen haben");
      return;
    }

    setSaving(true);
    try {
      await axios.post(`${API}/users`, newUser);
      toast.success("Benutzer erfolgreich angelegt");
      setCreateDialog(false);
      setNewUser({ email: "", name: "", password: "", role: "viewer" });
      fetchUsers();
    } catch (error) {
      console.error("Failed to create user:", error);
      toast.error(error.response?.data?.detail || "Benutzer konnte nicht angelegt werden");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordDialog.user || !newPassword) return;
    if (newPassword.length < 6) {
      toast.error("Passwort muss mindestens 6 Zeichen haben");
      return;
    }

    setSaving(true);
    try {
      await axios.put(`${API}/users/${passwordDialog.user.user_id}/password`, {
        new_password: newPassword
      });
      toast.success("Passwort erfolgreich geändert");
      setPasswordDialog({ open: false, user: null });
      setNewPassword("");
    } catch (error) {
      console.error("Failed to change password:", error);
      toast.error("Passwort konnte nicht geändert werden");
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (name) => {
    return name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Unbekannt";
    const date = new Date(dateString);
    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };

  const isAdmin = currentUser?.role === "admin";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="user-management-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-['Plus_Jakarta_Sans']">
            Benutzerverwaltung
          </h1>
          <p className="text-muted-foreground mt-1">
            Verwalten Sie Benutzer und deren Zugriffsrechte
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setCreateDialog(true)} className="bg-red-500 hover:bg-red-600">
            <UserPlus className="w-4 h-4 mr-2" />
            Neuer Benutzer
          </Button>
        )}
      </div>

      {/* Role Info Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="font-semibold">Administrator</p>
                <p className="text-xs text-muted-foreground">
                  Voller Zugriff, Benutzerverwaltung
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Edit className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-semibold">Editor</p>
                <p className="text-xs text-muted-foreground">
                  Artikel erstellen und bearbeiten
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <Eye className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="font-semibold">Betrachter</p>
                <p className="text-xs text-muted-foreground">
                  Nur Lesezugriff auf Artikel
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Benutzer ({users.length})
              </CardTitle>
              <CardDescription>
                Alle registrierten Benutzer und deren Rollen
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Benutzer suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredUsers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Benutzer</TableHead>
                  <TableHead>E-Mail</TableHead>
                  <TableHead>Rolle</TableHead>
                  <TableHead>Registriert</TableHead>
                  {isAdmin && <TableHead className="text-right">Aktionen</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.user_id} data-testid={`user-row-${user.user_id}`} className={user.is_blocked ? "opacity-60 bg-red-50" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={user.picture} alt={user.name} />
                          <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.name}</span>
                        {user.user_id === currentUser?.user_id && (
                          <Badge variant="secondary" className="text-xs">Sie</Badge>
                        )}
                        {user.is_blocked && (
                          <Badge variant="destructive" className="text-xs">Gesperrt</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        {user.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={user.role} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Calendar className="w-4 h-4" />
                        {formatDate(user.created_at)}
                      </div>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPasswordDialog({ open: true, user })}
                            disabled={user.user_id === currentUser?.user_id}
                            className="text-slate-600"
                            data-testid={`password-user-${user.user_id}`}
                          >
                            <Lock className="w-4 h-4 mr-2" />
                            Passwort
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(user)}
                            disabled={user.user_id === currentUser?.user_id}
                            data-testid={`edit-user-${user.user_id}`}
                          >
                            <Shield className="w-4 h-4 mr-2" />
                            Rolle
                          </Button>
                          <Button
                            variant={user.is_blocked ? "outline" : "ghost"}
                            size="sm"
                            onClick={() => handleToggleBlock(user)}
                            disabled={user.user_id === currentUser?.user_id}
                            className={user.is_blocked ? "text-emerald-600 border-emerald-300" : "text-amber-600"}
                            data-testid={`block-user-${user.user_id}`}
                          >
                            {user.is_blocked ? (
                              <>
                                <UserX className="w-4 h-4 mr-2" />
                                Entsperren
                              </>
                            ) : (
                              <>
                                <Ban className="w-4 h-4 mr-2" />
                                Sperren
                              </>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteDialog({ open: true, user })}
                            disabled={user.user_id === currentUser?.user_id}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            data-testid={`delete-user-${user.user_id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Keine Benutzer gefunden</h3>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? "Versuchen Sie einen anderen Suchbegriff"
                  : "Es sind noch keine Benutzer registriert"
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permission Info */}
      {!isAdmin && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Eingeschränkter Zugriff</p>
                <p className="text-sm text-amber-700">
                  Nur Administratoren können Benutzerrollen ändern. Wenden Sie sich an einen Administrator, 
                  wenn Sie Änderungen benötigen.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Role Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => !open && setEditDialog({ open: false, user: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Benutzerrolle ändern</DialogTitle>
            <DialogDescription>
              Ändern Sie die Zugriffsrechte für {editDialog.user?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Avatar className="w-10 h-10">
                <AvatarImage src={editDialog.user?.picture} alt={editDialog.user?.name} />
                <AvatarFallback className="bg-indigo-100 text-indigo-700">
                  {getInitials(editDialog.user?.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{editDialog.user?.name}</p>
                <p className="text-sm text-muted-foreground">{editDialog.user?.email}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Neue Rolle</label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Rolle wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-red-600" />
                      Administrator
                    </div>
                  </SelectItem>
                  <SelectItem value="editor">
                    <div className="flex items-center gap-2">
                      <Edit className="w-4 h-4 text-indigo-600" />
                      Editor
                    </div>
                  </SelectItem>
                  <SelectItem value="viewer">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-slate-600" />
                      Betrachter
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="p-3 bg-slate-50 rounded-lg text-sm">
              <p className="font-medium mb-2">Berechtigungen:</p>
              {selectedRole === "admin" && (
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Alle Artikel lesen, erstellen, bearbeiten, löschen</li>
                  <li>Kategorien und Dokumente verwalten</li>
                  <li>Benutzerrollen ändern</li>
                  <li>Systemeinstellungen anpassen</li>
                </ul>
              )}
              {selectedRole === "editor" && (
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Alle Artikel lesen, erstellen, bearbeiten</li>
                  <li>Kategorien und Dokumente verwalten</li>
                  <li>Keine Benutzerverwaltung</li>
                </ul>
              )}
              {selectedRole === "viewer" && (
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Alle veröffentlichten Artikel lesen</li>
                  <li>KI-Suche nutzen</li>
                  <li>Keine Bearbeitungsrechte</li>
                </ul>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, user: null })}>
              Abbrechen
            </Button>
            <Button onClick={handleSaveRole} className="bg-indigo-600 hover:bg-indigo-700">
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, user: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Benutzer löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie den Benutzer "{deleteDialog.user?.name}" ({deleteDialog.user?.email}) wirklich dauerhaft löschen? 
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-red-600 hover:bg-red-700">
              Dauerhaft löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserManagement;
