import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Braces, FileText, CodeXml as Github, Image, Images, Layers, LockKeyhole, Orbit, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import type { ToolId } from './types';
import Workspace from './components/Workspace';

const tools = [
  { id: 'docx-pdf', title: 'DOCX 转 PDF', subtitle: '文档排版，妥善保留', description: '将 Word 文档转换为 PDF，保留中文、图片、表格与基本分页。', icon: FileText, color: 'blue', types: 'DOCX → PDF', note: '首次按需加载引擎' },
  { id: 'image-pdf', title: '图片转 PDF', subtitle: '散落的图片，整理成册', description: '把多张图片合成一个 PDF，自由排序、旋转，调整纸张与边距。', icon: Images, color: 'peach', types: 'JPG / PNG / WEBP → PDF' },
  { id: 'pdf-image', title: 'PDF 转图片', subtitle: '每一页，都能单独分享', description: '选择需要的页面与清晰度，导出 PNG 或 JPG，一键打包下载。', icon: Image, color: 'purple', types: 'PDF → PNG / JPG' },
  { id: 'pdf-organize', title: 'PDF 页面整理', subtitle: '让每一页，各就各位', description: '合并、拆分、提取、删除、排序和旋转，保留原始文字与矢量内容。', icon: Layers, color: 'green', types: '合并 / 拆分 / 提取 / 排序' },
  { id: 'image-convert', title: '图片格式互转', subtitle: '换个格式，刚好合适', description: '批量转换 JPG、PNG、WebP，调整尺寸、质量与透明背景。', icon: Sparkles, color: 'yellow', types: 'JPG ↔ PNG ↔ WEBP' },
] as const;
const repo = 'https://github.com/StellarYige/StarShift';
function route() { const id = location.hash.slice(1); return tools.some(t => t.id === id) ? id as ToolId : undefined; }

export default function App() {
  const [active, setActive] = useState<ToolId | undefined>(route);
  useEffect(() => {
    const change = () => { setActive(route()); window.scrollTo({ top: 0 }); };
    window.addEventListener('hashchange', change);
    // A hash change can precede this passive effect after the first paint.
    change();
    return () => window.removeEventListener('hashchange', change);
  }, []);
  const tool = tools.find(t => t.id === active);
  useEffect(() => { document.title = tool ? `${tool.title} · 星易 StarShift` : '星易 StarShift · 只是转个文件'; }, [tool]);
  return <>
    <header className="site-header"><div className="header-inner"><a href="#" className="brand" aria-label="星易 StarShift 首页"><span className="brand-symbol"><Orbit size={27} strokeWidth={1.6} /></span><span>星易 <b>StarShift</b></span><span className="version">BETA</span></a><nav aria-label="主导航"><a href="#" className="nav-tools">全部工具</a><a href={`${repo}#自行部署`} target="_blank" rel="noreferrer">自行部署<ArrowUpRight size={14} /></a><a href={repo} target="_blank" rel="noreferrer" className="github-link"><Github size={18} /><span>GitHub</span></a></nav></div></header>
    <main>
      {!tool ? <>
        <section className="hero"><div className="eyebrow"><span /> 免费、开源、在本地完成</div><h1>只是转个文件，<br className="mobile-break" /><span>不必开个会员。</span></h1><p>你的文件，你的浏览器。选个工具，现在就开始。</p><div className="hero-tags"><span><LockKeyhole size={14} />文件不上传</span><span><Zap size={14} />无需登录</span><span><CheckIcon />没有水印和次数限制</span></div></section>
        <section className="tool-section" aria-labelledby="tools-heading"><div className="section-heading"><h2 id="tools-heading">选一个工具，轻松搞定</h2><span>5 个实用工具<span className="tiny-star">✳</span></span></div><div className="tool-grid">{tools.map((t, index) => <a key={t.id} href={`#${t.id}`} className={`tool-card ${t.color}`}><div className="card-top"><span className="tool-icon"><t.icon size={25} strokeWidth={1.6} /></span><span className="card-index">0{index + 1}</span></div><h3>{t.title}</h3><p>{t.description}</p><div className="card-bottom"><span>{t.types}</span><ArrowRight size={19} /></div>{'note' in t && <span className="engine-note">{t.note}</span>}</a>)}<div className="privacy-card"><div className="privacy-icon"><ShieldCheck size={31} strokeWidth={1.4} /></div><h3>文件的旅程，<br />止于你的浏览器。</h3><p>不上传文件、文件名或转换结果。<br />没有广告，也没有追踪代码。</p><a href={`${repo}#隐私与安全`} target="_blank" rel="noreferrer">透明的代码，可验证的承诺<ArrowUpRight size={14} /></a></div></div></section>
        <div className="open-source-strip"><span className="code-icon"><Braces size={24} /></span><div><strong>好用的工具，也应该是开放的。</strong><span>自由使用、查看源码，或部署一份属于自己的星易。</span></div><a href={`${repo}#自行部署`} target="_blank" rel="noreferrer">获取源码与部署指南<ArrowUpRight size={16} /></a></div>
      </> : <><div className="tool-intro"><a href="#" className="back-link"><ArrowLeft size={15} />全部工具</a><div className="tool-title-row"><span className={`tool-icon ${tool.color}`}><tool.icon size={29} strokeWidth={1.7} /></span><div><h1>{tool.title}</h1><p>{tool.subtitle}</p></div><span className="local-badge"><ShieldCheck size={14} />本地处理</span></div></div><Workspace key={tool.id} tool={tool.id} /></>}
    </main>
    <footer><div><span className="footer-brand">✳ 星易 StarShift</span><span>小工具，少一点门槛。</span></div><div><a href={`${repo}/blob/main/LICENSE`} target="_blank" rel="noreferrer">MIT 开源</a><a href={`${repo}/blob/main/THIRD_PARTY_NOTICES.md`} target="_blank" rel="noreferrer">第三方许可</a><a href={`${repo}/issues`} target="_blank" rel="noreferrer">反馈问题<ArrowUpRight size={12} /></a></div></footer>
  </>;
}
function CheckIcon() { return <span className="check-icon">✓</span>; }
