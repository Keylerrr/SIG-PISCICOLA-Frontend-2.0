"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

const API_BASE = "https://backend-pongase-trucha.onrender.com/api";

export function ProductsTab({ farmId }) {
  const [products, setProducts] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [types, setTypes] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    type_product: "",
    unit: "",
    minimun_stock_threshold: 0,
    comments: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access");
      const headers = { Authorization: `Bearer ${token}` };

      const [prodRes, typesRes, unitsRes] = await Promise.all([
        fetch(`${API_BASE}/farms/${farmId}/products/`, { headers }),
        fetch(`${API_BASE}/type-products/`, { headers }),
        fetch(`${API_BASE}/unit/`, { headers }), // Probaremos con /unit/ basado en tu cambio
      ]);

      const parseRes = async (res) => {
        if (!res.ok) return [];
        const data = await res.json();
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.results)) return data.results;
        return [];
      };

      const productsData = await parseRes(prodRes);
      
      // Obtener el stock por cada producto individualmente
      const stockPromises = productsData.map(async (prod) => {
        try {
          const res = await fetch(`${API_BASE}/farms/${farmId}/products/${prod.id}/stock/`, { headers });
          if (!res.ok) return { product: prod.id, current_stock: 0 };
          const data = await res.json();
          // Intentar extraer el stock según varias posibles estructuras
          const stockValue = data.stock ?? data.current_stock ?? data.quantity ?? data.total ?? data ?? 0;
          return { product: prod.id, current_stock: typeof stockValue === 'number' ? stockValue : 0 };
        } catch {
          return { product: prod.id, current_stock: 0 };
        }
      });

      const stocksData = await Promise.all(stockPromises);

      setProducts(productsData);
      setStocks(stocksData);
      setTypes(await parseRes(typesRes));
      setUnits(await parseRes(unitsRes));
    } catch (err) {
      console.error("Error fetching products data:", err);
      toast.error("Error al cargar los datos de productos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (farmId) fetchData();
  }, [farmId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("access");
      const url = editingId 
        ? `${API_BASE}/farms/${farmId}/products/${editingId}/`
        : `${API_BASE}/farms/${farmId}/products/`;
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Error al guardar");

      toast.success(editingId ? "Producto actualizado" : "Producto creado");
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem("access");
      const res = await fetch(`${API_BASE}/farms/${farmId}/products/${id}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Error al eliminar");
      toast.success("Producto eliminado");
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const openEdit = (prod) => {
    setEditingId(prod.id);
    setFormData({
      name: prod.name || "",
      type_product: prod.type_product?.toString() || "",
      unit: prod.unit?.toString() || "",
      minimun_stock_threshold: prod.minimun_stock_threshold || 0,
      comments: prod.comments || "",
    });
    setIsModalOpen(true);
  };

  const openCreate = () => {
    setEditingId(null);
    setFormData({
      name: "",
      type_product: "",
      unit: "",
      minimun_stock_threshold: 0,
      comments: "",
    });
    setIsModalOpen(true);
  };

  // Maps for display
  const typeMap = new Map(types.map(t => [t.id, t.name]));
  const unitMap = new Map(units.map(u => [u.id, u.name || u.symbol]));
  
  // Try to find stock, assuming stock API returns array of objects with product ID and current_stock, or just objects.
  const getStock = (productId) => {
    const stockObj = stocks.find(s => s.product === productId || s.id === productId);
    return stockObj ? (stockObj.current_stock ?? stockObj.stock ?? stockObj.quantity ?? 0) : 0;
  };

  if (loading) {
    return <div className="py-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600"/></div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800">Catálogo de Productos</h2>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" /> Agregar Producto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Producto</Label>
                <Select value={formData.type_product} onValueChange={v => setFormData({...formData, type_product: v})}>
                  <SelectTrigger><SelectValue placeholder="Seleccione un tipo" /></SelectTrigger>
                  <SelectContent>
                    {types.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unidad</Label>
                <Select value={formData.unit} onValueChange={v => setFormData({...formData, unit: v})}>
                  <SelectTrigger><SelectValue placeholder="Seleccione una unidad" /></SelectTrigger>
                  <SelectContent>
                    {units.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.name || u.symbol}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Stock Mínimo</Label>
                <Input type="number" value={formData.minimun_stock_threshold} onChange={e => setFormData({...formData, minimun_stock_threshold: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Comentarios</Label>
                <Input value={formData.comments} onChange={e => setFormData({...formData, comments: e.target.value})} />
              </div>
              <DialogFooter>
                <Button type="submit">Guardar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
            <tr>
              <th className="p-4">Nombre</th>
              <th className="p-4">Tipo</th>
              <th className="p-4">Unidad</th>
              <th className="p-4">Stock</th>
              <th className="p-4">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.length === 0 ? (
              <tr><td colSpan="5" className="p-4 text-center">No hay productos</td></tr>
            ) : products.map((prod) => (
              <tr key={prod.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 font-medium text-slate-900">{prod.name}</td>
                <td className="p-4">{typeMap.get(prod.type_product) || prod.type_product}</td>
                <td className="p-4">{unitMap.get(prod.unit) || prod.unit}</td>
                <td className="p-4 font-bold">{getStock(prod.id)}</td>
                <td className="p-4 flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(prod)}>
                    <Pencil className="w-4 h-4 text-blue-600" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash className="w-4 h-4 text-red-600" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="max-w-md">
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar {prod.name}?</AlertDialogTitle>
                        <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(prod.id)} className="bg-red-600 hover:bg-red-700">
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
