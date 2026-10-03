"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Package, Truck, ShoppingCart, ArrowRightLeft, ArrowLeft } from "lucide-react";
import { ProductsTab } from "@/app/components/inventory/ProductsTab";
import { SuppliersTab } from "@/app/components/inventory/SuppliersTab";
import { BuysTab } from "@/app/components/inventory/BuysTab";
import { MovementsTab } from "@/app/components/inventory/MovementsTab";
import { Toaster } from "sonner";

export default function InventoryContent({ farmId }) {
  const [activeTab, setActiveTab] = useState("products");
  const router = useRouter();

  const tabs = [
    { id: "products", name: "Productos", icon: Package },
    { id: "suppliers", name: "Proveedores", icon: Truck },
    { id: "buys", name: "Compras", icon: ShoppingCart },
    { id: "movements", name: "Movimientos", icon: ArrowRightLeft },
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <Toaster position="top-center" />
      <div className="max-w-7xl mx-auto px-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 hover:cursor-pointer mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Volver a la Vista de la Granja
        </button>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Inventario</h1>
            <p className="text-slate-600">Gestiona los productos, proveedores y movimientos</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-50">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium text-sm whitespace-nowrap transition-colors ${
                    isActive 
                      ? "text-blue-600 border-b-2 border-blue-600 bg-white" 
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.name}
                </button>
              );
            })}
          </div>

          <div className="p-6 overflow-x-auto">
            {activeTab === "products" && <ProductsTab farmId={farmId} />}
            {activeTab === "suppliers" && <SuppliersTab farmId={farmId} />}
            {activeTab === "buys" && <BuysTab farmId={farmId} />}
            {activeTab === "movements" && <MovementsTab farmId={farmId} />}
          </div>
        </div>

      </div>
    </div>
  );
}