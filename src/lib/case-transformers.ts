// Convierte snake_case a camelCase
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
}

// Transforma recursivamente objetos de snake_case a camelCase
export function transformSnakeToCamel(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => transformSnakeToCamel(item));
  }

  if (typeof obj !== "object") return obj;

  const transformed: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = snakeToCamel(key);
      transformed[camelKey] = transformSnakeToCamel(obj[key]);
    }
  }
  return transformed;
}
