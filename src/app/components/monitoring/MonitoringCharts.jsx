"use client";

import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { BarChart3, Loader2, AlertCircle, Inbox } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const CHART_COLORS = {
  biomass: "#2563eb",
  fca: "#4f46e5",
  mortality: "#dc2626",
  avgWeight: "#059669",
  biomassGain: "#0d9488",
};

function formatNumber(value, maximumFractionDigits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }
  return Number(value).toLocaleString("es-CO", { maximumFractionDigits });
}

function ChartTooltip({ active, payload, label, valueSuffix = "" }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-slate-700">{label}</p>
      <p className="mt-1 text-slate-900 font-semibold">
        {formatNumber(payload[0].value)}
        {valueSuffix}
      </p>
    </div>
  );
}

function ChartEmpty({ message }) {
  return (
    <div className="h-[220px] sm:h-[260px] flex flex-col items-center justify-center text-slate-400 gap-2">
      <Inbox className="w-8 h-8 opacity-50" />
      <p className="text-sm text-center px-4">{message}</p>
    </div>
  );
}

function MetricLineChart({
  data,
  color,
  valueSuffix = "",
  yAxisFormatter,
  emptyMessage,
}) {
  if (!data.length) {
    return <ChartEmpty message={emptyMessage} />;
  }

  return (
    <div className="h-[220px] sm:h-[260px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 11, fill: "#64748b" }}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#64748b" }}
            width={48}
            tickFormatter={yAxisFormatter}
          />
          <Tooltip
            content={
              <ChartTooltip valueSuffix={valueSuffix} />
            }
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={{ r: 3, fill: color }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function MetricAreaChart({ data, color, valueSuffix = "", emptyMessage }) {
  if (!data.length) {
    return <ChartEmpty message={emptyMessage} />;
  }

  return (
    <div className="h-[220px] sm:h-[260px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="biomassGainGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.35} />
              <stop offset="95%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 11, fill: "#64748b" }}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#64748b" }}
            width={48}
            tickFormatter={(v) => formatNumber(v)}
          />
          <Tooltip content={<ChartTooltip valueSuffix={valueSuffix} />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill="url(#biomassGainGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartCard({ title, description, children }) {
  return (
    <Card className="border-slate-100 shadow-sm py-0 gap-0">
      <CardHeader className="border-b border-slate-100 bg-slate-50/80 py-3">
        <CardTitle className="text-sm font-semibold text-slate-800">
          {title}
        </CardTitle>
        {description && (
          <CardDescription className="text-xs">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="pt-4 pb-4">{children}</CardContent>
    </Card>
  );
}

/**
 * Solo renderiza gráficas. No hace fetch: recibe datos del padre (MonitoringSection).
 */
export function MonitoringCharts({
  chartSeries = {
    biomass: [],
    fca: [],
    mortality: [],
    avgWeight: [],
    biomassGain: [],
  },
  isLoading = false,
  error = null,
  isEmpty = false,
}) {
  const charts = useMemo(
    () => [
      {
        id: "biomass",
        title: "Evolución de Biomasa",
        description: "Biomasa total (kg) por fecha de control",
        type: "line",
        data: chartSeries.biomass,
        color: CHART_COLORS.biomass,
        suffix: " kg",
        emptyMessage: "Sin registros de biomasa en este ciclo.",
      },
      {
        id: "fca",
        title: "FCA Histórico",
        description: "Factor de conversión alimenticia acumulado",
        type: "line",
        data: chartSeries.fca,
        color: CHART_COLORS.fca,
        suffix: "",
        emptyMessage: "Sin registros de FCA disponibles.",
      },
      {
        id: "mortality",
        title: "Mortalidad",
        description: "Porcentaje de mortalidad por control",
        type: "line",
        data: chartSeries.mortality,
        color: CHART_COLORS.mortality,
        suffix: "%",
        yAxisFormatter: (v) => `${formatNumber(v)}%`,
        emptyMessage: "Sin registros de mortalidad.",
      },
      {
        id: "avgWeight",
        title: "Peso Promedio",
        description: "Peso promedio de la población (g)",
        type: "line",
        data: chartSeries.avgWeight,
        color: CHART_COLORS.avgWeight,
        suffix: " g",
        emptyMessage: "Sin registros de peso promedio.",
      },
      {
        id: "biomassGain",
        title: "Ganancia de Biomasa",
        description: "Incremento de biomasa entre controles (kg)",
        type: "area",
        data: chartSeries.biomassGain,
        color: CHART_COLORS.biomassGain,
        suffix: " kg",
        emptyMessage: "Sin registros de ganancia de biomasa.",
      },
    ],
    [chartSeries]
  );

  return (
    <section className="space-y-4 mt-8">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-slate-500" />
        <div>
          <h3 className="text-lg font-bold text-slate-900">Análisis histórico</h3>
          <p className="text-sm text-slate-500">
            Tendencias del ciclo según controles biométricos registrados
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="border-red-200 bg-red-50">
          <AlertCircle className="text-red-600" />
          <AlertTitle className="text-red-800">Error al cargar gráficas</AlertTitle>
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-8 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Cargando historial de controles...</span>
        </div>
      )}

      {!isLoading && !error && isEmpty && (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <Inbox className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="font-medium text-slate-700">Sin datos históricos</p>
          <p className="text-sm text-slate-500 mt-1">
            Registre al menos un muestreo biométrico para visualizar las tendencias.
          </p>
        </div>
      )}

      {!isLoading && !error && !isEmpty && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {charts.map((chart) => (
            <ChartCard
              key={chart.id}
              title={chart.title}
              description={chart.description}
            >
              {chart.type === "area" ? (
                <MetricAreaChart
                  data={chart.data}
                  color={chart.color}
                  valueSuffix={chart.suffix}
                  emptyMessage={chart.emptyMessage}
                />
              ) : (
                <MetricLineChart
                  data={chart.data}
                  color={chart.color}
                  valueSuffix={chart.suffix}
                  yAxisFormatter={chart.yAxisFormatter}
                  emptyMessage={chart.emptyMessage}
                />
              )}
            </ChartCard>
          ))}
        </div>
      )}
    </section>
  );
}
