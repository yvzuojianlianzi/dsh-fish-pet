# 怎么装「大肥鱼桌宠」

这是一个 DeepSeek Harness 的网页插件：装好之后，页面左下角会多一只大肥鱼，打开
DSH 它跟你打招呼，点一下会说话，能拖到任何地方，没人理它会打盹。

## 你需要

- 较新的 DeepSeek Harness（`0.2.1-rc.3` 及以上；桌面版 0.2.x 都可以）。
- 会用桌面版的 **插件 / Plugins** 页面，或者命令行 `dsh`。

## 装法一：桌面版，从本地文件夹装（拿到的是 zip）

1. 把 zip 解压到一个固定位置，比如 `D:\plugins\dsh-fish-pet`。以后别删它。
2. 打开 DSH 桌面版 → **插件 / Plugins** 页 → 添加插件（Add plugin）。
3. 安装来源填这个文件夹的**绝对路径**，例如 `D:\plugins\dsh-fish-pet`。
4. 装完刷新一下页面（Ctrl+R）。左下角应该出现大肥鱼。

## 装法二：命令行，从 tarball 或文件夹装

```sh
dsh plugin --profile <你的 profile 名> add "D:\path\to\dsh-fish-pet-0.2.0.tgz"
# 或者直接指文件夹
dsh plugin --profile <你的 profile 名> add "D:\path\to\dsh-fish-pet"
```

`desktop` 桌面版的 profile 一般叫 `desktop`。装完重启一次 DSH。

## 装法三：从 GitHub 装（作者把仓库推上去以后）

```sh
dsh plugin --profile desktop add github:用户名/仓库名
```

也可以在插件页把 `github:用户名/仓库名` 填进安装来源。

## 用完不想要了

插件页里删掉这个插件（Remove），或者：

```sh
dsh plugin --profile desktop remove dsh-fish-pet
```

## 怎么用它

| 操作 | 效果 |
| --- | --- |
| 打开 DSH | 按当前时段打招呼 |
| 点一下 | 说句话、冒心 |
| 按住拖 | 换位置，位置会记住 |
| 左/右半边 | 自动转身朝向页面中间 |
| 右键 | 说句话 / 安静一点 / 睡一会儿 / 回到角落 / 藏起来 |
| 放着不管 | 偶尔自言自语，三分半后打盹 |

## 说明

- 角色图是作者自己放进去的图，**不在** MIT 许可里（见 `NOTICE.md`）；代码是 MIT。
- 插件只写浏览器 `localStorage`（位置、是否爱说话），不碰你的会话数据。
