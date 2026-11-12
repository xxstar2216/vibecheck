import os
import shutil
import sys
from docx import Document
from docx.oxml import OxmlElement
from docx.text.paragraph import Paragraph
from docx.shared import Pt, Cm, RGBColor

SRC = r"D:\PythonProjects\shenduzhifu\JD_doc\ROOT 全栈岗位笔试——彭星星.docx"
BACKUP = r"D:\PythonProjects\shenduzhifu\JD_doc\ROOT 全栈岗位笔试——彭星星.backup-before-role-update-2026-11-12.docx"
TMP = SRC + ".tmp"

LIVE = "https://expulsion-lifting-urging.ngrok-free.dev"
GITHUB = "https://github.com/xxstar2216/vibecheck"
GRAY = RGBColor(0x55, 0x55, 0x55)
INK = RGBColor(0x11, 0x11, 0x11)

if not os.path.exists(SRC):
    print("源文件不存在:", SRC)
    sys.exit(1)
if not os.path.exists(BACKUP):
    shutil.copy2(SRC, BACKUP)
    print("已备份:", BACKUP)

doc = Document(SRC)


def find(pred):
    for p in doc.paragraphs:
        if pred(p.text):
            return p
    return None


def clear_runs(p):
    for r in list(p.runs):
        r._element.getparent().remove(r._element)


def add_run(p, text, bold=False, size=11, color=None):
    r = p.add_run(text)
    r.font.name = "Arial"
    r.font.size = Pt(size)
    r.bold = bold
    if color is not None:
        r.font.color.rgb = color
    return r


def add_after(anchor, text, bold=False, size=11, before=1, after=1, color=None, bullet=False):
    new_p = OxmlElement("w:p")
    anchor._p.addnext(new_p)
    p = Paragraph(new_p, anchor._parent)
    add_run(p, ("• " if bullet else "") + text, bold=bold, size=size, color=color)
    p.paragraph_format.space_before = Pt(before)
    p.paragraph_format.space_after = Pt(after)
    if bullet:
        p.paragraph_format.left_indent = Cm(0.6)
        p.paragraph_format.first_line_indent = Cm(-0.4)
    return p


# 1) 提交人/日期 + 应聘岗位 拆成两行
meta = find(lambda t: t.strip().startswith("提交人：彭星星"))
if meta is None:
    print("未找到提交人行")
    sys.exit(1)
clear_runs(meta)
add_run(meta, "提交人：彭星星｜日期：2026-11-12", size=10.5, color=GRAY)
add_after(meta, "应聘岗位：测试开发工程师（QA Automation Engineer）｜质量体系设计者", size=10.5, color=GRAY)

# 2) 补充说明顶部：在线体验 / GitHub 拆成两行，URL 加粗
live = find(lambda t: t.strip().startswith("在线体验：") and "GitHub" in t)
if live is not None:
    clear_runs(live)
    add_run(live, "在线体验：", size=10.5, color=GRAY)
    add_run(live, LIVE, bold=True, size=10.5, color=INK)
    gh = add_after(live, "GitHub：", size=10.5, color=GRAY)
    add_run(gh, GITHUB, bold=True, size=10.5, color=INK)

# 3) 第 4 节：两条链接各自一行，URL 加粗
demo = find(lambda t: t.strip().startswith("• 在线 Demo"))
if demo is not None:
    clear_runs(demo)
    add_run(demo, "• 在线 Demo：", size=11)
    add_run(demo, LIVE, bold=True, size=11, color=INK)

gh2 = find(lambda t: t.strip().startswith("• GitHub（public）"))
if gh2 is not None:
    clear_runs(gh2)
    add_run(gh2, "• GitHub（public）：", size=11)
    add_run(gh2, GITHUB, bold=True, size=11, color=INK)

# 4) 对齐 JD：质量体系设计者 / 自动化边界 / 技术栈 / 阻止风险发布
atoms = find(lambda t: t.strip().startswith("项目参考 Atoms"))
if atoms is not None:
    a1 = add_after(
        atoms,
        "这个岗位要的不是流程末端的检查员，而是质量体系的奠基人：从失败现象中提炼标准，把工具和判断方式做成产品的一部分。VibeCheck 是一个可运行的小型原型。",
        size=11,
        before=2,
        after=2,
    )
    a2 = add_after(
        a1,
        "自动化边界：验收用例自动生成/执行、失败自动修复 1 轮；视觉审美、复杂业务语义、是否放行保留人工判断。工具不是重点，判断什么该自动化才是。",
        size=11,
        before=1,
        after=1,
        bullet=True,
    )
    add_after(
        a2,
        "技术栈：React/TypeScript + Node.js（Next.js）；生成物是前端应用，验收 runner 在浏览器里运行。",
        size=11,
        before=1,
        after=1,
        bullet=True,
    )

gate = find(lambda t: t.strip().startswith("放行规则："))
if gate is not None:
    add_after(
        gate,
        "门禁不通过就阻止交付，这是“敢于阻止有风险的发布”的产品化。",
        size=11,
        before=1,
        after=1,
    )

doc.save(TMP)
try:
    os.replace(TMP, SRC)
    print("已写入:", SRC)
except PermissionError:
    print("保存失败：文件可能正在 Word 中打开。临时文件:", TMP)
    sys.exit(1)

check = Document(SRC)
print("\n=== 关键段落与加粗检查 ===")
for i, p in enumerate(check.paragraphs):
    t = p.text.strip()
    if any(
        k in t
        for k in [
            "提交人：彭星星",
            "应聘岗位：",
            "在线体验：",
            "GitHub：",
            "• 在线 Demo",
            "• GitHub（public）",
            "质量体系的奠基人",
            "自动化边界",
            "技术栈：React",
            "敢于阻止",
        ]
    ):
        print(f"{i:03d} | {t[:180]}")
        for r in p.runs:
            if r.bold:
                print("      BOLD:", repr(r.text[:100]))
