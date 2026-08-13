export interface ISize {
  width: number;
  height: number;
  type: "png" | "gif" | "jpg";
}

export declare const types: readonly ["png", "gif", "jpg"];
export declare function disableTypes(typesToDisable: string[]): void;
export declare function imageSize(input: ArrayBuffer | Uint8Array): ISize;
export default imageSize;
