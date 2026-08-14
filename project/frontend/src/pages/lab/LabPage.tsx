import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FlaskConical, Loader2, Play, History, Check } from "lucide-react";
import { labService } from "@/services/labService";
import { useAuthStore } from "@/store/authStore";
import { mockLabModels } from "@/lib/mockData";
import type { LabCompareResultItem } from "@/types";

const modelLabels: Record<string, string> = {
  deepseek: "DeepSeek",
  "gpt-4o": "GPT-4o",
  "claude-3.5": "Claude 3.5",
};

/** 游客模式演示结果 */
const demoResults: Record<string, string> = {
  deepseek:
    "提示词工程是设计和优化输入给大语言模型的指令（Prompt）的技术。\n\n核心要点：\n\n1. **角色设定**：告诉模型扮演什么角色\n2. **任务描述**：明确要完成什么任务\n3. **上下文**：提供必要的背景信息\n4. **输出格式**：指定期望的格式\n5. **约束条件**：限制长度、风格、禁止项\n\n> 一句话：好的提示词 = 清晰的角色 + 明确的任务 + 充分的上下文。",
  "gpt-4o":
    "**Prompt Engineering（提示词工程）** 是一门通过精心设计输入指令，来引导大语言模型产出高质量结果的实践方法。\n\n关键技巧：\n- 使用具体的动词和名词\n- 提供示例（few-shot）\n- 将复杂任务拆解为步骤\n\n入门建议：先掌握角色、任务、格式三要素，再逐步叠加约束与上下文。",
  "claude-3.5":
    "提示词工程，简而言之，就是**如何与 AI 高效对话**。\n\n它包含三个层次：\n1. 基础层——角色设定与任务描述\n2. 进阶层——上下文注入与思维链引导\n3. 高级层——多轮迭代与自我反思\n\n掌握提示词工程，本质上是掌握**结构化表达**的能力。",
};

export default function LabPage() {
  const token = useAuthStore((s) => s.token);
  const isDemo = token === "demo-token";

  const [prompt, setPrompt] = useState("");
  const [selected, setSelected] = useState<string[]>(["deepseek", "gpt-4o"]);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<LabCompareResultItem[] | null>(null);
  const [error, setError] = useState("");

  const toggleModel = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const canRun = prompt.trim().length > 0 && selected.length > 0 && !running;

  const handleRun = async () => {
    if (!canRun) return;
    setRunning(true);
    setError("");
    setResults(null);

    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

    try {
      if (isDemo) {
        await delay(1800);
        const items: LabCompareResultItem[] = selected.map((model, i) => ({
          model,
          status: "success",
          result: demoResults[model] ?? "该模型暂未配置演示数据",
          duration: Number((1.2 + i * 0.4).toFixed(1)),
        }));
        setResults(items);
      } else {
        const data = await labService.compare({
          prompt: prompt.trim(),
          models: selected,
          temperature,
          maxTokens,
        });
        setResults(data.results);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "实验失败，请稍后重试");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-8 flex flex-col gap-6">
      <div>
        <h1 className="wb-title text-2xl md:text-3xl">提示词实验室</h1>
        <p className="wb-text text-sm mt-1.5">
          沙盒环境：对比不同模型、不同参数下的输出效果
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* 左侧：提示词输入 */}
        <div className="flex-1 wb-card">
          <div className="flex items-center gap-2 mb-3">
            <FlaskConical className="w-4 h-4 text-[#3A3A3A]" />
            <h3 className="text-sm font-semibold text-[#171717]">输入要测试的提示词</h3>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={9}
            placeholder="输入提示词，例如：用三句话解释什么是提示词工程…"
            className="wb-input"
          />
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-[#A0A0A8]">{prompt.length} / 4000</span>
            <button
              onClick={handleRun}
              disabled={!canRun}
              className="wb-btn wb-btn-primary"
            >
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {running ? "运行中…" : "运行实验"}
            </button>
          </div>
        </div>

        {/* 右侧：控制面板 */}
        <div className="w-full lg:w-64 shrink-0 wb-card">
          <div className="flex items-center gap-2 mb-4">
            <History className="w-4 h-4 text-[#3A3A3A]" />
            <h3 className="text-sm font-semibold text-[#171717]">控制面板</h3>
          </div>

          {/* 模型选择 */}
          <div className="mb-5">
            <p className="text-xs text-[#737373] mb-2">模型选择（至少 1 个）</p>
            <div className="flex flex-col gap-2">
              {mockLabModels.map((m) => (
                <button
                  key={m.id}
                  onClick={() => toggleModel(m.id)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm border transition-all duration-150 ease-in-out ${
                    selected.includes(m.id)
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-white border-[#E5E6EA] text-[#737373] hover:bg-[#F0F1F4]"
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                      selected.includes(m.id) ? "bg-blue-600 border-blue-600" : "border-[#D6D8DE]"
                    }`}
                  >
                    {selected.includes(m.id) && <Check className="w-3 h-3 text-white" />}
                  </span>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* 温度滑块 */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-[#737373]">Temperature</p>
              <span className="text-xs text-[#3A3A3A] font-medium">{temperature.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
              className="w-full accent-[#4B3FE3]"
            />
            <div className="flex justify-between text-[10px] text-[#A0A0A8] mt-1">
              <span>稳定</span>
              <span>创造</span>
            </div>
          </div>

          {/* Max Tokens 滑块 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-[#737373]">Max Tokens</p>
              <span className="text-xs text-[#3A3A3A] font-medium">{maxTokens}</span>
            </div>
            <input
              type="range"
              min={256}
              max={8192}
              step={256}
              value={maxTokens}
              onChange={(e) => setMaxTokens(Number(e.target.value))}
              className="w-full accent-[#4B3FE3]"
            />
            <div className="flex justify-between text-[10px] text-[#A0A0A8] mt-1">
              <span>256</span>
              <span>8192</span>
            </div>
          </div>
        </div>
      </div>

      {/* 结果对比区 */}
      {results && results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {results.map((item) => (
            <div key={item.model} className="wb-card">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <h3 className="text-sm font-semibold text-[#171717]">
                  {modelLabels[item.model] ?? item.model}
                </h3>
                <span className="ml-auto text-[10px] text-[#A0A0A8]">
                  {item.duration ? `${item.duration}s` : ""}
                  {item.usage ? ` · ${item.usage.totalTokens} tokens` : ""}
                </span>
              </div>
              {item.status === "failed" ? (
                <p className="text-sm text-red-600 bg-red-50 border-red-200 rounded-xl p-3">
                  此模型暂时不可用{item.error ? `：${item.error}` : ""}
                </p>
              ) : (
                <div className="bg-white border-[#E5E6EA] rounded-xl p-4 text-sm text-[#3A3A3A] leading-relaxed max-h-72 overflow-y-auto">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.result ?? ""}</ReactMarkdown>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-red-600 text-center">{error}</p>}

      {running && (
        <div className="wb-card flex items-center justify-center gap-3 py-10 text-sm text-[#737373]">
          <Loader2 className="w-5 h-5 animate-spin text-[#3A3A3A]" />
          各模型正在生成回复…
        </div>
      )}
    </div>
  );
}
