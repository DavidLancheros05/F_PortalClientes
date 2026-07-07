export default function UnauthorizedPage() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="p-6 bg-white shadow rounded text-center">
        <h1 className="text-3xl font-bold mb-4">Acceso no autorizado</h1>
        <p>No tienes permisos para acceder a esta página.</p>
      </div>
    </div>
  );
}
