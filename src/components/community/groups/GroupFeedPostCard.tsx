import { GroupFeedPost } from "@/hooks/useGroupFeed";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { FileText, Trophy, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface GroupFeedPostCardProps {
  post: GroupFeedPost;
}

export function GroupFeedPostCard({ post }: GroupFeedPostCardProps) {
  const authorName = post.author?.full_name || "Former member";
  const authorAvatar = post.author?.avatar_url || "";

  const timeAgo = post.created_at
    ? formatDistanceToNow(new Date(post.created_at), { addSuffix: true })
    : "";

  return (
    <div className="bg-card border border-border/80 rounded-xl p-4 space-y-3 transition-colors hover:border-border">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar className="w-8 h-8 shrink-0">
            <AvatarImage src={authorAvatar} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
              {authorName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h4 className="text-xs font-semibold text-foreground truncate">{authorName}</h4>
            <span className="text-[11px] text-muted-foreground">{timeAgo}</span>
          </div>
        </div>

        <Badge
          variant="secondary"
          className="text-[10px] font-medium capitalize shrink-0 gap-1 px-2 py-0.5"
        >
          {post.post_type === "document" && (
            <>
              <FileText className="w-3 h-3 text-blue-500" />
              Document
            </>
          )}
          {post.post_type === "quiz_result" && (
            <>
              <Trophy className="w-3 h-3 text-amber-500" />
              Quiz Result
            </>
          )}
          {post.post_type === "note" && (
            <>
              <MessageSquare className="w-3 h-3 text-emerald-500" />
              Note
            </>
          )}
        </Badge>
      </div>

      {/* Caption text */}
      {post.caption && (
        <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
          {post.caption}
        </p>
      )}

      {/* Resource attachment preview card */}
      {post.referenceData && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border/60">
          {post.post_type === "document" ? (
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h5 className="text-xs font-semibold text-foreground truncate">
              {post.referenceData.title}
            </h5>
            {post.referenceData.subtitle && (
              <span className="text-[11px] text-muted-foreground block truncate">
                {post.referenceData.subtitle}
              </span>
            )}
          </div>

          {post.post_type === "quiz_result" && post.referenceData.totalQuestions && (
            <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs shrink-0 font-bold">
              {Math.round(
                ((post.referenceData.score ?? 0) / post.referenceData.totalQuestions) * 100
              )}
              %
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
