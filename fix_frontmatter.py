import os
import re

def fix_frontmatter(path, content, title, add_sidebar=False, add_icon=None):
    if not content.startswith('---'):
        return content
    end_idx = content.find('---', 3)
    if end_idx == -1:
        return content
    
    fm_section = content[:end_idx + 3]
    rest = content[end_idx + 3:]
    
    fm_lines = fm_section.split('\n')
    new_fm_lines = []
    title_idx = -1

    for i, line in enumerate(fm_lines):
        new_fm_lines.append(line)
        stripped = line.strip()
        if stripped.startswith('title:'):
            title_idx = i

    if add_sidebar and title_idx != -1:
        sidebar_line = f'sidebarTitle: "{title}"'
        new_fm_lines.insert(title_idx + 1, sidebar_line)

    if add_icon:
        closing_idx = len(new_fm_lines) - 1
        for i in range(len(new_fm_lines) - 1, -1, -1):
            if new_fm_lines[i].strip() == '---':
                closing_idx = i
                break
        new_fm_lines.insert(closing_idx, f'icon: "{add_icon}"')

    new_content = '\n'.join(new_fm_lines) + rest
    return new_content

icon_fixes = {
    'docs/tools/joy-trust-network.mdx': 'wrench',
    'docs/guides/integrating-praisonaiui.mdx': 'plug',
}

dirs = ['docs/features', 'docs/tools', 'docs/guides']
fixed_count = 0
fixed_files = []

for d in dirs:
    for f in sorted(os.listdir(d)):
        if not f.endswith('.mdx'):
            continue
        path = f'{d}/{f}'
        with open(path) as fh:
            content = fh.read()

        if not content.startswith('---'):
            continue
        end_idx = content.find('---', 3)
        if end_idx == -1:
            continue
        fm_text = content[3:end_idx].strip()
        fm = {}
        for line in fm_text.split('\n'):
            if ':' in line:
                key, _, val = line.partition(':')
                fm[key.strip()] = val.strip().strip('"').strip("'")

        add_sidebar = 'sidebarTitle' not in fm
        add_icon = icon_fixes.get(path) if 'icon' not in fm else None

        if not add_sidebar and not add_icon:
            continue

        title = fm.get('title', f.replace('.mdx', '').replace('-', ' ').title())
        new_content = fix_frontmatter(path, content, title, add_sidebar, add_icon)

        if new_content != content:
            with open(path, 'w') as fh:
                fh.write(new_content)
            fixed_count += 1
            fixed_files.append(path)

print(f'Fixed {fixed_count} files')
for p in fixed_files:
    print(f'  {p}')
