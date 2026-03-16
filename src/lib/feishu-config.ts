// Feishu Configuration
// Centralized place for hardcoded defaults to ensure consistency across API routes

export const FEISHU_CONFIG = {
  // App Credentials
  // Default fallback credentials if environment variables are not set
  APP_ID: 'cli_a9224facb0b89bdf',
  APP_SECRET: 'UljtNgtWlxpe2Qe5vI3qPedXVMQfhXcx',
  APP_TOKEN: 'KWl2bVHgEadrB3sV0rzcGQ3Hnog', // Base Token

  // Table IDs
  INTERNAL_TABLE_ID: 'tblMG2e1rOdQnFNJ', // Internal Cupping Results (内部杯测结果)
  EVENT_TABLE_ID: 'tbldVl0yZUmlGiET',    // Event Cupping Results (展会/活动杯测)
  SAMPLE_TABLE_ID: 'tblFJKzxagGpVUoP',   // Sample Inventory (样品库)
  VOTING_TABLE_ID: 'tbl4FziWMhuB4c32',   // Public Voting Results (大众评审结果)
};
