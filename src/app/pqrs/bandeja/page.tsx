"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle, Inbox, PackageOpen } from "lucide-react";
import { pqrsService } from "@/services/pqrs.service";
import { PageHeaderCard } from "@/components/PageHeaderCard";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { Th, Td } from "@/components/tables/TableCell";
import { Tr } from "@/components/tables/TableRow";
import { ErrorModal } from "@/components/modals";

interface PQRS {
  pqrs_id: number;
  pqrs_numero: string;
  pqrs_titulo: string;
  pqrs_descripcion: string;
  pqrs_fecha_creacion: string;
  pqrs_fecha_cierre?: string;
  pqrs_sla_vencimiento?: string;
  pqrs_usr_asignado_id?: number | null;
  tipo?: { pt_nombre: string };
  estado?: { pe_id: number; pe_nombre: string; pe_color?: string };
}

export default function BandejaPage() {
  const router = useRouter();
  const [pqrs, setPqrs] = useState<PQRS[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tomarLoading, setTomarLoading] = useState<number | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<{ id: number; rol: string } | null>(
    null,
  );

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);

        const user = localStorage.getItem("user");
        if (user) {
          const userData = JSON.parse(user);
          setUserInfo({ id: userData.usr_id, rol: userData.rol });
        }

        const data = await pqrsService.getListado();
        setPqrs(data || []);
      } catch (err) {
        setError("Error al cargar las PQRS");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  const handleTomarPQRS = async (pqrsId: number) => {
    if (!userInfo) return;

    try {
      setTomarLoading(pqrsId);
      await pqrsService.asignar(pqrsId, userInfo.id);

      const data = await pqrsService.getListado();
      setPqrs(data || []);
    } catch (err) {
      console.error("Error al tomar PQRS:", err);
      setActionErrorMessage("Error al tomar la PQRS");
    } finally {
      setTomarLoading(null);
    }
  };

  const asignadas = pqrs.filter((p) => p.pqrs_usr_asignado_id);
  const disponibles = pqrs.filter((p) => !p.pqrs_usr_asignado_id);

  const TableRow = ({
    item,
    isDisponible,
  }: {
    item: PQRS;
    isDisponible: boolean;
  }) => (
    <Tr key={item.pqrs_id}>
      <Td className="font-medium text-brand-600">
        {item.pqrs_numero}
      </Td>
      <Td>{item.pqrs_titulo}</Td>
      <Td>{item.tipo?.pt_nombre || "-"}</Td>
      <Td>
        <span
          className="inline-flex px-3 py-1 rounded-full text-xs font-semibold text-white"
          style={{
            backgroundColor: item.estado?.pe_color || "#6B7280",
            opacity: 0.9,
          }}
        >
          {item.estado?.pe_nombre || "-"}
        </span>
      </Td>
      <Td>
        {new Date(item.pqrs_fecha_creacion).toLocaleDateString("es-ES")}
      </Td>
      <Td align="center" sticky className="space-x-2">
        {isDisponible ? (
          <>
            <button
              onClick={() => handleTomarPQRS(item.pqrs_id)}
              disabled={tomarLoading === item.pqrs_id}
              className="text-green-600 hover:text-green-800 font-medium disabled:opacity-50"
            >
              {tomarLoading === item.pqrs_id ? "Tomando..." : "Tomar"}
            </button>
            <button
              onClick={() => router.push(`/pqrs/${item.pqrs_id}`)}
              className="text-brand-600 hover:text-brand-700 font-medium"
            >
              Ver
            </button>
          </>
        ) : (
          <button
            onClick={() => router.push(`/pqrs/gestionar/${item.pqrs_id}`)}
            className="text-brand-600 hover:text-brand-700 font-medium"
          >
            Gestionar
          </button>
        )}
      </Td>
    </Tr>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeaderCard
          icon={Inbox}
          eyebrow="PQRS"
          title="Bandeja de PQRS"
          onBack={() => router.push("/pqrs")}
        />

          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-12 text-center">
              <p className="text-gray-600">Cargando...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 rounded-2xl border border-red-200 shadow-lg p-12 text-center">
              <p className="text-red-600">{error}</p>
            </div>
          ) : pqrs.length === 0 ? (
            <EmptyStateCard icon={PackageOpen} title="No hay PQRS disponibles" />
          ) : (
            <div className="space-y-8">
              {asignadas.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Mis PQRS Asignadas ({asignadas.length})
                  </h2>
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <Th>Número</Th>
                            <Th>Título</Th>
                            <Th>Tipo</Th>
                            <Th>Estado</Th>
                            <Th>Fecha Creación</Th>
                            <Th align="center" sticky>
                              Acciones
                            </Th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {asignadas.map((item) => (
                            <TableRow
                              key={item.pqrs_id}
                              item={item}
                              isDisponible={false}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {disponibles.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold text-gray-800 mb-4">
                    PQRS Disponibles ({disponibles.length})
                  </h2>
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <Th>Número</Th>
                            <Th>Título</Th>
                            <Th>Tipo</Th>
                            <Th>Estado</Th>
                            <Th>Fecha Creación</Th>
                            <Th align="center" sticky>
                              Acciones
                            </Th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {disponibles.map((item) => (
                            <TableRow
                              key={item.pqrs_id}
                              item={item}
                              isDisponible={true}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
      </div>

      <ErrorModal
        isOpen={!!actionErrorMessage}
        message={actionErrorMessage || ""}
        onAction={() => setActionErrorMessage(null)}
      />
    </div>
  );
}
