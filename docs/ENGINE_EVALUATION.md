# 文档引擎评估与事实边界

记录日期：2026-09-12。目标是浏览器本地真实排版转换，优先中文、表格、图片、分页，不使用网页截图、纯文本重排、打印对话框或服务器转换。

## 方案 A：@matbee/libreoffice-converter 2.7.2

- 查阅了作者 [README](https://github.com/matbeedotcom/libreoffice-document-converter)、API 和 npm 发布包的 TypeScript 声明、Worker 源映射。
- 实际接口包括 `WorkerBrowserConverter`、`createWasmPaths`、`fonts` 注入和 `convert(..., { outputFormat: 'pdf' })`。包标注 MPL-2.0。
- 包内实际资源：WASM 147,416,331 字节，data 99,735,918 字节；内嵌 versionrc 构建 ID 为 `d1c9e0e4e1ddeb24fe8f93e56860b3765043f8b1`。
- 同源 Worker、Pages 风格 Service Worker 隔离和 Noto 字体注入可初始化。Windows Chromium 的两页中文样例在导入或 PDF 保存阶段多次长时间不返回，达到 240 秒处理超时。
- 尝试了关闭只用于编辑事件的 Unipoll 模式、去除字体、简单英文样例、同一二进制 Node 对照。简单英文曾输出成功，但中文可靠性未达要求。无法据此判定全部上游或全部平台不可用。
- **结论：不采用，不随最终站点或发布包分发。** 未对外将其超时结果标成支持。

## 方案 B：ZetaOffice + zetajs 1.2.0（采用）

- 依据 allotropia [官方 convertpdf 示例](https://github.com/allotropia/zetajs/tree/main/examples/convertpdf) 和 [zetajs 源码](https://github.com/allotropia/zetajs) 实现。
- 专用 iframe 初始化 WASM，真实导入/导出位于 UNO Worker：`desktop.loadComponentFromURL` → `XStorable.storeToURL`，`FilterName=writer_pdf_Export`。这不是 HTML 截图或图片 PDF。
- 导入传入 `Hidden=true`、`ReadOnly=true`、[NEVER_EXECUTE=0](https://api.libreoffice.org/docs/idl/ref/namespacecom_1_1sun_1_1star_1_1document_1_1MacroExecMode.html)、[NO_UPDATE=0](https://api.libreoffice.org/docs/idl/ref/namespacecom_1_1sun_1_1star_1_1document_1_1UpdateDocMode.html)；short 值通过 zetajs.Any 的 short 类型传入。
- 固定上游 2025-05-13 二进制，versionrc 的精确源提交为 `efaf0670b4d055f838a2849becb10f08aa06a257`。WASM 161,667,499 字节；data 99,520,604 字节；loader 858,124 字节；metadata 215,180 字节。中文字体额外约 16 MB，总解压加载资源约 266 MiB。
- 原型中两页样例（中文标题、三列表格、120×80 彩色透明图、显式分页）从启动到转换成功约 16.3 秒。生产构建另做了端到端测试与独立 PyMuPDF 验证，详见测试记录。
- 中文字体在运行时初始化前写入内存字体目录；没有复制 Windows 的宋体、微软雅黑等系统字体。另测缺失 SimSun 时的中文替代。
- 新任务批次创建新引擎；同批文件串行复用。批次结束、取消、离开工具时移除 iframe 和整个 Worker 树，释放引擎虚拟文件与内存。
- 未修改引擎二进制及 zetajs 文件。可复现的 gzip 归档、源地址、完整许可与 SHA-256 均在 `vendor/`。不依赖上游 CDN 的运行时可达性。

## Pages、安全与许可证

- 使用 hash 路由与 Vite base，实际测试了 `/StarShift/` 下的生产静态资源加载；测试服务器不设置 COOP/COEP，隔离由同源 `coi-serviceworker` 建立。
- 需要 HTTPS / localhost、WASM、Worker、Service Worker、SharedArrayBuffer；浏览器不支持隔离时禁止 DOCX 启动并给出提示。
- 主界面 CSP 不开放普通 eval。引擎专用 iframe 因 Embind 绑定使用独立策略允许 eval；文档脚本不在此执行，ZIP 验证、外部关系移除、UNO 禁宏/禁更新和线程网络封锁共同约束输入。
- 每个网络审计只观察合成文件的测试过程。通过的审计证明该样例没有外发请求，不是对所有未知漏洞的安全证明。
- PDF 页面整理使用 pdf-lib `copyPages`，不会默认栅格化；PDF.js 只用于缩略图、预览和 PDF → 图片。图像编码通过浏览器 OffscreenCanvas，验证返回 MIME，防止不支持的格式静默回退 PNG。
- 许可来自具体上游源文件与 npm 包，见第三方声明。未完成对所有 LibreOffice 支持格式和复杂版式的穷举测试；首版只开放实际实现的 DOCX 输入。
