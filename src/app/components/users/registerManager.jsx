"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { toast } from "sonner";

export function RegisterManager() {
  const [productores, setProductores] = useState([]);

  const [correo, setCorreo] = useState("");
  const [open, setOpen] = useState(false);

  const fetchProductores = async () => {
    const token = localStorage.getItem("access");
    if (!token) return;

    try {
      const res = await fetch(
        "https://backend-pongase-trucha.onrender.com/api/users/productor/",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) throw new Error();

      const data = await res.json();
      setProductores(data);
    } catch (err) {
      console.error(err);
      toast.error("Error cargando productores");
    }
  };

  useEffect(() => {
    fetchProductores();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!correo) {
      toast.error("El correo es obligatorio");
      return;
    }

    const token = localStorage.getItem("access");

    await toast.promise(
      fetch("https://backend-pongase-trucha.onrender.com/api/invitations/productor/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: correo,
        }),
      }).then(async (res) => {
        let data = null;
        try {
          data = await res.json();
        } catch { }

        if (!res.ok) {
          throw new Error(data?.message || "Error al guardar");
        }

        await fetchProductores();

        return data;
      }),
      {
        loading: "Creando Productor...",
        success: () => {
          setCorreo("");
          setOpen(false);

          return "Enviando credenciales";
        },
        error: (err) => err.message || "Error al guardar",
      }
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Gestión de Productores</h1>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg">
              <Plus className="w-4 h-4" />
              Agregar
            </button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar Productor</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <FieldGroup>
                <Field>
                  <Label>Correo</Label>
                  <Input
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    required
                  />
                </Field>
              </FieldGroup>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">Guardar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {productores.length === 0 ? (
          <p className="text-gray-500">No hay productores aún</p>
        ) : (
          productores.map((p) => (
            <div key={p.id} className="border rounded-lg p-4 group border border-gray-200 hover:border-blue-500 hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
              <p className="font-bold group-hover:text-blue-600">
                {p.name} {p.lastname}
              </p>
              <p className="text-sm text-gray-500">{p.email}</p>
              <p className="text-sm">{p.phone}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
