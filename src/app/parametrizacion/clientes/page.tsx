import { redirect } from "next/navigation";

export default function ClientesPageRedirect() {
  redirect("/parametrizacion/clientes/listado");
}
