import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Lambang Kabupaten Subang (public domain via Wikimedia).
 * Source: https://commons.wikimedia.org/wiki/File:Seal_of_Subang_Regency.svg
 */
export function BrandLogo({
  className,
  size = 40,
  priority = false,
}: {
  className?: string;
  size?: number;
  priority?: boolean;
}) {
  return (
    <Image
      src="/brand/seal-subang.svg"
      alt="Lambang Kabupaten Subang"
      width={size}
      height={size}
      priority={priority}
      className={cn("shrink-0 object-contain", className)}
    />
  );
}
