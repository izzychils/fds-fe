import { useRef, useState } from "react";
import { BadgeCheck, ImagePlus, MessageSquareReply, Pencil, Star, Trash2, X } from "lucide-react";
import type { Review, User } from "@/types";
import { Avatar, Badge, Button, Card, Field, Modal, RatingInput, Textarea } from "@/components/ui";
import { cn, formatDateTime, readImageFile, timeAgo } from "@/lib/utils";
import type { RatingSummary } from "@/services/catalog";

/* ------------------------------------------------------- rating summary */

export function RatingSummaryPanel({ summary }: { summary: RatingSummary }) {
  const total = summary.count || 1;
  return (
    <Card className="p-4">
      <div className="flex items-center gap-5">
        <div className="text-center">
          <p className="text-4xl font-extrabold tracking-tight">
            {summary.count > 0 ? summary.rating.toFixed(1) : "—"}
          </p>
          <div className="mt-1 flex justify-center gap-0.5" aria-hidden>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={cn(
                  "size-3.5",
                  star <= Math.round(summary.rating)
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground/40",
                )}
              />
            ))}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {summary.count} {summary.count === 1 ? "review" : "reviews"}
          </p>
        </div>

        <ul className="flex-1 space-y-1.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = summary.distribution[star as 1 | 2 | 3 | 4 | 5] ?? 0;
            const percent = Math.round((count / total) * 100);
            return (
              <li key={star} className="flex items-center gap-2 text-xs">
                <span className="w-8 shrink-0 font-semibold text-muted-foreground">{star}★</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-amber-400"
                    style={{ width: `${count === 0 ? 0 : Math.max(6, percent)}%` }}
                  />
                </span>
                <span className="w-8 shrink-0 text-right text-muted-foreground">{count}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------- review item */

export function ReviewItem({
  review,
  currentUser,
  onEdit,
  onDelete,
  onReply,
}: {
  review: Review;
  currentUser: User | null;
  onEdit?: (review: Review) => void;
  onDelete?: (review: Review) => void;
  onReply?: (review: Review) => void;
}) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const isOwn = currentUser?.id === review.userId;
  const canReply = currentUser?.role === "vendor" || currentUser?.role === "admin";

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <Avatar name={review.userName} src={review.userAvatar} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold">{review.userName}</p>
            {review.isVerifiedPurchase ? (
              <Badge tone="success">
                <BadgeCheck className="size-3" aria-hidden /> Verified purchase
              </Badge>
            ) : null}
            {review.isHidden ? <Badge tone="destructive">Hidden by moderator</Badge> : null}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="flex gap-0.5" aria-label={`${review.rating} out of 5 stars`}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    "size-3.5",
                    star <= review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30",
                  )}
                  aria-hidden
                />
              ))}
            </span>
            <span className="text-xs text-muted-foreground">{timeAgo(review.createdAt)}</span>
          </div>

          <p className="mt-2 whitespace-pre-line text-sm">{review.comment}</p>

          {review.photos.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {review.photos.map((photo, index) => (
                <li key={`${review.id}-photo-${index}`}>
                  <button
                    type="button"
                    onClick={() => setLightbox(photo)}
                    className="overflow-hidden rounded-xl border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Open review photo ${index + 1}`}
                  >
                    <img
                      src={photo}
                      alt={`Photo from ${review.userName}'s review`}
                      loading="lazy"
                      className="size-24 object-cover transition-transform hover:scale-105"
                    />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {review.vendorReply ? (
            <div className="mt-3 rounded-xl border-l-4 border-primary/40 bg-primary/6 p-3">
              <p className="flex items-center gap-1.5 text-xs font-bold text-primary">
                <MessageSquareReply className="size-3.5" aria-hidden /> Kitchen replied
              </p>
              <p className="mt-1 text-sm">{review.vendorReply.text}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {formatDateTime(review.vendorReply.at)}
              </p>
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            {isOwn && onEdit ? (
              <Button size="sm" variant="ghost" onClick={() => onEdit(review)}>
                <Pencil className="size-3.5" aria-hidden /> Edit
              </Button>
            ) : null}
            {isOwn && onDelete ? (
              <Button size="sm" variant="ghost" onClick={() => onDelete(review)}>
                <Trash2 className="size-3.5" aria-hidden /> Delete
              </Button>
            ) : null}
            {!isOwn && canReply && onReply && !review.vendorReply ? (
              <Button size="sm" variant="outline" onClick={() => onReply(review)}>
                <MessageSquareReply className="size-3.5" aria-hidden /> Reply
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <Modal
        open={Boolean(lightbox)}
        onClose={() => setLightbox(null)}
        title="Review photo"
        size="lg"
      >
        {lightbox ? (
          <img src={lightbox} alt="Full size review photo" className="w-full rounded-2xl" />
        ) : null}
      </Modal>
    </Card>
  );
}

/* ------------------------------------------------------------- review form */

export function ReviewForm({
  open,
  onClose,
  onSubmit,
  onUpdate,
  initial,
  dishName,
  pending,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit?: (input: { rating: number; comment: string; photos: string[] }) => void;
  onUpdate?: (input: { rating: number; comment: string; photos: string[] }) => void;
  initial?: Review | null;
  dishName: string;
  pending?: boolean;
}) {
  const [rating, setRating] = useState(initial?.rating ?? 5);
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [photos, setPhotos] = useState<string[]>(initial?.photos ?? []);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      const remaining = 3 - photos.length;
      if (remaining <= 0) {
        setError("You can attach up to 3 photos.");
        return;
      }
      const accepted = Array.from(files).slice(0, remaining);
      const read = await Promise.all(accepted.map(readImageFile));
      setPhotos((prev) => [...prev, ...read]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That image could not be read.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const submit = () => {
    setError(null);
    if (comment.trim().length < 4) {
      setError("Tell us a little more about the meal.");
      return;
    }
    const payload = { rating, comment: comment.trim(), photos };
    if (initial && onUpdate) onUpdate(payload);
    else onSubmit?.(payload);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Edit your review" : `Review ${dishName}`}
      description="Photos are attached to your review and shown to other customers."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={pending || uploading}>
            {initial ? "Save changes" : "Publish review"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Your rating" required>
          <RatingInput value={rating} onChange={setRating} />
        </Field>

        <Field label="Your review" required error={error}>
          <Textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="How was the food, the packaging and the delivery?"
            maxLength={1200}
          />
        </Field>

        <div>
          <p className="mb-2 text-sm font-semibold">Photos (optional, up to 3)</p>
          <div className="flex flex-wrap items-center gap-2">
            {photos.map((photo, index) => (
              <span key={`upload-${index}`} className="relative">
                <img
                  src={photo}
                  alt={`Upload preview ${index + 1}`}
                  className="size-20 rounded-xl object-cover"
                />
                <button
                  type="button"
                  onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== index))}
                  aria-label={`Remove photo ${index + 1}`}
                  className="absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </span>
            ))}
            {photos.length < 3 ? (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex size-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
              >
                <ImagePlus className="size-5" aria-hidden />
                Add
              </button>
            ) : null}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={(event) => void handleFiles(event.target.files)}
          />
          <p className="mt-2 text-[11px] text-muted-foreground">
            JPG, PNG or WEBP up to 3 MB each. Images are held locally in this development build.
          </p>
        </div>
      </div>
    </Modal>
  );
}

