"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lead, PipelineStage } from "@/lib/api";
import { Archive, Mail, Phone, User, Calendar, ArrowRight, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { ArchiveLeadDialog } from "./archive-lead-dialog";

/**
 * KanbanBoard Component
 * 
 * Interactive drag-and-drop pipeline visualization for managing leads through sales stages
 * 
 * Features:
 * - HTML5 Drag & Drop API for moving leads between stages
 * - Visual differentiation for final stages (Closed Won/Lost)
 * - Quick action buttons for stage movement and archiving
 * - Priority-based color coding (High: Red, Medium: Yellow, Low: Blue)
 * - Mobile-responsive column layout
 * 
 * Props:
 * @param stages - Array of pipeline stages (ordered)
 * @param leads - Array of leads to display (ONLY non-archived leads)
 * @param onMoveLeadToStage - Callback when lead is moved to new stage
 * @param onArchiveLead - Callback when lead is archived
 * @param onLeadClick - Optional callback when lead card is clicked
 * 
 * Important Notes:
 * - Only pass non-archived leads to this component
 * - Final stages (Closed Won/Lost) have special green/red styling
 * - Moving to final stages is the ONLY way to mark deal outcomes
 * - Archiving is separate from stage movement
 */
type KanbanBoardProps = {
  stages: PipelineStage[];
  leads: Lead[];
  onMoveLeadToStage: (leadId: string, stageId: string) => Promise<void>;
  onArchiveLead: (leadId: string, reason?: string) => Promise<void>;
  onLeadClick?: (lead: Lead) => void;
};

type LeadCardProps = {
  lead: Lead;
  onMoveToStage: (stageId: string) => void;
  onArchive: (reason?: string) => Promise<void>;
  onClick?: () => void;
  availableStages: PipelineStage[];
  onDragStart: (e: React.DragEvent) => void;
  isDragging: boolean;
};

function LeadCard({ 
  lead, 
  onMoveToStage, 
  onArchive, 
  onClick, 
  availableStages,
  onDragStart,
  isDragging,
}: LeadCardProps) {
  const [isMoving, setIsMoving] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);

  return (
    <>
      <Card
        draggable
        onDragStart={onDragStart}
        className={cn(
          "p-3 mb-2 cursor-move hover:shadow-md transition-all",
          "border-l-4",
          lead.priority === "HIGH" && "border-l-red-500",
          lead.priority === "MEDIUM" && "border-l-yellow-500",
          lead.priority === "LOW" && "border-l-blue-500",
          isDragging && "opacity-50 rotate-2"
        )}
        onClick={onClick}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 flex-1">
              <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm truncate">
                  {lead.firstName} {lead.lastName}
                </h4>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {lead.email && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span className="truncate max-w-[150px]">{lead.email}</span>
                    </div>
                  )}
                  {lead.mobile && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>{lead.mobile}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <Badge
              variant={
                lead.priority === "HIGH"
                  ? "destructive"
                  : lead.priority === "MEDIUM"
                    ? "default"
                    : "secondary"
              }
              className="ml-2 shrink-0"
            >
              {lead.priority}
            </Badge>
          </div>

          {lead.budgetMin && lead.budgetMax && (
            <div className="text-xs text-muted-foreground">
              Budget: ₹{lead.budgetMin.toLocaleString()} - ${lead.budgetMax.toLocaleString()}
            </div>
          )}

          {lead.assignedTo && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <span>{lead.assignedTo.fullName}</span>
            </div>
          )}

          {lead.nextFollowUpAt && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>Follow up: {new Date(lead.nextFollowUpAt).toLocaleDateString()}</span>
            </div>
          )}

          {lead.tags && lead.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {lead.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {lead.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{lead.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {showActions && (
            <div className="pt-2 border-t space-y-1" onClick={(e) => e.stopPropagation()}>
              <div className="flex flex-wrap gap-1">
                {availableStages
                  .filter((s) => s.id !== lead.currentStageId)
                  .slice(0, 3)
                  .map((stage) => {
                    const isWon = stage.isFinal && stage.name.toLowerCase().includes('won');
                    const isLost = stage.isFinal && stage.name.toLowerCase().includes('lost');
                    
                    return (
                      <Button
                        key={stage.id}
                        size="sm"
                        variant={stage.isFinal ? "default" : "ghost"}
                        className={cn(
                          "h-6 text-xs",
                          isWon && "bg-green-600 hover:bg-green-700",
                          isLost && "bg-red-600 hover:bg-red-700"
                        )}
                        onClick={async (e) => {
                          e.stopPropagation();
                          setIsMoving(true);
                          await onMoveToStage(stage.id);
                          setIsMoving(false);
                        }}
                        disabled={isMoving}
                      >
                        <ArrowRight className="h-3 w-3 mr-1" />
                        {stage.name}
                        {isWon && ' ✓'}
                        {isLost && ' ✗'}
                      </Button>
                    );
                  })}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowArchiveDialog(true);
                  }}
                >
                  <Archive className="h-3 w-3 mr-1" />
                  Archive
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      <ArchiveLeadDialog
        open={showArchiveDialog}
        onOpenChange={setShowArchiveDialog}
        onConfirm={onArchive}
        leadName={`${lead.firstName} ${lead.lastName}`}
      />
    </>
  );
}

type StageColumnProps = {
  stage: PipelineStage;
  leads: Lead[];
  onMoveLeadToStage: (leadId: string, stageId: string) => Promise<void>;
  onArchiveLead: (leadId: string, reason?: string) => Promise<void>;
  onLeadClick?: (lead: Lead) => void;
  allStages: PipelineStage[];
  draggedLeadId: string | null;
  onDragStart: (leadId: string) => void;
  onDragEnd: () => void;
  onDrop: (stageId: string) => void;
};

function StageColumn({
  stage,
  leads,
  onMoveLeadToStage,
  onArchiveLead,
  onLeadClick,
  allStages,
  draggedLeadId,
  onDragStart,
  onDragEnd,
  onDrop,
}: StageColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    onDrop(stage.id);
  };

  const isClosedWon = stage.isFinal && stage.name.toLowerCase().includes('won');
  const isClosedLost = stage.isFinal && stage.name.toLowerCase().includes('lost');
  const stageColor = isClosedWon ? '#16a34a' : isClosedLost ? '#dc2626' : stage.color;
  const bgColor = isClosedWon ? '#f0fdf4' : isClosedLost ? '#fef2f2' : `${stage.color}20`;

  return (
    <div className="shrink-0 w-80">
      <div className="mb-3">
        <div
          className={cn(
            "flex items-center justify-between p-3 rounded-lg",
            isClosedWon && "border border-green-300",
            isClosedLost && "border border-red-300"
          )}
          style={{ backgroundColor: bgColor, borderLeft: `4px solid ${stageColor}` }}
        >
          <div>
            <h3 className={cn(
              "font-semibold",
              isClosedWon && "text-green-700",
              isClosedLost && "text-red-700"
            )}>
              {stage.name}
            </h3>
            {stage.description && (
              <p className="text-xs text-muted-foreground mt-1">{stage.description}</p>
            )}
          </div>
          <Badge 
            variant={isClosedWon ? "default" : isClosedLost ? "destructive" : "secondary"}
            className={cn(
              isClosedWon && "bg-green-600",
              isClosedLost && "bg-red-600"
            )}
          >
            {leads.length}
          </Badge>
        </div>
        {stage.isFinal && (
          <Badge 
            variant={isClosedWon ? "default" : isClosedLost ? "destructive" : "outline"} 
            className={cn(
              "mt-2 ml-3 text-xs",
              isClosedWon && "bg-green-600",
              isClosedLost && "bg-red-600"
            )}
          >
            {isClosedWon ? '✓ Closed Won' : isClosedLost ? '✗ Closed Lost' : 'Final Stage'}
          </Badge>
        )}
      </div>
      <div
        className={cn(
          "space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto pr-2 p-2 rounded-lg transition-colors min-h-[200px]",
          isDragOver && "bg-accent/50 ring-2 ring-primary"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {leads.length === 0 ? (
          <Card className="p-4 text-center text-sm text-muted-foreground">
            {isDragOver ? "Drop lead here" : "No leads in this stage"}
          </Card>
        ) : (
          leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onMoveToStage={(stageId) => onMoveLeadToStage(lead.id, stageId)}
              onArchive={(reason) => onArchiveLead(lead.id, reason)}
              onClick={() => onLeadClick?.(lead)}
              availableStages={allStages}
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", lead.id);
                onDragStart(lead.id);
              }}
              isDragging={draggedLeadId === lead.id}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function KanbanBoard({
  stages,
  leads,
  onMoveLeadToStage,
  onArchiveLead,
  onLeadClick,
}: KanbanBoardProps) {
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const sortedStages = [...stages].sort((a, b) => a.order - b.order);
  
  const getLeadsForStage = (stageId: string) => {
    return leads.filter((lead) => lead.currentStageId === stageId);
  };

  const handleDrop = async (targetStageId: string) => {
    if (!draggedLeadId) return;

    const lead = leads.find(l => l.id === draggedLeadId);
    if (!lead) return;

    // Only move if dropping in a different stage
    if (lead.currentStageId !== targetStageId) {
      await onMoveLeadToStage(draggedLeadId, targetStageId);
    }
    
    setDraggedLeadId(null);
  };

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max">
        {sortedStages.map((stage) => (
          <StageColumn
            key={stage.id}
            stage={stage}
            leads={getLeadsForStage(stage.id)}
            onMoveLeadToStage={onMoveLeadToStage}
            onArchiveLead={onArchiveLead}
            onLeadClick={onLeadClick}
            allStages={sortedStages}
            draggedLeadId={draggedLeadId}
            onDragStart={setDraggedLeadId}
            onDragEnd={() => setDraggedLeadId(null)}
            onDrop={handleDrop}
          />
        ))}
      </div>
    </div>
  );
}
