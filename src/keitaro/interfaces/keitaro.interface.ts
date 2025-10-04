export interface KeitaroDomain {
  id: number;
  name: string;
  state: string;
  created_at: string;
  updated_at: string;
}

export interface KeitaroApiResponse {
  domains: KeitaroDomain[];
}
