import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
const client = new SecretsManagerClient({});
export async function getSecret(secretId) {
    const command = new GetSecretValueCommand({ SecretId: secretId });
    const response = await client.send(command);
    return response.SecretString || '';
}
//# sourceMappingURL=secrets.js.map