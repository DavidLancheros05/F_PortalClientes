import { useState, useCallback } from "react";

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
  type?: "text" | "number" | "date" | "email" | "url";
}

export interface FormErrors {
  [fieldId: number]: string;
}

export interface FormValidation {
  errors: FormErrors;
  hasErrors: boolean;
  validateField: (
    fieldId: number,
    value: any,
    rules: ValidationRule,
  ) => string | null;
  validateAll: (
    values: Record<number, any>,
    rules: Record<number, ValidationRule>,
  ) => boolean;
  clearErrors: () => void;
  clearFieldError: (fieldId: number) => void;
}

export const useFormValidation = (): FormValidation => {
  const [errors, setErrors] = useState<FormErrors>({});

  const validateField = useCallback(
    (fieldId: number, value: any, rules: ValidationRule): string | null => {
      let error: string | null = null;

      // Validación de requerido
      if (rules.required) {
        if (
          value === undefined ||
          value === null ||
          value === "" ||
          (Array.isArray(value) && value.length === 0)
        ) {
          const requiredError = "Este campo es obligatorio";
          error = requiredError;
          setErrors((prev) => ({ ...prev, [fieldId]: requiredError }));
          return error;
        }
      }

      // Si está vacío y no es requerido, no validar más
      if (!value && value !== 0 && !rules.required) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[fieldId];
          return newErrors;
        });
        return null;
      }

      // Validación de tipo
      if (rules.type === "email") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(String(value))) {
          error = "Ingrese un email válido";
        }
      }

      if (rules.type === "url") {
        try {
          new URL(String(value));
        } catch {
          error = "Ingrese una URL válida";
        }
      }

      if (rules.type === "number") {
        if (isNaN(Number(value))) {
          error = "Ingrese un número válido";
        }
      }

      if (rules.type === "date") {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(String(value))) {
          error = "Ingrese una fecha válida (YYYY-MM-DD)";
        } else {
          const date = new Date(String(value));
          if (isNaN(date.getTime())) {
            error = "Ingrese una fecha válida";
          }
        }
      }

      // Validación de longitud
      if (rules.minLength && String(value).length < rules.minLength) {
        error = `Mínimo ${rules.minLength} caracteres`;
      }

      if (rules.maxLength && String(value).length > rules.maxLength) {
        error = `Máximo ${rules.maxLength} caracteres`;
      }

      // Validación con patrón
      if (rules.pattern && !rules.pattern.test(String(value))) {
        error = "Formato inválido";
      }

      // Validación personalizada
      if (rules.custom) {
        error = rules.custom(value);
      }

      // Actualizar estado
      if (error) {
        setErrors((prev) => ({ ...prev, [fieldId]: error }));
      } else {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[fieldId];
          return newErrors;
        });
      }

      return error;
    },
    [],
  );

  const validateAll = useCallback(
    (
      values: Record<number, any>,
      rules: Record<number, ValidationRule>,
    ): boolean => {
      const newErrors: FormErrors = {};
      let isValid = true;

      Object.entries(rules).forEach(([fieldId, fieldRules]) => {
        const value = values[Number(fieldId)];
        const error = validateField(Number(fieldId), value, fieldRules);
        if (error) {
          newErrors[Number(fieldId)] = error;
          isValid = false;
        }
      });

      setErrors(newErrors);
      return isValid;
    },
    [validateField],
  );

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const clearFieldError = useCallback((fieldId: number) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldId];
      return newErrors;
    });
  }, []);

  return {
    errors,
    hasErrors: Object.keys(errors).length > 0,
    validateField,
    validateAll,
    clearErrors,
    clearFieldError,
  };
};
