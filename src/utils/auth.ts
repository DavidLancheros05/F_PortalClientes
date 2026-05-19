export interface User {
  id: number;
  nombre: string;
  rol: string;
}

// Obtener usuario desde localStorage
export const getUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

// Validar si es admin
export const isAdmin = (): boolean => {
  const user = getUser();
  return user?.rol === 'ADMIN';
};
