SELECT p.name as pipeline, ps.name as stage, ps."isFinal", ps."order" 
FROM "Pipeline" p 
LEFT JOIN "PipelineStage" ps ON p.id = ps."pipelineId" 
ORDER BY p.name, ps."order";
