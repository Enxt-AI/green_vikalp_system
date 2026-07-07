"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * CampaignAnalyticsChart Component
 * 
 * Displays two interactive pie charts for campaign performance visualization
 * 
 * Chart 1 - Pipeline Distribution:
 * - Shows lead distribution across all pipeline stages
 * - Each slice uses the stage's configured color
 * - Click on slice to filter and view leads in that stage
 * - Only shows stages that have leads (empty stages hidden)
 * 
 * Chart 2 - Deal Outcomes:
 * - Shows Active Leads vs. Closed Won vs. Closed Lost
 * - Blue: Active leads in pipeline
 * - Green: Successfully closed deals
 * - Red: Lost opportunities
 * - Displays Win Rate percentage below chart
 * 
 * Data Handling:
 * - Final stages (Closed Won/Lost): Includes ALL leads (even archived)
 * - Active stages: Excludes archived leads
 * - This ensures accurate metrics while keeping pipeline clean
 * 
 * Interactive Features:
 * - Hover tooltips show count and percentage
 * - Click on pipeline stages to view lead details
 * - Responsive design with mobile support
 * 
 * Props:
 * @param stages - Array of pipeline stages with colors and metadata
 * @param leads - ALL leads (including archived) for accurate metrics
 * @param onStageClick - Callback when user clicks a pipeline stage slice
 */
interface PipelineStage {
  id: string;
  name: string;
  color: string;
  order: number;
  isFinal?: boolean;
}

interface Lead {
  id: string;
  currentStageId: string;
  isArchived: boolean;
}

interface CampaignAnalyticsChartProps {
  stages: PipelineStage[];
  leads: Lead[];
  onStageClick: (stageId: string) => void;
}

export function CampaignAnalyticsChart({
  stages,
  leads,
  onStageClick,
}: CampaignAnalyticsChartProps) {
  // Pipeline stages data (all stages with lead counts)
  const pipelineData = stages.map((stage) => {
    const stageLeads = leads.filter(
      (lead) =>
        lead.currentStageId === stage.id &&
        (stage.isFinal ? true : !lead.isArchived) // For final stages, include all; for others, exclude archived
    );
    return {
      id: stage.id,
      name: stage.name,
      value: stageLeads.length,
      color: stage.color,
      isFinal: stage.isFinal,
    };
  }).filter((item) => item.value > 0); // Only show stages with leads

  // Deal outcome data (Won/Lost/Active)
  const activeLeads = leads.filter((l) => {
    const stage = stages.find((s) => s.id === l.currentStageId);
    return !stage?.isFinal && !l.isArchived;
  }).length;

  const wonLeads = leads.filter((l) => {
    const stage = stages.find((s) => s.id === l.currentStageId);
    return stage?.isFinal && stage?.name.toLowerCase().includes("won");
  }).length;

  const lostLeads = leads.filter((l) => {
    const stage = stages.find((s) => s.id === l.currentStageId);
    return stage?.isFinal && stage?.name.toLowerCase().includes("lost");
  }).length;

  const outcomeData = [
    { name: "Active Leads", value: activeLeads, color: "#3b82f6" },
    { name: "Closed Won", value: wonLeads, color: "#16a34a" },
    { name: "Closed Lost", value: lostLeads, color: "#dc2626" },
  ].filter((item) => item.value > 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const total = pipelineData.reduce((sum, item) => sum + item.value, 0);
      const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0;
      
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {data.value} leads ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const OutcomeTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const total = outcomeData.reduce((sum, item) => sum + item.value, 0);
      const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0;
      
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {data.value} leads ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null; // Don't show label for very small slices

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        className="font-semibold text-sm"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Pipeline Distribution Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Distribution</CardTitle>
          <p className="text-sm text-muted-foreground">
            Click on a stage to view leads
          </p>
        </CardHeader>
        <CardContent>
          {pipelineData.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No leads in pipeline
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pipelineData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  onClick={(data) => onStageClick(data.id)}
                  cursor="pointer"
                >
                  {pipelineData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value, entry: any) => (
                    <span className="text-sm">
                      {value} ({entry.payload.value})
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Total: {pipelineData.reduce((sum, item) => sum + item.value, 0)} leads
          </div>
        </CardContent>
      </Card>

      {/* Deal Outcome Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Deal Outcomes</CardTitle>
          <p className="text-sm text-muted-foreground">
            Active vs. Closed deals
          </p>
        </CardHeader>
        <CardContent>
          {outcomeData.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No leads to display
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={outcomeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {outcomeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<OutcomeTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value, entry: any) => (
                    <span className="text-sm">
                      {value} ({entry.payload.value})
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
          {wonLeads + lostLeads > 0 && (
            <div className="mt-4 text-center">
              <div className="text-2xl font-bold text-neutral-900">
                {Math.round((wonLeads / (wonLeads + lostLeads)) * 100)}%
              </div>
              <div className="text-sm text-muted-foreground">Win Rate</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
