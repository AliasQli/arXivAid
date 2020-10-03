# Daily Report

## Day 1

初步实现了爬虫的基本功能。分析了网页结构，能解析目录页和文件页。能写入数据库。

使用了发送高级网络请求的superAgent模组的使用方法。使用了cheerio以jQuery的方式解析html。使用了mongodb。

## Day 2

用async/await重写了代码。

用原生的http和https代替了superAgent。

用express搭建了服务器。实现接口支持了对标题、作者、简介的关键字查询功能，对发布日期和最后修改日期的范围查询功能。剩余模糊查询功能。

填充了README.md。

bug: init.js不能自动退出。
