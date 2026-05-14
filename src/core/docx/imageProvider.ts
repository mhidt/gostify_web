export interface ImageProvider {
  getImageBuffer(fileName: string): Promise<ArrayBuffer | null>;
  getImageDimensions(fileName: string): Promise<{ width: number; height: number } | null>;
}
