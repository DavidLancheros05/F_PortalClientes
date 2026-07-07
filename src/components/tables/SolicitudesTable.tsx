'use client';

interface Solicitud {
  id: number;
  cliente: string;
  estado: string;
  fechaCreacion: string;
  fechaEstimadaRespuesta: string;
}

interface Props {
  solicitudes: Solicitud[];
}

export function SolicitudesTable({ solicitudes }: Props) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th>ID</th>
          <th>Cliente</th>
          <th>Estado</th>
          <th>Fecha Creación</th>
          <th>Fecha Estimada</th>
        </tr>
      </thead>
      <tbody>
        {solicitudes.map((s) => (
          <tr key={s.id}>
            <td>{s.id}</td>
            <td>{s.cliente}</td>
            <td>{s.estado}</td>
            <td>{s.fechaCreacion}</td>
            <td>{s.fechaEstimadaRespuesta}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
