"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash,
  Loader2,
  Eye,
  Search,
  Eraser,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { salesService } from "@/lib/salesService";
import {
  CLIENT_TYPE_LABELS,
  DOCUMENT_TYPE_LABELS,
} from "@/lib/salesConstants";
import { formatApiError } from "@/lib/salesUtils";
import { ClientForm, getEmptyClientForm } from "./ClientForm";

export function ClientsTable({ farmId }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filterClientType, setFilterClientType] = useState("all");
  const [filterDocumentType, setFilterDocumentType] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchApplied, setSearchApplied] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(getEmptyClientForm());

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailClient, setDetailClient] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [deleteBlockOpen, setDeleteBlockOpen] = useState(false);
  const [deleteBlockMessage, setDeleteBlockMessage] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmDeleteName, setConfirmDeleteName] = useState("");

  const fetchData = useCallback(async () => {
    if (!farmId) return;
    setLoading(true);
    setError(null);
    try {
      const filters = {};
      if (filterClientType !== "all") filters.client_type = filterClientType;
      if (filterDocumentType !== "all")
        filters.document_type = filterDocumentType;
      if (searchApplied) filters.search = searchApplied;

      const data = await salesService.getClients(farmId, filters);
      setClients(data);
    } catch (err) {
      console.error(err);
      if (err.status === 401) {
        window.location.href = "/login";
        return;
      }
      setError(formatApiError(err));
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [farmId, filterClientType, filterDocumentType, searchApplied]);

  useEffect(() => {
    const timer = setTimeout(() => fetchData(), 0);
    return () => clearTimeout(timer);
  }, [fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await salesService.updateClient(farmId, editingId, formData);
        toast.success("Cliente actualizado");
      } else {
        await salesService.createClient(farmId, formData);
        toast.success("Cliente creado");
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      if (err.status === 401) {
        window.location.href = "/login";
        return;
      }
      toast.error(formatApiError(err));
    }
  };

  const handleDeleteAttempt = async (client) => {
    try {
      const result = await salesService.canDeleteClient(farmId, client.id);
      if (result.can_delete === false) {
        setDeleteBlockMessage(
          result.reason ||
            result.message ||
            result.detail ||
            "No se puede eliminar este cliente."
        );
        setDeleteBlockOpen(true);
        return;
      }
      setConfirmDeleteId(client.id);
      setConfirmDeleteName(client.name);
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const handleDelete = async (id) => {
    try {
      await salesService.deleteClient(farmId, id);
      toast.success("Cliente eliminado");
      fetchData();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const openEdit = (c) => {
    setEditingId(c.id);
    setFormData({
      client_type: c.client_type || "",
      name: c.name || "",
      document_type: c.document_type || "",
      document_number: c.document_number || "",
      phone: c.phone || "",
      email: c.email || "",
      address: c.address || "",
      observations: c.observations || "",
    });
    setIsModalOpen(true);
  };

  const openCreate = () => {
    setEditingId(null);
    setFormData(getEmptyClientForm());
    setIsModalOpen(true);
  };

  const hasActiveFilters =
    filterClientType !== "all" ||
    filterDocumentType !== "all" ||
    Boolean(searchApplied);

  const clearFilters = () => {
    setFilterClientType("all");
    setFilterDocumentType("all");
    setSearchInput("");
    setSearchApplied("");
  };

  const openDetail = async (client) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailClient(null);
    try {
      const full = await salesService.getClient(farmId, client.id);
      setDetailClient(full);
    } catch (err) {
      toast.error(formatApiError(err));
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading && clients.length === 0) {
    return (
      <div className="py-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
          {error}
        </div>
      )}

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <h2 className="text-xl font-bold text-slate-800">Directorio de Clientes</h2>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={openCreate}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" /> Agregar Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Editar Cliente" : "Nuevo Cliente"}
              </DialogTitle>
            </DialogHeader>
            <ClientForm
              formData={formData}
              onChange={setFormData}
              onSubmit={handleSubmit}
              mode={editingId ? "edit" : "create"}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-3 mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <div className="space-y-1 min-w-[140px]">
          <Label className="text-xs">Tipo cliente</Label>
          <Select value={filterClientType} onValueChange={setFilterClientType}>
            <SelectTrigger className="bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="natural">Natural</SelectItem>
              <SelectItem value="juridico">Jurídica</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 min-w-[140px]">
          <Label className="text-xs">Tipo documento</Label>
          <Select
            value={filterDocumentType}
            onValueChange={setFilterDocumentType}
          >
            <SelectTrigger className="bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="CC">CC</SelectItem>
              <SelectItem value="NIT">NIT</SelectItem>
              <SelectItem value="CE">CE</SelectItem>
              <SelectItem value="PAS">Pasaporte</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 flex-1 min-w-[200px]">
          <Label className="text-xs">Buscar</Label>
          <div className="flex gap-2">
            <Input
              className="bg-white"
              placeholder="Nombre o documento..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setSearchApplied(searchInput);
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => setSearchApplied(searchInput)}
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
            className="whitespace-nowrap"
          >
            <Eraser className="w-4 h-4 mr-2" />
            Limpiar filtros
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
            <tr>
              <th className="p-4">Nombre</th>
              <th className="p-4">Tipo cliente</th>
              <th className="p-4">Tipo doc.</th>
              <th className="p-4">Documento</th>
              <th className="p-4">Teléfono</th>
              <th className="p-4">Email</th>
              <th className="p-4">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clients.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-4 text-center">
                  No hay clientes
                </td>
              </tr>
            ) : (
              clients.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-medium text-slate-900">{c.name}</td>
                  <td className="p-4">
                    {CLIENT_TYPE_LABELS[c.client_type] || c.client_type}
                  </td>
                  <td className="p-4">
                    {DOCUMENT_TYPE_LABELS[c.document_type] || c.document_type}
                  </td>
                  <td className="p-4">{c.document_number}</td>
                  <td className="p-4">{c.phone || "—"}</td>
                  <td className="p-4">
                    {c.email ? (
                      <span className="text-blue-600">{c.email}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDetail(c)}
                        title="Ver detalle"
                      >
                        <Eye className="w-4 h-4 text-slate-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(c)}
                      >
                        <Pencil className="w-4 h-4 text-blue-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteAttempt(c)}
                      >
                        <Trash className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle del cliente</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="py-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
            </div>
          ) : detailClient ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {[
                ["Nombre", detailClient.name],
                [
                  "Tipo cliente",
                  CLIENT_TYPE_LABELS[detailClient.client_type] ||
                    detailClient.client_type,
                ],
                [
                  "Documento",
                  `${detailClient.document_type} ${detailClient.document_number}`,
                ],
                ["Teléfono", detailClient.phone || "—"],
                ["Email", detailClient.email || "—"],
                ["Dirección", detailClient.address || "—"],
                ["Observaciones", detailClient.observations || "—"],
              ].map(([label, value]) => (
                <div key={label} className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
                    {label}
                  </p>
                  <p className="font-bold text-slate-800">{value}</p>
                </div>
              ))}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmDeleteId != null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDeleteId(null);
            setConfirmDeleteName("");
          }
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {confirmDeleteName}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDeleteId) handleDelete(confirmDeleteId);
                setConfirmDeleteId(null);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteBlockOpen} onOpenChange={setDeleteBlockOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>No se puede eliminar</AlertDialogTitle>
            <AlertDialogDescription>{deleteBlockMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cerrar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
