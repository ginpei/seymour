export interface ReaderConfig {
  onReadProgress?: (index: number, length: number) => void;
  onEmbedProgress?: (index: number, length: number) => void;
  OPENAI_API_KEY: string;
  pattern: string;
}
