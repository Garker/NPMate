import { randomUUID } from 'node:crypto'
import { desc } from 'drizzle-orm'
import { getDatabase } from '../../database/client'
import { operationHistory } from '../../database/schema'
import type { PackageAction } from '../../src/types/package'
import type { OperationHistoryEntry } from '../../src/types/system'

export interface HistoryWrite {
  projectId: string
  projectName: string
  action: PackageAction
  command: string
  success: boolean
  exitCode: number
  output: string
}

export class HistoryService {
  record(input: HistoryWrite): void {
    getDatabase()
      .insert(operationHistory)
      .values({
        id: randomUUID(),
        ...input,
        output: input.output.slice(0, 20_000),
        createdAt: new Date().toISOString(),
      })
      .run()
  }

  list(): OperationHistoryEntry[] {
    return getDatabase()
      .select()
      .from(operationHistory)
      .orderBy(desc(operationHistory.createdAt))
      .limit(200)
      .all()
      .map((row) => ({
        ...row,
        action: row.action as PackageAction,
      }))
  }
}
