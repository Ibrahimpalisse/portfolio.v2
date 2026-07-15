import { cn } from "@/lib/utils";

type FormFieldProps = {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
};

export function FormField({
  id,
  label,
  error,
  required,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("grid w-full gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-foreground/75">
        {label}
        {required && <span className="text-primary"> *</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
