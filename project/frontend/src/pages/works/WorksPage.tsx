import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Copy,
  Check,
  RefreshCw,
  Loader2,
  FileText,
  History,
  Sparkles,
} from "lucide-react";
import { worksService } from "@/services/worksService";
import { useAuthStore } from "@/store/authStore";
import { mockWorks, workTemplates, WorkTemplateConfig } from "@/lib/mockData";
import type { Work, WorkType } from "@/types";

/** 游客模式：模拟 AI 生成内容 */
function demoGenerate(tpl: WorkTemplateConfig, formData: Record<string, string>): string {
  const values = Object.values(formData).filter(Boolean).join("、");
  const map: Record<WorkType, string> = {
    ppt: `# ${formData.topic || "主题"} 大纲\n\n## 一、开场引入\n- 抛出问题：为什么值得关注\n- 介绍背景\n\n## 二、核心内容\n- 要点 1：${values.split("、")[0] || "概念定义"}\n- 要点 2：结合实际案例\n- 要点 3：常见误区\n\n## 三、总结与行动\n- 关键收获\n- 下一步行动建议`,
    report: `# ${formData.title || "报告标题"}\n\n## 概述\n围绕核心主题展开，先给出结论：${values.split("、")[0] || "整体进展顺利"}。\n\n## 详细分析\n1. 第一点：现状与数据\n2. 第二点：问题与挑战\n3. 第三点：应对策略\n\n## 结论与建议\n综合以上分析，建议持续推进并关注关键风险。`,
    email: `尊敬的${formData.recipient || "领导"}：\n\n您好！\n\n关于${formData.purpose || "工作事项"}，现向您汇报如下：\n\n一、当前进展\n各项工作按计划推进，整体符合预期。\n\n二、需要支持的事项\n1. 资源协调\n2. 决策确认\n\n三、下一步安排\n下周完成收尾并输出总结。\n\n${formData.attachment ? `附件：${formData.attachment}\n` : ""}此致\n敬礼`,
    social: `${formData.product || "产品"}真的绝了！✨\n\n🔥 为什么值得入手：\n1. 体验超出预期\n2. 性价比超高\n3. 身边人都在夸\n\n真实使用感受，种草不踩雷！\n\n#好物推荐 #${formData.platform || "生活方式"}`,
  };
  return map[tpl.type];
}

