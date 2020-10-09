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

## Day 3

发现bug产生原因：数据库连接未关闭。

写了update.js，加入cron中即可每日更新。

分离了router。

独立了用于连接数据库的代码。

## Day 4

发现对于http status 302之类的情况处理不完善。考虑改回使用superAgent模组(改了，12点后断网无法测试）。

删除了部分await，提高了并发性。

~~不久将~~已支持模糊查询。

考虑将部分toArray的使用改为直接对Cursor的使用。

数据库将设密码。

将download开放为静态目录，提供了文件下载功能。除mirai和docker部署外，主要功能已全部完成或接近完成，剩余修bug。可能有（不少）隐藏bug。

晚了，休息了。

## Day 5

已改回superAgent模组。

已将部分toArray改为Cursor。

数据库仍未设密码。

写了mirai.js，无法测试。

从data.json中分离出了status.json。

用回了随机UA。

一些unsolved要修：使db能够重连，异常退出时init.js能缓存当前状态，downloadFailure的insert改为upsert（一个就够）。

明天对Promise/async/await系统中的异常抛出作系统研究。

主要功能：仅剩docker。

## Day 6

init.js中db能够重连，异常退出时能缓存当前状态，downloadFailure的insert改为upsert。

mirai很好。将mirai装入docker image。

将arXivAid装入docker image，但之后仍可能修改。

## Day 7

在Linux的docker上部署。至此，全部工作完成。

## Day 8

注：由于init.js暂停后会从头运行，以下工作均未能同步至服务器：

使init.js能自动退出，update.js待解决。

使获取的intro中不会出现\\n。
