import { MessageSquare } from "lucide-react"

import { listIThinkComments } from "../data/ithink-comments.queries.server"
import { addIThinkComment as addComment } from "../actions/add-comment"

type IThinkCommentsSectionProps = {
  oneThingId: string
}

export async function IThinkCommentsSection({
  oneThingId,
}: IThinkCommentsSectionProps) {
  const comments = await listIThinkComments(oneThingId)

  async function postComment(formData: FormData) {
    "use server"
    await addComment(formData)
  }

  return (
    <section
      data-slot="comments"
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        Comments
        {comments.length > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">
            {comments.length}
          </span>
        )}
      </div>

      {comments.length === 0 ? (
        <p className="text-xs text-muted-foreground">No comments yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {comments.map((c) => (
            <li key={c.id} className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono">{c.authorUserId.slice(0, 8)}</span>
                <span>·</span>
                <time dateTime={c.createdAt.toISOString()}>
                  {c.createdAt.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </div>
              <p className="text-sm whitespace-pre-wrap text-foreground">
                {c.body}
              </p>
            </li>
          ))}
        </ul>
      )}

      <form action={postComment} className="flex flex-col gap-2 pt-1">
        <input type="hidden" name="oneThingId" value={oneThingId} />
        <textarea
          name="body"
          placeholder="Add a comment…"
          rows={2}
          maxLength={5000}
          required
          className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
        />
        <button
          type="submit"
          className="self-end rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          Post
        </button>
      </form>
    </section>
  )
}

export function CommentsSkeleton() {
  return (
    <div className="h-32 animate-pulse rounded-lg border border-border bg-muted" />
  )
}
