import { Paperclip } from "lucide-react"

import { listIThinkAttachments } from "../data/ithink-attachments.queries.server"

type IThinkAttachmentsSectionProps = {
  oneThingId: string
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export async function IThinkAttachmentsSection({
  oneThingId,
}: IThinkAttachmentsSectionProps) {
  const attachments = await listIThinkAttachments(oneThingId)

  return (
    <section
      data-slot="attachments"
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Paperclip className="h-4 w-4 text-muted-foreground" />
        Attachments
        {attachments.length > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">
            {attachments.length}
          </span>
        )}
      </div>

      {attachments.length === 0 ? (
        <p className="text-xs text-muted-foreground">No attachments yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {attachments.map((a) => (
            <li key={a.id} className="flex items-center gap-2">
              <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-sm text-foreground underline-offset-4 hover:underline"
              >
                {a.url.split("/").pop() ?? a.url}
              </a>
              <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                {formatBytes(a.sizeBytes)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted-foreground">
        Upload via the API after obtaining a Blob upload URL.
      </p>
    </section>
  )
}

export function AttachmentsSkeleton() {
  return (
    <div className="h-24 animate-pulse rounded-lg border border-border bg-muted" />
  )
}
