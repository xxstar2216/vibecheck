import os
import shutil
import sys

from docx import Document
from docx.shared import Pt

SRC = r"D:\PythonProjects\shenduzhifu\JD_doc\ROOT 全栈岗位笔试——彭星星-提交版-v3.docx"
DST = r"D:\PythonProjects\shenduzhifu\JD_doc\ROOT 全栈岗位笔试——彭星星-最终提交.docx"

if not os.path.exists(SRC):
    print("源文件不存在:", SRC)
    sys.exit(1)
shutil.copy2(SRC, DST)
doc = Document(DST)


def clear_runs(p):
    for r in list(p.runs):
        r._element.getparent().remove(r._element)


def set_text(p, text, size=11, bold=False):
    clear_runs(p)
    r = p.add_run(text)
    r.font.name = "Arial"
    r.font.size = Pt(size)
    r.bold = bold


REPLACEMENTS = [
    (
        "• typecheck / lint / build / smoke 全通过。",
        "• 类型检查 / 代码规范 / 生产构建 / 端到端冒烟测试 全通过。",
        11,
        False,
    ),
    (
        "• 真实模型 deepseek-flash：约 76 秒，首版未通过 → 自动修复 1 次 → 100/100，7/7 项验收通过。",
        "• 真实模型 deepseek-flash：Spec 确认 → 生成 → 质量门禁 100/100，端到端约 42 秒；修复了 reasoning token 挤占 8K 输出预算导致的截断（提升到 16K 后复测通过）。",
        11,
        False,
    ),
    (
        "限制：单文件生成、浏览器内 runner、只自动修 1 轮、分享无权限管理、SQLite 单实例、演示环境为临时隧道（评审期间保持在线）。",
        "限制：单文件生成、浏览器内 runner、只自动修 1 轮、分享无权限管理、SQLite 单实例、演示环境为临时隧道（评审期间保持在线；首次加载可能较慢）。",
        11,
        False,
    ),
    (
        "九、v2 更新说明",
        "九、产品能力",
        16,
        True,
    ),
    (
        "这一版补齐了产品能力上的缺口；质量门禁仍是核心差异化。",
        "项目在质量闭环之外，具备以下产品能力；质量门禁仍是核心差异化。",
        11,
        False,
    ),
    (
        "更新后的在线 Demo：https://expulsion-lifting-urging.ngrok-free.dev（首次打开点 Visit Site）。",
        "在线 Demo：https://expulsion-lifting-urging.ngrok-free.dev（首次打开点 Visit Site）。",
        11,
        False,
    ),
]

changed = 0
for p in doc.paragraphs:
    t = p.text.strip()
    for old, new, size, bold in REPLACEMENTS:
        if t == old:
            set_text(p, new, size=size, bold=bold)
            changed += 1
            break
    else:
        # substring replacements
        if "A11y" in p.text:
            set_text(
                p,
                p.text.replace("A11y", "可访问性").replace("可访问性 与韧性", "可访问性与韧性"),
            )
            changed += 1
        elif "v2 已补上" in p.text:
            set_text(p, p.text.replace("v2 已补上", "现在已补上"))
            changed += 1

doc.save(DST)
print(f"已生成 {DST}，替换 {changed} 段")

check = Document(DST)
text = "\n".join(x.text for x in check.paragraphs)
bad = ["v2", "0→4", "3→4", "4/5", "2.7", "六项", "补强", "页面美观度", "smoke:v2", "smoke:spec", "A11y", "更新后的在线", "76 秒", "7/7"]
print("\n=== 残留检查 ===")
for term in bad:
    print(f"{term}: {'FOUND' if term in text else 'clean'}")

print("\n=== 关键段落 ===")
for i, p in enumerate(check.paragraphs):
    t = p.text.strip()
    if any(
        k in t
        for k in [
            "九、产品能力",
            "项目在质量闭环",
            "注册登录：",
            "数据持久化：",
            "代码管理：",
            "产物预览：",
            "Agent 交互：",
            "页面：",
            "已验证",
            "类型检查",
            "可访问性",
            "登录/数据库",
            "在线 Demo",
        ]
    ):
        print(f"{i:03d} | {t[:150]}")
