"use client";

import {
  hasPermission,
  PERMISSIONS,
} from "@/lib/permissions";
import { Suspense, use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  UserCog,
  Package,
  Plus,
  Loader2,
  Receipt,
  Search,
  Factory,
  Waves,
  CalendarClock,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Ponds } from "@/app/components/ponds/ponds";
import { Batches } from "@/app/components/batches/batches";
import { BatchRegisterForm } from "@/app/components/batches/batch_form";
import { ProductionPlans } from "@/app/components/production/production_plan";
import { ProductionPlanForm } from "@/app/components/production/production_plan_form";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PondRegisterForm } from "@/app/components/ponds/pond_form";
import { FeedingSchedules } from "@/app/components/feeding/feeding_schedules_tab";
import { FarmWorkers } from "@/app/components/workers/farm_workers_tab";
import InventoryContent from "@/app/home/granja/[id]/inventory/InventoryContent";
import SalesContent from "@/app/home/granja/[id]/sales/SalesContent";

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

/* ---------- Piezas visuales locales (sin lógica de negocio) ---------- */

function InfoItem({ label, children }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-semibold text-slate-900">
        {children}
      </dd>
    </div>
  );
}

function SearchBox({ id, label, placeholder, value, onChange }) {
  return (
    <Field className="w-full sm:max-w-sm">
      <FieldLabel htmlFor={id} className="sr-only">
        {label}
      </FieldLabel>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          id={id}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-9"
        />
      </div>
    </Field>
  );
}

function ModuleHeader({ title, description, action }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      {action}
    </div>
  );
}

const primaryBtn =
  "bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-300 rounded-lg shadow-sm";

