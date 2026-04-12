export {};

declare global {
  interface Window {
    electronAPI: {
      openFileDialog: (options?: {
        filters?: { name: string; extensions: string[] }[];
      }) => Promise<{ canceled: boolean; filePaths: string[] }>;
      readFileBase64: (filePath: string) => Promise<string>;
      writeFile: (
        filePath: string,
        data: string | ArrayBuffer
      ) => Promise<boolean>;
      fileExists: (filePath: string) => Promise<boolean>;
      getAppPath: (
        name: 'userData' | 'documents' | 'temp'
      ) => Promise<string>;
      platform: string;
    };
  }
}
