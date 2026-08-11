---
layout: page
title: 课程资料
nav_order: 6
description: 数学分析(B1)课程讲义、作业文件、习题课资料与补充材料。
permalink: /materials/
---

# 课程资料

本页面集中发布《数学分析(B1)》的课程讲义、作业文件、习题课资料及补充材料。资料会根据实际教学进度逐步更新，请以课程 QQ 群及任课教师、助教的最新通知为准。

<div class="materials-notice" role="note" aria-label="资料下载说明">
  <p class="materials-notice__title">下载说明</p>
  <ul>
    <li>下载前请核对资料名称、更新时间和文件格式，避免使用旧版本。</li>
    <li>可在线查看的文件会同时提供“在线查看”和“下载资料”两个入口。</li>
    <li>部分作业答案或复习资料只会在合适的教学阶段发布。</li>
  </ul>
</div>

{% assign material_categories = site.data.materials.categories %}

{% if material_categories %}
<nav class="materials-index" aria-label="课程资料分类">
  <span class="materials-index__label">资料分类</span>
  <div class="materials-index__links">
    {% for category in material_categories %}
      {% assign category_count = category.items | size %}
      <a href="#{{ category.id | escape }}">
        {{ category.title | escape }}
        <span aria-label="{{ category_count }} 项资料">{{ category_count }}</span>
      </a>
    {% endfor %}
  </div>
</nav>

{% for category in material_categories %}
  {% assign category_count = category.items | size %}
  <section class="materials-section" id="{{ category.id | escape }}">
    <div class="materials-section__header">
      <div>
        <h2>{{ category.title | escape }}</h2>
        {% if category.description %}
          <p>{{ category.description | escape }}</p>
        {% endif %}
      </div>
      <span class="materials-section__count">{{ category_count }} 项</span>
    </div>

    {% if category_count > 0 %}
      <div class="materials-grid">
        {% for material in category.items %}
          {% include material-card.html material=material %}
        {% endfor %}
      </div>
    {% else %}
      <div class="materials-empty">
        <p>本分类资料尚未发布。</p>
        <span>后续会随教学进度逐步更新。</span>
      </div>
    {% endif %}
  </section>
{% endfor %}
{% else %}
<div class="materials-empty materials-empty--page">
  <p>课程资料尚未配置。</p>
  <span>请稍后再来查看。</span>
</div>
{% endif %}