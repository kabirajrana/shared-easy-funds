import * as React from "react";
import { IconEye, IconEyeOff } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

export interface InputProps extends React.ComponentProps<"input"> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightSlot?: React.ReactNode;
  wrapperClassName?: string;
  inputClassName?: string;
  passwordToggle?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      inputClassName,
      wrapperClassName,
      type,
      label,
      error,
      leftIcon,
      rightSlot,
      passwordToggle = false,
      ...props
    },
    ref,
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const isPassword = type === "password" && passwordToggle;
    const actualType = isPassword && showPassword ? "text" : type;

    return (
      <label className={cn("block space-y-1.5", wrapperClassName)}>
        {label ? <span className="text-sm font-medium text-[var(--color-muted)]">{label}</span> : null}
        <div
          className={cn(
            "flex items-center gap-2 rounded-[8px] border border-[var(--color-border)] bg-white px-3 py-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition focus-within:border-[var(--color-primary)] focus-within:ring-2 focus-within:ring-[var(--color-primary)]/15",
            error &&
              "border-[var(--color-error)] focus-within:border-[var(--color-error)] focus-within:ring-[var(--color-error)]/15",
            className,
          )}
        >
          {leftIcon ? <span className="text-[var(--color-hint)]">{leftIcon}</span> : null}
          <input
            ref={ref}
            type={actualType}
            className={cn(
              "min-h-9 w-full border-0 bg-transparent p-0 text-[15px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-hint)] focus:ring-0",
              inputClassName,
            )}
            {...props}
          />
          {isPassword ? (
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="grid h-8 w-8 place-items-center rounded-full text-[var(--color-hint)] transition hover:bg-black/5 hover:text-[var(--color-text)]"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
            </button>
          ) : null}
          {rightSlot}
        </div>
        {error ? <p className="text-xs text-[var(--color-error)]">{error}</p> : null}
      </label>
    );
  },
);
Input.displayName = "Input";

export { Input };
