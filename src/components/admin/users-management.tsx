"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import type { Role } from "@prisma/client";
import {
  createUser,
  deleteUser,
  deactivateUser,
  reactivateUser,
  updateUser,
} from "@/actions/users";
import { ROLE_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  defaultUserFormValues,
  UserFormFields,
  type KecamatanWithDesa,
  type UserFormValues,
} from "@/components/admin/user-form-fields";

export type AdminUserRow = {
  id: string;
  username: string;
  name: string;
  role: Role;
  isActive: boolean;
  kecamatanCode: string | null;
  desaCode: string | null;
  kecamatanName: string | null;
  desaName: string | null;
  kabupatenName: string | null;
};

type ModalMode =
  | { type: "closed" }
  | { type: "create" }
  | { type: "edit"; user: AdminUserRow }
  | { type: "delete"; user: AdminUserRow };

export function UsersManagement({
  users,
  currentUserId,
  kecamatanList,
}: {
  users: AdminUserRow[];
  currentUserId: string;
  kecamatanList: KecamatanWithDesa[];
}) {
  const [modal, setModal] = useState<ModalMode>({ type: "closed" });
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<UserFormValues>(() =>
    defaultUserFormValues(kecamatanList),
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter && u.role !== roleFilter) return false;
      if (statusFilter === "aktif" && !u.isActive) return false;
      if (statusFilter === "nonaktif" && u.isActive) return false;
      if (!q) return true;
      const hay = `${u.name} ${u.username} ${ROLE_LABELS[u.role]} ${u.desaName ?? ""} ${u.kecamatanName ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [users, search, roleFilter, statusFilter]);

  const roleOptions = useMemo(
    () => [
      { value: "", label: "Semua peran" },
      ...(["admin", "camat", "operator_kecamatan", "operator_desa"] as Role[]).map(
        (r) => ({ value: r, label: ROLE_LABELS[r] }),
      ),
    ],
    [],
  );

  const statusOptions = [
    { value: "", label: "Semua status" },
    { value: "aktif", label: "Aktif" },
    { value: "nonaktif", label: "Nonaktif" },
  ];

  function openCreate() {
    setFormError(null);
    setFormValues(defaultUserFormValues(kecamatanList));
    setModal({ type: "create" });
  }

  function openEdit(user: AdminUserRow) {
    setFormError(null);
    setFormValues(
      defaultUserFormValues(kecamatanList, {
        name: user.name,
        username: user.username,
        role: user.role,
        kecamatanCode: user.kecamatanCode ?? "",
        desaCode: user.desaCode ?? "",
        password: "",
      }),
    );
    setModal({ type: "edit", user });
  }

  function closeModal() {
    if (pending) return;
    setModal({ type: "closed" });
    setFormError(null);
  }

  function submitForm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      if (modal.type === "create") {
        const result = await createUser(formData);
        if (!result.ok) {
          setFormError(result.error);
          return;
        }
        toast.success("Pengguna berhasil dibuat");
        setModal({ type: "closed" });
        return;
      }

      if (modal.type === "edit") {
        formData.set("id", modal.user.id);
        const result = await updateUser(formData);
        if (!result.ok) {
          setFormError(result.error);
          return;
        }
        toast.success("Pengguna berhasil diperbarui");
        setModal({ type: "closed" });
      }
    });
  }

  function toggleActive(user: AdminUserRow) {
    startTransition(async () => {
      const result = user.isActive
        ? await deactivateUser(user.id)
        : await reactivateUser(user.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        user.isActive ? "Pengguna dinonaktifkan" : "Pengguna diaktifkan",
      );
    });
  }

  function confirmDelete() {
    if (modal.type !== "delete") return;
    const user = modal.user;
    startTransition(async () => {
      const result = await deleteUser(user.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Pengguna dihapus");
      setModal({ type: "closed" });
    });
  }

  return (
    <div className="flex flex-1 flex-col gap-5 px-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5">
          <label className="relative min-w-[12rem] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama / username…"
              className="w-full rounded-xl bg-card py-2 pl-9 pr-3 text-sm shadow-card outline-none transition placeholder:text-muted-foreground focus:shadow-card-hover"
            />
          </label>
          <SearchableSelect
            variant="filter"
            className="min-w-[9rem]"
            options={roleOptions}
            value={roleFilter}
            onChange={setRoleFilter}
            placeholder="Semua peran"
            searchable={false}
          />
          <SearchableSelect
            variant="filter"
            className="min-w-[9rem]"
            options={statusOptions}
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="Semua status"
            searchable={false}
          />
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Tambah pengguna
        </button>
      </div>

      <section className="rounded-3xl bg-card p-5 shadow-card sm:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">
              Daftar pengguna
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Kelola akun, peran, dan wilayah akses
            </p>
          </div>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
            {filtered.length}
            {filtered.length !== users.length ? ` / ${users.length}` : ""}{" "}
            pengguna
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl bg-muted/40 px-4 py-12 text-center text-sm text-muted-foreground">
            {users.length === 0
              ? "Belum ada pengguna."
              : "Tidak ada pengguna yang cocok dengan filter."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2.5 font-medium">Pengguna</th>
                  <th className="px-3 py-2.5 font-medium">Peran</th>
                  <th className="px-3 py-2.5 font-medium">Wilayah</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const isSelf = u.id === currentUserId;
                  return (
                    <tr
                      key={u.id}
                      className="border-t border-muted/50 hover:bg-muted/25"
                    >
                      <td className="px-3 py-3">
                        <div className="font-medium">{u.name}</div>
                        <div className="text-xs text-muted-foreground">
                          @{u.username}
                          {isSelf ? (
                            <span className="ml-1.5 text-primary">(Anda)</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                          {ROLE_LABELS[u.role]}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {u.role === "admin" ? (
                          <span className="text-xs">
                            {u.kabupatenName
                              ? `Kab. ${u.kabupatenName}`
                              : "Sistem"}
                          </span>
                        ) : (
                          <div>
                            {u.desaName ? (
                              <div className="font-medium text-foreground/90">
                                {u.desaName}
                              </div>
                            ) : null}
                            <div className="text-xs">
                              {u.kecamatanName
                                ? `Kec. ${u.kecamatanName}`
                                : "—"}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
                            u.isActive
                              ? "bg-success/15 text-success"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {u.isActive ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(u)}
                            className="inline-flex items-center gap-1 rounded-xl bg-muted/70 px-2.5 py-1.5 text-xs font-semibold text-foreground shadow-card transition hover:bg-muted"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={isSelf || pending}
                            onClick={() => toggleActive(u)}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold shadow-card transition disabled:cursor-not-allowed disabled:opacity-50",
                              u.isActive
                                ? "bg-warning/10 text-warning hover:bg-warning/15"
                                : "bg-success/10 text-success hover:bg-success/15",
                            )}
                          >
                            {u.isActive ? (
                              <UserX className="h-3.5 w-3.5" />
                            ) : (
                              <UserCheck className="h-3.5 w-3.5" />
                            )}
                            {u.isActive ? "Nonaktif" : "Aktifkan"}
                          </button>
                          <button
                            type="button"
                            disabled={isSelf || pending}
                            onClick={() => setModal({ type: "delete", user: u })}
                            className="inline-flex items-center gap-1 rounded-xl bg-danger/10 px-2.5 py-1.5 text-xs font-semibold text-danger shadow-card transition hover:bg-danger/15 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Create / Edit modal */}
      <Modal
        open={modal.type === "create" || modal.type === "edit"}
        onClose={closeModal}
        size="lg"
        title={
          modal.type === "edit" ? "Edit pengguna" : "Tambah pengguna"
        }
        description={
          modal.type === "edit"
            ? "Ubah data akun. Password opsional — kosongkan jika tidak diganti."
            : "Buat akun baru. Password disimpan terenkripsi."
        }
      >
        <form onSubmit={submitForm} className="space-y-5">
          {modal.type === "edit" ? (
            <input type="hidden" name="id" value={modal.user.id} />
          ) : null}

          <UserFormFields
            mode={modal.type === "edit" ? "edit" : "create"}
            kecamatanList={kecamatanList}
            values={formValues}
            onChange={setFormValues}
          />

          {formError ? (
            <div className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
              {formError}
            </div>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 border-t border-transparent pt-1">
            <button
              type="button"
              onClick={closeModal}
              disabled={pending}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-60"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90 disabled:opacity-60"
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {modal.type === "edit" ? "Simpan perubahan" : "Buat pengguna"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={modal.type === "delete"}
        onClose={closeModal}
        size="sm"
        title="Hapus pengguna?"
        description={
          modal.type === "delete"
            ? `Hapus @${modal.user.username} (${modal.user.name})? Jika masih punya riwayat tugas, akun hanya dinonaktifkan.`
            : undefined
        }
      >
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={closeModal}
            disabled={pending}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={confirmDelete}
            className="inline-flex items-center gap-2 rounded-xl bg-danger px-4 py-2.5 text-sm font-semibold text-white shadow-card transition hover:opacity-90 disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Ya, hapus
          </button>
        </div>
      </Modal>
    </div>
  );
}
