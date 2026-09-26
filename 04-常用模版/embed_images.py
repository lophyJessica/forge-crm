#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
评审PRD 图片内嵌发布版生成脚本
把 md 里的图片相对引用替换成 base64 data:URI，生成一个"自包含"发布版，
发到语雀/Confluence/邮件等任何平台图都不会断。

用法:
  python3 embed_images.py <评审PRD.md> [--img-dir <目录>] [--output <输出.md>]

默认: --img-dir  = md 所在目录的 images/ 子目录
      --output   = <原名>-发布版.md
规则: 只处理 md 里的 ![alt](./images/xxx.png) 相对引用；找不到图报错并跳过。
"""
import argparse, base64, os, re, sys

IMG_RE = re.compile(r'!\[([^\]]*)\]\((\./images/[^)]+)\)')

def embed(md_path, img_dir, out_path):
    with open(md_path, encoding='utf-8') as f:
        text = f.read()
    missing = []
    replaced = 0

    def repl(m):
        nonlocal replaced
        alt, rel = m.group(1), m.group(2)
        img = os.path.join(img_dir, os.path.basename(rel))
        if not os.path.isfile(img):
            missing.append(rel)
            return m.group(0)
        with open(img, 'rb') as f:
            b64 = base64.b64encode(f.read()).decode('ascii')
        ext = os.path.splitext(img)[1].lstrip('.').lower() or 'png'
        replaced += 1
        return f'![{alt}](data:image/{ext};base64,{b64})'

    new_text = IMG_RE.sub(repl, text)

    if missing:
        print(f'⚠️  缺失 {len(missing)} 张图，未内嵌: {missing}', file=sys.stderr)
        sys.exit(1)

    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(new_text)

    in_size = os.path.getsize(md_path)
    out_size = os.path.getsize(out_path)
    print(f'✅ 已内嵌 {replaced} 张图')
    print(f'   源文件: {md_path}  ({in_size/1024:.0f} KB)')
    print(f'   发布版: {out_path}  ({out_size/1024:.0f} KB)')
    print(f'   说明: 发布版为自包含单文件，发到语雀/Confluence 图片不丢')

if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('md')
    ap.add_argument('--img-dir', default=None, help='图片目录，默认 md 所在目录的 images/')
    ap.add_argument('--output', default=None, help='输出 md 路径，默认 <md>-发布版.md')
    a = ap.parse_args()

    base = os.path.dirname(os.path.abspath(a.md))
    img_dir = a.img_dir or os.path.join(base, 'images')
    out = a.output or os.path.splitext(a.md)[0] + '-发布版.md'
    embed(a.md, img_dir, out)