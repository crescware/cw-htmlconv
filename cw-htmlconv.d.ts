declare module cwHtmlconv {
  interface PatternObject {
    selector:      string;
    attrPattern?:  string;
    attrReplace?:  string;
    attrRemove?:   boolean;
    valuePattern?: string;
    valueReplace?: string;
    textPattern?:  string;
    textReplace?:  string;
    valueEmpty?:   boolean;
    method?: {
      behavior: string;
      open:     string;
      start:    string;
      end:      string;
    };
    manipulation?: Array<{
      type:   string;
      match:  number;
      filter: string;
    }>;
    subPatterns?: PatternObject[];
  }

export default function main(input: string, patterns?: PatternObject[]): string;
}

declare module 'cw-htmlconv' {
  export = cwHtmlconv;
}
