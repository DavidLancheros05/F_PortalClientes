"use client";

import type { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type SortableItemProps = {
  id: string;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
};

export const SortableItem = ({
  id,
  children,
  disabled,
  className,
}: SortableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    disabled,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${className ?? ""} ${isDragging ? "opacity-70" : ""}`}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
};
