import os
import shutil
import sys
from copy import deepcopy

from docx import Document
from docx.opc.constants import RELATIONSHIP_TYPE as RT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Pt

SRC = r"D:\PythonProjects\shenduzhifu\JD_doc\ROOT 全栈岗位笔试——彭星星-提交版-v3.docx"
DST = os.environ.get("VIBECHECK_DOCX_DST") or r"D:\PythonProjects\shenduzhifu\JD_doc\ROOT 全栈岗位笔试——彭星星-最终提交.docx"

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


URL_TARGETS = [
    "https://expulsion-lifting-urging.ngrok-free.dev",
    "https://github.com/xxstar2216/vibecheck",
]


def make_run(text, rpr):
    r = OxmlElement("w:r")
    if rpr is not None:
        r.append(deepcopy(rpr))
    t = OxmlElement("w:t")
    t.set(qn("xml:space"), "preserve")
    t.text = text
    r.append(t)
    return r


def make_hyperlink(paragraph, url, rpr):
    r_id = paragraph.part.relate_to(url, RT.HYPERLINK, is_external=True)
    hyperlink = OxmlElement("w:hyperlink")
    hyperlink.set(qn("r:id"), r_id)

    r = OxmlElement("w:r")
    if rpr is not None:
        r.append(deepcopy(rpr))
    rpr_el = r.find(qn("w:rPr"))
    if rpr_el is None:
        rpr_el = OxmlElement("w:rPr")
        r.insert(0, rpr_el)
    for tag in ("w:color", "w:u"):
        for existing in rpr_el.findall(qn(tag)):
            rpr_el.remove(existing)
    color = OxmlElement("w:color")
    color.set(qn("w:val"), "0563C1")
    rpr_el.append(color)
    underline = OxmlElement("w:u")
    underline.set(qn("w:val"), "single")
    rpr_el.append(underline)

    t = OxmlElement("w:t")
    t.set(qn("xml:space"), "preserve")
    t.text = url
    r.append(t)
    hyperlink.append(r)
    return hyperlink


def insert_before(doc, anchor_prefix, items):
    for p in doc.paragraphs:
        if p.text.strip().startswith(anchor_prefix):
            for text, size, bold in items:
                new_p = p.insert_paragraph_before()
                r = new_p.add_run(text)
                r.font.name = "Arial"
                r.font.size = Pt(size)
                r.bold = bold
            return True
    print("WARN: anchor not found:", anchor_prefix)
    return False


def linkify_urls(doc):
    for paragraph in doc.paragraphs:
        for url in URL_TARGETS:
            if url not in paragraph.text:
                continue
            run = next((r for r in paragraph.runs if url in r.text), None)
            if run is None:
                continue

            text = run.text
            idx = text.find(url)
            prefix = text[:idx]
            suffix = text[idx + len(url):]
            rpr = run._r.find(qn("w:rPr"))
            rpr = deepcopy(rpr) if rpr is not None else None

            parent = run._r.getparent()
            pos = parent.index(run._r)
            parent.remove(run._r)

            elements = []
            if prefix:
                elements.append(make_run(prefix, rpr))
            elements.append(make_hyperlink(paragraph, url, rpr))
            if suffix:
                elements.append(make_run(suffix, rpr))
            for offset, element in enumerate(elements):
                parent.insert(pos + offset, element)


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
        "无需登录；首次打开如出现 ngrok 提示页，点 Visit Site；评审期间保持在线。",
        "访客可直接体验；注册/登录用于云端保存，登录页可一键使用演示账号。首次打开如出现 ngrok 提示页，点 Visit Site；评审期间保持在线。",
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

insert_before(
    doc,
    "一、一句话定位",
    [
        (
            "针对上一轮反馈（注册登录 0/5，数据持久化、代码管理、产物预览 3/5）：本轮已补邮箱注册登录、服务端 SQLite 云端保存、代码编辑/版本 diff/ZIP、分享页/二维码/全屏；登录页提供演示账号，文末附 3 分钟评审路径。",
            11,
            False,
        ),
    ],
)

insert_before(
    doc,
    "4. 笔试结果回收通道",
    [
        ("十、3 分钟评审路径", 16, True),
        (
            "• 注册登录：右上角「登录 / 注册」→ 注册，或点「使用演示账号」；登录后项目保存到云端。",
            11,
            False,
        ),
        (
            "• Agent 交互：新建应用 → 输入需求 → Spec Agent 给出验收标准 → 确认 → Build / QA / Gate。",
            11,
            False,
        ),
        (
            "• 数据持久化：刷新页面；退出后重新登录（或换无痕窗口），项目仍在。",
            11,
            False,
        ),
        (
            "• 页面美观度：预览页切换桌面 / 手机宽度；3 个模板卡片。",
            11,
            False,
        ),
        (
            "• 代码管理：代码 → 编辑 → 保存并验收；版本 → diff / 回滚；下载 ZIP。",
            11,
            False,
        ),
        (
            "• 产物预览：预览 → 分享 → 新标签 / 全屏 / 二维码。",
            11,
            False,
        ),
    ],
)

linkify_urls(doc)
doc.save(DST)
print(f"已生成 {DST}，替换 {changed} 段")

check = Document(DST)
text = "\n".join(x.text for x in check.paragraphs)
bad = ["v2", "0→4", "3→4", "4/5", "2.7", "六项", "补强", "smoke:v2", "smoke:spec", "A11y", "更新后的在线", "76 秒", "7/7", "无需登录"]
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
