import { parsePipeline, stagesToPipeline, newStage } from "../nosql-pipeline";
import { summarizeExplain } from "../nosql-explain";

describe("parsePipeline", () => {
    it("parses a pipeline array into stages", () => {
        const stages = parsePipeline('[{"$match": {"a": 1}}, {"$limit": 5}]');
        expect(stages).toHaveLength(2);
        expect(stages![0].type).toBe("$match");
        expect(JSON.parse(stages![0].body)).toEqual({ a: 1 });
        expect(stages![1].type).toBe("$limit");
        expect(stages![1].enabled).toBe(true);
    });

    it("returns null for non-pipelines", () => {
        expect(parsePipeline('{"a": 1}')).toBeNull();
        expect(parsePipeline("not json")).toBeNull();
        expect(parsePipeline('[{"$match": {}, "$limit": 5}]')).toBeNull(); // two keys per stage
        expect(parsePipeline("[1, 2]")).toBeNull();
    });
});

describe("stagesToPipeline", () => {
    const stages = [
        { ...newStage("$match"), body: '{"a": 1}' },
        { ...newStage("$sort"), body: '{"a": -1}', enabled: false },
        { ...newStage("$limit"), body: "5" },
    ];

    it("serializes enabled stages only", () => {
        expect(JSON.parse(stagesToPipeline(stages))).toEqual([{ $match: { a: 1 } }, { $limit: 5 }]);
    });

    it("respects the upTo bound (preview-to-here)", () => {
        expect(JSON.parse(stagesToPipeline(stages, 0))).toEqual([{ $match: { a: 1 } }]);
        expect(JSON.parse(stagesToPipeline(stages, 1))).toEqual([{ $match: { a: 1 } }]); // index 1 disabled
    });

    it("throws on invalid stage JSON", () => {
        expect(() => stagesToPipeline([{ ...newStage("$match"), body: "{oops" }])).toThrow();
    });

    it("round-trips through parsePipeline", () => {
        const text = stagesToPipeline(stages);
        const reparsed = parsePipeline(text)!;
        expect(reparsed.map((s) => s.type)).toEqual(["$match", "$limit"]);
    });
});

describe("summarizeExplain", () => {
    it("flags COLLSCAN and reads executionStats", () => {
        const summary = summarizeExplain({
            queryPlanner: { winningPlan: { stage: "COLLSCAN", direction: "forward" } },
            executionStats: { nReturned: 3, totalDocsExamined: 1000, executionTimeMillis: 12 },
        });
        expect(summary.collscan).toBe(true);
        expect(summary.nReturned).toBe(3);
        expect(summary.totalDocsExamined).toBe(1000);
        expect(summary.executionTimeMillis).toBe(12);
    });

    it("finds index names in nested plans (aggregate explain shape)", () => {
        const summary = summarizeExplain({
            stages: [{
                $cursor: {
                    queryPlanner: {
                        winningPlan: { stage: "FETCH", inputStage: { stage: "IXSCAN", indexName: "a_1" } },
                    },
                },
            }],
        });
        expect(summary.collscan).toBe(false);
        expect(summary.indexNames).toEqual(["a_1"]);
        expect(summary.stages).toEqual(expect.arrayContaining(["FETCH", "IXSCAN"]));
    });

    it("tolerates junk input", () => {
        expect(summarizeExplain(null).stages).toEqual([]);
        expect(summarizeExplain("x").collscan).toBe(false);
    });
});
