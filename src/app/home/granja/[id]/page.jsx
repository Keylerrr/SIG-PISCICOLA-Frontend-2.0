"use client";

import {
  hasPermission,
  PERMISSIONS,
} from "@/lib/permissions";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  UserCog,
  Package,
  Plus,
  Loader2,
  Fish,
  Receipt,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Ponds } from "@/app/components/ponds/ponds";
import { Batches } from "@/app/components/batches/batches";
import { BatchRegisterForm } from "@/app/components/batches/batch_form";
import { ProductionPlans } from "@/app/components/production/production_plan";
import { ProductionPlanForm } from "@/app/components/production/production_plan_form";
import { Field, FieldLabel } from "@/components/ui/field";
import { ButtonGroup } from "@/components/ui/button-group";
import { Input } from "@/components/ui/input";
import { PondRegisterForm } from "@/app/components/ponds/pond_form";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function Granja({ params }) {
  const { id } = use(params);

  const [granja, setGranja] = useState([]);
  const [departamentos, setDepartmentos] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [searchBatch, setSearchBatch] = useState("");
  const [searchPlan, setSearchPlan] = useState("");
  const [ciudades, setCiudades] = useState([]);

  const router = useRouter();

  const [myPermissions, setMyPermissions] = useState([]);
  const [myMember, setMyMember] = useState(null);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    let mounted = true;

    try {
      const userString = localStorage.getItem("user");

      if (userString && mounted) {
        Promise.resolve().then(() => {
          if (mounted) {
            setUserData(JSON.parse(userString));
          }
        });
      }
    } catch (error) {
      console.error("Error parsing user data:", error);
    }

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("access");

    fetch("https://backend-pongase-trucha.onrender.com/api/departments/", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Error al traer departamentos");
        return res.json();
      })
      .then((data) => {
        setDepartmentos(data);
      })
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("access");

    fetch(`https://backend-pongase-trucha.onrender.com/api/farms/${id}/`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar granja");
        return res.json();
      })
      .then((data) => {
        setGranja(data);
      })
      .catch((err) => console.error(err));
  }, [id]);

  useEffect(() => {
    fetch("https://backend-pongase-trucha.onrender.com/api/cities/", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access")}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Error al traer ciudades");
        return res.json();
      })
      .then((data) => {
        setCiudades(data);
      })
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("access");

    let userId = null;

    try {
      const userObj = JSON.parse(localStorage.getItem("user"));

      if (userObj) {
        userId = userObj.id;
      }
    } catch (e) {}

    fetch(
      `https://backend-pongase-trucha.onrender.com/api/farms/${id}/members/`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const me = data.find(
            (member) => member.user.id === userId
          );

          if (me) {
            setMyMember(me);
            setMyPermissions(me.permissions || []);
          }
        }
      });
  }, [id]);

  const isFarmOwner = myMember?.is_owner;

  const isProductor =
    userData?.role?.name === "Productor" ||
    userData?.role === "Productor" ||
    userData?.role?.name === "productor";

  const isAdmin =
    userData?.role?.name === "Admin" ||
    userData?.role === "Admin" ||
    userData?.role?.name === "admin";

  // El Productor tiene acceso total si es miembro de la finca
  const hasFullAccess =
    isAdmin ||
    (isProductor && myMember != null) ||
    isProductor;

  const canManagePonds =
    hasFullAccess ||
    isFarmOwner ||
    hasPermission(
      myPermissions,
      PERMISSIONS.MANAGE_POND
    );

  const canManageCycles =
    hasFullAccess ||
    isFarmOwner ||
    hasPermission(
      myPermissions,
      PERMISSIONS.MANAGE_CYCLE
    );

  const canManageFarm =
    hasFullAccess ||
    isFarmOwner ||
    hasPermission(
      myPermissions,
      PERMISSIONS.MANAGE_FARM
    );

  const canManageInventory =
    hasFullAccess ||
    isFarmOwner ||
    hasPermission(
      myPermissions,
      PERMISSIONS.MANAGE_INVENTORY
    );

  return (
    <div className="min-h-screen bg-slate-50">
      {granja.length === 0 && departamentos.length === 0 && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-xl shadow-2xl flex flex-col items-center">
            <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
            <p className="mt-4 font-medium text-slate-700">
              Cargando estanques...
            </p>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <a
          href={"/home"}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800"
        >
          <ArrowLeft className="w-5 h-5" />
          Volver a la Página de Inicio
        </a>
      </div>

      <div className="px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-sm p-6 space-y-6">
          <div className="flex justify-between items-start">
            <h1 className="text-4xl font-bold">
              {granja.name}
            </h1>

            <div className="flex flex-wrap items-center gap-3">
              {canManageInventory && (
                <Button 
                  onClick={() => {
                    router.push(`/home/granja/${id}/inventory`);
                  }}
                  className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl shadow-sm transition-all"
                >
                  <Package className="w-5 h-5" />
                  Inventario
                </Button>
              )}

              {canManageInventory && (
                <Button
                  onClick={() => {
                    router.push(`/home/granja/${id}/sales`);
                  }}
                  className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl shadow-sm transition-all"
                >
                  <Receipt className="w-5 h-5" />
                  Ventas
                </Button>
              )}

              {canManageFarm && (
                <Button
                  onClick={() =>
                    router.push(
                      `/home/granja/${id}/granja_trabajadores`
                    )
                  }
                  className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 hover:-translate-y-0.5 transition-all duration-200 text-white px-5 py-2.5 rounded-xl shadow-sm"
                >
                  <UserCog className="w-5 h-5" />
                  Trabajadores
                </Button>
              )}

              <Button
                asChild
                className="bg-slate-900 hover:bg-slate-800 hover:-translate-y-0.5 transition-all duration-200 text-white px-5 py-2.5 rounded-xl shadow-sm"
              >
                <Link
                  href={`/home/granja/${id}/alimentacion`}
                  className="flex items-center gap-2"
                >
                  <Fish className="w-5 h-5" />
                  Alimentación
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xl">
            <div className="bg-slate-50 p-4 rounded-lg">
              Departamento <br />
              <p className="font-bold">
                {
                  departamentos.find(
                    (d) => d.id === granja.department
                  )?.name
                }
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg">
              Municipio <br />
              <p className="font-bold">
                {ciudades.find((c) => c.id === granja.city)?.name || "—"}
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg">
              Área Total <br />
              <p className="font-bold">
                {granja.total_area_ha} ha
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg">
              Direccion <br />
              <p className="font-bold">
                {granja.address}
              </p>
            </div>

            {granja.water_source?.length > 0 && (
              <div className="bg-slate-50 p-4 rounded-lg">
                Fuente hídrica <br />
                <p className="font-bold">
                  {{
                    river: "Río",
                    stream: "Quebrada",
                    lake: "Lago/Laguna",
                    spring: "Manantial",
                    reservoir: "Embalse",
                    deep_well: "Pozo profundo",
                    municipal: "Acueducto municipal",
                    irrigation_canal: "Canal de riego",
                  }[granja.water_source] || granja.water_source}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ESTANQUES */}
      <div className="mt-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto flex justify-between">
          <div>
            <h1 className="font-bold text-3xl">
              Estanques
            </h1>

            <p className="text-xl">
              Selecciona un estanque para ver especies y calidad del agua
            </p>
          </div>

          {canManagePonds && (
            <div>
              <Dialog>
                <form>
                  <DialogTrigger asChild>
                    <Button
                      className="text-xl flex items-center gap-2 text-white rounded-xl bg-blue-600 px-4 py-5"
                      variant="outline"
                    >
                      <Plus />
                      Agregar Estanque
                    </Button>
                  </DialogTrigger>

                  <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        Agregar Estanque
                      </DialogTitle>

                      <DialogDescription>
                        Escribe la información del estanque que vas a agregar. Haz
                        click en crear cuando hayas terminado.
                      </DialogDescription>
                    </DialogHeader>

                    <PondRegisterForm
                      op={1}
                      idProp={""}
                      idFarmProp={id}
                      nombreProp={""}
                      capacidadProp={""}
                      areaProp={""}
                      volumenProp={""}
                      profundidadProp={""}
                      descripcionProp={""}
                    />
                  </DialogContent>
                </form>
              </Dialog>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row gap-4 sm:items-end sm:justify-between">
          <div className="w-full sm:flex-1">
            <Field className="text-xl">
              <FieldLabel
                htmlFor="input-button-group"
                className="text-xl"
              >
                Buscar
              </FieldLabel>

              <ButtonGroup>
                <Input
                  id="input-button-group"
                  placeholder="Escriba el nombre del estanque..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />

                <Button className="text-md">
                  Buscar
                </Button>
              </ButtonGroup>
            </Field>
          </div>

          <div className="w-full sm:w-50">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filtrar" />
              </SelectTrigger>

              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">
                    Todos
                  </SelectItem>

                  <SelectItem value="active">
                    Activo
                  </SelectItem>

                  <SelectItem value="inactive">
                    Inactivo
                  </SelectItem>

                  <SelectItem value="cleaning">
                    En Limpieza
                  </SelectItem>

                  <SelectItem value="in_use">
                    En Uso
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="mt-6 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <Ponds
          id={id}
          search={search}
          filter={filter}
        />
      </div>

      {/* PLANES DE PRODUCCIÓN */}
      <div className="mt-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto flex justify-between">
          <div>
            <h1 className="font-bold text-3xl">
              Planes de Producción
            </h1>

            <p className="text-xl">
              Define los parámetros esperados para el cultivo
            </p>
          </div>

          {canManageCycles && (
            <div>
              <Dialog>
                <form>
                  <DialogTrigger asChild>
                    <Button
                      className="text-xl flex items-center gap-2 text-white rounded-xl bg-blue-600 px-4 py-5"
                      variant="outline"
                    >
                      <Plus />
                      Nuevo Plan
                    </Button>
                  </DialogTrigger>

                  <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        Registrar Plan de Producción
                      </DialogTitle>

                      <DialogDescription>
                        Complete los detalles del nuevo plan de producción.
                      </DialogDescription>
                    </DialogHeader>

                    <ProductionPlanForm
                      op={1}
                      farmProp={id}
                    />
                  </DialogContent>
                </form>
              </Dialog>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row gap-4 sm:items-end sm:justify-between">
          <div className="w-full sm:flex-1">
            <Field className="text-xl">
              <FieldLabel
                htmlFor="input-search-plans"
                className="text-xl"
              >
                Buscar Plan
              </FieldLabel>

              <ButtonGroup>
                <Input
                  id="input-search-plans"
                  placeholder="Escriba el nombre del plan..."
                  value={searchPlan}
                  onChange={(e) => setSearchPlan(e.target.value)}
                />

                <Button className="text-md">
                  Buscar
                </Button>
              </ButtonGroup>
            </Field>
          </div>
        </div>
      </div>

      <div className="mt-6 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto pb-4">
        <ProductionPlans
          id={id}
          search={searchPlan}
        />
      </div>


      {/* LOTES */}
      <div className="mt-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto flex justify-between">
          <div>
            <h1 className="font-bold text-3xl">
              Lotes
            </h1>

            <p className="text-xl">
              Gestiona los lotes de la granja (sin asociar a estanque)
            </p>
          </div>

          {canManagePonds && (
            <div>
              <Dialog>
                <form>
                  <DialogTrigger asChild>
                    <Button
                      className="text-xl flex items-center gap-2 text-white rounded-xl bg-blue-600 px-4 py-5"
                      variant="outline"
                    >
                      <Plus />
                      Crear Lote
                    </Button>
                  </DialogTrigger>

                  <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        Crear Lote
                      </DialogTitle>

                      <DialogDescription>
                        Escribe la información del lote que vas a crear. Haz
                        click en crear cuando hayas terminado.
                      </DialogDescription>
                    </DialogHeader>

                    <BatchRegisterForm
                      op={1}
                      idProp={""}
                      idFarmProp={id}
                      specieProp={""}
                      biologicalStateProp={""}
                      statusProp={""}
                      initialQuantityProp={""}
                      minWeightGProp={""}
                      avgWeightGProp={""}
                      maxWeightGProp={""}
                      commentsProp={""}
                    />
                  </DialogContent>
                </form>
              </Dialog>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row gap-4 sm:items-end sm:justify-between">
          <div className="w-full sm:flex-1">
            <Field className="text-xl">
              <FieldLabel
                htmlFor="input-search-batches"
                className="text-xl"
              >
                Buscar Lote
              </FieldLabel>

              <ButtonGroup>
                <Input
                  id="input-search-batches"
                  placeholder="Escriba el estado o tipo..."
                  value={searchBatch}
                  onChange={(e) =>
                    setSearchBatch(e.target.value)
                  }
                />

                <Button className="text-md">
                  Buscar
                </Button>
              </ButtonGroup>
            </Field>
          </div>
        </div>
      </div>

      <div className="mt-6 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto pb-12">
        <Batches
          id={id}
          search={searchBatch}
        />
      </div>
    </div>
  );
}