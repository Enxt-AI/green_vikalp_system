"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { pipelines, type PipelineType } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Stage = {
  name: string;
  description: string;
  color: string;
};

type CreatePipelineDialogProps = {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onPipelineCreated?: () => void;
};

const PREDEFINED_COLORS = [
  { name: "Blue", value: "#3B82F6" },
  { name: "Green", value: "#10B981" },
  { name: "Orange", value: "#F59E0B" },
  { name: "Red", value: "#EF4444" },
  { name: "Purple", value: "#8B5CF6" },
  { name: "Pink", value: "#EC4899" },
  { name: "Cyan", value: "#06B6D4" },
  { name: "Indigo", value: "#6366F1" },
];

export function CreatePipelineDialog({
  children,
  open,
  onOpenChange,
  onPipelineCreated,
}: CreatePipelineDialogProps) {
  // Controlled/uncontrolled state pattern
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;
  const setDialogOpen = isControlled ? (onOpenChange || (() => {})) : setInternalOpen;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<PipelineType>("BUYER");
  const [stages, setStages] = useState<Stage[]>([
    { name: "New", description: "", color: "#3B82F6" },
    { name: "Contacted", description: "", color: "#F59E0B" },
    { name: "Qualified", description: "", color: "#10B981" },
    { name: "Proposal", description: "", color: "#8B5CF6" },
  ]);
  const [isCreating, setIsCreating] = useState(false);

  // Reset form when dialog closes
  useEffect(() => {
    if (!dialogOpen) {
      setName("");
      setDescription("");
      setType("BUYER");
      setStages([
        { name: "New", description: "", color: "#3B82F6" },
        { name: "Contacted", description: "", color: "#F59E0B" },
        { name: "Qualified", description: "", color: "#10B981" },
        { name: "Proposal", description: "", color: "#8B5CF6" },
      ]);
    }
  }, [dialogOpen]);

  const addStage = () => {
    setStages([...stages, { name: "", description: "", color: "#3B82F6" }]);
  };

  const removeStage = (index: number) => {
    if (stages.length <= 1) {
      toast.error("Pipeline must have at least one stage");
      return;
    }
    setStages(stages.filter((_, i) => i !== index));
  };

  const updateStage = (index: number, field: keyof Stage, value: string) => {
    const newStages = [...stages];
    newStages[index][field] = value;
    setStages(newStages);
  };

  const handleCreate = async () => {
    // Validation
    if (!name.trim()) {
      toast.error("Pipeline name is required");
      return;
    }

    if (stages.length === 0) {
      toast.error("Pipeline must have at least one stage");
      return;
    }

    // Validate all stages have names
    const emptyStageIndex = stages.findIndex((s) => !s.name.trim());
    if (emptyStageIndex !== -1) {
      toast.error(`Stage ${emptyStageIndex + 1} name is required`);
      return;
    }

    try {
      setIsCreating(true);

      await pipelines.create({
        name: name.trim(),
        description: description.trim() || undefined,
        type,
        stages: stages.map((stage, index) => ({
          name: stage.name.trim(),
          description: stage.description.trim() || undefined,
          color: stage.color,
          isDefault: index === 0, // First stage is default
        })),
      });

      toast.success("Pipeline created successfully");
      setDialogOpen(false);
      onPipelineCreated?.();
    } catch (error) {
      console.error("Failed to create pipeline:", error);
      toast.error("Failed to create pipeline");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Pipeline</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Pipeline Details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Pipeline Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Real Estate Sales"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description of this pipeline..."
                maxLength={500}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Pipeline Type *</Label>
              <Select value={type} onValueChange={(value) => setType(value as PipelineType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BUYER">Buyer Pipeline</SelectItem>
                  <SelectItem value="SELLER">Seller Pipeline</SelectItem>
                  <SelectItem value="INVESTOR">Investor Pipeline</SelectItem>
                  <SelectItem value="RENTER">Renter Pipeline</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stages Section */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Pipeline Stages *</Label>
              <Button type="button" variant="outline" size="sm" onClick={addStage}>
                Add Stage
              </Button>
            </div>

            <div className="space-y-3">
              {stages.map((stage, index) => (
                <div key={index} className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-neutral-700">
                      Stage {index + 1}
                      {index === 0 && (
                        <span className="ml-2 text-xs text-neutral-500">(Default)</span>
                      )}
                    </span>
                    {stages.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStage(index)}
                        className="h-8 text-red-600 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor={`stage-name-${index}`} className="text-sm">
                        Stage Name *
                      </Label>
                      <Input
                        id={`stage-name-${index}`}
                        value={stage.name}
                        onChange={(e) => updateStage(index, "name", e.target.value)}
                        placeholder="e.g., Qualified"
                        maxLength={100}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor={`stage-description-${index}`} className="text-sm">
                        Description
                      </Label>
                      <Textarea
                        id={`stage-description-${index}`}
                        value={stage.description}
                        onChange={(e) => updateStage(index, "description", e.target.value)}
                        placeholder="Optional description..."
                        maxLength={500}
                        rows={2}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor={`stage-color-${index}`} className="text-sm">
                        Color
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {PREDEFINED_COLORS.map((color) => (
                          <button
                            key={color.value}
                            type="button"
                            onClick={() => updateStage(index, "color", color.value)}
                            className={`h-8 w-8 rounded-md border-2 transition-all hover:scale-110 ${
                              stage.color === color.value
                                ? "border-neutral-900 ring-2 ring-neutral-300"
                                : "border-neutral-200"
                            }`}
                            style={{ backgroundColor: color.value }}
                            title={color.name}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-3 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? "Creating..." : "Create Pipeline"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