export default function Granja({ params }) {
  const { id } = use(params);

  const [granja, setGranja] = useState([]);
  const [departamentos, setDepartmentos] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [searchBatch, setSearchBatch] = useState("");
  const [searchPlan, setSearchPlan] = useState("");
  const [ciudades, setCiudades] = useState([]);
  const [tab, setTab] = useState("produccion");
  const [subTab, setSubTab] = useState("planes");

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

  /* Pestañas principales.
     - "panel": se muestra dentro de esta página.
     - "href": abre la ruta existente (las rutas no cambian).
     Los permisos son los mismos que tenían los botones originales. */
  const mainTabs = [
    { key: "produccion", label: "Producción", icon: Factory, visible: true },
    { key: "estanques", label: "Estanques", icon: Waves, visible: true },
    {
      key: "inventario",
      label: "Inventario",
      icon: Package,
      visible: canManageInventory,
    },
    {
      key: "ventas",
      label: "Ventas",
      icon: Receipt,
      visible: canManageInventory,
    },
    {
      key: "personal",
      label: "Personal",
      icon: UserCog,
      visible: canManageFarm,
    },
  ];

  const subTabs = [
    { key: "planes", label: "Planes" },
    { key: "lotes", label: "Lotes" },
    {
      key: "cronogramas",
      label: "Cronogramas",
      icon: CalendarClock,
    },
  ];

  return (
    <div className="relative min-h-screen bg-slate-50">
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

      <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        {/* Volver */}
        <a
          href={"/home"}
          className="inline-flex items-center gap-2 rounded text-sm text-slate-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a la Página de Inicio
        </a>

        {/* CABECERA DE LA GRANJA */}
        <header className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            {granja.name}
          </h1>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-slate-100 pt-4 sm:grid-cols-3 lg:grid-cols-5">
            <InfoItem label="Departamento">
              {departamentos.find((d) => d.id === granja.department)?.name || "—"}
            </InfoItem>

            <InfoItem label="Municipio">
              {ciudades.find((c) => c.id === granja.city)?.name || "—"}
            </InfoItem>

            <InfoItem label="Área total">
              {granja.total_area_ha} ha
            </InfoItem>

            <InfoItem label="Dirección">
              {granja.address}
            </InfoItem>

            {granja.water_source?.length > 0 && (
              <InfoItem label="Fuente hídrica">
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
              </InfoItem>
            )}
          </dl>
        </header>

        {/* PESTAÑAS PRINCIPALES */}
        <div
          role="tablist"
          aria-label="Secciones de la granja"
          className="flex gap-1 overflow-x-auto border-b border-slate-200"
        >
          {mainTabs
            .filter((t) => t.visible)
            .map((t) => {
              const Icon = t.icon;
              const isLink = Boolean(t.href);
              const active = !isLink && tab === t.key;

              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  id={`tab-${t.key}`}
                  aria-selected={active}
                  aria-controls={isLink ? undefined : `panel-${t.key}`}
                  onClick={() =>
                    isLink ? router.push(t.href) : setTab(t.key)
                  }
                  className={`flex items-center gap-2 whitespace-nowrap rounded-t border-b-2 px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${
                    active
                      ? "border-blue-600 text-blue-700"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                  {isLink && (
                    <ArrowUpRight className="h-3 w-3 text-slate-400" />
                  )}
                </button>
              );
            })}
        </div>

        {/* Los módulos permanecen montados y solo se ocultan:
            no se pierden datos ni se repiten las consultas al cambiar de pestaña. */}

        {/* ===== PRODUCCIÓN (con subpestañas) ===== */}
        <div
          role="tabpanel"
          id="panel-produccion"
          aria-labelledby="tab-produccion"
          hidden={tab !== "produccion"}
          className="space-y-5"
        >
          <div
            role="tablist"
            aria-label="Producción"
            className="inline-flex max-w-full gap-1 overflow-x-auto rounded-lg bg-slate-200/70 p-1"
          >
            {subTabs.map((s) => {
              const Icon = s.icon;
              const isLink = Boolean(s.href);
              const active = !isLink && subTab === s.key;

              return (
                <button
                  key={s.key}
                  type="button"
                  role="tab"
                  id={`subtab-${s.key}`}
                  aria-selected={active}
                  aria-controls={isLink ? undefined : `subpanel-${s.key}`}
                  onClick={() =>
                    isLink ? router.push(s.href) : setSubTab(s.key)
                  }
                  className={`flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${
                    active
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  {s.label}
                  {isLink && (
                    <ArrowUpRight className="h-3 w-3 text-slate-400" />
                  )}
                </button>
              );
            })}
          </div>

          {/* PLANES */}
          <section
            role="tabpanel"
            id="subpanel-planes"
            aria-labelledby="subtab-planes"
            hidden={subTab !== "planes"}
            className="space-y-4"
          >
            <ModuleHeader
              title="Planes de producción"
              description="Define los parámetros esperados para el cultivo."
              action={
                canManageCycles && (
                  <Dialog>
                    <form>
                      <DialogTrigger asChild>
                        <Button className={primaryBtn}>
                          <Plus className="w-4 h-4" />
                          Nuevo plan
                        </Button>
                      </DialogTrigger>

                      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Registrar plan de producción</DialogTitle>

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
                )
              }
            />

            <SearchBox
              id="input-search-plans"
              label="Buscar plan"
              placeholder="Buscar por nombre del plan..."
              value={searchPlan}
              onChange={setSearchPlan}
            />

            <ProductionPlans
              id={id}
              search={searchPlan}
            />
          </section>

          {/* LOTES */}
          <section
            role="tabpanel"
            id="subpanel-lotes"
            aria-labelledby="subtab-lotes"
            hidden={subTab !== "lotes"}
            className="space-y-4 pb-8"
          >
            <ModuleHeader
              title="Lotes"
              description="Gestiona los lotes de la granja (sin asociar a estanque)."
              action={
                canManagePonds && (
                  <Dialog>
                    <form>
                      <DialogTrigger asChild>
                        <Button className={primaryBtn}>
                          <Plus className="w-4 h-4" />
                          Crear lote
                        </Button>
                      </DialogTrigger>

                      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Crear lote</DialogTitle>

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
                )
              }
            />

            <SearchBox
              id="input-search-batches"
              label="Buscar lote"
              placeholder="Buscar por estado o tipo..."
              value={searchBatch}
              onChange={setSearchBatch}
            />

            <Batches
              id={id}
              search={searchBatch}
            />
          </section>

          {/* CRONOGRAMAS (antes la página de Alimentación) */}
          <section
            role="tabpanel"
            id="subpanel-cronogramas"
            aria-labelledby="subtab-cronogramas"
            hidden={subTab !== "cronogramas"}
            className="pb-8"
          >
            {tab === "produccion" && subTab === "cronogramas" && (
              <FeedingSchedules id={id} />
            )}
          </section>
        </div>

        {/* ===== ESTANQUES ===== */}
        <section
          role="tabpanel"
          id="panel-estanques"
          aria-labelledby="tab-estanques"
          hidden={tab !== "estanques"}
          className="space-y-4 pb-8"
        >
          <ModuleHeader
            title="Estanques"
            description="Selecciona un estanque para ver especies y calidad del agua."
            action={
              canManagePonds && (
                <Dialog>
                  <form>
                    <DialogTrigger asChild>
                      <Button className={primaryBtn}>
                        <Plus className="w-4 h-4" />
                        Agregar estanque
                      </Button>
                    </DialogTrigger>

                    <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Agregar estanque</DialogTitle>

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
              )
            }
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchBox
              id="input-button-group"
              label="Buscar estanque"
              placeholder="Buscar por nombre del estanque..."
              value={search}
              onChange={setSearch}
            />

            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>

              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                  <SelectItem value="cleaning">En Limpieza</SelectItem>
                  <SelectItem value="in_use">En Uso</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <Ponds
            id={id}
            search={search}
            filter={filter}
          />
        </section>

        {/* ===== INVENTARIO (antes /inventory) ===== */}
        <section
          role="tabpanel"
          id="panel-inventario"
          aria-labelledby="tab-inventario"
          hidden={tab !== "inventario"}
          className="pb-8"
        >
          {tab === "inventario" && canManageInventory && (
            <Suspense fallback={<div>Cargando...</div>}>
              <InventoryContent farmId={id} />
            </Suspense>
          )}
        </section>

        {/* ===== VENTAS (antes /sales) ===== */}
        <section
          role="tabpanel"
          id="panel-ventas"
          aria-labelledby="tab-ventas"
          hidden={tab !== "ventas"}
          className="pb-8"
        >
          {tab === "ventas" && canManageInventory && (
            <Suspense fallback={<div>Cargando...</div>}>
              <SalesContent farmId={id} />
            </Suspense>
          )}
        </section>

        {/* ===== PERSONAL (antes la página de Trabajadores) ===== */}
        <section
          role="tabpanel"
          id="panel-personal"
          aria-labelledby="tab-personal"
          hidden={tab !== "personal"}
          className="pb-8"
        >
          {tab === "personal" && canManageFarm && (
            <FarmWorkers id={id} />
          )}
        </section>
      </div>
    </div>
  );
}