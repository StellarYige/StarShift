// StarShift MIT. Official UNO document import and writer_pdf_Export; never renders a screenshot to PDF.
Module.zetajs.then(zetajs => {
const css = zetajs.uno.com.sun.star, thrPort = zetajs.mainPort;
const desktop = css.frame.Desktop.create(zetajs.getUnoComponentContext());
const property = (Name, Value) => new css.beans.PropertyValue({ Name, Value });

// This thread needs only already-loaded engine code and local virtual files.
globalThis.fetch = () => Promise.reject(new Error('Document network access disabled'));
globalThis.XMLHttpRequest = class { constructor() { throw new Error('Document network access disabled'); } };
globalThis.WebSocket = class { constructor() { throw new Error('Document network access disabled'); } };
for (const method of ['log', 'debug', 'info', 'warn', 'error']) console[method] = () => {};

thrPort.onmessage = ({ data }) => {
  if (data.type !== 'convert') return;
  let model;
  try {
    thrPort.postMessage({ type: 'progress', message: '正在解析文档并排版…', detail: { phase: 'import' } });
    model = desktop.loadComponentFromURL('file:///tmp/starshift-input.docx', '_blank', 0, [
      property('Hidden', true), property('ReadOnly', true),
      property('MacroExecutionMode', new zetajs.Any(zetajs.type.short, css.document.MacroExecMode.NEVER_EXECUTE)),
      property('UpdateDocMode', new zetajs.Any(zetajs.type.short, css.document.UpdateDocMode.NO_UPDATE)),
    ]);
    if (!model) throw new Error('Document import failed');
    thrPort.postMessage({ type: 'progress', message: '正在导出 PDF…', detail: { phase: 'export' } });
    model.storeToURL('file:///tmp/starshift-output.pdf', [property('Overwrite', true), property('FilterName', 'writer_pdf_Export')]);
    thrPort.postMessage({ type: 'done' });
  } catch { thrPort.postMessage({ type: 'error' }); }
  finally { try { model?.close(true); } catch { /* disposing the frame releases the engine too */ } }
};
thrPort.postMessage({ type: 'ready' });

}).catch(() => Module.uno_mainPort?.postMessage({ type: 'initialize-error' }));
