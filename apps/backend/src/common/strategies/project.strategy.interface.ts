import { B2BLog } from '@ola/shared-types';

export interface ProjectStrategy {
  /**
   * Parse raw BigQuery row into B2BLog object.
   * Different projects might have different raw schema mappings.
   */
  parseLog(raw: any): B2BLog;

  /**
   * Return custom SQL where clause for filtering.
   * @param projectId - The project ID to filter by.
   */
  getFilterQuery(projectId: string): string;
}
