import { Check, Circle, Flame, MessageSquare, FileText, Trophy } from "lucide-react";

/**
 * 今日任务列表（左侧栏下半部分）— 浅色工作台风格
 * 接口文档 v2.0 暂无任务接口，当前为静态演示数据。
 */
interface TaskItem {
  id: string;
  label: string;
  desc: string;
  done: boolean;
  icon: typeof Flame;
}

const tasks: TaskItem[] = [
  { id: "streak", label: "连续打卡", desc: "今日已完成 1 次练习", done: true, icon: Flame },
  { id: "chat", label: "苏格拉底对话", desc: "完成 1 次对话练习", done: false, icon: MessageSquare },
  { id: "work", label: "作品工厂", desc: "创作 1 个作品", done: false, icon: FileText },
  { id: "challenge", label: "提示词挑战赛", desc: "提交 1 次挑战", done: false, icon: Trophy },
];

export function TaskList() {
  const doneCount = tasks.filter((t) => t.done).length;

  return (
    <div className="flex-1 min-h-0 mx-2 my-3 flex flex-col rounded-xl border border-app-border bg-app-surface overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
      <div className="px-3 pt-2.5 pb-1.5 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-app-t3">今日任务</h3>
        <span className="wb-badge wb-badge-blue text-[10px]">
          {doneCount}/{tasks.length}
        </span>
      </div>

      <div className="px-1.5 pb-2 flex flex-col gap-0.5 overflow-auto">
        {tasks.map((task) => {
          const Icon = task.icon;
          return (
            <div
              key={task.id}
              className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition duration-150 ease-in-out ${
                task.done ? "opacity-60" : "hover:bg-app-chrome"
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${task.done ? "text-blue-400" : "text-app-t4"}`} />
              <div className="min-w-0 flex-1">
                <p
                  className={`text-xs truncate ${
                    task.done ? "text-app-t4 line-through" : "text-app-t2"
                  }`}
                >
                  {task.label}
                </p>
                <p className="text-[10px] text-app-t4 truncate">{task.desc}</p>
              </div>
              {task.done ? (
                <Check className="w-4 h-4 text-blue-500 shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-app-borderStrong shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
