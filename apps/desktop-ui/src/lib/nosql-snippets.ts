// MongoDB query/aggregation snippets + operator metadata for the nosql-explorer
// Monaco completion provider. Pure data so it can be unit-tested and reused;
// the component maps these to Monaco CompletionItems (kept out of here to avoid
// importing monaco types into a lib module).
//
// `insertText` uses Monaco snippet placeholder syntax (${1:foo}) when
// `snippet` is true. The editor language is JSON, so snippets are JSON-shaped.

export interface NosqlCompletion {
    /** Text shown in the completion list. */
    label: string;
    /** Short right-aligned hint (e.g. the category). */
    detail: string;
    /** Markdown docs shown in the details flyout. */
    doc: string;
    /** Text inserted on accept. */
    insertText: string;
    /** When true, insertText contains ${n} tab-stops (InsertAsSnippet). */
    snippet: boolean;
}

// Query + aggregation operators. Kept flat; `detail` groups them visually.
export const MONGO_OPERATORS: NosqlCompletion[] = [
    // comparison
    op("$eq", "comparison", "Matches values equal to a specified value.", `"$eq": \${1:value}`),
    op("$ne", "comparison", "Matches values not equal to a specified value.", `"$ne": \${1:value}`),
    op("$gt", "comparison", "Matches values greater than a specified value.", `"$gt": \${1:value}`),
    op("$gte", "comparison", "Matches values greater than or equal to a specified value.", `"$gte": \${1:value}`),
    op("$lt", "comparison", "Matches values less than a specified value.", `"$lt": \${1:value}`),
    op("$lte", "comparison", "Matches values less than or equal to a specified value.", `"$lte": \${1:value}`),
    op("$in", "comparison", "Matches any of the values in an array.", `"$in": [\${1:value}]`),
    op("$nin", "comparison", "Matches none of the values in an array.", `"$nin": [\${1:value}]`),
    // logical
    op("$and", "logical", "Joins clauses with a logical AND.", `"$and": [\${1:{}}]`),
    op("$or", "logical", "Joins clauses with a logical OR.", `"$or": [\${1:{}}]`),
    op("$nor", "logical", "Joins clauses with a logical NOR.", `"$nor": [\${1:{}}]`),
    op("$not", "logical", "Inverts the effect of a query expression.", `"$not": \${1:{}}`),
    // element / evaluation
    op("$exists", "element", "Matches documents that have the specified field.", `"$exists": \${1:true}`),
    op("$type", "element", "Selects documents where a field is of the specified BSON type.", `"$type": "\${1:string}"`),
    op("$regex", "evaluation", "Selects documents where values match a regular expression.", `"$regex": "\${1:pattern}", "$options": "\${2:i}"`),
    op("$expr", "evaluation", "Allows aggregation expressions within the query language.", `"$expr": \${1:{}}`),
    op("$mod", "evaluation", "Performs a modulo operation on a field value.", `"$mod": [\${1:divisor}, \${2:remainder}]`),
    // array
    op("$all", "array", "Matches arrays that contain all specified elements.", `"$all": [\${1:value}]`),
    op("$elemMatch", "array", "Matches documents with array elements meeting all criteria.", `"$elemMatch": \${1:{}}`),
    op("$size", "array", "Matches arrays with the specified number of elements.", `"$size": \${1:0}`),
    // aggregation stages
    op("$match", "stage", "Filters documents to pass only matching ones to the next stage.", `"$match": \${1:{}}`),
    op("$project", "stage", "Reshapes documents, including/excluding fields.", `"$project": \${1:{}}`),
    op("$group", "stage", "Groups documents by an _id expression and computes accumulators.", `"$group": { "_id": \${1:null} }`),
    op("$sort", "stage", "Sorts documents by the specified fields.", `"$sort": { "\${1:field}": \${2:-1} }`),
    op("$limit", "stage", "Limits the number of documents passed to the next stage.", `"$limit": \${1:10}`),
    op("$skip", "stage", "Skips a number of documents.", `"$skip": \${1:0}`),
    op("$lookup", "stage", "Performs a left outer join to another collection.", `"$lookup": { "from": "\${1:coll}", "localField": "\${2:local}", "foreignField": "\${3:foreign}", "as": "\${4:joined}" }`),
    op("$unwind", "stage", "Deconstructs an array field into one document per element.", `"$unwind": "$\${1:field}"`),
    op("$addFields", "stage", "Adds new fields to documents.", `"$addFields": \${1:{}}`),
    op("$count", "stage", "Counts documents at this stage.", `"$count": "\${1:count}"`),
    // accumulators
    op("$sum", "accumulator", "Sums numeric values (use 1 to count).", `"$sum": \${1:1}`),
    op("$avg", "accumulator", "Averages numeric values.", `"$avg": "$\${1:field}"`),
    op("$min", "accumulator", "Returns the minimum value.", `"$min": "$\${1:field}"`),
    op("$max", "accumulator", "Returns the maximum value.", `"$max": "$\${1:field}"`),
    op("$first", "accumulator", "Returns the first value in a group.", `"$first": "$\${1:field}"`),
    op("$last", "accumulator", "Returns the last value in a group.", `"$last": "$\${1:field}"`),
    op("$push", "accumulator", "Appends values to an array in a group.", `"$push": "$\${1:field}"`),
    op("$addToSet", "accumulator", "Appends unique values to an array in a group.", `"$addToSet": "$\${1:field}"`),
];

