"use client";

import { useEffect, useState } from "react";
import {
  Braces,
  Plus,
  RefreshCw,
  Search,
  Pencil,
  Power,
  Trash2,
  Save,
  X,
  Inbox,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import {
  variablesPlantillaService,
  VariablePlantilla,
  AmbitoVariable,
  TablaOrigen,
  FormatoVariable,
} from "@/services/admin/parametrizacion/variables-plantilla.service";
import { ConfirmModal, SuccessModal, ErrorModal } from "@/components/modals";
import { PageHeaderCard } from "@/components/PageHeaderCard";
import { Th, Td } from "@/components/tables/TableCell";
import { Tr } from "@/components/tables/TableRow";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { FilterField } from "@/components/filters/FilterField";
import { FilterActions } from "@/components/filters/FilterActions";
import { TableContainer } from "@/components/tables/TableContainer";

const AMBITO_LABELS: Record<AmbitoVariable, string> = {
  FIJA: "Cualquier documento",
  CARTA_APROBACION: "Carta de Vinculación",
};

function mensajeError(err: unknown, fallback: string): string {
  const conRespuesta = err as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  return conRespuesta?.response?.data?.message || conRespuesta?.message || fallback;
}

export default function VariablesPlantillaPage() {
  const [items, setItems] = useState<VariablePlantilla[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarNuevo, setMostrarNuevo] = useState(false);

  const [nombreVar, setNombreVar] = useState("");
  const [etiqueta, setEtiqueta] = useState("");
  const [ambito, setAmbito] = useState<AmbitoVariable>("FIJA");
  const [resuelta, setResuelta] = useState(false);
  const [tablaOrigen, setTablaOrigen] = useState<TablaOrigen | "">("");
  const [columnaOrigen, setColumnaOrigen] = useState("");
  const [formato, setFormato] = useState<FormatoVariable>("TEXTO");
  const [columnasDisponibles, setColumnasDisponibles] = useState<string[]>([]);
  const [cargandoColumnas, setCargandoColumnas] = useState(false);

  const cargarColumnas = async (tabla: TablaOrigen | "") => {
    if (!tabla) {
      setColumnasDisponibles([]);
      return;
    }
    setCargandoColumnas(true);
    try {
      const cols = await variablesPlantillaService.getColumnas(tabla);
      setColumnasDisponibles(cols);
    } catch (e) {
      console.error(e);
      setColumnasDisponibles([]);
    } finally {
      setCargandoColumnas(false);
    }
  };

  const [filtroAmbito, setFiltroAmbito] = useState<"TODOS" | AmbitoVariable>(
    "TODOS",
  );
  const [filtroEstado, setFiltroEstado] = useState<
    "TODOS" | "ACTIVO" | "INACTIVO"
  >("TODOS");
  const [busqueda, setBusqueda] = useState("");

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editandoEtiqueta, setEditandoEtiqueta] = useState("");
  const [editandoResuelta, setEditandoResuelta] = useState(false);
  const [editandoTablaOrigen, setEditandoTablaOrigen] = useState<TablaOrigen | "">("");
  const [editandoColumnaOrigen, setEditandoColumnaOrigen] = useState("");
  const [editandoFormato, setEditandoFormato] = useState<FormatoVariable>("TEXTO");
  const [editandoColumnasDisponibles, setEditandoColumnasDisponibles] = useState<string[]>([]);
  const [editandoCargandoColumnas, setEditandoCargandoColumnas] = useState(false);

  const cargarColumnasEdicion = async (tabla: TablaOrigen | "") => {
    if (!tabla) {
      setEditandoColumnasDisponibles([]);
      return;
    }
    setEditandoCargandoColumnas(true);
    try {
      const cols = await variablesPlantillaService.getColumnas(tabla);
      setEditandoColumnasDisponibles(cols);
    } catch (e) {
      console.error(e);
      setEditandoColumnasDisponibles([]);
    } finally {
      setEditandoCargandoColumnas(false);
    }
  };

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action?: () => void | Promise<void>;
    confirmText?: string;
    isDangerous?: boolean;
  }>({ isOpen: false, title: "", message: "" });

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const data = await variablesPlantillaService.getAll();
      setItems(data);
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const limpiarFormulario = () => {
    setNombreVar("");
    setEtiqueta("");
    setAmbito("FIJA");
    setResuelta(false);
    setTablaOrigen("");
    setColumnaOrigen("");
    setFormato("TEXTO");
    setColumnasDisponibles([]);
  };

  const crear = () => {
    const nombre = nombreVar.trim().toLowerCase();
    if (!/^[a-z][a-z0-9_]*$/.test(nombre)) {
      setErrorMessage(
        "El nombre de la variable debe empezar con una letra y solo contener minúsculas, números y guion bajo (ej: mi_variable).",
      );
      return;
    }
    if (!etiqueta.trim()) {
      setErrorMessage("La etiqueta es obligatoria.");
      return;
    }
    if (tablaOrigen && !columnaOrigen) {
      setErrorMessage("Selecciona la columna de origen.");
      return;
    }

    const placeholder = `{{${nombre}}}`;
    // Si hay tabla+columna, la variable se resuelve sola — no depende del
    // check manual "resuelta" (ese es solo para el caso sin mapeo, código
    // a mano).
    const resueltaFinal = tablaOrigen ? true : resuelta;

    setConfirmModal({
      isOpen: true,
      title: "Confirmar creación",
      message: tablaOrigen
        ? `¿Deseas crear la variable ${placeholder}? Se resolverá automáticamente desde ${tablaOrigen}.${columnaOrigen} — no hace falta código adicional.`
        : resuelta
          ? `¿Deseas crear la variable ${placeholder}? Quedará disponible de inmediato para insertar en plantillas.`
          : `¿Deseas crear la variable ${placeholder}? Como NO está marcada como "resuelta" ni tiene tabla/columna de origen, quedará en el catálogo pero NO se podrá insertar en ninguna plantilla hasta que un desarrollador la conecte a un dato real.`,
      confirmText: "Sí, crear",
      action: async () => {
        setSubmitting(true);
        try {
          await variablesPlantillaService.create({
            pvp_placeholder: placeholder,
            pvp_etiqueta: etiqueta.trim(),
            pvp_ambito: ambito,
            pvp_resuelta: resueltaFinal,
            pvp_tabla_origen: tablaOrigen || undefined,
            pvp_columna_origen: tablaOrigen ? columnaOrigen : undefined,
            pvp_formato: tablaOrigen ? formato : undefined,
          });
          limpiarFormulario();
          setMostrarNuevo(false);
          await cargarDatos();
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          setSuccessMessage({
            title: "Variable creada",
            message: "La variable fue agregada al catálogo",
          });
        } catch (e) {
          console.error(e);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          setErrorMessage(mensajeError(e, "Error al crear la variable"));
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  const iniciarEdicion = (item: VariablePlantilla) => {
    setEditandoId(item.pvp_id);
    setEditandoEtiqueta(item.pvp_etiqueta);
    setEditandoResuelta(item.pvp_resuelta);
    setEditandoTablaOrigen(item.pvp_tabla_origen || "");
    setEditandoColumnaOrigen(item.pvp_columna_origen || "");
    setEditandoFormato(item.pvp_formato || "TEXTO");
    setEditandoColumnasDisponibles([]);
    if (item.pvp_tabla_origen) cargarColumnasEdicion(item.pvp_tabla_origen);
  };

  const guardarEdicion = () => {
    if (!editandoId || !editandoEtiqueta.trim()) return;
    if (editandoTablaOrigen && !editandoColumnaOrigen) {
      setErrorMessage("Selecciona la columna de origen.");
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: "Confirmar cambios",
      message: "¿Deseas guardar los cambios de esta variable?",
      confirmText: "Sí, guardar",
      action: async () => {
        setSubmitting(true);
        try {
          await variablesPlantillaService.update(editandoId, {
            pvp_etiqueta: editandoEtiqueta.trim(),
            pvp_resuelta: editandoTablaOrigen ? true : editandoResuelta,
            pvp_tabla_origen: editandoTablaOrigen || null,
            pvp_columna_origen: editandoTablaOrigen ? editandoColumnaOrigen : null,
            pvp_formato: editandoTablaOrigen ? editandoFormato : undefined,
          });
          setEditandoId(null);
          await cargarDatos();
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          setSuccessMessage({
            title: "Variable actualizada",
            message: "Los cambios fueron guardados",
          });
        } catch (e) {
          console.error(e);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          setErrorMessage(mensajeError(e, "Error al actualizar la variable"));
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  const toggleEstado = (item: VariablePlantilla) => {
    setConfirmModal({
      isOpen: true,
      title: item.pvp_estado ? "Inactivar variable" : "Activar variable",
      message: `¿Deseas ${item.pvp_estado ? "inactivar" : "activar"} ${item.pvp_placeholder}? ${
        item.pvp_estado
          ? "Mientras esté inactiva no se podrá insertar en nuevas plantillas."
          : ""
      }`,
      isDangerous: item.pvp_estado,
      confirmText: item.pvp_estado ? "Inactivar" : "Activar",
      action: async () => {
        try {
          await variablesPlantillaService.toggleEstado(
            item.pvp_id,
            !item.pvp_estado,
          );
          await cargarDatos();
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          setSuccessMessage({
            title: "Operación exitosa",
            message: `La variable fue ${item.pvp_estado ? "inactivada" : "activada"}`,
          });
        } catch (e) {
          console.error(e);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          setErrorMessage(mensajeError(e, "Error al cambiar el estado"));
        }
      },
    });
  };

  const eliminar = (item: VariablePlantilla) => {
    setConfirmModal({
      isOpen: true,
      title: "Eliminar variable",
      message: `¿Deseas eliminar ${item.pvp_placeholder} del catálogo? Si está en uso en algún documento, la eliminación se bloqueará.`,
      isDangerous: true,
      confirmText: "Sí, eliminar",
      action: async () => {
        setSubmitting(true);
        try {
          await variablesPlantillaService.remove(item.pvp_id);
          await cargarDatos();
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          setSuccessMessage({
            title: "Variable eliminada",
            message: "La variable fue eliminada del catálogo",
          });
        } catch (e) {
          console.error(e);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          setErrorMessage(mensajeError(e, "Error al eliminar la variable"));
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  const itemsFiltrados = items.filter((item) => {
    if (filtroAmbito !== "TODOS" && item.pvp_ambito !== filtroAmbito) return false;
    if (filtroEstado === "ACTIVO" && !item.pvp_estado) return false;
    if (filtroEstado === "INACTIVO" && item.pvp_estado) return false;
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      if (
        !item.pvp_placeholder.toLowerCase().includes(q) &&
        !item.pvp_etiqueta.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl w-full mx-auto">
        <PageHeaderCard
          icon={Braces}
          eyebrow="Parametrización"
          title="Variables de Plantilla"
          subtitle="Catálogo de {{variables}} insertables en el contenido de una plantilla de documento"
          actions={
            <button
              onClick={() => {
                setMostrarNuevo(true);
                limpiarFormulario();
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-600 transition-colors hover:bg-[#eef3ff]"
            >
              <Plus className="h-4 w-4" />
              Nueva
            </button>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FilterField label="Buscar">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Placeholder o etiqueta..."
                  className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </FilterField>

            <FilterField label="Ámbito">
              <select
                value={filtroAmbito}
                onChange={(e) =>
                  setFiltroAmbito(e.target.value as "TODOS" | AmbitoVariable)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="TODOS">Todos</option>
                <option value="FIJA">Cualquier documento</option>
                <option value="CARTA_APROBACION">Carta de Vinculación</option>
              </select>
            </FilterField>

            <FilterField label="Estado">
              <select
                value={filtroEstado}
                onChange={(e) =>
                  setFiltroEstado(
                    e.target.value as "TODOS" | "ACTIVO" | "INACTIVO",
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="TODOS">Todos</option>
                <option value="ACTIVO">Activas</option>
                <option value="INACTIVO">Inactivas</option>
              </select>
            </FilterField>

            <FilterActions className="col-span-full">
              <button
                onClick={cargarDatos}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Actualizar
              </button>
            </FilterActions>
          </div>
        </PageHeaderCard>

        {mostrarNuevo && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-5 mb-4">
            <p className="text-sm font-semibold text-gray-900 mb-3">
              Nueva variable
            </p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre (sin llaves)
                </label>
                <div className="flex items-center">
                  <span className="text-xs text-gray-400 mr-1">{"{{"}</span>
                  <input
                    type="text"
                    value={nombreVar}
                    onChange={(e) => setNombreVar(e.target.value)}
                    placeholder="mi_variable"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-xs text-gray-400 ml-1">{"}}"}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Etiqueta
                </label>
                <input
                  type="text"
                  value={etiqueta}
                  onChange={(e) => setEtiqueta(e.target.value)}
                  placeholder="Ej: Fecha de nacimiento"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ámbito
                </label>
                <select
                  value={ambito}
                  onChange={(e) => setAmbito(e.target.value as AmbitoVariable)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="FIJA">Cualquier documento</option>
                  <option value="CARTA_APROBACION">Carta de Vinculación</option>
                </select>
              </div>

              <div className="md:col-span-4 grid grid-cols-1 md:grid-cols-4 gap-4 border-t border-gray-100 pt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tabla origen (opcional)
                  </label>
                  <select
                    value={tablaOrigen}
                    onChange={(e) => {
                      const nuevaTabla = e.target.value as TablaOrigen | "";
                      setTablaOrigen(nuevaTabla);
                      setColumnaOrigen("");
                      cargarColumnas(nuevaTabla);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sin mapear (código a mano)</option>
                    <option value="solicitudes">Tabla: solicitudes</option>
                    <option value="clientes">Tabla: clientes</option>
                  </select>
                </div>

                {tablaOrigen && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Columna
                      </label>
                      <select
                        value={columnaOrigen}
                        onChange={(e) => setColumnaOrigen(e.target.value)}
                        disabled={cargandoColumnas}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50"
                      >
                        <option value="">
                          {cargandoColumnas ? "Cargando columnas..." : "Selecciona una columna..."}
                        </option>
                        {columnasDisponibles.map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Formato
                      </label>
                      <select
                        value={formato}
                        onChange={(e) => setFormato(e.target.value as FormatoVariable)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="TEXTO">Texto</option>
                        <option value="MONEDA">Moneda ($ 1.234.567)</option>
                        <option value="DIAS">Días (30 días)</option>
                        <option value="FECHA">Fecha (20/9/2026)</option>
                      </select>
                    </div>
                  </>
                )}

                <p className="md:col-span-4 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  {tablaOrigen ? (
                    <>
                      <ShieldCheck className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
                      Con tabla y columna elegidas, el sistema resuelve esta
                      variable solo al generar el PDF — no hace falta que un
                      desarrollador escriba código.
                    </>
                  ) : (
                    "Sin tabla/columna, la variable necesita código a mano (ver el check de abajo)."
                  )}
                </p>
              </div>

              <div className="md:col-span-4 flex items-end gap-2">
                <button
                  onClick={crear}
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="h-4 w-4" />
                  {submitting ? "Guardando..." : "Agregar"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    limpiarFormulario();
                    setMostrarNuevo(false);
                  }}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <X className="h-4 w-4" />
                  Cerrar
                </button>
              </div>

              {!tablaOrigen && (
                <label className="md:col-span-4 flex items-start gap-2 text-xs text-gray-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <input
                    type="checkbox"
                    checked={resuelta}
                    onChange={(e) => setResuelta(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    <strong>Ya existe código que resuelve esta variable con un dato real.</strong>{" "}
                    Márcalo solo si un desarrollador ya conectó este placeholder a un campo real
                    a mano (para algo que no encaja en tabla+columna, ej. representante legal).
                    Si lo dejas sin marcar, la variable queda en el catálogo pero{" "}
                    <strong>no se podrá insertar</strong> en ninguna plantilla todavía — así se
                    evita repetir el caso de <code>{"{{tasa_interes}}"}</code>, una variable que
                    se ofrecía para insertar sin tener ningún dato real detrás.
                  </span>
                </label>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando...</p>
          </div>
        ) : itemsFiltrados.length === 0 ? (
          <EmptyStateCard
            icon={Inbox}
            title="No hay variables para estos filtros."
          />
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-slate-50 to-blue-50/40">
              <p className="text-sm text-gray-600">
                Mostrando{" "}
                <span className="font-semibold">{itemsFiltrados.length}</span>{" "}
                variable{itemsFiltrados.length !== 1 ? "s" : ""}
              </p>
            </div>

            <TableContainer>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <Th>Placeholder</Th>
                      <Th>Etiqueta</Th>
                      <Th>Ámbito</Th>
                      <Th>Origen del dato</Th>
                      <Th align="center">Resuelta</Th>
                      <Th>Estado</Th>
                      <Th sticky align="right">
                        Acciones
                      </Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {itemsFiltrados.map((item) => (
                      <Tr key={item.pvp_id}>
                        <Td className="whitespace-nowrap font-mono text-xs text-violet-700">
                          {item.pvp_placeholder}
                        </Td>
                        <Td className="whitespace-nowrap">
                          {editandoId === item.pvp_id ? (
                            <input
                              type="text"
                              value={editandoEtiqueta}
                              onChange={(e) => setEditandoEtiqueta(e.target.value)}
                              className="w-48 px-2 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            item.pvp_etiqueta
                          )}
                        </Td>
                        <Td className="whitespace-nowrap text-gray-600">
                          {AMBITO_LABELS[item.pvp_ambito]}
                        </Td>
                        <Td className="whitespace-nowrap">
                          {editandoId === item.pvp_id ? (
                            <div className="flex flex-col gap-1.5 w-48">
                              <select
                                value={editandoTablaOrigen}
                                onChange={(e) => {
                                  const nuevaTabla = e.target.value as TablaOrigen | "";
                                  setEditandoTablaOrigen(nuevaTabla);
                                  setEditandoColumnaOrigen("");
                                  cargarColumnasEdicion(nuevaTabla);
                                }}
                                className="w-full px-2 py-1 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Sin mapear (código a mano)</option>
                                <option value="solicitudes">Tabla: solicitudes</option>
                                <option value="clientes">Tabla: clientes</option>
                              </select>
                              {editandoTablaOrigen && (
                                <>
                                  <select
                                    value={editandoColumnaOrigen}
                                    onChange={(e) => setEditandoColumnaOrigen(e.target.value)}
                                    disabled={editandoCargandoColumnas}
                                    className="w-full px-2 py-1 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50"
                                  >
                                    <option value="">
                                      {editandoCargandoColumnas ? "Cargando..." : "Selecciona columna..."}
                                    </option>
                                    {editandoColumnasDisponibles.map((col) => (
                                      <option key={col} value={col}>
                                        {col}
                                      </option>
                                    ))}
                                  </select>
                                  <select
                                    value={editandoFormato}
                                    onChange={(e) => setEditandoFormato(e.target.value as FormatoVariable)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="TEXTO">Texto</option>
                                    <option value="MONEDA">Moneda</option>
                                    <option value="DIAS">Días</option>
                                    <option value="FECHA">Fecha</option>
                                  </select>
                                </>
                              )}
                            </div>
                          ) : item.pvp_tabla_origen && item.pvp_columna_origen ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-mono text-emerald-700">
                              {item.pvp_tabla_origen}.{item.pvp_columna_origen}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">
                              Manual (código)
                            </span>
                          )}
                        </Td>
                        <Td align="center">
                          {editandoId === item.pvp_id ? (
                            editandoTablaOrigen ? (
                              <span
                                title="Con tabla/columna elegidas, se resuelve sola"
                                className="inline-flex items-center gap-1 text-emerald-600"
                              >
                                <ShieldCheck className="h-4 w-4" />
                              </span>
                            ) : (
                              <input
                                type="checkbox"
                                checked={editandoResuelta}
                                onChange={(e) => setEditandoResuelta(e.target.checked)}
                                title='Sin tabla/columna de origen, se resuelve a mano en código'
                              />
                            )
                          ) : item.pvp_resuelta ? (
                            <span
                              title="Ya tiene código que la resuelve con datos reales"
                              className="inline-flex items-center gap-1 text-emerald-600"
                            >
                              <ShieldCheck className="h-4 w-4" />
                            </span>
                          ) : (
                            <span
                              title="Sin código que la resuelva todavía — no se puede insertar"
                              className="inline-flex items-center gap-1 text-amber-600"
                            >
                              <ShieldAlert className="h-4 w-4" />
                            </span>
                          )}
                        </Td>
                        <Td className="whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold ${
                              item.pvp_estado
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {item.pvp_estado ? "Activa" : "Inactiva"}
                          </span>
                        </Td>
                        <Td sticky align="right" className="whitespace-nowrap font-medium">
                          {editandoId === item.pvp_id ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={guardarEdicion}
                                title="Guardar cambios"
                                className="group inline-flex items-center justify-center w-8 h-8 rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow transition-all duration-150"
                              >
                                <Save className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setEditandoId(null)}
                                title="Cancelar edición"
                                className="group inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-slate-700 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all duration-150"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => iniciarEdicion(item)}
                                title="Editar variable"
                                className="group inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-all duration-150"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => toggleEstado(item)}
                                title={item.pvp_estado ? "Inactivar variable" : "Activar variable"}
                                className={`group inline-flex items-center justify-center w-8 h-8 rounded-lg border border-transparent transition-all duration-150 ${
                                  item.pvp_estado
                                    ? "text-slate-500 hover:text-amber-600 hover:bg-amber-50 hover:border-amber-200"
                                    : "text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200"
                                }`}
                              >
                                <Power className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => eliminar(item)}
                                title="Eliminar variable"
                                className="group inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all duration-150"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TableContainer>
          </div>
        )}
      </div>

      <ErrorModal
        isOpen={!!errorMessage}
        message={errorMessage}
        onAction={() => setErrorMessage("")}
      />

      <SuccessModal
        isOpen={!!successMessage}
        title={successMessage?.title || "Éxito"}
        message={successMessage?.message || ""}
        actionText="Aceptar"
        onAction={() => setSuccessMessage(null)}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText || "Confirmar"}
        isDangerous={confirmModal.isDangerous}
        isLoading={submitting}
        onConfirm={async () => {
          if (confirmModal.action) await confirmModal.action();
        }}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
