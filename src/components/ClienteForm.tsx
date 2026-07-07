import { useState } from "react";

interface Props {
  onCreated: () => void;
}

export const ClienteForm = ({ onCreated }: Props) => {
  const [razonSocial, setrazonSocial] = useState("");
  const [nit, setNit] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:3001/clientes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ razonSocial, nit, direccion, telefono }),
      });

      if (!res.ok) throw new Error("Error creando cliente");

      setrazonSocial("");
      setNit("");
      setDireccion("");
      setTelefono("");
      onCreated();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded-md mb-4">
      <h2 className="text-lg font-bold mb-2">Crear Cliente</h2>
      <input
        placeholder="Razón Social"
        value={razonSocial}
        onChange={(e) => setrazonSocial(e.target.value)}
        className="block mb-2 w-full p-2 border rounded"
      />
      <input
        placeholder="NIT"
        value={nit}
        onChange={(e) => setNit(e.target.value)}
        className="block mb-2 w-full p-2 border rounded"
      />
      <input
        placeholder="Dirección"
        value={direccion}
        onChange={(e) => setDireccion(e.target.value)}
        className="block mb-2 w-full p-2 border rounded"
      />
      <input
        placeholder="Teléfono"
        value={telefono}
        onChange={(e) => setTelefono(e.target.value)}
        className="block mb-2 w-full p-2 border rounded"
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-500 text-white p-2 rounded"
      >
        {loading ? "Creando..." : "Crear Cliente"}
      </button>
    </form>
  );
};
