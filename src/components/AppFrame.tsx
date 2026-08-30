export function AppFrame({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`app-frame mx-auto overflow-x-hidden ${className}`}>
      {children}
    </div>
  );
}
