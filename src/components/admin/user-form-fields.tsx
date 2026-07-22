"use client";

import { useMemo } from "react";
import type { Role } from "@prisma/client";
import { ROLE_LABELS } from "@/lib/labels";
import { SearchableSelect } from "@/components/ui/searchable-select";

export type WilayahOption = { code: string; name: string };
export type KecamatanWithDesa = WilayahOption & { desa: WilayahOption[] };

export const CREATABLE_ROLES: Role[] = [
  "admin",
  "camat",
  "operator_kecamatan",
  "operator_desa",
];

export type UserFormValues = {
  name: string;
  username: string;
  password: string;
  role: Role;
  kecamatanCode: string;
  desaCode: string;
};

export function defaultUserFormValues(
  kecamatanList: KecamatanWithDesa[],
  initial?: Partial<UserFormValues> & { role?: Role },
): UserFormValues {
  const role = initial?.role ?? "operator_desa";
  const kecamatanCode =
    initial?.kecamatanCode ?? kecamatanList[0]?.code ?? "";
  const desaFromKec =
    kecamatanList.find((k) => k.code === kecamatanCode)?.desa ?? [];
  return {
    name: initial?.name ?? "",
    username: initial?.username ?? "",
    password: "",
    role,
    kecamatanCode,
    desaCode: initial?.desaCode ?? desaFromKec[0]?.code ?? "",
  };
}

export function UserFormFields({
  mode,
  kecamatanList,
  values,
  onChange,
}: {
  mode: "create" | "edit";
  kecamatanList: KecamatanWithDesa[];
  values: UserFormValues;
  onChange: (next: UserFormValues) => void;
}) {
  const needsKecamatan =
    values.role === "camat" ||
    values.role === "operator_kecamatan" ||
    values.role === "operator_desa";
  const needsDesa = values.role === "operator_desa";

  const availableDesa = useMemo(() => {
    const kec = kecamatanList.find((k) => k.code === values.kecamatanCode);
    return kec?.desa ?? [];
  }, [kecamatanList, values.kecamatanCode]);

  const roleOptions = useMemo(
    () =>
      CREATABLE_ROLES.map((r) => ({
        value: r,
        label: ROLE_LABELS[r],
      })),
    [],
  );

  const kecamatanOptions = useMemo(
    () =>
      kecamatanList.map((k) => ({
        value: k.code,
        label: k.name,
        keywords: k.code,
      })),
    [kecamatanList],
  );

  const desaOptions = useMemo(
    () =>
      availableDesa.map((d) => ({
        value: d.code,
        label: d.name,
        keywords: d.code,
      })),
    [availableDesa],
  );

  function patch(partial: Partial<UserFormValues>) {
    onChange({ ...values, ...partial });
  }

  function onRoleChange(next: Role) {
    const nextValues: UserFormValues = { ...values, role: next };
    if (
      next === "camat" ||
      next === "operator_kecamatan" ||
      next === "operator_desa"
    ) {
      if (!nextValues.kecamatanCode && kecamatanList[0]) {
        nextValues.kecamatanCode = kecamatanList[0].code;
        nextValues.desaCode = kecamatanList[0].desa[0]?.code ?? "";
      }
    } else {
      nextValues.kecamatanCode = "";
      nextValues.desaCode = "";
    }
    onChange(nextValues);
  }

  function onKecamatanChange(code: string) {
    const kec = kecamatanList.find((k) => k.code === code);
    patch({
      kecamatanCode: code,
      desaCode: kec?.desa[0]?.code ?? "",
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="user-name" className="text-sm font-medium">
            Nama lengkap <span className="text-danger">*</span>
          </label>
          <input
            id="user-name"
            name="name"
            required
            minLength={2}
            maxLength={100}
            value={values.name}
            onChange={(e) => patch({ name: e.target.value })}
            className="w-full rounded-xl bg-muted/60 px-3 py-2.5 text-sm outline-none transition focus:bg-card focus:shadow-card"
            placeholder="Contoh: Budi Santoso"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="user-username" className="text-sm font-medium">
            Username <span className="text-danger">*</span>
          </label>
          <input
            id="user-username"
            name="username"
            required
            minLength={3}
            maxLength={40}
            autoComplete="off"
            value={values.username}
            onChange={(e) => patch({ username: e.target.value })}
            className="w-full rounded-xl bg-muted/60 px-3 py-2.5 text-sm outline-none transition focus:bg-card focus:shadow-card"
            placeholder="contoh: op.desa.baru"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="user-password" className="text-sm font-medium">
            Password{" "}
            {mode === "create" ? (
              <span className="text-danger">*</span>
            ) : (
              <span className="font-normal text-muted-foreground">
                (opsional)
              </span>
            )}
          </label>
          <input
            id="user-password"
            name="password"
            type="password"
            required={mode === "create"}
            minLength={mode === "create" ? 8 : undefined}
            maxLength={100}
            autoComplete="new-password"
            value={values.password}
            onChange={(e) => patch({ password: e.target.value })}
            className="w-full rounded-xl bg-muted/60 px-3 py-2.5 text-sm outline-none transition focus:bg-card focus:shadow-card"
            placeholder={
              mode === "create"
                ? "Minimal 8 karakter"
                : "Kosongkan jika tidak diubah"
            }
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="user-role" className="text-sm font-medium">
            Peran <span className="text-danger">*</span>
          </label>
          <SearchableSelect
            id="user-role"
            name="role"
            required
            options={roleOptions}
            value={values.role}
            onChange={(v) => onRoleChange(v as Role)}
            placeholder="Pilih peran"
            searchable={false}
          />
        </div>
      </div>

      {needsKecamatan ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="user-kecamatan" className="text-sm font-medium">
              Kecamatan <span className="text-danger">*</span>
            </label>
            <SearchableSelect
              id="user-kecamatan"
              name="kecamatanCode"
              required
              options={kecamatanOptions}
              value={values.kecamatanCode}
              onChange={onKecamatanChange}
              placeholder="Pilih kecamatan"
              searchPlaceholder="Cari kecamatan…"
            />
          </div>
          {needsDesa ? (
            <div className="space-y-2">
              <label htmlFor="user-desa" className="text-sm font-medium">
                Desa <span className="text-danger">*</span>
              </label>
              <SearchableSelect
                id="user-desa"
                name="desaCode"
                required
                options={desaOptions}
                value={values.desaCode}
                onChange={(desaCode) => patch({ desaCode })}
                placeholder="Pilih desa"
                searchPlaceholder="Cari desa…"
                emptyText="Desa tidak ditemukan"
              />
            </div>
          ) : (
            <input type="hidden" name="desaCode" value="" />
          )}
        </div>
      ) : (
        <>
          <input type="hidden" name="kecamatanCode" value="" />
          <input type="hidden" name="desaCode" value="" />
        </>
      )}
    </div>
  );
}
