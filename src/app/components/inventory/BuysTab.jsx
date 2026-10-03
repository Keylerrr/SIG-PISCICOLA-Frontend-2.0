"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
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

export function BuysTab({ farmId }) {
  const [buys, setBuys] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [typeProducts, setTypeProducts] = useState([]);
  const [species, setSpecies] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    supplier: "",
    date: new Date().toISOString().split('T')[0],
    invoice_number: "",
    comments: "",
    details: [],
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access");
      const headers = { Authorization: `Bearer ${token}` };

      const [buysRes, supRes, prodRes, tpRes, specRes] = await Promise.all([
        fetch(`${API_BASE}/farms/${farmId}/buys/`, { headers }),
        fetch(`${API_BASE}/farms/${farmId}/suppliers/`, { headers }),
        fetch(`${API_BASE}/farms/${farmId}/products/`, { headers }),
        fetch(`${API_BASE}/type-products/`, { headers }),
        fetch(`${API_BASE}/species/`, { headers })
      ]);

      if (buysRes.ok) setBuys(await buysRes.json());
      if (supRes.ok) setSuppliers(await supRes.json());
      if (prodRes.ok) setProducts(await prodRes.json());
      if (tpRes.ok) setTypeProducts(await tpRes.json());
      if (specRes.ok) setSpecies(await specRes.json());
    } catch (err) {
      console.error("Error fetching buys:", err);
      toast.error("Error al cargar compras.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!farmId) return;
    
    // Diferir la llamada para evitar la advertencia de "setState síncrono en effect"
    const timer = setTimeout(() => {
      fetchData();
    }, 0);
    
    return () => clearTimeout(timer);
  }, [farmId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.details.length === 0) {
      toast.error("Debe agregar al menos un producto a la compra.");
      return;
    }

    // Validar productos tipo lote
    for (let i = 0; i < formData.details.length; i++) {
      const det = formData.details[i];
      const prod = products.find(p => p.id === parseInt(det.product));
      const tProd = prod ? typeProducts.find(tp => tp.id === prod.type_product) : null;

      if (tProd && tProd.name.toLowerCase() === 'lote') {
        if (!det.batch_data || !det.batch_data.specie_id) {
          toast.error(`El producto '${prod.name}' es tipo Lote y requiere datos de lote (Especie obligatoria).`);
          return;
        }
      }
    }

    try {
      const token = localStorage.getItem("access");
      const url = editingId
        ? `${API_BASE}/farms/${farmId}/buys/${editingId}/`
        : `${API_BASE}/farms/${farmId}/buys/`;

      const payload = {
        ...formData,
        supplier: formData.supplier ? parseInt(formData.supplier) : null,
      };

      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.log("Error de la API:", errData);
        throw new Error(JSON.stringify(errData));
      }

      toast.success(editingId ? "Compra actualizada" : "Compra registrada");
      setIsModalOpen(false);
      fetchData();
      router.refresh();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem("access");
      const res = await fetch(`${API_BASE}/farms/${farmId}/buys/${id}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Error al eliminar");
      toast.success("Compra eliminada");
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const openEdit = (b) => {
    setEditingId(b.id);

    // Reconstruir detalles para garantizar la estructura de batch_data
    const transformedDetails = (b.details || []).map(det => {
      const prod = products.find(p => p.id === det.product);
      const tProd = prod ? typeProducts.find(tp => tp.id === prod.type_product) : null;

      let newDet = { ...det };

      if (tProd && tProd.name.toLowerCase() === 'lote') {
        const bd = det.batch_data || {};
        newDet.batch_data = {
          specie_id: bd.specie_id || bd.specie || "",
          biological_state: bd.biological_state || "alevin",
          min_weight_g: bd.min_weight_g || 0,
          avg_weight_g: bd.avg_weight_g || 0,
          max_weight_g: bd.max_weight_g || 0,
          comments: bd.comments || ""
        };
      } else {
        delete newDet.batch_data;
      }

      return newDet;
    });

    setFormData({
      supplier: b.supplier ? b.supplier.toString() : "",
      date: b.date || "",
      invoice_number: b.invoice_number || "",
      comments: b.comments || "",
      details: transformedDetails,
    });
    setIsModalOpen(true);
  };

  const openCreate = () => {
    setEditingId(null);
    setFormData({
      supplier: "",
      date: new Date().toISOString().split('T')[0],
      invoice_number: "",
      comments: "",
      details: [],
    });
    setIsModalOpen(true);
  };

  const addDetail = () => {
    setFormData({
      ...formData,
      details: [
        ...formData.details,
        { product: "", quantity: 1, unit_value: 0 }
      ]
    });
  };

  const removeDetail = (index) => {
    const newDetails = [...formData.details];
    newDetails.splice(index, 1);
    setFormData({ ...formData, details: newDetails });
  };

  const updateDetail = (index, field, value) => {
    const newDetails = [...formData.details];
    if (field === 'product') {
      newDetails[index].product = value ? parseInt(value) : "";
      // Check if product is Lote
      const prod = products.find(p => p.id === parseInt(value));
      const tProd = typeProducts.find(tp => tp.id === prod?.type_product);
      if (tProd && tProd.name.toLowerCase() === 'lote') {
        newDetails[index].batch_data = {
          specie_id: "",
          biological_state: "alevin",
          min_weight_g: 0,
          avg_weight_g: 0,
          max_weight_g: 0,
          comments: ""
        };
      } else {
        delete newDetails[index].batch_data;
      }
    } else {
      newDetails[index][field] = value;
    }
    setFormData({ ...formData, details: newDetails });
  };

  const updateBatchData = (index, field, value) => {
    const newDetails = [...formData.details];
    newDetails[index].batch_data[field] = value;
    setFormData({ ...formData, details: newDetails });
  };

  const getSupplierName = (id) => {
    const s = suppliers.find(sup => sup.id === id);
    return s ? s.name : "N/A";
  };

  if (loading) {
    return <div className="py-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800">Registro de Compras</h2>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" /> Nueva Compra
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Compra" : "Nueva Compra"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fecha *</Label>
                  <Input type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Proveedor</Label>
                  <Select value={formData.supplier} onValueChange={v => setFormData({ ...formData, supplier: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccione proveedor" /></SelectTrigger>
                    <SelectContent>
                      {suppliers.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Número Factura</Label>
                  <Input value={formData.invoice_number} onChange={e => setFormData({ ...formData, invoice_number: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Comentarios</Label>
                  <Input value={formData.comments} onChange={e => setFormData({ ...formData, comments: e.target.value })} />
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-slate-800">Detalles de Compra</h3>
                  <Button type="button" variant="outline" size="sm" onClick={addDetail}>
                    <Plus className="w-4 h-4 mr-1" /> Agregar Producto
                  </Button>
                </div>

                {formData.details.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded-lg">Agrega productos a la compra.</p>
                ) : (
                  <div className="space-y-4">
                    {formData.details.map((det, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-lg relative">
                        <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-slate-400 hover:text-red-600" onClick={() => removeDetail(idx)}>
                          <X className="w-4 h-4" />
                        </Button>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="space-y-2">
                            <Label>Producto *</Label>
                            <Select value={det.product?.toString()} onValueChange={v => updateDetail(idx, 'product', v)}>
                              <SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                              <SelectContent>
                                {products.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Cantidad *</Label>
                            <Input type="number" step="0.01" min="0.01" required value={det.quantity} onChange={e => updateDetail(idx, 'quantity', parseFloat(e.target.value))} />
                          </div>
                          <div className="space-y-2">
                            <Label>Valor Unitario *</Label>
                            <Input type="number" step="0.01" min="0" required value={det.unit_value} onChange={e => updateDetail(idx, 'unit_value', parseFloat(e.target.value))} />
                          </div>
                        </div>

                        {det.batch_data && (
                          <div className="mt-4 p-4 bg-white border border-blue-100 rounded-md">
                            <h4 className="text-sm font-semibold text-blue-800 mb-3">Datos del Lote</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                              <div className="space-y-2">
                                <Label className="text-xs">Especie</Label>
                                <Select value={det.batch_data.specie_id?.toString()} onValueChange={v => updateBatchData(idx, 'specie_id', parseInt(v))}>
                                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Especie" /></SelectTrigger>
                                  <SelectContent>
                                    {species.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Estado Bio.</Label>
                                <Select value={det.batch_data.biological_state} onValueChange={v => updateBatchData(idx, 'biological_state', v)}>
                                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Estado" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="alevin">Alevín</SelectItem>
                                    <SelectItem value="rising">Levante</SelectItem>
                                    <SelectItem value="fatting">Engorde</SelectItem>
                                    <SelectItem value="breeding">Reproducción</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Peso Min (g)</Label>
                                <Input className="h-8 text-xs" type="number" step="0.01" value={det.batch_data.min_weight_g} onChange={e => updateBatchData(idx, 'min_weight_g', parseFloat(e.target.value))} />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Peso Prom (g)</Label>
                                <Input className="h-8 text-xs" type="number" step="0.01" value={det.batch_data.avg_weight_g} onChange={e => updateBatchData(idx, 'avg_weight_g', parseFloat(e.target.value))} />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Peso Max (g)</Label>
                                <Input className="h-8 text-xs" type="number" step="0.01" value={det.batch_data.max_weight_g} onChange={e => updateBatchData(idx, 'max_weight_g', parseFloat(e.target.value))} />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Comentarios</Label>
                                <Input className="h-8 text-xs" type="text" value={det.batch_data.comments} onChange={e => updateBatchData(idx, 'comments', e.target.value)} />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="submit">Guardar Compra</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
            <tr>
              <th className="p-4">Fecha</th>
              <th className="p-4">Factura</th>
              <th className="p-4">Proveedor</th>
              <th className="p-4">Comentarios</th>
              <th className="p-4">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {buys.length === 0 ? (
              <tr><td colSpan="5" className="p-4 text-center">No hay compras registradas</td></tr>
            ) : buys.map((b) => (
              <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 font-medium text-slate-900">{b.date}</td>
                <td className="p-4">{b.invoice_number || "—"}</td>
                <td className="p-4">{getSupplierName(b.supplier)}</td>
                <td className="p-4">{b.comments || "—"}</td>
                <td className="p-4 flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(b)}>
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
                        <AlertDialogTitle>¿Eliminar compra?</AlertDialogTitle>
                        <AlertDialogDescription>Esta acción no se puede deshacer y revertirá los movimientos de inventario asociados.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(b.id)} className="bg-red-600 hover:bg-red-700">
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
