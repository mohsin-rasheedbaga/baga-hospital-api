'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Plus,
  Search,
  Pill,
  Package,
  Trash2,
  Edit3,
  Save,
  Loader2,
  Beaker,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Medicine {
  id: string;
  name: string;
  category: string;
  unit: string;
  stock: number;
  price: number;
}

type DialogMode = 'add' | 'edit' | null;

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const UNIT_OPTIONS = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream'];

const CATEGORY_OPTIONS = [
  'Antibiotic',
  'Painkiller',
  'Vitamin',
  'Antacid',
  'Antihistamine',
  'Anti-inflammatory',
  'Cardiovascular',
  'Diabetes',
  'Respiratory',
  'Dermatology',
  'Gastrointestinal',
  'Other',
];

let idCounter = 0;
function nextId() {
  return `med-${++idCounter}`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PharmacyMedicinesPage() {
  const router = useRouter();

  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterUnit, setFilterUnit] = useState('all');

  // Dialog state
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [editId, setEditId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Other');
  const [formUnit, setFormUnit] = useState('Tablet');
  const [formStock, setFormStock] = useState('0');
  const [formPrice, setFormPrice] = useState('0');

  const [saving, setSaving] = useState(false);

  /* ---- Handlers ---- */
  const openAdd = () => {
    setDialogMode('add');
    setEditId(null);
    setFormName('');
    setFormCategory('Other');
    setFormUnit('Tablet');
    setFormStock('0');
    setFormPrice('0');
  };

  const openEdit = (med: Medicine) => {
    setDialogMode('edit');
    setEditId(med.id);
    setFormName(med.name);
    setFormCategory(med.category);
    setFormUnit(med.unit);
    setFormStock(String(med.stock));
    setFormPrice(String(med.price));
  };

  const closeDialog = () => {
    setDialogMode(null);
    setEditId(null);
  };

  const handleSave = () => {
    if (!formName.trim()) {
      toast.error('Medicine name is required');
      return;
    }

    setSaving(true);

    // Simulate a small delay for UX
    setTimeout(() => {
      if (dialogMode === 'add') {
        const newMed: Medicine = {
          id: nextId(),
          name: formName.trim(),
          category: formCategory,
          unit: formUnit,
          stock: parseInt(formStock, 10) || 0,
          price: parseFloat(formPrice) || 0,
        };
        setMedicines((prev) => [...prev, newMed]);
        toast.success(`"${newMed.name}" added successfully`);
      } else if (dialogMode === 'edit' && editId) {
        setMedicines((prev) =>
          prev.map((m) =>
            m.id === editId
              ? {
                  ...m,
                  name: formName.trim(),
                  category: formCategory,
                  unit: formUnit,
                  stock: parseInt(formStock, 10) || 0,
                  price: parseFloat(formPrice) || 0,
                }
              : m
          )
        );
        toast.success(`"${formName.trim()}" updated successfully`);
      }
      setSaving(false);
      closeDialog();
    }, 300);
  };

  const handleDelete = (med: Medicine) => {
    setMedicines((prev) => prev.filter((m) => m.id !== med.id));
    toast.success(`"${med.name}" deleted`);
  };

  /* ---- Filter ---- */
  const filtered = medicines.filter((med) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      if (
        !med.name.toLowerCase().includes(q) &&
        !med.category.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    if (filterCategory !== 'all' && med.category !== filterCategory) return false;
    if (filterUnit !== 'all' && med.unit !== filterUnit) return false;
    return true;
  });

  const totalStock = medicines.reduce((sum, m) => sum + m.stock, 0);
  const totalValue = medicines.reduce((sum, m) => sum + m.stock * m.price, 0);

  const unitColor: Record<string, string> = {
    Tablet: 'bg-blue-50 text-blue-700 border-blue-200',
    Capsule: 'bg-purple-50 text-purple-700 border-purple-200',
    Syrup: 'bg-amber-50 text-amber-700 border-amber-200',
    Injection: 'bg-red-50 text-red-700 border-red-200',
    Cream: 'bg-pink-50 text-pink-700 border-pink-200',
  };

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => router.push('/dashboard')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Medicine Inventory</h1>
            <p className="text-sm text-gray-500">
              {medicines.length} medicines &middot; {totalStock} total units &middot; Rs. {totalValue.toLocaleString()} total value
            </p>
          </div>
        </div>

        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={openAdd}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Medicine
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name or category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v || "")}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORY_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterUnit} onValueChange={(v) => setFilterUnit(v || "")}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Units</SelectItem>
                {UNIT_OPTIONS.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {medicines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 mb-4">
                <Package className="h-7 w-7 text-emerald-400" />
              </div>
              <p className="text-base font-medium text-gray-700 mb-1">No medicines added</p>
              <p className="text-sm text-gray-400 mb-4">
                Start by adding medicines to your inventory
              </p>
              <Button
                variant="outline"
                className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                onClick={openAdd}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Medicine
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Beaker className="h-10 w-10 mb-3 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">No results match your filters</p>
              <p className="text-xs text-gray-400">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Medicine Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Value</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((med) => (
                    <TableRow key={med.id}>
                      <TableCell className="font-medium text-sm text-gray-900">
                        {med.name}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{med.category}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${unitColor[med.unit] || ''}`}
                        >
                          {med.unit}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        <span
                          className={
                            med.stock === 0
                              ? 'text-red-600 font-semibold'
                              : med.stock < 10
                              ? 'text-amber-600 font-medium'
                              : 'text-gray-700'
                          }
                        >
                          {med.stock}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm text-gray-700">
                        Rs. {med.price.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-sm text-gray-600 hidden sm:table-cell">
                        Rs. {(med.stock * med.price).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-gray-500 hover:text-emerald-600 hover:bg-emerald-50"
                            onClick={() => openEdit(med)}
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-gray-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(med)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogMode !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5 text-emerald-600" />
              {dialogMode === 'add' ? 'Add Medicine' : 'Edit Medicine'}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === 'add'
                ? 'Add a new medicine to the inventory'
                : 'Update medicine details'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="med-name" className="text-sm font-medium">
                Medicine Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="med-name"
                placeholder="e.g., Paracetamol 500mg"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Category</Label>
                <Select value={formCategory} onValueChange={(v) => setFormCategory(v || "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Unit</Label>
                <Select value={formUnit} onValueChange={(v) => setFormUnit(v || "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="med-stock" className="text-sm font-medium">
                  Stock Quantity
                </Label>
                <Input
                  id="med-stock"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formStock}
                  onChange={(e) => setFormStock(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="med-price" className="text-sm font-medium">
                  Price (Rs.)
                </Label>
                <Input
                  id="med-price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleSave}
              disabled={saving}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <Save className="h-4 w-4 mr-2" />
              {dialogMode === 'add' ? 'Add Medicine' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
