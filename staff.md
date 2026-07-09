---
layout: page
title: 教学团队
description: 数学分析(B1)课程任课教师与助教信息。
---

# 教学团队

本页面用于展示《数学分析(B1)》课程任课教师与助教信息。

## 任课教师

{% assign instructors = site.staffers | where: 'role', 'Instructor' %}
{% for staffer in instructors %}
{{ staffer }}
{% endfor %}

{% assign teaching_assistants = site.staffers | where: 'role', 'Teaching Assistant' %}
{% assign num_teaching_assistants = teaching_assistants | size %}
{% if num_teaching_assistants != 0 %}
## 助教

{% for staffer in teaching_assistants %}
{{ staffer }}
{% endfor %}
{% endif %}
