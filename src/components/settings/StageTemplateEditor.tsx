"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import StageTemplateRow from "./StageTemplateRow";
import {
  upsertStageTemplate,
  deleteStageTemplate,
  reorderStageTemplates,
  addStageTemplate,
} from "@/lib/settings-actions";

interface StageData {
  id: string;
  stage_name: string;
  order_index: number;
  is_billable: boolean;
  is_active: boolean;
}

interface Props {
  clientId: string;
  taskTypeName: string;
  taskTypeId: string;
  stages: StageData[];
}

export default function StageTemplateEditor({
  clientId,
  taskTypeName,
  taskTypeId,
  stages: initialStages,
}: Props) {
  const [stages, setStages] = useState(initialStages);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      setStages((prev) => {
        const oldIndex = prev.findIndex((s) => s.id === active.id);
        const newIndex = prev.findIndex((s) => s.id === over.id);
        const newStages = arrayMove(prev, oldIndex, newIndex).map((s, i) => ({
          ...s,
          order_index: i,
        }));
        return newStages;
      });

      const newOrder = stages.map((s) => s.id);
      const oldIndex = newOrder.indexOf(active.id as string);
      const newIndex = newOrder.indexOf(over.id as string);
      const reordered = arrayMove(newOrder, oldIndex, newIndex);

      setSaving(true);
      await reorderStageTemplates(clientId, taskTypeId, reordered);
      setSaving(false);
    },
    [clientId, taskTypeId, stages]
  );

  const handleChangeName = useCallback(
    async (id: string, name: string) => {
      setStages((prev) =>
        prev.map((s) => (s.id === id ? { ...s, stage_name: name } : s))
      );
      setSaving(true);
      await upsertStageTemplate(id, {
        client_id: clientId,
        task_type_id: taskTypeId,
        stage_name: name,
        order_index: stages.find((s) => s.id === id)?.order_index ?? 0,
        is_billable: stages.find((s) => s.id === id)?.is_billable ?? false,
        is_active: stages.find((s) => s.id === id)?.is_active ?? true,
      });
      setSaving(false);
    },
    [clientId, taskTypeId, stages]
  );

  const handleToggleBillable = useCallback(
    async (id: string, value: boolean) => {
      setStages((prev) =>
        prev.map((s) => (s.id === id ? { ...s, is_billable: value } : s))
      );
      setSaving(true);
      const stage = stages.find((s) => s.id === id);
      await upsertStageTemplate(id, {
        client_id: clientId,
        task_type_id: taskTypeId,
        stage_name: stage?.stage_name ?? "",
        order_index: stage?.order_index ?? 0,
        is_billable: value,
        is_active: stage?.is_active ?? true,
      });
      setSaving(false);
    },
    [clientId, taskTypeId, stages]
  );

  const handleToggleActive = useCallback(
    async (id: string, value: boolean) => {
      setStages((prev) =>
        prev.map((s) => (s.id === id ? { ...s, is_active: value } : s))
      );
      setSaving(true);
      const stage = stages.find((s) => s.id === id);
      await upsertStageTemplate(id, {
        client_id: clientId,
        task_type_id: taskTypeId,
        stage_name: stage?.stage_name ?? "",
        order_index: stage?.order_index ?? 0,
        is_billable: stage?.is_billable ?? false,
        is_active: value,
      });
      setSaving(false);
    },
    [clientId, taskTypeId, stages]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setStages((prev) => prev.filter((s) => s.id !== id));
      setSaving(true);
      await deleteStageTemplate(id);
      setSaving(false);
    },
    []
  );

  const handleAdd = async () => {
    if (!newName.trim()) return;
    const name = newName.trim();
    setSaving(true);
    setNewName("");
    const result = await addStageTemplate(clientId, taskTypeId, name);
    setSaving(false);
    if (result.success && result.stage) {
      setStages((prev) => [
        ...prev,
        {
          id: result.stage!.id,
          stage_name: result.stage!.stage_name,
          order_index: result.stage!.order_index,
          is_billable: result.stage!.is_billable,
          is_active: result.stage!.is_active,
        },
      ]);
    }
  };

  const activeStages = stages.filter((s) => s.is_active);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">{taskTypeName}</h3>
          <p className="text-xs text-zinc-500">
            {activeStages.length} active stages
          </p>
        </div>
      </div>

      <div className="mb-3 rounded-md border border-zinc-700/50 bg-zinc-950/50 px-3 py-2 text-xs text-zinc-500">
        Perubahan hanya berlaku untuk period yang di-generate setelah ini. Period yang sudah ada tidak akan berubah.
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={stages.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-1">
            {stages
              .sort((a, b) => a.order_index - b.order_index)
              .map((stage) => (
                <StageTemplateRow
                  key={stage.id}
                  stage={stage}
                  onChangeName={handleChangeName}
                  onToggleBillable={handleToggleBillable}
                  onToggleActive={handleToggleActive}
                  onDelete={handleDelete}
                />
              ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="mt-3 flex items-center gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          placeholder="New stage name..."
          className="flex-1 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
        />
        <button
          onClick={handleAdd}
          disabled={!newName.trim() || saving}
          className="rounded bg-white px-3 py-1 text-xs font-medium text-black transition-colors hover:bg-zinc-200 disabled:opacity-40"
        >
          + Tambah
        </button>
      </div>

      {saving && (
        <span className="mt-2 inline-block text-xs text-zinc-500 animate-pulse">
          Menyimpan...
        </span>
      )}
    </div>
  );
}
