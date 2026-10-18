export type PipelineStep<TCtx> = (ctx: TCtx) => Promise<void> | void;

export class Pipeline<TCtx> {
  private readonly steps: PipelineStep<TCtx>[] = [];

  use(step: PipelineStep<TCtx>): this {
    this.steps.push(step);
    return this;
  }

  async run(ctx: TCtx): Promise<TCtx> {
    for (const step of this.steps) {
      await step(ctx);
    }
    return ctx;
  }
}
