# arXivAid

## 简介

范老板是小z的好朋友，经常和小z一起吃麻辣香锅。范老板喜欢机器学习，所以不可避免地，需要大量的查阅和阅读论文。可是论文的检索和下载是一件技巧活，而范老板很懒，所以他找到了小z，希望小z帮他解决这个问题。然而小z也很懒，所以这个问题就落到了你的头上。你需要完成一个小工具arXivAid，帮范老板完成这一任务。  

## 入口文件

init.js: 用于初始化，爬取全部论文信息入库。

server.js: 服务器程序。

update.js：用于更新。最低&推荐运行频率：一次/天。

## 网络接口

/?skip=\<skip\>&show=\<show\>&
title=\<KeyWords\>&titlereg=\<regexp\>&titleregopt=\<options\>&
authors=\<KeyWords\>&
intro=\<KeyWords\>&introreg=\<regexp\>&introregopt=\<options\>&
submit=\<TimeStr | TimeStr\~TimeStr\>&revise=\<TimeStr | TimeStr\~TimeStr\>

用于查询。

/download/\<filename\>

用于下载。

## QQ机器人

key1=\<value 1\>
key2=\<value 2\>
...

其中参数和查询接口中相同。

注意：QQ机器人运行所需的4个jar文件和用于自动登录的AutoLogin.yml没有上传至git。

## conpromised & reason

爬取速率：15sec/请求，未爬完：受robots.txt限制。

下载链接始终公开可用：设置动态下载链接无意义。

## bug

update时可能会用新的替换旧的。

update脚本不能自动退出。这是与数据库的连接没有断开所致。

可能会抛出未处理异常。

## unsolved（给我时间也不会做的）

查询正文：pdf中的文本是以图片形式存储的，要提取得使用OCR。

## future（如果这个项目还有future的话我会做的）

QQ机器人支持添加好友，支持群聊，直接发送pdf... 哎。
