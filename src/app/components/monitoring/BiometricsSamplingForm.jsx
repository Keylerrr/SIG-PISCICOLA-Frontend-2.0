import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

const API_BASE = "https://backend-pongase-trucha.onrender.com/api";

export function BiometricsSamplingForm({ farmId, pondId, cycleId, onSuccess, onCancel }) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const [formData, setFormData] = useState({
        evaluation_date: new Date().toISOString().split("T")[0],
        sampled_quantity: "",
        mortality_quantity: "0",
        min_weight_g: "",
        max_weight_g: "",
        observations: "",
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
        setError(null);
    };

    const validate = () => {
        if (!formData.evaluation_date) return "La fecha es requerida.";
        
        const sampled = parseInt(formData.sampled_quantity, 10);
        if (isNaN(sampled) || sampled <= 0) return "La cantidad de muestra debe ser mayor a 0.";

        const mortality = parseInt(formData.mortality_quantity, 10);
        if (isNaN(mortality) || mortality < 0) return "La mortalidad no puede ser negativa.";
        if (mortality > sampled) return "La mortalidad no puede ser mayor que la cantidad de muestra.";

        const minW = parseFloat(formData.min_weight_g);
        const maxW = parseFloat(formData.max_weight_g);

        if (isNaN(minW) || minW <= 0) return "El peso mínimo debe ser mayor a 0.";
        if (isNaN(maxW) || maxW <= 0) return "El peso máximo debe ser mayor a 0.";

        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const validationError = validate();
        if (validationError) {
            setError(validationError);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem("access");
            const response = await fetch(
                `${API_BASE}/farms/${farmId}/ponds/${pondId}/cycles/${cycleId}/fish-evaluations/`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        evaluation_date: formData.evaluation_date,
                        sampled_quantity: parseInt(formData.sampled_quantity, 10),
                        mortality_quantity: parseInt(formData.mortality_quantity, 10),
                        min_weight_g: parseFloat(formData.min_weight_g),
                        max_weight_g: parseFloat(formData.max_weight_g),
                        observations: formData.observations || "",
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error("Error payload:", errorData);
                throw new Error(
                    errorData.detail ||
                    errorData.non_field_errors?.[0] ||
                    errorData.message ||
                    "Error al registrar la evaluación (probablemente ya existe una para esta fecha)."
                );
            }

            onSuccess();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-200">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label htmlFor="evaluation_date">Fecha de Evaluación *</Label>
                    <Input
                        id="evaluation_date"
                        name="evaluation_date"
                        type="date"
                        required
                        value={formData.evaluation_date}
                        onChange={handleChange}
                    />
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="sampled_quantity">Peces de Muestra *</Label>
                    <Input
                        id="sampled_quantity"
                        name="sampled_quantity"
                        type="number"
                        min="1"
                        required
                        value={formData.sampled_quantity}
                        onChange={handleChange}
                    />
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="mortality_quantity">Mortalidad (Peces) *</Label>
                    <Input
                        id="mortality_quantity"
                        name="mortality_quantity"
                        type="number"
                        min="0"
                        required
                        value={formData.mortality_quantity}
                        onChange={handleChange}
                    />
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="min_weight_g">Peso Mínimo (g) *</Label>
                    <Input
                        id="min_weight_g"
                        name="min_weight_g"
                        type="number"
                        step="0.1"
                        min="0.1"
                        required
                        value={formData.min_weight_g}
                        onChange={handleChange}
                    />
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="max_weight_g">Peso Máximo (g) *</Label>
                    <Input
                        id="max_weight_g"
                        name="max_weight_g"
                        type="number"
                        step="0.1"
                        min="0.1"
                        required
                        value={formData.max_weight_g}
                        onChange={handleChange}
                    />
                </div>
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="observations">Observaciones (Opcional)</Label>
                <textarea
                    id="observations"
                    name="observations"
                    className="w-full min-h-[80px] rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Detalles sobre la muestra, estado de los peces, etc."
                    value={formData.observations}
                    onChange={handleChange}
                />
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isLoading}
                >
                    Cancelar
                </Button>
                <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
                    {isLoading ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Guardando...
                        </>
                    ) : (
                        "Registrar Evaluación"
                    )}
                </Button>
            </DialogFooter>
        </form>
    );
}
