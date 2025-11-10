import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
export class TeamStateStorage {
    constructor(tableName, region = 'us-east-1') {
        const client = new DynamoDBClient({ region });
        this.docClient = DynamoDBDocumentClient.from(client);
        this.tableName = tableName;
    }
    async store(member) {
        await this.docClient.send(new PutCommand({
            TableName: this.tableName,
            Item: member,
        }));
    }
    async get(email) {
        const result = await this.docClient.send(new GetCommand({
            TableName: this.tableName,
            Key: { email },
        }));
        return result.Item || null;
    }
    async getAll() {
        const result = await this.docClient.send(new ScanCommand({
            TableName: this.tableName,
        }));
        return result.Items || [];
    }
    async updateWorkload(email, workload, assignedIssues) {
        await this.docClient.send(new UpdateCommand({
            TableName: this.tableName,
            Key: { email },
            UpdateExpression: 'SET current_workload = :workload, assigned_issues = :issues, updated_at = :now',
            ExpressionAttributeValues: {
                ':workload': workload,
                ':issues': assignedIssues,
                ':now': new Date().toISOString(),
            },
        }));
    }
}
//# sourceMappingURL=team-state.js.map