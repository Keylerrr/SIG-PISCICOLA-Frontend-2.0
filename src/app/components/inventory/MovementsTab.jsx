"use client";

import { useEffect, useState } from "react";
import { Loader2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const API_BASE = "https://backend-pongase-trucha.onrender.com/api";

export function MovementsTab({ farmId }) {
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [typeProducts, setTypeProducts] = useState([]);
  const [filterTypeProduct, setFilterTypeProduct] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("access");
        const headers = { Authorization: `Bearer ${token}` };

        const [movRes, prodRes, tpRes] = await Promise.all([
          fetch(`${API_BASE}/farms/${farmId}/inventory-movements/`, { headers }),
          fetch(`${API_BASE}/farms/${farmId}/products/`, { headers }),
          fetch(`${API_BASE}/type-products/`, { headers })
        ]);

        if (movRes.ok) setMovements(await movRes.json());
        if (prodRes.ok) setProducts(await prodRes.json());
        if (tpRes.ok) setTypeProducts(await tpRes.json());
      } catch (err) {
        console.error("Error fetching movements:", err);
        toast.error("Error al cargar movimientos de inventario.");
      } finally {
        setLoading(false);
      }
    };

    if (!farmId) return;
    
    // Diferir la llamada para evitar advertencias de React
    const timer = setTimeout(() => {
      fetchData();
    }, 0);
    
    return () => clearTimeout(timer);
  }, [farmId]);

  const getProductName = (id) => {
    const p = products.find(prod => prod.id === id);
    return p ? p.name : "N/A";
  };

  const getMovementTypeStyle = (type) => {
    const isEntry = type === 'ENTRY' || type === 'IN' || type.toLowerCase().includes('entrada');
    return {
      text: type,
      color: isEntry ? 'text-green-600 bg-green-50 border-green-200' : 'text-red-600 bg-red-50 border-red-200',
      icon: isEntry ? <ArrowDownRight className="w-4 h-4 mr-1" /> : <ArrowUpRight className="w-4 h-4 mr-1" />
    };
  };

  const filteredMovements = movements.filter(mov => {
    if (filterTypeProduct === "all") return true;
    const prod = products.find(p => p.id === mov.product);
    if (!prod) return false;
    return prod.type_product?.toString() === filterTypeProduct;
  });

  if (loading) {
    return <div className="py-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600"/></div>;
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Historial de Movimientos</h2>
          <p className="text-sm text-slate-500">Consulta los ingresos y salidas de productos del inventario.</p>
        </div>

        <div className="w-full sm:w-64">
          <Select value={filterTypeProduct} onValueChange={setFilterTypeProduct}>
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Filtrar por tipo..." />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {typeProducts.map(tp => (
                  <SelectItem key={tp.id} value={tp.id.toString()}>{tp.name}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
            <tr>
              <th className="p-4">Fecha</th>
              <th className="p-4">Producto</th>
              <th className="p-4">Tipo</th>
              <th className="p-4 text-right">Cantidad</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredMovements.length === 0 ? (
              <tr><td colSpan="4" className="p-4 text-center">No hay movimientos registrados para este filtro</td></tr>
            ) : filteredMovements.map((mov) => {
              const style = getMovementTypeStyle(mov.movement_type || mov.type);
              const date = new Date(mov.created_at || mov.date).toLocaleString();

              return (
                <tr key={mov.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">{date}</td>
                  <td className="p-4 font-medium text-slate-900">{getProductName(mov.product)}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style.color}`}>
                      {style.icon} {style.text}
                    </span>
                  </td>
                  <td className="p-4 text-right font-bold">{mov.quantity}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
