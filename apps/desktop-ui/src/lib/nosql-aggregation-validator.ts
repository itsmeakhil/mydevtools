// Allowed aggregation pipeline stages
const ALLOWED_STAGES = new Set([
  "$addFields",
  "$bucket",
  "$bucketAuto",
  "$changeStream",
  "$collStats",
  "$count",
  "$densify",
  "$documents",
  "$facet",
  "$fill",
  "$geoNear",
  "$group",
  "$indexStats",
  "$limit",
  "$listSessions",
  "$lookup",
  "$match",
  "$merge",
  "$out",
  "$planCacheStats",
  "$project",
  "$redact",
  "$replaceRoot",
  "$replaceWith",
  "$sample",
  "$search",
  "$searchMeta",
  "$setWindowFields",
  "$skip",
  "$sort",
  "$sortByCount",
  "$unionWith",
  "$unwind",
])

// Blocked stages that can execute arbitrary code
const BLOCKED_STAGES = new Set(["$where", "$function", "$accumulator", "$eval"])

/**
 * Validates an aggregation pipeline to prevent code injection attacks.
 * - Blocks $where, $function, $accumulator, $eval
 * - Validates all stages are known
 * - Validates stage structure is an array of objects
 */
export function validateAggregationPipeline(pipeline: unknown): { valid: boolean; error?: string } {
  if (!Array.isArray(pipeline)) {
    return { valid: false, error: "Pipeline must be an array of stages" }
  }

  if (pipeline.length === 0) {
    return { valid: false, error: "Pipeline cannot be empty" }
  }

  if (pipeline.length > 100) {
    return { valid: false, error: "Pipeline cannot have more than 100 stages" }
  }

  for (let i = 0; i < pipeline.length; i++) {
    const stage = pipeline[i]

    if (!stage || typeof stage !== "object" || Array.isArray(stage)) {
      return { valid: false, error: `Stage ${i} must be a non-array object` }
    }

    const stageName = Object.keys(stage)[0]
    if (!stageName) {
      return { valid: false, error: `Stage ${i} is empty` }
    }

    if (BLOCKED_STAGES.has(stageName)) {
      return {
        valid: false,
        error: `Stage ${stageName} is not allowed for security reasons`,
      }
    }

    if (!ALLOWED_STAGES.has(stageName)) {
      return { valid: false, error: `Unknown aggregation stage: ${stageName}` }
    }
  }

  return { valid: true }
}
