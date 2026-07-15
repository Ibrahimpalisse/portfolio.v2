type FormErrorProps = {
  id?: string;
  message: string;
};

export function FormError({ id, message }: FormErrorProps) {
  if (!message) return null;

  return (
    <p id={id} className="text-sm text-red-600" role="alert" aria-live="polite">
      {message}
    </p>
  );
}
