# 大肥鱼桌宠 · dsh-fish-pet

给 DeepSeek Harness 的网页加一个会说话的小家伙：打开就打招呼，点一下就冒话，能拖着走，
没人理它会自己打盹。

*A desktop pet for the DSH Web UI: it greets you when the app opens, talks when poked,
can be dragged anywhere, turns toward the middle of the page, and naps when left alone.*

<img src="art/pet.webp" width="180" alt="大肥鱼">

## 装

需要 DSH `0.2.1-rc.3` 及以上。

```sh
dsh plugin --profile desktop add github:yvzuojianlianzi/dsh-fish-pet
```

桌面版也可以在 **插件 / Plugins → 添加插件** 里填 `github:yvzuojianlianzi/dsh-fish-pet`。

装完刷新页面（Ctrl+R）；没变化就重启一次 DSH。卸载：

```sh
dsh plugin --profile desktop remove dsh-fish-pet
```

> 从 GitHub 装需要机器上有 `git`（pnpm 拉仓库要用）。没有的话用
> [Releases](https://github.com/yvzuojianlianzi/dsh-fish-pet/releases) 里的压缩包，
> 解压后按 `SHARE.md` 装。

## 它会做什么

| 时机 | 行为 |
| --- | --- |
| 打开 DSH | 从角落弹出来，按当前时段打招呼（早上 / 下午 / 晚上 / 深夜各不同） |
| 点它一下 | 弹出一句话，身体轻轻压一下，冒几颗心 |
| 按住拖动 | 拖到页面任何位置；位置记在浏览器里，下次还是那儿 |
| 站在左 / 右半边 | 自动转身朝向页面中间（拖过中线时会翻个身） |
| 鼠标靠近 | 脑袋会朝你这边歪一点 |
| 不管它 | 安静久了偶尔自言自语，安静到 3 分半就躺下打盹（z z z） |
| 右键 | 小菜单：说句话 / 安静一点 / 睡一会儿 / 回到角落 / 藏起来 |
| 说句话 | 头顶弹一个白色对话框，说一句 |
| 睡一会儿 | 就地躺下睡，点一下或再选一次「醒醒」起来 |
| 回到角落 | 滑到它最近的那个角落 |
| 藏起来 | 缩到最近的屏幕边，只露半边身子偷看；点一下它就出来 |

中英双语，跟随 DSH 的语言设置。

## 它住在哪

- 渲染在 `shell.overlay`（frame-wide floating layer）上，浮在所有栏位之上；只有桌宠
  本身接收指针事件，不挡页面操作。
- 样式只用 `--dsw-alias-*` 主题变量，明暗主题都跟得上。
- 位置、是否爱说话存在浏览器 `localStorage`，不碰 DSH 的数据目录。

## 自己改

```
src/client.js             组件源码（图片位置留了 '__PET_IMG__' 占位）
scripts/make-art.py       从 art/source.png 生成 art/pet.webp 和 icon.png
scripts/build-client.py   把图片内联进 client.js
```

```sh
python scripts/make-art.py      # 换图时
python scripts/build-client.py  # 改完源码，生成 client.js
```

## 素材与许可

代码、构建脚本、locale 文本是 MIT（见 `LICENSE`）。

角色图 `art/source.png` **不在** MIT 范围内，只在本插件中原样使用，不授予再许可
（见 `NOTICE.md`）。要拿去再分发或商用，请先确认这张图可以用。
