export function SearchListThumb({
  src,
  alt,
  variant = "master",
}: {
  src: string;
  alt: string;
  variant?: "master" | "academy";
}) {
  return (
    <div className="relative h-[72px] w-[72px] shrink-0">
      <img
        src={src}
        alt={alt}
        className={`h-full w-full object-cover border border-gray-50 ${
          variant === "master" ? "rounded-full" : "rounded-[16px]"
        }`}
      />
      {variant === "master" && (
        <div className="absolute right-1 bottom-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-green-500" />
      )}
    </div>
  );
}
