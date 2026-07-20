// Pure logic for the aggregation pipeline builder (nosql-explorer).

export interface PipelineStage {
    id: string;
    type: string;
    body: string;
    enabled: boolean;
}

export const STAGE_TYPES = [
    "$match", "$project", "$group", "$sort", "$limit", "$skip",
    "$lookup", "$unwind", "$addFields", "$count", "$facet", "$sample",
    "$replaceRoot", "$sortByCount", "$bucket",
] as const;

export const STAGE_TEMPLATES: Record<string, string> = {
    $match: '{\n  "field": "value"\n}',
    $project: '{\n  "field": 1\n}',
    $group: '{\n  "_id": "$field",\n  "count": { "$sum": 1 }\n}',
    $sort: '{\n  "field": 1\n}',
    $limit: "10",
    $skip: "0",
    $lookup: '{\n  "from": "other_collection",\n  "localField": "local_field",\n  "foreignField": "foreign_field",\n  "as": "joined"\n}',
    $unwind: '"$arrayField"',
    $addFields: '{\n  "newField": "$existing"\n}',
    $count: '"total"',
    $facet: '{\n  "results": [{ "$limit": 10 }]\n}',
    $sample: '{\n  "size": 10\n}',
    $replaceRoot: '{\n  "newRoot": "$field"\n}',
    $sortByCount: '"$field"',
    $bucket: '{\n  "groupBy": "$field",\n  "boundaries": [0, 100],\n  "default": "other"\n}',
};

const newId = () => crypto.randomUUID();

export function newStage(type = "$match"): PipelineStage {
    return { id: newId(), type, body: STAGE_TEMPLATES[type] ?? "{}", enabled: true };
}

/** Parse a raw pipeline JSON array into editable stages. Null when not a pipeline. */
export function parsePipeline(text: string): PipelineStage[] | null {
    try {
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) return null;
        const stages: PipelineStage[] = [];
        for (const s of parsed) {
            if (typeof s !== "object" || s === null || Array.isArray(s)) return null;
            const keys = Object.keys(s);
            if (keys.length !== 1) return null;
            stages.push({
                id: newId(),
                type: keys[0],
                body: JSON.stringify(s[keys[0]], null, 2),
                enabled: true,
            });
        }
        return stages;
    } catch {
        return null;
    }
}

/**
 * Serialize stages (enabled only, up to `upTo` inclusive when given) back to
 * pipeline JSON. Throws on invalid stage-body JSON.
 */
export function stagesToPipeline(stages: PipelineStage[], upTo?: number): string {
    const active = stages.filter((s, i) => s.enabled && (upTo === undefined || i <= upTo));
    const out = active.map((s) => ({ [s.type]: JSON.parse(s.body) }));
    return JSON.stringify(out, null, 2);
}
