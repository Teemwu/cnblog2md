# cnblog2md
解析博客园备份 xml 文件，生成 markdown 和对应图片文件，并将文件保存到本地的命令行工具

## 安装
全局安装

```bash
npm i -g cnblog2md
```

```bash
cnb -v
```

局部安装

```bash
npm i cnblog2md -D
```

```bash
npx cnb -v
```

输出版本号即安装成功

## 使用示例
使用前需要准备好博客的备份文件，可以到 [这里](https://i1.cnblogs.com/BlogBackup.aspx) 去下载本分文件

> 为了减少对网站性能的影响，麻烦您在工作日18:00之后、8点之前或周六、周日进行备份。


⚠️ 需要注意的是，博客园备份功能开放时间是： 周一到周五 18:00-08:00 周六日全天

假设我们准备好了备份文件 `CNBlogs_BlogBackup.xml` ，运行以下命令

```bash
cnb -f CNBlogs_BlogBackup.xml -m mds -i imgs
```

解析完会在运行目录生成 `mds` 和 `imgs` 文件夹

如果不使用 `-m` 和 `-i` 来自定义存储文件夹，则所有文件默认存放到运行目录

## 参数

| 简写 | 全写      | 必要性 | 描述                             |
| :--- | :-------- | :----: | :------------------------------- |
| -f   | --file    |   是   | 要解析的 `xml` 备份文件路径      |
| -m   | --md      |   否   | 存储 `md` 文件的路径             |
| -i   | --img     |   否   | 存储图片文件的路径               |
| -mi  | --mdimg   |   否   | 自定义 `md` 文件中图片的相对路径 |
| -a   | --auth    |   否   | 自定义作者名称                   |
| -v   | --version |   否   | 查看版本号                       |
| -h   | --help    |   否   | 查看帮助信息                     |

## 自定义目录

可通过自定义设置保存目录来进行文件的保存，工具提供了日期时间模板的解析，使用时只需用 `{{}}` 包裹即可

常用格式化占位符如下，具体可参考 [dayjs](https://day.js.org/docs/en/display/format)

| 占位符 | 输出             | 详情                     |
| :----- | :--------------- | :----------------------- |
| YY     | 18               | 两位数的年份             |
| YYYY   | 2018             | 四位数的年份             |
| M      | 1-12             | 月份，从 1 开始          |
| MM     | 01-12            | 月份，两位数             |
| MMM    | Jan-Dec          | 缩写的月份名称           |
| MMMM   | January-December | 完整的月份名称           |
| D      | 1-31             | 月份里的一天             |
| DD     | 01-31            | 月份里的一天，两位数     |
| d      | 0-6              | 一周中的一天，星期天是 0 |
| dd     | Su-Sa            | 最简写的星期几           |
| ddd    | Sun-Sat          | 简写的星期几             |
| dddd   | Sunday-Saturday  | 星期几                   |
| H      | 0-23             | 小时                     |
| HH     | 00-23            | 小时，两位数             |

### 目录使用日期时间

有时候需要根据文章的发布日期来进行生成目录，如 `mds/2022/xxx.md` 或者 `imgs/2022/10/24/xxxx.png`

此时，只需要在命令行输入

```bash
cnb -f CNBlogs_BlogBackup.xml -m mds/{{YYYY}} -i imgs/{{YYYY}}/{{MM}}/{{DD}}
```
### Markdown 图片自定义路径

如果要自定义 `markdown` 文件内图片的路径，如 `![](/public/xxxx.png)`

则可以

```bash
cnb -f CNBlogs_BlogBackup.xml -mi /public
```

## 自定义输出文章格式

输入 `markdown`	文件时，通常我们需要自定义一些头部信息，工具默认输出文章格式如下

```md
---
title:  文章标题
author: 作者
date: 文章发布时间
isPublished: 是否发布
categories:
  - 分组一
tags:
  - 标签一
  - 标签二
---

#  文章标题

文章内容
```

### 默认模版
如需自定义输入格式，可在运行目录新增 `cnb-template.hbs` 或者 `cnb-template.handlebars` 文件

默认解析模板如下，可根据需求进行更改，具体模版语法可查看 [handlebars](https://handlebarsjs.com/guide/)

```hbs
---
title: {{title}}
author: {{author}}
date: {{date}}
isPublished: {{isPublished}}
categories:
{{#each categories}}
  - {{this}}
{{/each}}
tags:
{{#each tags}}
  - {{this}}
{{/each}}
---

# {{title}}

{{content}}
```

### 可用模版变量

| 变量名      | 类型     | 描述         |
| :---------- | :------- | :----------- |
| title       | string   | 文章标题     |
| author      | string   | 作者名       |
| date        | string   | 文章发布日期 |
| isPublished | boolean  | 是否发布文章 |
| categories  | string[] | 文章分组     |
| tags        | string[] | 文章标签     |
| content     | string   | 文章内容     |

## License

[MIT](https://github.com/Teemwu/cnblog2md/blob/main/LICENSE)