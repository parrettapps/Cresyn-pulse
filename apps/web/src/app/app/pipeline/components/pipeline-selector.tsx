'use client';

import { Check, ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../../../components/ui/button';
import type { PipelineWithStages } from '../../../../types/pipeline';

interface PipelineSelectorProps {
  pipelines: PipelineWithStages[];
  selected: PipelineWithStages | null;
  onSelect: (pipeline: PipelineWithStages) => void;
}

export function PipelineSelector({ pipelines, selected, onSelect }: PipelineSelectorProps) {
  const [open, setOpen] = useState(false);

  if (pipelines.length === 0) return null;
  if (pipelines.length === 1) {
    return (
      <div className="text-sm font-medium text-neutral-700">
        {pipelines[0]!.name}
      </div>
    );
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        className="min-w-40 justify-between"
      >
        <span className="truncate">{selected?.name || 'Select pipeline'}</span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />

          {/* Dropdown Menu */}
          <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-lg border border-neutral-200 bg-white shadow-lg">
            <div className="p-1">
              {pipelines.map((pipeline) => {
                const isSelected = pipeline.id === selected?.id;
                return (
                  <button
                    key={pipeline.id}
                    onClick={() => {
                      onSelect(pipeline);
                      setOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-neutral-50"
                  >
                    <Check
                      className={`h-4 w-4 ${isSelected ? 'opacity-100' : 'opacity-0'}`}
                    />
                    <div className="flex-1 text-left">
                      <div className="font-medium text-neutral-900">{pipeline.name}</div>
                      {pipeline.description && (
                        <div className="text-xs text-neutral-500">{pipeline.description}</div>
                      )}
                    </div>
                    {pipeline.isDefault && (
                      <span className="text-xs text-neutral-400">Default</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
