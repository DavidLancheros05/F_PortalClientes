"use client";

import React from "react";
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from "lucide-react";
import { useNotification as useNotificationContext } from "@/context/NotificationContext";

// Importamos el contexto para acceder a las notificaciones
import { NotificationContext } from "@/context/NotificationContext";
import { useContext } from "react";

export function Notifications() {
  const context = useContext(NotificationContext);

  if (!context) return null;

  const { notifications, removeNotification } = context;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`flex items-start gap-3 p-4 rounded-lg shadow-lg border animate-in slide-in-from-right ${
            notification.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : notification.type === "error"
                ? "bg-red-50 border-red-200 text-red-800"
                : notification.type === "warning"
                  ? "bg-amber-50 border-amber-200 text-amber-800"
                  : "bg-blue-50 border-blue-200 text-blue-800"
          }`}
        >
          <div className="flex-shrink-0 mt-0.5">
            {notification.type === "success" && (
              <CheckCircle className="w-5 h-5" />
            )}
            {notification.type === "error" && (
              <AlertCircle className="w-5 h-5" />
            )}
            {notification.type === "warning" && (
              <AlertTriangle className="w-5 h-5" />
            )}
            {notification.type === "info" && <Info className="w-5 h-5" />}
          </div>

          <div className="flex-1">
            <p className="text-sm font-medium">{notification.message}</p>
          </div>

          <button
            onClick={() => removeNotification(notification.id)}
            className="flex-shrink-0 text-current opacity-50 hover:opacity-100 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
