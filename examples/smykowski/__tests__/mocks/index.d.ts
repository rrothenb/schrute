export * from './github-api.js';
export * from './sample-emails.js';
import { createMockGitHubClient, createMockIssue, createMockPR } from './github-api.js';
export declare const mocks: {
    github: {
        createClient: typeof createMockGitHubClient;
        createIssue: typeof createMockIssue;
        createPR: typeof createMockPR;
    };
    emails: {
        all: any[];
        byType: {
            meetingNotes: z.infer<any>[];
            commitment: z.infer<any>[];
            vacation: z.infer<any>[];
            statusRequest: z.infer<any>[];
            urgent: z.infer<any>[];
            prReminder: z.infer<any>[];
            dependency: z.infer<any>[];
            retrospective: z.infer<any>[];
            workload: z.infer<any>[];
            onboarding: z.infer<any>[];
        };
    };
};
//# sourceMappingURL=index.d.ts.map