import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/**
 * 项目表只保存扫描结果，不保存 package.json 全文。
 * removedAt 用于可撤销移除，避免低风险操作弹出确认框。
 */
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  path: text('path').notNull().unique(),
  framework: text('framework').notNull(),
  nodeVersion: text('node_version').notNull(),
  packageManager: text('package_manager').notNull(),
  lockFile: text('lock_file'),
  dependenciesCount: integer('dependencies_count').notNull().default(0),
  devDependenciesCount: integer('dev_dependencies_count').notNull().default(0),
  nodeModulesSize: integer('node_modules_size').notNull().default(0),
  scannedAt: text('scanned_at').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  removedAt: text('removed_at'),
})

export const aiSettings = sqliteTable('ai_settings', {
  id: text('id').primaryKey(),
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  encryptedApiKey: text('encrypted_api_key'),
  baseUrl: text('base_url').notNull(),
  temperature: integer('temperature').notNull().default(20),
  updatedAt: text('updated_at').notNull(),
})

export const operationHistory = sqliteTable('operation_history', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  projectName: text('project_name').notNull(),
  action: text('action').notNull(),
  command: text('command').notNull(),
  success: integer('success', { mode: 'boolean' }).notNull(),
  exitCode: integer('exit_code').notNull(),
  output: text('output').notNull(),
  createdAt: text('created_at').notNull(),
})
