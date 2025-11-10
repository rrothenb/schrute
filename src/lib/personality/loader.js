import { readFile, readdir } from 'fs/promises';
import { parse } from 'yaml';
import { PersonalityConfigSchema } from '~/lib/types/index.js';
import { join } from 'path';
export class PersonalityLoader {
    constructor() {
        this.personalities = new Map();
        this.defaultPersonalityName = 'default';
    }
    /**
     * Load a personality from a YAML file
     */
    async loadFromFile(filePath) {
        try {
            const content = await readFile(filePath, 'utf-8');
            const parsed = parse(content);
            const personality = PersonalityConfigSchema.parse(parsed);
            this.personalities.set(personality.name, personality);
            return personality;
        }
        catch (error) {
            throw new Error(`Failed to load personality from ${filePath}: ${error}`);
        }
    }
    /**
     * Load all personalities from a directory
     */
    async loadFromDirectory(dirPath) {
        try {
            const files = await readdir(dirPath);
            const yamlFiles = files.filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));
            const personalities = [];
            for (const file of yamlFiles) {
                const filePath = join(dirPath, file);
                const personality = await this.loadFromFile(filePath);
                personalities.push(personality);
            }
            return personalities;
        }
        catch (error) {
            throw new Error(`Failed to load personalities from ${dirPath}: ${error}`);
        }
    }
    /**
     * Get a personality by name
     */
    get(name) {
        return this.personalities.get(name);
    }
    /**
     * Get the default personality
     */
    getDefault() {
        const personality = this.personalities.get(this.defaultPersonalityName);
        if (!personality) {
            throw new Error(`Default personality "${this.defaultPersonalityName}" not found`);
        }
        return personality;
    }
    /**
     * Set the default personality name
     */
    setDefaultPersonalityName(name) {
        this.defaultPersonalityName = name;
    }
    /**
     * Get all loaded personality names
     */
    getAvailablePersonalities() {
        return Array.from(this.personalities.keys());
    }
    /**
     * Check if a personality is loaded
     */
    has(name) {
        return this.personalities.has(name);
    }
    /**
     * Add a personality programmatically
     */
    add(personality) {
        this.personalities.set(personality.name, personality);
    }
    /**
     * Clear all personalities
     */
    clear() {
        this.personalities.clear();
    }
}
export function createPersonalityLoader() {
    return new PersonalityLoader();
}
//# sourceMappingURL=loader.js.map