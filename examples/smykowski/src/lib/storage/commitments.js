import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
export class CommitmentsStorage {
    constructor(tableName, region = 'us-east-1') {
        const client = new DynamoDBClient({ region });
        this.docClient = DynamoDBDocumentClient.from(client);
        this.tableName = tableName;
    }
    async store(commitment) {
        await this.docClient.send(new PutCommand({
            TableName: this.tableName,
            Item: commitment,
        }));
    }
    async get(id) {
        const result = await this.docClient.send(new GetCommand({
            TableName: this.tableName,
            Key: { id },
        }));
        return result.Item || null;
    }
    async getByPerson(email) {
        const result = await this.docClient.send(new QueryCommand({
            TableName: this.tableName,
            IndexName: 'person_email-index',
            KeyConditionExpression: 'person_email = :email',
            ExpressionAttributeValues: { ':email': email },
        }));
        return result.Items || [];
    }
    async updateStatus(id, status) {
        await this.docClient.send(new UpdateCommand({
            TableName: this.tableName,
            Key: { id },
            UpdateExpression: 'SET #status = :status, updated_at = :now',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: {
                ':status': status,
                ':now': new Date().toISOString(),
            },
        }));
    }
}
//# sourceMappingURL=commitments.js.map