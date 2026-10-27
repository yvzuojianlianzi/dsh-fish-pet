"""Publish the missing files, topics and the v0.2.0 release to GitHub.

Run with the token in GH_TOKEN. Idempotent-ish: it creates one commit with the
files that are missing or differ, then makes sure topics and the release exist.
"""

import base64
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

OWNER = "yvzuojianlianzi"
REPO = "dsh-fish-pet"
TOKEN = os.environ.get("GH_TOKEN", "")
ROOT = Path(__file__).resolve().parent.parent
API = "https://api.github.com"

if not TOKEN:
    sys.exit("GH_TOKEN missing")


def call(method, path, payload=None, raw=None, content_type=None, host=None):
    url = path if path.startswith("http") else (host or API) + path
    headers = {
        "Authorization": "Bearer " + TOKEN,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "dsh-fish-pet-publish",
    }
    data = None
    if payload is not None:
        data = json.dumps(payload).encode()
        headers["Content-Type"] = "application/json"
    elif raw is not None:
        data = raw
        headers["Content-Type"] = content_type or "application/octet-stream"
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            body = response.read()
            return json.loads(body) if body else {}
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", "replace")[:900]
        print("HTTP %s on %s %s\n%s" % (error.code, method, path, detail))
        raise


repo = call("GET", "/repos/%s/%s" % (OWNER, REPO))
print("repo:", repo["full_name"], "default:", repo["default_branch"])

# --- 1. one commit with every missing or updated file -----------------------
WANTED = [
    "LICENSE",
    "NOTICE.md",
    "README.md",
    "SHARE.md",
    "art/pet.webp",
    "art/source.png",
    "client.js",
    "cordis.patch.yml",
    "icon.png",
    "index.js",
    "locale/zh.json",
    "locale/en.json",
    "package.json",
    "scripts/build-client.py",
    "scripts/check-keys.py",
    "scripts/make-art.py",
    "scripts/publish.py",
    "src/client.js",
]

ref = call("GET", "/repos/%s/%s/git/ref/heads/%s" % (OWNER, REPO, repo["default_branch"]))
base_sha = ref["object"]["sha"]
base_commit = call("GET", "/repos/%s/%s/git/commits/%s" % (OWNER, REPO, base_sha))
base_tree = base_commit["tree"]["sha"]

entries = []
for path in WANTED:
    content = (ROOT / path).read_bytes()
    blob = call("POST", "/repos/%s/%s/git/blobs" % (OWNER, REPO), {
        "content": base64.b64encode(content).decode("ascii"),
        "encoding": "base64",
    })
    entries.append({"path": path, "mode": "100644", "type": "blob", "sha": blob["sha"], "size": len(content)})
    print("blob", path, len(content), "->", blob["sha"][:8])

tree = call("POST", "/repos/%s/%s/git/trees" % (OWNER, REPO), {"base_tree": base_tree, "tree": entries})
head_sha = base_sha
if tree["sha"] == base_tree:
    print("commit: nothing to change, tree already up to date")
else:
    commit = call("POST", "/repos/%s/%s/git/commits" % (OWNER, REPO), {
        "message": "Add artwork, locale resources and authoring sources\n\n"
                   "Keeps the runtime files unchanged; splits the MIT text from the\n"
                   "artwork notice so the license is recognised.",
        "tree": tree["sha"],
        "parents": [base_sha],
    })
    call("PATCH", "/repos/%s/%s/git/refs/heads/%s" % (OWNER, REPO, repo["default_branch"]), {"sha": commit["sha"]})
    head_sha = commit["sha"]
    print("commit:", head_sha[:10])

# --- 2. repository metadata (needs Administration on the token) -------------
description = "给 DeepSeek Harness 的桌宠：打开就打招呼，点一下就说话，能拖到任何地方。"
try:
    call("PATCH", "/repos/%s/%s" % (OWNER, REPO), {
        "description": description,
        "homepage": "https://github.com/%s/%s#readme" % (OWNER, REPO),
    })
    print("description: updated")
except urllib.error.HTTPError as error:
    print("description: skipped (HTTP %s)" % error.code)

try:
    topics = call("PUT", "/repos/%s/%s/topics" % (OWNER, REPO), {
        "names": ["deepseek-harness", "dsh-plugin", "desktop-pet", "widget", "chibi"],
    })
    print("topics:", ", ".join(topics.get("names", [])))
except urllib.error.HTTPError as error:
    print("topics: skipped (HTTP %s)" % error.code)

# --- 3. release + assets ----------------------------------------------------
import json as _json

VERSION = _json.loads((ROOT / "package.json").read_text(encoding="utf-8"))["version"]
TAG = "v" + VERSION
BODY = """右键菜单的四项，这一版终于是真的会动了。

**新东西**

- 「说句话」：白底对话框，话停留 6 秒
- 「睡一会儿」：就地躺下，头顶浮一个白色的小框，里面三个 z 依次起伏
- 「回到角落」：滑回**左下角**（默认位置也回到左下）
- 「藏起来」：缩到最近的屏幕边、只露半边身子偷看，点一下就出来

**修掉的 bug**

- 右键菜单里的按钮点了没反应——菜单按下时被桌宠的拖拽逻辑抢了指针，浏览器的 `click` 被重定向到桌宠身上，按钮的点击根本没发生。现在菜单区域的按下不再进入拖拽。

**安装**

```sh
dsh plugin --profile desktop add github:yvzuojianlianzi/dsh-fish-pet
```

桌面版也可以在「插件 → 添加插件」里填这串地址。

**附件**

- `dsh-fish-pet-%s.tgz`：本地安装用（`dsh plugin add <路径>`）
- `dsh-fish-pet-github.zip`：解压后按 `SHARE.md` 装，不需要 git

角色图不在 MIT 许可范围内，详见 `NOTICE.md`。
""" % VERSION

try:
    release = call("GET", "/repos/%s/%s/releases/tags/%s" % (OWNER, REPO, TAG))
except urllib.error.HTTPError as error:
    if error.code != 404:
        raise
    release = call("POST", "/repos/%s/%s/releases" % (OWNER, REPO), {
        "tag_name": TAG,
        "target_commitish": repo["default_branch"],
        "name": TAG + " · 大肥鱼桌宠",
        "body": BODY,
        "draft": False,
        "prerelease": False,
    })
print("release:", release["html_url"])

# The release may exist from an earlier run whose tag points at an older
# commit; move the tag to this commit so the release's source archive matches.
try:
    tag_ref = call("GET", "/repos/%s/%s/git/ref/tags/%s" % (OWNER, REPO, TAG))
    if tag_ref.get("object", {}).get("sha") != head_sha:
        call("PATCH", "/repos/%s/%s/git/refs/tags/%s" % (OWNER, REPO, TAG), {
            "sha": head_sha, "force": True,
        })
        print("tag: moved to", head_sha[:10])
except urllib.error.HTTPError as error:
    if error.code != 404:
        raise

assets = [
    (ROOT / "dist" / ("dsh-fish-pet-%s.tgz" % VERSION), "application/gzip"),
    (ROOT / "dist" / "dsh-fish-pet-github.zip", "application/zip"),
]
uploaded = {item["name"] for item in release.get("assets", [])}
for path, ctype in assets:
    if path.name in uploaded:
        print("asset exists:", path.name)
        continue
    result = call(
        "POST",
        "/repos/%s/%s/releases/%d/assets?name=%s" % (OWNER, REPO, release["id"], path.name),
        raw=path.read_bytes(),
        content_type=ctype,
        host="https://uploads.github.com",
    )
    print("asset:", result["name"], result["size"], "bytes")

print("done")
