"use client";

import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LogOut, Settings, UserRound, Fish, UserRoundPlus, Package, Bell, UsersRound } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertsTab } from '../inventory/AlertsTab';
import { useAlerts } from '@/hooks/useAlerts';

export function Navbar() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const [userData, setUserData] = useState({
    name: "Cargando...",
    role: "Usuario"
  });
  
  const { alerts, unreadCount, markAllAsRead, fetchAlerts, markAsRead } = useAlerts();
  const [openAlerts, setOpenAlerts] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const userString = localStorage.getItem("user");
        if (userString) {
          setUserData(JSON.parse(userString));
        }
      } catch {
        setUserData({ name: "Cargando...", role: "Usuario" });
      }
    }, 0);
    
    return () => clearTimeout(timer);
  }, []);

  const handleLogout = async (e) => {
    e.preventDefault()
    setIsLoading(true);


    try {

      const token = localStorage.getItem("access")
      const refresh = localStorage.getItem("refresh");

      const res = await fetch("https://backend-pongase-trucha.onrender.com/api/auth/logout/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          refresh: refresh,
        })
      })

      if (!res.ok) {
        setIsLoading(false);
        throw new Error("Error al cerrar sesion")
      }

      localStorage.clear();
      router.push('/');

    } catch (error) {
      console.error(error)
      setIsLoading(false)
    }
  };

  const handleSettings = () => {
    router.push('/manageUsers');
  };

  const handleHome = () => {
    router.push('/home');
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[9999] bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <p className="text-lg font-semibold">Cerrando sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          <button
            onClick={handleHome}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity hover:cursor-pointer"
          >

            <Image 
              src="/images/PongaseTrucha.png" 
              alt="Pongase Trucha Logo" 
              width={48} 
              height={48} 
              className="w-12 h-12" 
            />
            <span className="text-xl font-bold text-[#4F8FB3]">
              Póngase Trucha
            </span>
          </button>

          <div className="flex items-center gap-4">

            <button 
              onClick={() => router.push('/home/perfil')}
              className="flex items-center gap-3 px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer text-left"
            >
              <div className="bg-gray-200 p-2 rounded-full">
                <UserRound className="w-5 h-5 text-slate-700" />
              </div>
              <div>
                <p className="font-bold text-sm text-slate-800">
                  {userData.name}
                </p>
                <p className="text-xs capitalize text-slate-600">
                  {userData.role?.name}
                </p>
              </div>
            </button>

            {(userData.role?.name?.toLowerCase() === 'productor' || 
            userData.role?.name?.toLowerCase() === 'admin') && (
              <>
                <button 
                  title='Agregar Trabajadores'
                  onClick={handleSettings}
                  className="relative p-2 rounded-full hover:bg-gray-100 transition-colors hover:cursor-pointer flex items-center justify-center"
                >
                  <UsersRound className="w-5 h-5 text-slate-700" />
                </button>
              </>
            )}

          <Popover open={openAlerts} onOpenChange={setOpenAlerts}>
              <PopoverTrigger asChild>
                <button
                  title='Ver Alertas'
                  className="relative p-2 rounded-full hover:bg-gray-100 transition-colors hover:cursor-pointer flex items-center justify-center"
                  aria-label="Alertas"
                >
                  <Bell className="w-5 h-5 text-slate-700" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full font-bold">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-96 p-0" align="end">
                {alerts.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500 text-center py-8">
                    No hay alertas activas
                  </div>
                ) : (
                  <AlertsTab 
                    alerts={alerts}
                    onMarkAllAsRead={markAllAsRead}
                    onAlertRead={markAsRead}
                    compact
                  />
                )}
              </PopoverContent>
            </Popover>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors hover:cursor-pointer"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-md font-bold">Salir</span>
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}
