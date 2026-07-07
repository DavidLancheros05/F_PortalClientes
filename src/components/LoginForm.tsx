// "use client";

// import { useState } from "react";
// import { useRouter } from "next/navigation";

// export default function LoginForm() {
//   const router = useRouter();
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [loading, setLoading] = useState(false);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setLoading(true);

//     try {
//       console.log("🟢 Click en LOGIN", { email, password });

//       const res = await fetch("http://localhost:3001/auth/login", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ email, password }),
//       });

//       const data = await res.json();
//       console.log("📥 Respuesta:", data);

//       if (res.ok && data.token) {
//         localStorage.setItem("token", data.token);
//         console.log("✅ Token guardado en localStorage");
//         console.log("🔄 Redirigiendo a /dashboard");
//         await router.push("/dashboard");
//         console.log("➡️ Redirección ejecutada");
//       } else {
//         alert(data.message || "Error al iniciar sesión");
//       }
//     } catch (err) {
//       console.error("❌ Error en login:", err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-80">
//       <input
//         type="email"
//         placeholder="Correo"
//         value={email}
//         onChange={(e) => setEmail(e.target.value)}
//         className="p-2 border rounded"
//         required
//       />
//       <input
//         type="password"
//         placeholder="Contraseña"
//         value={password}
//         onChange={(e) => setPassword(e.target.value)}
//         className="p-2 border rounded"
//         required
//       />
//       <button
//         type="submit"
//         className="bg-blue-500 text-white p-2 rounded"
//         disabled={loading}
//       >
//         {loading ? "Iniciando..." : "Login"}
//       </button>
//     </form>
//   );
// }
