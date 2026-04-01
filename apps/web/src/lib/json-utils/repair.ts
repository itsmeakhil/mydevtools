import { jsonrepair } from 'jsonrepair';

export interface RepairResult {
    repaired: string;
    wasRepaired: boolean;
    changes: string[];
}

export function repairJSON(input: string): RepairResult {
    const changes: string[] = [];

    try {
        // Try to parse as-is first
        JSON.parse(input);
        return {
            repaired: input,
            wasRepaired: false,
            changes: [],
        };
    } catch {
        // Input needs repair
    }

    try {
        const repaired = jsonrepair(input);

        // Detect what was changed
        if (input !== repaired) {
            if (input.includes("'") && !repaired.includes("'")) {
                changes.push('Replaced single quotes with double quotes');
            }
            if (input.match(/,\s*[}\]]/)) {
                changes.push('Removed trailing commas');
            }
            if (!input.includes('"') && repaired.includes('"')) {
                changes.push('Added missing quotes around keys');
            }
            if (input.includes('//') || input.includes('/*')) {
                changes.push('Removed comments');
            }
        }

        return {
            repaired,
            wasRepaired: true,
            changes: changes.length > 0 ? changes : ['Fixed JSON syntax errors'],
        };
    } catch (err) {
        throw new Error('Could not repair JSON: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
}

export function validateJSON(input: string): { isValid: boolean; error: string | null } {
    try {
        JSON.parse(input);
        return { isValid: true, error: null };
    } catch (err) {
        return {
            isValid: false,
            error: err instanceof Error ? err.message : 'Invalid JSON',
        };
    }
}

export function formatJSON(input: string, indent: number = 2): string {
    const parsed = JSON.parse(input);
    return JSON.stringify(parsed, null, indent);
}

export function minifyJSON(input: string): string {
    const parsed = JSON.parse(input);
    return JSON.stringify(parsed);
}
