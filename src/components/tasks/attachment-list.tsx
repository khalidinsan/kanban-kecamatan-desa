import { FileText, Paperclip } from "lucide-react";

export type AttachmentItem = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
};

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentList({
  items,
  emptyLabel = "Tidak ada lampiran",
}: {
  items: AttachmentItem[];
  emptyLabel?: string;
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{emptyLabel}</p>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const isImage = item.mimeType.startsWith("image/");
        return (
          <li key={item.id}>
            <a
              href={`/api/uploads/${item.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-2.5 text-sm transition hover:bg-muted"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-card">
                {isImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/uploads/${item.id}`}
                    alt=""
                    className="h-9 w-9 rounded-lg object-cover"
                  />
                ) : item.mimeType === "application/pdf" ? (
                  <FileText className="h-4 w-4 text-danger" />
                ) : (
                  <Paperclip className="h-4 w-4 text-primary" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">
                  {item.originalName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatBytes(item.size)}
                </span>
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
