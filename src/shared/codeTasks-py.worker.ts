// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Pyodide global is loaded via importScripts
importScripts('https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js');

declare const loadPyodide: () => Promise<any>;

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

let pyodideReady: Promise<any> | null = null;

const getPyodide = async () => {
  if (!pyodideReady) {
    pyodideReady = loadPyodide();
  }
  return pyodideReady;
};

ctx.onmessage = async (event: MessageEvent) => {
  const { code, input } = event.data as { code: string; input: string };

  try {
    const pyodide = await getPyodide();

    const script = `
import sys, io

_input_data = str(${JSON.stringify(input)})
_stdin = io.StringIO(_input_data)
_stdout = io.StringIO()
_sys_stdin = sys.stdin
_sys_stdout = sys.stdout
sys.stdin = _stdin
sys.stdout = _stdout

input_data = _input_data

${code}

if 'solve' in globals():
    _res = solve(input_data)
    if _res is not None:
        print(_res)

sys.stdin = _sys_stdin
sys.stdout = _sys_stdout
_stdout.getvalue()
    `;

    const output = await pyodide.runPythonAsync(script);
    ctx.postMessage({ ok: true, output });
  } catch (error) {
    ctx.postMessage({ ok: false, error: String(error) });
  }
};

