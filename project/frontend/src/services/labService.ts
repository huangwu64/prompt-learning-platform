import apiClient from "./apiClient";
import type {
  LabTestRequest,
  LabTestResponse,
  LabCompareRequest,
  LabCompareResponse,
} from "@/types";

export const labService = {
  /** 测试单条提示词 POST /api/lab/test */
  test: (data: LabTestRequest) =>
    apiClient.post<LabTestResponse>("/lab/test", data),

  /** 多模型对比 POST /api/lab/compare */
  compare: (data: LabCompareRequest) =>
    apiClient.post<LabCompareResponse>("/lab/compare", data),
};
