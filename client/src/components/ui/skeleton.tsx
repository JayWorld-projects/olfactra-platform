import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "rounded-md bg-muted/60 animate-[skeleton-pulse_2.5s_ease-in-out_infinite]",
        className
      )}
      style={{
        // Calm, slow pulse — gentler than default animate-pulse
      }}
      {...props}
    />
  );
}

export { Skeleton };
