module cli {
  interface RootOpts {
    encoding: string[];
    out: string[];
    patterns: string[];
    patternsText: string[];
    text: string[];
  }

  interface RootArgs {
    inputPath: string;
  }
}
