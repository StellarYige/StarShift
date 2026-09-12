import sys, json, hashlib, zipfile, fitz

filename = sys.argv[1]
def inspect(document):
    return [{"text": page.get_text().strip(), "rotation": page.rotation,
             "size": list(page.mediabox), "paths": len(page.get_drawings()),
             "images": [[image["width"], image["height"]] for image in page.get_image_info()],
             "renderSha256": hashlib.sha256(page.get_pixmap(matrix=fitz.Matrix(1, 1)).samples).hexdigest()}
            for page in document]

if filename.endswith('.zip'):
    with zipfile.ZipFile(filename) as archive:
        pages = [inspect(fitz.open(stream=archive.read(name), filetype='pdf')) for name in archive.namelist()]
    assert len(pages) == 100 and all(len(group) == 1 for group in pages)
    result = [group[0] for group in pages]
    for index, page in enumerate(result):
        assert page['text'].startswith(f'SYNTHETIC PAGE {index + 1}\n')
        assert page['paths'] > 0 and page['images'] == [[240, 160]]
else:
    result = inspect(fitz.open(filename))
    assert len(result) == 10
    for index, page in enumerate(result):
        assert page['images'] == ([[2000, 3000]] if index == 0 else [[3000, 2000]])
        assert abs(page['size'][2] - 595.28) < .02 and abs(page['size'][3] - 841.89) < .02
print(json.dumps(result))
