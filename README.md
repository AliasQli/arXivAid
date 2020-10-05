# arXivAid

## 简介

范老板是小z的好朋友，经常和小z一起吃麻辣香锅。范老板喜欢机器学习，所以不可避免地，需要大量的查阅和阅读论文。可是论文的检索和下载是一件技巧活，而范老板很懒，所以他找到了小z，希望小z帮他解决这个问题。然而小z也很懒，所以这个问题就落到了你的头上。你需要完成一个小工具arXivAid，帮范老板完成这一任务。  

## 文件

init.js: 用于初始化，爬取全部论文信息入库。

server.js: 服务器程序。

update.js：用于更新。最低&推荐运行频率：一次/天。

## 网络接口

/?title=\<KeyWords\>&authors=\<KeyWords\>&intro=\<KeyWords\>&submit=\<TimeStr | TimeStr\~TimeStr\>&revise=\<TimeStr | TimeStr\~TimeStr\>

用于查询。

/download/\<filename\>

用于下载。

## conpromised & reason

爬取速率：15sec/请求，未爬完。受robots.txt限制。

下载链接始终公开可用。设置动态下载链接无意义。

## bug/unsolved

数据库读写失败时程序会直接崩，因为不知道这种情况如何处理。
