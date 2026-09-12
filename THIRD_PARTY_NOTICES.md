# 第三方软件、字体与来源

StarShift 自有代码为 MIT；这不改变下面组件的许可证。发布包中保留 `licenses/`，源码仓库保留 `vendor/licenses/` 与 `vendor/fonts/OFL.txt`。不要用项目 MIT 许可证替换第三方声明。

## 浏览器运行依赖

| 组件 | 固定版本 | 许可 | 来源 |
| --- | --- | --- | --- |
| React / React DOM / scheduler | 见 package-lock.json，React 19.3.0 | MIT | https://github.com/facebook/react |
| pdf-lib 及 @pdf-lib/* | pdf-lib 1.17.1 | MIT | https://github.com/Hopding/pdf-lib |
| PDF.js / pdfjs-dist | 6.3.289 | Apache-2.0；内含字体等按其附带许可 | https://github.com/mozilla/pdf.js |
| fflate | 0.8.3 | MIT | https://github.com/101arrowz/fflate |
| lucide-react | 1.45.0 | ISC | https://github.com/lucide-icons/lucide |
| coi-serviceworker | 0.1.7 | MIT | https://github.com/gzuidhof/coi-serviceworker |
| zetajs | 1.2.0 | MIT | https://github.com/allotropia/zetajs |
| ZetaOffice / LibreOffice WASM | 2025-05-13 构建，见下文 | MPL-2.0，及组件各自许可 | https://zetaoffice.net/ |
| Noto Sans CJK SC Regular | 固定源码提交，见下文 | SIL OFL-1.1 | https://github.com/notofonts/noto-cjk |

资源准备脚本从安装的生产依赖复制 LICENSE / COPYING / NOTICE，并生成 `licenses/dependencies.json`；PDF.js 的 `standard_fonts/` 和 `wasm/` 原有声明也随目录一并保留。开发依赖（Vite、TypeScript、Vitest、Playwright、docx、sharp）不作为运行代码引入网站。PyMuPDF 仅用于测试自制 PDF，不随网站发布，其 AGPL/商业双许可请见其项目声明。

## ZetaOffice 可执行形式与对应源码

原始二进制来源是 allotropia 官方 `https://cdn.zetaoffice.net/zetaoffice_latest/`，读取的 Last-Modified 为 **2025-05-13**。为避免 `latest` 更新导致构建漂移，StarShift 已将这一次下载的**未修改** `soffice.js`、`soffice.data`、`soffice.data.js.metadata`、`soffice.wasm` 压缩固定在 `vendor/zetaoffice/`。只做可逆 gzip 压缩，解压后的 SHA-256 与长度见 `vendor/zetaoffice/manifest.json`，每次构建校验。构建不再请求此 CDN。

从该数据包 `/instdir/program/versionrc` 实际读取的构建 ID：

```text
efaf0670b4d055f838a2849becb10f08aa06a257
Vendor=allotropia software GmbH
UpdateID=ZetaOffice_24_en-US
```

对应源代码可免费取得：

- [LibreOffice/ZetaOffice 精确提交](https://github.com/LibreOffice/core/tree/efaf0670b4d055f838a2849becb10f08aa06a257)，[源码压缩包](https://github.com/LibreOffice/core/archive/efaf0670b4d055f838a2849becb10f08aa06a257.tar.gz)。包含构建脚本、配置与 `static/README.wasm.md`。
- [ZetaOffice 上游分支](https://git.libreoffice.org/core/+/refs/heads/distro/allotropia/zeta-24-2)。
- [上游公布的 Emscripten 工具链](https://github.com/allotropia/emscripten/tree/fixed-3.1.65)。
- [上游 Qt 5](https://github.com/allotropia/qt5/tree/5.15.2%2Bwasm) 与 [QtBase](https://github.com/allotropia/qtbase/tree/5.15.2%2Bwasm)，用于重构建、替换或重新链接引擎，遵循 LGPL-3.0 / GPL 等对应组件许可。
- [官方集成与重构建说明](https://github.com/allotropia/zetajs#using-with-an-own-build)。

StarShift 不限制对这些组件的修改、调试、逆向工程（为调试所作修改）或替换。可以重编译上述来源，将产物 gzip 压缩后替换 `vendor/zetaoffice/`，更新校验清单，再运行 `npm run build`。StarShift 的 MIT 页面代码和 `public/office/` 适配层与该引擎独立；无需使用我们固定的二进制。

`vendor/licenses/LibreOffice-license.xml` 是从**同一精确提交**取得的未裁剪许可与版权合集，覆盖该发行版可能包含的库和字体；`LibreOffice-COPYING.MPL`、`LibreOffice-COPYING.LGPL`、`LibreOffice-COPYING` 及 Qt/Emscripten 许可全文也保留。合集包含未启用组件时的条件段落，并不表示每个列出的组件都用于本次构建。

## 字体

额外中文字体来自 notofonts/noto-cjk 提交 `f8d157532fbfaeda587e826d4cd5b21a49186f7c` 的 `Sans/OTF/SimplifiedChinese/NotoSansCJKsc-Regular.otf`，未经字体修改，仅 gzip 压缩。源信息及 SHA-256 在 `vendor/fonts/manifest.json`，OFL 全文在相邻 `OFL.txt`。版权信息保留在字体 name 表中。该字体没有单独收费。

ZetaOffice 内嵌了 137 个字体文件，包括 OpenSymbol、Noto、DejaVu、Liberation、Gentium、Culmus、Carlito、Caladea 等。它们有各自的 OFL、Bitstream、GPL/LGPL 加字体例外等许可；不能统一标为 MIT 或 OFL。完整上游许可合集与从每个实际字体 name 表提取的原始版权、许可及来源 URL 保存在 `BUNDLED-FONT-NOTICES.txt`。提取脚本为 `scripts/extract-font-notices.mjs`。

OFL 的嵌入许可不要求使用该字体生成的 PDF 改用 OFL；其他字体按相应嵌入条款处理。字体、引擎、库的版权声明须随再分发保留。

## 自制测试素材

`tests/fixtures/` 的文档、图像和 PDF 均为本项目创建的合成数据，没有私人文件或第三方照片。源码随 MIT 发布；加密样例密码仅用于测试，不是秘密凭证。未将早期评估用的 `@matbee/libreoffice-converter` 纳入最终运行依赖或静态包。
