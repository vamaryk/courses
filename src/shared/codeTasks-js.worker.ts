const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (event: MessageEvent) => {
  const { code, input } = event.data as { code: string; input: string };

  let output = '';

  const safeConsole = {
    log: (...args: unknown[]) => {
      output += args.map((a) => String(a)).join(' ') + '\n';
    },
  };

  try {
    const wrapped = `
      (function(console, input) {
        "use strict";
        ${code}
        if (typeof solve === "function") {
          const result = solve(input);
          if (result !== undefined) {
            console.log(result);
          }
        }
      })
    `;

    // eslint-disable-next-line no-eval
    const fn = eval(wrapped) as (c: Console, i: string) => void;
    fn(safeConsole as unknown as Console, String(input));

    ctx.postMessage({ ok: true, output });
  } catch (error) {
    ctx.postMessage({ ok: false, error: String(error) });
  }
};