export default function WorksPage() {
  const token = useAuthStore((s) => s.token);
  const isDemo = token === "demo-token";

  const [selectedType, setSelectedType] = useState<WorkType>("email");
  const [title, setTitle] = useState("");
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<Work | null>(null);
  const [copied, setCopied] = useState(false);
  const [works, setWorks] = useState<Work[]>([]);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [error, setError] = useState("");

  const tpl = useMemo(() => workTemplates.find((t) => t.type === selectedType)!, [selectedType]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (isDemo) {
        setWorks(mockWorks);
        return;
      }
      try {
        const data = await worksService.list({ page: 1, pageSize: 50 });
        if (!cancelled) setWorks(data.items);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "加载作品列表失败");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [isDemo]);

  const selectTemplate = (type: WorkType) => {
    setSelectedType(type);
    setTitle("");
    setFormData({});
    setResult(null);
    setError("");
  };

  const canGenerate = title.trim().length > 0 && tpl.fields.every((f) => (formData[f.key] ?? "").trim().length > 0);

  const handleGenerate = async () => {
    if (!canGenerate || generating) return;

    setGenerating(true);
    setError("");

    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

    try {
      if (isDemo) {
        await delay(1500);
        const work: Work = {
          id: `work_local_${Date.now()}`,
          workType: selectedType,
          title: title.trim(),
          content: demoGenerate(tpl, formData),
          formData: { ...formData },
          shareUrl: null,
          createdAt: new Date().toISOString(),
        };
        setResult(work);
        setWorks((prev) => [work, ...prev]);
      } else {
        const work = await worksService.create({
          workType: selectedType,
          title: title.trim(),
          formData: { ...formData },
        });
        setResult(work);
        setWorks((prev) => [work, ...prev]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成失败，请重试");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.content) return;
    try {
      await navigator.clipboard.writeText(result.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("复制失败，请手动选择复制");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-8 flex flex-col gap-6">
      <div>
        <h1 className="wb-title text-2xl md:text-3xl">作品工厂</h1>
        <p className="wb-text text-sm mt-1.5">
          选择模板，填写关键信息，一键生成可用的内容
        </p>
      </div>

      {/* 模板选择区 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {workTemplates.map((t) => (
          <button
            key={t.type}
            onClick={() => selectTemplate(t.type)}
            className={`wb-card p-4 text-left wb-card-hover ${
              selectedType === t.type ? "border-blue-500 bg-[#F0F1F4]" : ""
            }`}
          >
            <span className="text-2xl">{t.emoji}</span>
            <p className="text-sm font-medium text-[#171717] mt-2">{t.label}</p>
            <p className="text-[11px] text-[#A0A0A8] mt-0.5 leading-snug">{t.desc}</p>
          </button>
        ))}
      </div>

      {/* 表单区 */}
      <div className="wb-card">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-[#3A3A3A]" />
          <h3 className="text-sm font-semibold text-[#171717]">
            填写信息 · {tpl.emoji} {tpl.label}
          </h3>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#737373]">标题</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={tpl.titlePlaceholder}
              maxLength={100}
              className="wb-input"
            />
          </div>

          {tpl.fields.map((field) => (
            <div key={field.key} className="flex flex-col gap-1.5">
              <label className="text-xs text-[#737373]">{field.label}</label>
              {field.type === "select" ? (
                <select
                  value={formData[field.key] ?? ""}
                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                  className="wb-input"
                >
                  <option value="" disabled className="bg-white">
                    请选择
                  </option>
                  {field.options?.map((opt) => (
                    <option key={opt} value={opt} className="bg-white">
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <textarea
                  value={formData[field.key] ?? ""}
                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  rows={field.type === "textarea" ? 3 : 1}
                  className="wb-input"
                />
              )}
            </div>
          ))}

          <button
            onClick={handleGenerate}
            disabled={!canGenerate || generating}
            className="wb-btn wb-btn-primary mt-1"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generating ? "AI 生成中…" : "生成内容"}
          </button>
          {!canGenerate && (
            <p className="text-[11px] text-[#A0A0A8] text-center">
              请填写标题和全部字段后生成
            </p>
          )}
        </div>
      </div>

      {/* 结果区 */}
      {result && (
        <div className="wb-card">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-[#3A3A3A]" />
            <h3 className="text-sm font-semibold text-[#171717]">生成结果 · {result.title}</h3>
          </div>
          <div className="bg-white border-[#E5E6EA] rounded-xl p-4 text-sm text-[#3A3A3A] leading-relaxed max-h-96 overflow-y-auto">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.content}</ReactMarkdown>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button onClick={handleCopy} className="wb-btn !text-xs !px-3 !py-1.5">
              {copied ? <Check className="w-3.5 h-3.5 text-[#3A3A3A]" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "已复制" : "复制"}
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="wb-btn wb-btn-primary !text-xs !px-3 !py-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${generating ? "animate-spin" : ""}`} />
              重新生成
            </button>
          </div>
        </div>
      )}

      {/* 历史作品 */}
      <div className="wb-card">
        <button
          onClick={() => setHistoryOpen(!historyOpen)}
          className="w-full flex items-center gap-2 mb-3"
        >
          <History className="w-4 h-4 text-[#3A3A3A]" />
          <h3 className="text-sm font-semibold text-[#171717]">历史作品</h3>
          <span className="ml-auto text-xs text-[#A0A0A8]">{works.length} 个</span>
        </button>

        {historyOpen &&
          (works.length === 0 ? (
            <p className="text-sm text-[#A0A0A8] py-4 text-center">
              还没有作品，选择上方模板开始创建
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {works.map((work) => (
                <button
                  key={work.id}
                  onClick={() => {
                    setResult(work);
                    setSelectedType(work.workType);
                  }}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border-[#E5E6EA] hover:bg-[#F0F1F4] hover:border-[#D6D8DE] text-left transition duration-150 ease-in-out"
                >
                  <span className="text-lg">
                    {workTemplates.find((t) => t.type === work.workType)?.emoji ?? "📄"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[#3A3A3A] truncate">{work.title}</p>
                    <p className="text-[11px] text-[#A0A0A8]">
                      {new Date(work.createdAt).toLocaleDateString("zh-CN")}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ))}
      </div>

      {error && <p className="text-xs text-red-600 text-center">{error}</p>}
    </div>
  );
}
