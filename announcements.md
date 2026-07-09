---
layout: page
title: 课程公告
nav_order: 3
description: 数学分析(B1)课程公告与重要通知。
---

# 课程公告

本页面用于发布《数学分析(B1)》课程公告、重要通知、作业提醒、习题课安排及其他课程相关信息。请同学们定期查看，并以课程 QQ 群及任课教师、助教的最新通知为准。

{% assign announcements = site.announcements | reverse %}
{% for announcement in announcements %}
{{ announcement }}
{% endfor %}
