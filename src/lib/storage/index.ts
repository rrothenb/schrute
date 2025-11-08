/**
 * Storage abstraction layer exports
 */

// Interfaces
export type {
  IMessageStore,
  IThreadStore,
  ISpeechActStore,
  IActivationLogStore,
  IEmailStore,
  IKnowledgeStore,
  ActivationLog,
} from './interfaces'

// DynamoDB implementations
export { DynamoDBMessageStore } from './dynamodb-message-store'
export { DynamoDBThreadStore } from './dynamodb-thread-store'
export { DynamoDBSpeechActStore } from './dynamodb-speechact-store'
export { DynamoDBActivationLogStore } from './dynamodb-activation-store'

// S3 implementations
export { S3EmailStore } from './s3-email-store'
export { S3KnowledgeStore } from './s3-knowledge-store'
