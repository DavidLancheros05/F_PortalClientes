import Link from "next/link";

export default function NotFound() {
  console.log("[NotFound [id]] Renderizando página 404 para ruta dinámica [id]");
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Error 404</h1>
        <p className="text-gray-600 mb-6">La solicitud no existe.</p>
        <Link
          href="/solicitudes"
          className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Volver a Solicitudes
        </Link>
      </div>
    </div>
  );
}
