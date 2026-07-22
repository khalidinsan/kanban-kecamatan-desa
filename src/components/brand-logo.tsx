import Image from "next/image";
import { BRAND } from "@/config/brand";
import { cn } from "@/lib/utils";

/**
 * Lambang Kabupaten Subang (public domain via Wikimedia).
 * Source: https://commons.wikimedia.org/wiki/File:Seal_of_Subang_Regency.svg
 * Used as the official seal mark for SIKILAT.
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
      alt={`${BRAND.name} — Lambang ${BRAND.regionLong}`}
      width={size}
      height={size}
      priority={priority}
      className={cn("h-auto w-auto shrink-0 object-contain", className)}
    />
  );
}
