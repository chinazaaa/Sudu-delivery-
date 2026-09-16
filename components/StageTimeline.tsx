import { STAGES, STAGE_LABEL, stageIndex, type BatchStage } from "@/lib/stages";
import { clockLabel } from "@/lib/time";

/**
 * Where the run has got to. It is one shared line per batch rather than a map,
 * so it is always true and needs nothing running on anyone's phone.
 */
export default function StageTimeline({
  stage,
  updatedAt,
}: {
  stage: BatchStage;
  updatedAt: string;
}) {
  const current = stageIndex(stage);
  const visible = STAGES.filter((s) => s !== "ordering");

  return (
    <div className="space-y-2">
      <ol className="space-y-1">
        {visible.map((step) => {
          const index = stageIndex(step);
          const done = index < current;
          const now = index === current;
          return (
            <li
              key={step}
              className={`flex items-center gap-2 text-sm ${
                now ? "font-semibold" : done ? "text-ink/50" : "text-ink/35"
              }`}
            >
              <span
                className={`inline-block size-2 shrink-0 rounded-full ${
                  now ? "bg-brand" : done ? "bg-green-600" : "bg-black/20"
                }`}
              />
              {STAGE_LABEL[step]}
            </li>
          );
        })}
      </ol>
      <p className="text-xs text-ink/50">Updated {clockLabel(updatedAt)}</p>
    </div>
  );
}
