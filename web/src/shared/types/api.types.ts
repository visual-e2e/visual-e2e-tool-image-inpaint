import type { ExportQuality } from "../enums/export-quality.enum";
import type { JobStatus } from "../enums/job-status.enum";
import type { ProcessMode } from "../enums/process-mode.enum";

export interface InpaintRequestBody {
  mode: ProcessMode;
  imageBase64: string;
  maskBase64?: string;
  exportQuality: ExportQuality;
}

export interface InpaintResponseBody {
  jobId: string;
  status: JobStatus;
  resultBase64?: string;
  width: number;
  height: number;
  provider: string;
  message?: string;
}

export interface ApiErrorBody {
  error: string;
  code?: string;
}
