'use client';

import { useState, useEffect } from 'react';
import { toast, Toaster } from 'sonner';
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Pencil, Lock, Save, X, UserRound, ArrowLeft, ShieldCheck, Mail, Phone, CreditCard } from 'lucide-react';
import { useRouter } from 'next/navigation';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function PerfilPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [openPasswordModal, setOpenPasswordModal] = useState(false);

  // Original profile data (for cancel)
  const [originalData, setOriginalData] = useState({});

  // Profile fields
  const [name, setName] = useState('');
  const [lastname, setLastname] = useState('');
  const [phone, setPhone] = useState('');
  const [cc, setCc] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  
  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    const token = localStorage.getItem("access");
    try {
      const res = await fetch("https://backend-pongase-trucha.onrender.com/api/users/me/", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOriginalData(data);
        setName(data.name || '');
        setLastname(data.lastname || '');
        setPhone(data.phone || '');
        setCc(data.cc || '');
        setEmail(data.email || '');
        setRole(data.role?.name || '');
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setName(originalData.name || '');
    setLastname(originalData.lastname || '');
    setPhone(originalData.phone || '');
    setIsEditing(false);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    const token = localStorage.getItem("access");
    try {
      const res = await fetch("https://backend-pongase-trucha.onrender.com/api/users/me/", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, lastname, phone }),
      });
      if (res.ok) {
        const data = await res.json();
        setOriginalData(data);
        localStorage.setItem("user", JSON.stringify(data));
        toast.success("Perfil actualizado correctamente");
        setIsEditing(false);
      } else {
        const err = await res.json();
        toast.error(err.detail || "Error al actualizar perfil");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error de conexión");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setSavingPassword(true);
    const token = localStorage.getItem("access");
    try {
      const res = await fetch("https://backend-pongase-trucha.onrender.com/api/auth/change-password/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        }),
      });
      if (res.ok) {
        toast.success("Contraseña actualizada correctamente");
        setCurrentPassword('');
        setNewPassword('');
        setOpenPasswordModal(false);
      } else {
        const err = await res.json();
        toast.error(err.detail || err.current_password?.[0] || "Error al cambiar contraseña");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error de conexión");
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-slate-500 text-lg">Cargando tu perfil...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <Toaster position="top-center" />
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/home')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver al Inicio
          </button>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
          
          {/* Banner & Avatar */}
          <div className="h-32 bg-linear-to-r from-blue-600 to-cyan-500 relative">
            <div className="absolute -bottom-12 left-8">
              <div className="bg-white p-2 rounded-full shadow-lg">
                <div className="bg-blue-100 p-6 rounded-full">
                  <UserRound className="w-12 h-12 text-blue-600" />
                </div>
              </div>
            </div>
            <div className="absolute top-6 right-8 flex gap-3">
               <Dialog open={openPasswordModal} onOpenChange={setOpenPasswordModal}>
                <DialogTrigger asChild>
                  <Button variant="secondary" className="bg-white/90 hover:bg-white text-slate-800 shadow-sm transition-all gap-2">
                    <Lock className="w-4 h-4" />
                    Cambiar Contraseña
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Lock className="w-5 h-5 text-blue-600" /> 
                      Cambiar Contraseña
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleChangePassword} className="space-y-4 mt-4">
                    <FieldGroup>
                      <Field>
                        <FieldLabel>Contraseña Actual</FieldLabel>
                        <Input 
                          type="password" 
                          value={currentPassword} 
                          onChange={e => setCurrentPassword(e.target.value)} 
                          required 
                        />
                      </Field>
                      <Field>
                        <FieldLabel>Nueva Contraseña</FieldLabel>
                        <Input 
                          type="password" 
                          value={newPassword} 
                          onChange={e => setNewPassword(e.target.value)} 
                          required 
                          minLength={8}
                          placeholder="Mínimo 8 caracteres"
                        />
                      </Field>
                      <div className="flex justify-end pt-2">
                        <Button type="submit" disabled={savingPassword} className="bg-blue-600 hover:bg-blue-700">
                          {savingPassword ? "Actualizando..." : "Actualizar Contraseña"}
                        </Button>
                      </div>
                    </FieldGroup>
                  </form>
                </DialogContent>
              </Dialog>

              {!isEditing && (
                <Button 
                  onClick={() => setIsEditing(true)} 
                  className="bg-white hover:bg-slate-50 text-blue-600 shadow-md transition-all gap-2"
                >
                  <Pencil className="w-4 h-4" />
                  Editar Datos
                </Button>
              )}
            </div>
          </div>

          {/* Profile Details */}
          <div className="pt-16 pb-8 px-8 sm:px-12">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-800">{originalData.name} {originalData.lastname}</h1>
              <p className="text-lg text-slate-500 capitalize flex items-center gap-2 mt-1">
                <ShieldCheck className="w-5 h-5 text-blue-500" />
                Rol: {role}
              </p>
            </div>

            {isEditing ? (
              <form onSubmit={handleUpdateProfile} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <h3 className="text-xl font-bold mb-6 text-slate-800">Editar Información</h3>
                <FieldGroup>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <Field>
                      <FieldLabel className="text-slate-700">Nombre</FieldLabel>
                      <Input value={name} onChange={e => setName(e.target.value)} required className="bg-white" />
                    </Field>
                    <Field>
                      <FieldLabel className="text-slate-700">Apellido</FieldLabel>
                      <Input value={lastname} onChange={e => setLastname(e.target.value)} required className="bg-white" />
                    </Field>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <Field>
                      <FieldLabel className="text-slate-700">Teléfono</FieldLabel>
                      <Input value={phone} onChange={e => setPhone(e.target.value)} className="bg-white" />
                    </Field>
                    {/* Disabled fields shown for context */}
                    <Field>
                      <FieldLabel className="text-slate-500">Cédula (No editable)</FieldLabel>
                      <Input value={cc} disabled className="bg-slate-100 text-slate-500 cursor-not-allowed" />
                    </Field>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-slate-200 mt-2">
                    <Button type="submit" disabled={savingProfile} className="bg-blue-600 hover:bg-blue-700 gap-2">
                      <Save className="w-4 h-4" />
                      {savingProfile ? "Guardando..." : "Guardar Cambios"}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={savingProfile} className="gap-2 text-slate-600">
                      <X className="w-4 h-4" />
                      Cancelar
                    </Button>
                  </div>
                </FieldGroup>
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 animate-in fade-in duration-500">
                
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-blue-50 p-3 rounded-xl">
                      <UserRound className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Nombre Completo</p>
                      <p className="text-lg font-medium text-slate-800">{originalData.name} {originalData.lastname}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="bg-emerald-50 p-3 rounded-xl">
                      <CreditCard className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Cédula</p>
                      <p className="text-lg font-medium text-slate-800">{cc || 'No registrada'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-purple-50 p-3 rounded-xl">
                      <Mail className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Correo Electrónico</p>
                      <p className="text-lg font-medium text-slate-800">{email || 'No registrado'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="bg-amber-50 p-3 rounded-xl">
                      <Phone className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Teléfono</p>
                      <p className="text-lg font-medium text-slate-800">{phone || 'No registrado'}</p>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
