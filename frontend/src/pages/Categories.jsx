import React, { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import {
  FolderTree,
  Plus,
  Edit,
  Trash2,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TreeItem = ({ category, categories, level = 0, onEdit, onDelete, expandedIds, toggleExpand }) => {
  const children = categories.filter(c => c.parent_id === category.category_id);
  const hasChildren = children.length > 0;
  const isExpanded = expandedIds.includes(category.category_id);

  return (
    <div>
      <div 
        className={`flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer group transition-colors`}
        style={{ paddingLeft: `${level * 24 + 8}px` }}
      >
        {hasChildren ? (
          <button 
            onClick={() => toggleExpand(category.category_id)}
            className="p-1 hover:bg-muted rounded"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        ) : (
          <span className="w-6" />
        )}
        
        {isExpanded && hasChildren ? (
          <FolderOpen className="w-5 h-5 text-amber-500" />
        ) : (
          <Folder className="w-5 h-5 text-amber-500" />
        )}
        
        <span className="flex-1 font-medium">{category.name}</span>
        
        <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={(e) => { e.stopPropagation(); onEdit(category); }}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-red-500 hover:text-red-600"
            onClick={(e) => { e.stopPropagation(); onDelete(category); }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {isExpanded && hasChildren && (
        <div>
          {children.map((child) => (
            <TreeItem
              key={child.category_id}
              category={child}
              categories={categories}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState([]);
  const [editDialog, setEditDialog] = useState({ open: false, category: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, category: null });
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    parent_id: null
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      toast.error("Kategorien konnten nicht geladen werden");
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const handleOpenCreate = () => {
    setFormData({ name: "", description: "", parent_id: null });
    setEditDialog({ open: true, category: null });
  };

  const handleOpenEdit = (category) => {
    setFormData({
      name: category.name,
      description: category.description || "",
      parent_id: category.parent_id
    });
    setEditDialog({ open: true, category });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Bitte geben Sie einen Namen ein");
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        parent_id: formData.parent_id === "none" ? null : formData.parent_id
      };

      if (editDialog.category) {
        await axios.put(`${API}/categories/${editDialog.category.category_id}`, payload);
        toast.success("Kategorie aktualisiert");
      } else {
        await axios.post(`${API}/categories`, payload);
        toast.success("Kategorie erstellt");
      }
      
      fetchCategories();
      setEditDialog({ open: false, category: null });
    } catch (error) {
      console.error("Failed to save:", error);
      toast.error("Kategorie konnte nicht gespeichert werden");
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.category) return;

    try {
      await axios.delete(`${API}/categories/${deleteDialog.category.category_id}`);
      toast.success("Kategorie gelöscht");
      fetchCategories();
    } catch (error) {
      console.error("Failed to delete:", error);
      toast.error("Kategorie konnte nicht gelöscht werden");
    } finally {
      setDeleteDialog({ open: false, category: null });
    }
  };

  const rootCategories = categories.filter(c => !c.parent_id);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="categories-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-['Plus_Jakarta_Sans']">
            Kategorien
          </h1>
          <p className="text-muted-foreground mt-1">
            Strukturieren Sie Ihre Wissensbasis hierarchisch
          </p>
        </div>
        <Button 
          onClick={handleOpenCreate}
          className="bg-indigo-600 hover:bg-indigo-700"
          data-testid="create-category-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Neue Kategorie
        </Button>
      </div>

      {/* Category Tree */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderTree className="w-5 h-5" />
            Kategoriestruktur
          </CardTitle>
        </CardHeader>
        <CardContent>
          {categories.length > 0 ? (
            <div className="space-y-1">
              {rootCategories.map((category) => (
                <TreeItem
                  key={category.category_id}
                  category={category}
                  categories={categories}
                  onEdit={handleOpenEdit}
                  onDelete={(cat) => setDeleteDialog({ open: true, category: cat })}
                  expandedIds={expandedIds}
                  toggleExpand={toggleExpand}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FolderTree className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Keine Kategorien</h3>
              <p className="text-muted-foreground mb-6">
                Erstellen Sie Ihre erste Kategorie, um Ihre Wissensartikel zu strukturieren.
              </p>
              <Button onClick={handleOpenCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Kategorie erstellen
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => !open && setEditDialog({ open: false, category: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editDialog.category ? "Kategorie bearbeiten" : "Neue Kategorie"}
            </DialogTitle>
            <DialogDescription>
              {editDialog.category 
                ? "Bearbeiten Sie die Kategorie-Details." 
                : "Erstellen Sie eine neue Kategorie für Ihre Wissensbasis."
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Kategoriename..."
                data-testid="category-name-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optionale Beschreibung..."
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Übergeordnete Kategorie</Label>
              <Select 
                value={formData.parent_id || "none"} 
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  parent_id: value === "none" ? null : value 
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Keine (Root-Kategorie)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Keine (Root-Kategorie)</SelectItem>
                  {categories
                    .filter(c => c.category_id !== editDialog.category?.category_id)
                    .map((cat) => (
                      <SelectItem key={cat.category_id} value={cat.category_id}>
                        {cat.name}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, category: null })}>
              Abbrechen
            </Button>
            <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">
              {editDialog.category ? "Speichern" : "Erstellen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, category: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kategorie löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie die Kategorie "{deleteDialog.category?.name}" wirklich löschen? 
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

export default Categories;