// Whole-query / whole-pipeline templates. These replace the editor content so
// they carry no leading key — they are full JSON documents/arrays.
export const MONGO_SNIPPETS: NosqlCompletion[] = [
    tpl("find: equals", "Filter by a field equals a value.", `{ "\${1:field}": \${2:value} }`),
    tpl("find: range", "Filter by a numeric/date range.", `{ "\${1:field}": { "$gte": \${2:min}, "$lte": \${3:max} } }`),
    tpl("find: in list", "Field matches any value in a list.", `{ "\${1:field}": { "$in": [\${2:a}, \${3:b}] } }`),
    tpl("find: regex", "Case-insensitive substring match.", `{ "\${1:field}": { "$regex": "\${2:text}", "$options": "i" } }`),
    tpl("find: exists", "Field is present (or absent).", `{ "\${1:field}": { "$exists": \${2:true} } }`),
    tpl("find: and", "Combine conditions with AND.", `{ "$and": [ { "\${1:a}": \${2:1} }, { "\${3:b}": \${4:2} } ] }`),
    tpl("find: or", "Combine conditions with OR.", `{ "$or": [ { "\${1:a}": \${2:1} }, { "\${3:b}": \${4:2} } ] }`),
    tpl("find: by ObjectId", "Match an _id ObjectId.", `{ "_id": { "$oid": "\${1:507f1f77bcf86cd799439011}" } }`),
    tpl(
        "agg: group + count",
        "Group by a field and count documents per group.",
        `[\n  { "$group": { "_id": "$\${1:field}", "count": { "$sum": 1 } } },\n  { "$sort": { "count": -1 } }\n]`,
    ),
    tpl(
        "agg: group + sum/avg",
        "Group and total/average a numeric field.",
        `[\n  { "$group": { "_id": "$\${1:groupField}", "total": { "$sum": "$\${2:amount}" }, "avg": { "$avg": "$\${2:amount}" } } }\n]`,
    ),
    tpl(
        "agg: match + sort + limit",
        "Top-N filtered documents.",
        `[\n  { "$match": { "\${1:field}": \${2:value} } },\n  { "$sort": { "\${3:sortField}": -1 } },\n  { "$limit": \${4:10} }\n]`,
    ),
    tpl(
        "agg: lookup (join)",
        "Left outer join to another collection.",
        `[\n  { "$lookup": { "from": "\${1:other}", "localField": "\${2:local}", "foreignField": "\${3:_id}", "as": "\${4:joined}" } },\n  { "$unwind": "$\${4:joined}" }\n]`,
    ),
    tpl(
        "agg: unwind + group",
        "Flatten an array then group by its elements.",
        `[\n  { "$unwind": "$\${1:items}" },\n  { "$group": { "_id": "$\${1:items}", "count": { "$sum": 1 } } }\n]`,
    ),
    tpl(
        "agg: facet",
        "Run multiple sub-pipelines in one pass.",
        `[\n  { "$facet": {\n    "\${1:byStatus}": [ { "$group": { "_id": "$\${2:status}", "n": { "$sum": 1 } } } ],\n    "\${3:total}": [ { "$count": "count" } ]\n  } }\n]`,
    ),
];

function op(label: string, detail: string, doc: string, body: string): NosqlCompletion {
    return { label, detail, doc, insertText: body, snippet: true };
}

function tpl(label: string, doc: string, body: string): NosqlCompletion {
    return { label, detail: "snippet", doc, insertText: body, snippet: true };
}
