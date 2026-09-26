#!/usr/bin/env python3
"""从原型标注 markdown 自动生成每块的"功能描述"行，替换/补写 `> 描述`。
描述 = 该块"### 页面内容"小节的首个要点句(`- xxx`)，无要点则取首个 #### 标题，再无则取块内首个要点。
目的：描述永远来自标注正文(正文来自PRD)，不靠人手写，可追溯、可持续。

用法:
  python3 extract_desc.py <annotations/pages/*.md>...
  python3 extract_desc.py annotations/pages/*.md        # 项目内
  --dry-run  只打印将改的描述，不写文件
  --force    每块无条件替换为自动提取值(默认: 仅补缺失或变更的描述)
"""
import argparse, re, sys


def extract_desc(block):
    """从块正文提取描述 = '页面内容'小节首个要点句。"""
    pc = re.search(r'### 页面内容\n(.*?)(?=\n### |\Z)', block, re.S)
    if pc:
        section = pc.group(1)
        item = re.search(r'-\s*([^\n]+)', section)
        if item:
            return item.group(1).strip()
        h = re.search(r'####\s*([^\n]+)', section)
        if h:
            return h.group(1).strip()
    item = re.search(r'-\s*([^\n]+)', block)
    if item:
        return item.group(1).strip()
    return ""


def process_file(path, force=False, dry=False):
    s = open(path, encoding="utf-8").read()
    blocks = re.split(r'(?=<!--\s*anno:start)', s)
    new_blocks = []
    total = replaced = 0
    for b in blocks:
        if not b.startswith('<!--'):
            new_blocks.append(b)
            continue
        total += 1
        desc = extract_desc(b)
        if not desc:
            new_blocks.append(b)
            continue
        lines = b.split('\n')
        out = []
        in_desc = False
        done = False
        for l in lines:
            if l.strip().startswith('## 需求描述'):
                in_desc = True
                out.append(l)
                continue
            if in_desc and not l.strip().startswith('###'):
                # 需求描述后的首个 `> ` 行=描述行
                if not done and l.strip().startswith('>') and '来源' not in l:
                    if not force and l.strip() == f"> {desc}":
                        out.append(l)  # 已一致
                    else:
                        out.append(f"> {desc}")
                        replaced += 1
                    done = True
                    continue
                out.append(l)
                continue
            if l.strip().startswith('###'):
                if in_desc and not done:
                    # 没有描述行: 在标题后补
                    pass
                in_desc = False
            out.append(l)
        if not done:
            # 块内没有描述行, 在需求描述标题后插入
            out2 = []
            ins = False
            for l in out:
                out2.append(l)
                if not ins and l.strip().startswith('## 需求描述'):
                    out2.append(f"> {desc}")
                    ins = True
                    replaced += 1
            out = out2
        new_blocks.append('\n'.join(out))
    if not dry:
        open(path, "w", encoding="utf-8").write(''.join(new_blocks))
    print(f"{path}: 描述 {replaced}/{total} 块" + (" (dry-run)" if dry else ""))
    return replaced


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("files", nargs="+")
    ap.add_argument("--force", action="store_true", help="无条件替换描述")
    ap.add_argument("--dry-run", action="store_true", help="只预览不写文件")
    a = ap.parse_args()
    total = 0
    for f in a.files:
        total += process_file(f, force=a.force, dry=a.dry_run)
    print(f"\n共处理描述 {total} 块")
    return 0


if __name__ == "__main__":
    sys.exit(main())