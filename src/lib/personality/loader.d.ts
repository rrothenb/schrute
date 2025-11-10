import { PersonalityConfig } from '~/lib/types/index.js';
export declare class PersonalityLoader {
    private personalities;
    private defaultPersonalityName;
    /**
     * Load a personality from a YAML file
     */
    loadFromFile(filePath: string): Promise<PersonalityConfig>;
    /**
     * Load all personalities from a directory
     */
    loadFromDirectory(dirPath: string): Promise<PersonalityConfig[]>;
    /**
     * Get a personality by name
     */
    get(name: string): PersonalityConfig | undefined;
    /**
     * Get the default personality
     */
    getDefault(): PersonalityConfig;
    /**
     * Set the default personality name
     */
    setDefaultPersonalityName(name: string): void;
    /**
     * Get all loaded personality names
     */
    getAvailablePersonalities(): string[];
    /**
     * Check if a personality is loaded
     */
    has(name: string): boolean;
    /**
     * Add a personality programmatically
     */
    add(personality: PersonalityConfig): void;
    /**
     * Clear all personalities
     */
    clear(): void;
}
export declare function createPersonalityLoader(): PersonalityLoader;
//# sourceMappingURL=loader.d.ts.map