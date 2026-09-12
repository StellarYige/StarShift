# 星易 StarShift

**只是转个文件，不必开个会员。**

免费、开源、无需登录的浏览器本地文件转换工具。文件、文件名和转换结果不上传；没有广告、追踪、水印、会员或使用次数限制。

[在线使用](https://stellaryige.github.io/StarShift/) · [从源码自行部署](#自行部署) · [测试记录](docs/TEST_REPORT.md) · [引擎选型与限制](docs/ENGINE_EVALUATION.md)

## 功能

| 工具 | 当前能力 |
| --- | --- |
| DOCX → PDF | ZetaOffice / LibreOffice WASM 原生 UNO 导入、PDF 导出；中文、内嵌图片、表格、基本分页；逐页预览、下载、批量、取消 |
| 图片 → PDF | JPG、PNG、WebP；多图排序、顺时针旋转；A4、Letter、适应图片；横纵向、毫米边距 |
| PDF → 图片 | PNG / JPG；页码范围、72 / 144 / 216 / 300 DPI；逐页输出与 ZIP 下载 |
| PDF 页面整理 | 缩略图、多文件合并、逐页拆分、选择提取、删除、排序、旋转；保留文字和矢量内容 |
| 图片格式互转 | JPG / PNG / WebP 批量转换；等比缩小、适用格式的质量控制、透明保留或指定背景色 |

不包含 PDF 转 Word、OCR、音视频转换、AI 助手或账号系统。

## 本地开发

需要 Node.js 24 LTS、npm、Git。以下命令可直接用于 **Windows PowerShell**（使用 `npm.cmd` 避免脚本执行策略限制）：

```powershell
git clone https://github.com/StellarYige/StarShift.git
cd StarShift
npm.cmd ci
npm.cmd run dev
```

打开终端实际显示的 `/StarShift/` 地址。引擎和字体已压缩保存在 `vendor/`，`predev` / `prebuild` 校验 SHA-256 后解压到 `public/`；该步骤不访问网络。`npm ci` 只下载开发依赖，不接触用户文件。

开发服务器不监听第三方大资源或测试缓存，也不向服务器转发浏览器日志。替换 `vendor/` 引擎或字体后，请重新运行 `npm.cmd run dev`。

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run preview
```

完整浏览器转换测试另需 Python 3.11+ 和 Playwright 的三个浏览器：

```powershell
python -m pip install -r requirements-test.txt
npx.cmd playwright install chromium firefox webkit
npm.cmd run test:e2e
npm.cmd run test:matrix
```

测试使用仓库自制样例，结果和截图位于 `test-results/`。`npm.cmd run fixtures` 可重建大部分样例；加密 PDF 的创建方法见测试记录。**请不要把个人文档提交到仓库。**

## 自行部署

### 从源码构建

项目不再制作或提供静态压缩发布包；v0.1.0 的手工 ZIP、校验附件和 Actions 中的项目发布包已清理。版本标签、Release 说明和历史测试证据保留，GitHub 自动生成的源码归档不受影响。

```powershell
npm.cmd ci
npm.cmd run build
```

`dist/` 是完整站点。保留全部引擎、字体、适配脚本、PDF.js、许可和 Service Worker 资源，部署到静态服务器的 `/StarShift/` 目录。生产使用 HTTPS，本机可用 localhost HTTP；不能双击 HTML 或通过 `file://` 使用。

部署到根路径或其他子路径时，请在构建前设置 `BASE_PATH`（必须以 `/` 开始、以 `/` 结束）：

```powershell
$env:BASE_PATH = '/'
npm.cmd run build
```

路由使用 `#image-pdf` 等 hash，不需要 SPA 服务器回退，刷新仍停留在对应工具。所有 Worker、WASM、字体、PDF.js CMap 路径均随 base 生成。

### GitHub Pages

现有仓库是 `StellarYige/StarShift`，默认分支 `main`。`.github/workflows/pages.yml` 会依次执行类型检查、单元测试、构建、Chromium 回归、Firefox / WebKit 与生命周期测试及 Pages 部署。PR 只检查，不部署。

仓库 `Settings → Pages → Build and deployment → Source` 应为 **GitHub Actions**。Actions 仅保存测试证据与 Pages 部署所需产物。Release 仅提供版本说明，不附加项目压缩包或校验文件。

GitHub Pages 无法自定义 COOP/COEP 响应头。本项目使用 MIT 许可的 `coi-serviceworker` 为同源资源补充隔离头，首次访问可能在文件选择界面显示前自动刷新一次。Service Worker **不缓存或存储用户文件**。拒绝 Service Worker 或隔离不可用时，DOCX 会明确提示，其余工具仍可用。

可控制响应头的自部署服务器可以直接设置：

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

WASM 的 MIME 应为 `application/wasm`，`.js` / `.mjs` 应为 JavaScript MIME。部署时同时更新全部资源，避免旧 HTML 与新 Worker 混用。

## 隐私与安全

- 转换仅使用 `File` / `Blob`、内存虚拟文件系统、Canvas 和 Web Worker，无上传端点、遥测或第三方转换 API。
- 运行时只加载站点自身的静态代码、字体和引擎。源码、许可和反馈链接仅在用户点击时打开 GitHub。
- DOCX 解压前检查目录、解压大小、重复路径与宏/嵌入对象；拒绝动态外部字段，移除外部关系。UNO 导入设置 `MacroExecutionMode=NEVER_EXECUTE`、`UpdateDocMode=NO_UPDATE`。
- 主页面 CSP 禁止普通 `eval`；固定引擎的 Embind 需要动态代码绑定，该权限仅在引擎专用 iframe 内开放。iframe 不插入文档 HTML；引擎网络访问受固定静态资源白名单约束，实际 UNO 转换线程禁用网络。
- PDF 预览只调用 PDF.js 页面渲染，不运行 PDF JavaScript、XFA、链接或交互表单。整理后的页面移除活动批注与页面动作。
- 不将用户文件写入 IndexedDB、localStorage、Cache Storage 或后端。sessionStorage 仅存一个隔离初始化标记；浏览器可能按 HTTP 规则缓存公开程序资源。
- 任务串行执行。取消会终止相应 Worker 或移除整个文档引擎 iframe；清空/离开工具时释放 Blob URL，PDF.js 任务与画布也会释放。

## 已知限制

- DOCX 在已测 Chromium、Chrome 和 Edge 中通过；当前固定引擎在 Firefox 155、Windows Playwright WebKit 26.6 中不兼容，会明确提示并保留输入。其他四项工具已在三种 Playwright 引擎中验证；真实 Safari 与手机尚待人工验证。
- 重复实测仍记录到偶发 DOCX 初始化失败／超时，根因未确定。超时后保留文件和设置，可显式重试；详细失败样本和成功耗时分别列于修订报告，不承诺稳定提速。
- **不承诺 Word 与 PDF 像素一致。** 未安装的中文字体使用 Noto Sans CJK SC 替代，复杂域、特殊字体、浮动对象、公式和复杂分页需预览核对。外链图片不加载，含宏、ActiveX、OLE 或 altChunk 的 DOCX 会拒绝处理。
- 文档引擎加中文字体约 **266 MiB（解压后）**，首次使用需要加载；实际网络传输量由静态服务器压缩决定。同批串行复用，每批结束释放引擎。实际性能、浏览器兼容范围与失败样本见 [v0.1.1 修订报告](docs/V0.1.1_REPORT.md)。真实 iOS / Android / Safari 仍按 [人工清单](docs/MOBILE_MANUAL_CHECKLIST.md) 待验证。
- 五项工具的队列重试、批量操作、预览、缩略图与处理流水改进，以及本轮验收和未解决事项，见 [五工具完善报告](docs/FIVE_TOOLS_REPORT.md)。
- 内存保护：单文件 100 MB、单批输入及输出各 300 MB、PDF 每份和整理队列最多 500 页、图片最多 3200 万像素且单边不超过 16384。这些是技术保护，无次数限制。
- 加密 PDF / DOCX 需先在本地解锁；损坏文件不会“修复后猜测”转换。
- PDF 页面整理保留页面文字与矢量内容，但首版不保留目录书签、批注、超链接、交互表单或有效数字签名，请保留原件。
- 动图只处理第一帧；图片转换不保留 EXIF，自动应用 EXIF 方向后再应用手动旋转。JPG 不支持透明，输出会填充背景色。尺寸设置只等比缩小，不放大。
- 大文件、高 DPI 和大量缩略图受设备内存限制；遇到内存不足请减小批量、页数或清晰度。
- 不提供离线 PWA 安装保证；离线/内网使用请先从源码构建完整站点，再通过本地 HTTP 服务访问。

## 代码结构

```text
src/components/       文件队列、设置、页面整理、预览
src/core/             DOCX 验证、图片处理、PDF 操作、Worker 调度
public/office/        固定 ZetaOffice 的 iframe / UNO Worker 适配
vendor/               固定引擎与字体压缩包、校验值、许可证
scripts/              离线资源准备、测试样例、性能测量、独立 PDF 检查
tests/                单元与浏览器端到端测试、自制样例
.github/workflows/    自动检查与 GitHub Pages 部署
```

自有代码采用 [MIT](LICENSE)。第三方库、LibreOffice/ZetaOffice、Qt 与字体分别遵循原许可，详见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) 和构建输出 `dist/licenses/`。引擎源码获取与重构建入口也列于该文件。
