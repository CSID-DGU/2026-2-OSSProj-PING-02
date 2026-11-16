// 현재 연결 종류 (나중에 @react-native-community/netinfo 또는 ConnectivityManager 네이티브 모듈로 교체)
export type ConnectionType = "wifi" | "cellular" | "none" | "unknown";

export interface NetworkService {
  getConnectionType(): Promise<ConnectionType>;
}

export const createMockNetworkService = (
  type: ConnectionType = "wifi"
): NetworkService => ({
  getConnectionType: async () => type,
});
