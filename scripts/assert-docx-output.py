"""Verify synthetic DOCX output semantics and layout with an independent PDF implementation."""
from pathlib import Path
import json
import sys
import fitz

target = Path(sys.argv[1])
doc = fitz.open(target)
assert len(doc) == 2, f'Expected explicit 2-page layout; got {len(doc)}'
one, two = doc[0].get_text(), doc[1].get_text()
assert '星易中文排版测试' in one
assert '中文表格' in one and 'CELL_ALPHA' in one and '42' in one
assert 'PAGE_ONE' in one and 'PAGE_TWO' not in one
assert 'PAGE_TWO' in two and '第二页' in two and 'PAGE_ONE' not in two
assert '\ufffd' not in one + two and '\u25a1' not in one + two
assert len(doc[0].get_drawings()) >= 6, 'Table borders should remain vector paths'
images = doc[0].get_image_info()
assert images and images[0]['width'] == 120 and images[0]['height'] == 80
cells = [doc[0].search_for(text)[0] for text in ['项目', '数量', '备注']]
assert cells[0].x0 < cells[1].x0 < cells[2].x0
assert abs(cells[0].y0 - cells[2].y0) < 2, 'Table header row lost alignment'
assert images[0]['bbox'][1] > cells[0].y1, 'Image should follow table'
for i, page in enumerate(doc):
    page.get_pixmap(matrix=fitz.Matrix(1.3, 1.3)).save(target.with_name(f'{target.stem}-page-{i + 1}.png'))
result = {'pages': len(doc), 'chinese_text': True, 'table_alignment': True, 'vector_table_paths': len(doc[0].get_drawings()), 'embedded_image': [images[0]['width'], images[0]['height']], 'explicit_page_break': True, 'text': [one, two]}
target.with_suffix('.verification.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
print('PASS: Chinese text, table geometry, vector borders, image placement and 2-page break.')
