"use client";

import { useState } from "react";
import { Package, Truck, ShoppingCart, ArrowRightLeft } from "lucide-react";
import { ProductsTab } from "@/app/components/inventory/ProductsTab";
import { SuppliersTab } from "@/app/components/inventory/SuppliersTab";
import { BuysTab } from "@/app/components/inventory/BuysTab";
import { MovementsTab } from "@/app/components/inventory/MovementsTab";
import { Toaster } from "sonner";

export default function InventoryContent({
  farmId,
  canViewProducts = false,
  canViewPurchases = false,
}) {
  const [selectedTab, setSelectedTab] = useState("products");

  const tabs = [
    { id: "products", name: "Productos", icon: Package, visible: canViewProducts },
    { id: "suppliers", name: "Proveedores", icon: Truck, visible: canViewPurchases },
    { id: "buys", name: "Compras", icon: ShoppingCart, visible: canViewPurchases },
    { id: "movements", name: "Movimientos", icon: ArrowRightLeft, visible: canViewProducts },
  ];
  const visibleTabs = tabs.filter((tab) => tab.visible);
  const activeTab = visibleTabs.some((tab) => tab.id === selectedTab)
    ? selectedTab
    : visibleTabs[0]?.id;

  return (
    <div>
  <Toaster position="top-center" />
  <div>

    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Inventario</h2>
        <p className="text-sm text-slate-500">Gestiona los productos, proveedores y movimientos</p>
      </div>
    </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-50">
            {visibleTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedTab(tab.id)}
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
            {activeTab === "products" && canViewProducts && (
              <ProductsTab farmId={farmId} />
            )}
            {activeTab === "suppliers" && canViewPurchases && (
              <SuppliersTab farmId={farmId} />
            )}
            {activeTab === "buys" && canViewPurchases && (
              <BuysTab farmId={farmId} />
            )}
            {activeTab === "movements" && canViewProducts && (
              <MovementsTab farmId={farmId} />
            )}
            {visibleTabs.length === 0 && (
              <p className="text-sm text-slate-500">
                No tienes permisos para ver los módulos de inventario.
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}