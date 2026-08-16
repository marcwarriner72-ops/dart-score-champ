import type { ReactNode } from "react";

/** Friendly placeholder used wherever a list has nothing in it yet. */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="panel flex flex-col items-center gap-2 p-8 text-center">
      {icon ? (
        <span className="grid size-12 place-items-center rounded-full bg-primary/15 text-primary">
          {icon}
        </span>
      ) : null}
      <p className="font-display text-xl font-bold uppercase">{title}</p>
      {description ? (
        <p className="max-w-[16rem] text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}
