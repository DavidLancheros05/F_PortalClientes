import Link from "next/link";

export default function UsuariosPage() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
        <Link
          href="/usuarios/crear-usuario"
          className="px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-semibold"
        >
          Crear usuario
        </Link>
      </div>
      <p className="mt-2 text-sm text-gray-600">
        Ya puedes crear usuarios desde el boton "Crear usuario".
      </p>
    </div>
  );
}
