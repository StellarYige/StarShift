# StarShift 首版实际测试记录

日期：2026-09-12。测试仅使用仓库自制素材，不使用个人文件。这里区分本地生产构建检查与真实 Pages 上线检查。

## 环境

- Windows / PowerShell，Node.js 24.18.0，npm 12.0.1。
- Playwright 1.63.0，Chromium 153.0.8010.12，单 Worker 串行执行。
- Python 3.11，PyMuPDF 1.26.4，sharp 0.35.4 用于独立检查输出。
- 生产文件由 `scripts/serve.mjs` 在 `http://127.0.0.1:4187/StarShift/` 提供；服务器**不设置 COOP / COEP**，通过站点 Service Worker 建立隔离。
- 内置浏览器工具返回没有可用浏览器连接，故 UI 与真实转换验证使用本地 Playwright Chromium；没有声称做过真实手机测试。

## 已执行命令与结果

| 命令 | 结果 |
| --- | --- |
| `npm.cmd run typecheck` | 通过 |
| `npm.cmd test` | 7 / 7 通过 |
| `npm.cmd run build` | 通过；全部静态内容约 272.5 MiB，引擎按需加载 |
| `npm.cmd run test:e2e` | 14 / 14 通过；完整一轮约 1.1 分钟 |
| `npm.cmd run check` | 类型、单元、生产构建与 14 项浏览器测试完整串联通过 |
| `npm.cmd audit --omit=dev` | npm 未报告生产依赖漏洞；不代表对 WASM 或所有潜在漏洞的审计 |
| 额外输出语义复核 | 针对方向像素、页序文字、向量路径和毫米边距强化断言后单独重跑 5 项，全部通过 |

## 实际验证内容

| 流程 | 样例与断言 |
| --- | --- |
| DOCX → PDF | 两份连续转换：Noto 字体与缺失 SimSun 的替代；中文标题、三列表格、图片、显式分页。PyMuPDF 断言 2 页、中文可提取、无替代符/方框、第一页只含 PAGE_ONE、第二页只含 PAGE_TWO；表头横向位置正确且同一水平行，至少 6 条矢量表格路径，内嵌 120×80 图片在表格下方。人工查看首个样例的渲染图，中文、表格和图片可见。 |
| DOCX 预览与取消 | PDF.js 预览两页；批次结束后 iframe 数量为 0；加载中取消后状态为已取消且 iframe 被移除。最后一轮包含完整加载、双文件转换、独立检查和预览的 DOCX 测试约 25.2 秒。 |
| DOCX 输入安全 | 损坏包与合成宏标记在引擎启动前拒绝；外部图片关系指向 `example.invalid`，转换审计没有访问该域名。 |
| 图片互转 | PNG→JPG 输出真实 JPEG，120×80 等比缩至 60×40，原透明角变为近白色；PNG / WebP→WebP 保留 alpha=0。JPG 属有损编码，颜色使用容差检查。 |
| 图片方向 | orientation=6 的 JPEG 自动转成 80×120；再手动旋转一次变为 120×80。额外检查左上角颜色，确认方向正确且没有重复应用 EXIF。 |
| 图片→PDF | 调整图片顺序；适应图片、零边距输出 60×90 和 90×60 pt 两页；A4 横向尺寸 841.89×595.28 pt，独立检查 20 mm 边距；逐页预览可翻页。 |
| PDF→图片 | 三页矢量 PDF 选择 2–3 页，144 DPI JPG；自带 90° 的第 2 页为 800×600，第 3 页为 600×800；检查绿色、蓝色页面像素统计，防止空白输出。 |
| PDF 页面整理 | 两份三页 PDF 合并，选择、排除、删除、排序和旋转。输出文字页序为 2、1、1、3，每页仍含原矢量路径且没有被转成图片；逐页拆分得到 4 个单页 PDF。 |
| 批量 ZIP | 重名图片导出为 `transparent.webp` 与 `transparent (2).webp`；解包并逐个核验文件格式、尺寸和 alpha；PDF 图片页名与页码相符，拆分页数正确。 |
| 错误与重试 | 损坏 PDF、越界页码、加密 PDF 都有明确提示；修正页码后可重试；取消后按钮恢复。超过 100 MB 的文件在解析前被拒绝。 |
| 输入资源保护 | 单元测试修改 PNG 头制造超大像素数，以及修改 DOCX ZIP 元数据制造解压炸弹；在完整像素解码 / 解压前拒绝。 |
| 生产路径与界面 | `/StarShift/` 首页、5 个工具入口、hash 刷新；桌面 1365×1000、移动模拟 390×844 截图，没有横向溢出；首页不提前下载文档引擎。 |
| 网络 | 图片转换、ZIP 下载、DOCX 导入/导出和预览时记录浏览器 Context 请求：HTTP 请求全是本站静态 GET，无请求正文，无合成私密文件名，无第三方文件请求。 |
| 资源与许可 | 逐个校验引擎、中文字体 SHA-256；确认旧引擎脚本不在 dist；原始许可合集、137 个内嵌字体的 name 表声明及 Qt/Emscripten 许可进入静态包。 |

## 测试中发现并修复

1. 首选 `@matbee/libreoffice-converter` 的中文转换长时间阻塞，替换为经实测通过的官方 ZetaOffice / UNO 接口，见引擎评估。
2. 最初 DOCX 动态域检查误把普通 `w:link` 样式标记当成 LINK 域，改为检查实际 `instrText` / `fldSimple`。
3. PDF.js 6 的销毁入口为 `document.loadingTask.destroy()`，已按实际 API 调整；未使用已删除的 `isEvalSupported` 参数。
4. 图片和 ZIP 重名去重，导出格式检查实际 MIME；JPEG 颜色断言使用有损编码容差。
5. 超大文件测试最初触及 Playwright 的 50 MB buffer 限制，改用临时实际文件路径；产品的 100 MB 检查通过。

## 证据与复现

`tests/e2e/` 是可重复执行的断言，`test-results/` 保存 JSON 报告、下载的真实文件、DOCX 语义 JSON、页面 PNG 与网络日志。GitHub Actions 的 `starshift-test-results` artifact 保存同样证据；测试产物默认不提交源码。

除 `encrypted.pdf` 外样例由 `npm.cmd run fixtures` 重建。加密 PDF 用 PyMuPDF 创建一个含 `Synthetic encrypted fixture` 的页面，以 AES-256 保存，测试口令 `test-fixture`；它不是任何实际文件或账户的凭据。

## 尚未验证或不承诺的范围

- 真实 iOS / Android 设备，Safari / Firefox 文档引擎兼容性；移动端只做 Chromium 视口模拟。
- 与 Microsoft Word 的逐像素等价、复杂公式/域/浮动对象、所有字体和所有 DOCX 特性。
- 最大边界持续压力、低内存手机、长时间多批次内存回收的系统级测量。
- 自部署站点的任意第三方服务器配置、离线 PWA 与所有潜在安全漏洞。

## GitHub Pages 实际状态

本地检查已通过。首发代码推送后由 Actions 部署；真实线上 URL、工作流结果和线上转换检查会在完成后回填本节。此时的构建成功不代表线上已部署。
