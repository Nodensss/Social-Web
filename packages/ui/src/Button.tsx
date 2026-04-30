import * as React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
};

export function Button({ variant = "primary", className = "", ...rest }: ButtonProps) {
  const base =
    "rounded-full px-4 py-2 text-sm font-semibold transition active:scale-95 disabled:opacity-50";
  const styles =
    variant === "primary"
      ? "bg-toy-accent text-white hover:opacity-90"
      : "bg-transparent text-toy-ink hover:bg-toy-ink/5";
  return <button className={`${base} ${styles} ${className}`} {...rest} />;
}
