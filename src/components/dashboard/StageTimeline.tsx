import type { StageStatus } from "@/lib/types";

const STAGE_COLORS: Record<StageStatus, string> = {
  done: "bg-emerald-500",
  in_progress: "bg-amber-500",
  blocked: "bg-red-500",
  not_started: "bg-zinc-600",
};

interface StageDot {
  status: StageStatus;
  stage_name: string;
}

interface Props {
  stages: StageDot[];
  hasPeriod: boolean;
  onClick?: () => void;
}

export default function StageTimeline({ stages, hasPeriod, onClick }: Props) {
  if (!hasPeriod || stages.length === 0) {
    return <span className="text-xs text-zinc-600">-</span>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex cursor-pointer items-center gap-0.5 rounded-sm transition-opacity hover:opacity-80"
      title={`${stages.filter((s) => s.status === "done").length}/${stages.length} done — click for details`}
    >
      {stages.map((stage, i) => (
        <div key={i} className="flex items-center gap-0.5">
          <div
            className={`h-2 w-2 shrink-0 rounded-full ${STAGE_COLORS[stage.status]}`}
            title={`${stage.stage_name}: ${stage.status.replace("_", " ")}`}
          />
          {i < stages.length - 1 && (
            <div className="h-px w-3 bg-zinc-700" />
          )}
        </div>
      ))}
      <span className="ml-1.5 text-xs text-zinc-500 tabular-nums">
        {stages.filter((s) => s.status === "done").length}/{stages.length}
      </span>
    </button>
  );
}
