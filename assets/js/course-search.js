const instances = new WeakMap();

export function initCourseSearch(root) {
  if (instances.has(root)) {
    return instances.get(root);
  }

  const trigger =
    root.querySelector('[data-search-open]');

  const dialog =
    root.querySelector('[data-search-dialog]');

  const panel =
    root.querySelector('[data-search-panel]');

  const input =
    root.querySelector('[data-search-input]');

  const clearButton =
    root.querySelector('[data-search-clear]');

  const closeButton =
    root.querySelector('[data-search-close]');

  const status =
    root.querySelector('[data-search-status]');

  const results =
    root.querySelector('[data-search-results]');

  if (
    !trigger ||
    !dialog ||
    !panel ||
    !input ||
    !clearButton ||
    !closeButton ||
    !status ||
    !results
  ) {
    throw new Error(
      'Course search markup is incomplete.'
    );
  }

  const pagefindModuleUrl =
    root.dataset.pagefindModule;

  const highlightModuleUrl =
    root.dataset.pagefindHighlightModule;

  const baseUrl =
    normalizeBaseUrl(
      root.dataset.searchBaseUrl
    );

  const MAX_PAGE_RESULTS = 12;
  const MAX_SUB_RESULTS = 6;
  const SEARCH_DEBOUNCE_MS = 180;

  let pagefindPromise = null;
  let lastFocusedElement = null;
  let queryVersion = 0;
  let resultLinks = [];
  let activeResultIndex = -1;

  function normalizeBaseUrl(value) {
    const normalized =
      String(value || '/').trim();

    if (
      !normalized ||
      normalized === '/'
    ) {
      return '/';
    }

    return (
      '/' +
      normalized.replace(
        /^\/+|\/+$/g,
        ''
      ) +
      '/'
    );
  }

  function isDialogOpen() {
    return (
      dialog.open ||
      dialog.hasAttribute('open')
    );
  }

  function setStatus(message) {
    status.textContent = message;
  }

  function setBusy(isBusy) {
    results.toggleAttribute(
      'aria-busy',
      isBusy
    );
  }

  function resetActiveResult() {
    activeResultIndex = -1;

    resultLinks = Array.from(
      results.querySelectorAll(
        '[data-search-result-link]'
      )
    );

    resultLinks.forEach(
      (link, index) => {
        link.addEventListener(
          'focus',
          () => {
            activeResultIndex = index;
          }
        );
      }
    );
  }

  function focusResult(index) {
    if (resultLinks.length === 0) {
      return;
    }

    const nextIndex =
      (
        index +
        resultLinks.length
      ) %
      resultLinks.length;

    activeResultIndex = nextIndex;

    resultLinks[nextIndex].focus({
      preventScroll: true
    });

    resultLinks[nextIndex]
      .scrollIntoView({
        block: 'nearest'
      });
  }

  function createMessage(
    className,
    title,
    detail
  ) {
    const wrapper =
      document.createElement('div');

    wrapper.className = className;

    const heading =
      document.createElement('p');

    heading.className =
      'course-search__message-title';

    heading.textContent = title;

    wrapper.appendChild(heading);

    if (detail) {
      const description =
        document.createElement('p');

      description.className =
        'course-search__message-detail';

      description.textContent = detail;

      wrapper.appendChild(
        description
      );
    }

    return wrapper;
  }

  function renderIdle() {
    results.replaceChildren(
      createMessage(
        'course-search__message',
        '输入关键词开始搜索',
        '可搜索课程说明、教师姓名、公告、周次、作业、答疑、课程编号和教室。'
      )
    );

    setStatus(
      '等待输入搜索关键词。'
    );

    resetActiveResult();
  }

  function renderNoResults(query) {
    results.replaceChildren(
      createMessage(
        'course-search__message course-search__message--empty',
        `未找到“${query}”`,
        '请尝试缩短关键词，或改用课程名称、教师姓名、周次和课程编号。'
      )
    );

    setStatus('没有匹配结果。');
    resetActiveResult();
  }

  function renderError() {
    results.replaceChildren(
      createMessage(
        'course-search__message course-search__message--error',
        '搜索暂时不可用',
        '如果这是本地预览，请先生成 Pagefind 索引；部署站点请稍后刷新重试。'
      )
    );

    setStatus(
      '搜索索引加载失败。'
    );

    resetActiveResult();
  }

  function createExcerpt(
    html,
    className
  ) {
    const excerpt =
      document.createElement('p');

    excerpt.className = className;

    /*
     * Pagefind 会先对摘要中的 HTML 实体进行转义，
     * 然后才插入自己的 mark 标签。
     */
    excerpt.innerHTML = html || '';

    return excerpt;
  }

  function createResultLink(
    url,
    title,
    excerptHtml,
    className
  ) {
    const link =
      document.createElement('a');

    link.className = className;
    link.href = url;

    link.dataset.searchResultLink = '';

    const titleElement =
      document.createElement('span');

    titleElement.className =
      `${className}-title`;

    titleElement.textContent = title;

    link.appendChild(titleElement);

    if (excerptHtml) {
      link.appendChild(
        createExcerpt(
          excerptHtml,
          `${className}-excerpt`
        )
      );
    }

    return link;
  }

  function createPageResult(page) {
    const article =
      document.createElement('article');

    article.className =
      'course-search__result';

    const pageTitle =
      page.meta?.title ||
      page.url ||
      '未命名页面';

    article.appendChild(
      createResultLink(
        page.url,
        pageTitle,
        page.excerpt,
        'course-search__page-link'
      )
    );

    const subResults =
      Array.isArray(page.sub_results)
        ? page.sub_results
            .filter(
              (item) =>
                item?.url &&
                item.url !== page.url
            )
            .slice(
              0,
              MAX_SUB_RESULTS
            )
        : [];

    if (subResults.length > 0) {
      const list =
        document.createElement('ul');

      list.className =
        'course-search__sub-results';

      subResults.forEach((item) => {
        const listItem =
          document.createElement('li');

        listItem.appendChild(
          createResultLink(
            item.url,
            item.title || pageTitle,
            item.excerpt,
            'course-search__sub-link'
          )
        );

        list.appendChild(listItem);
      });

      article.appendChild(list);
    }

    return article;
  }

  function renderResults(
    pages,
    total
  ) {
    if (pages.length === 0) {
      renderNoResults(
        input.value.trim()
      );
      return;
    }

    const fragment =
      document.createDocumentFragment();

    pages.forEach((page) => {
      fragment.appendChild(
        createPageResult(page)
      );
    });

    results.replaceChildren(
      fragment
    );

    const displayed = pages.length;

    setStatus(
      total > displayed
        ? `找到 ${total} 个页面结果，当前显示前 ${displayed} 个。`
        : `找到 ${total} 个页面结果。`
    );

    resetActiveResult();
  }

  async function loadPagefind() {
    if (!pagefindModuleUrl) {
      throw new Error(
        'Missing Pagefind module URL.'
      );
    }

    if (!pagefindPromise) {
      pagefindPromise =
        import(pagefindModuleUrl)
          .then(async (pagefind) => {
            await pagefind.options({
              baseUrl,
              excerptLength: 28,
              highlightParam:
                'highlight'
            });

            await pagefind.init();

            return pagefind;
          })
          .catch((error) => {
            pagefindPromise = null;
            throw error;
          });
    }

    return pagefindPromise;
  }

  async function performSearch() {
    const query =
      input.value.trim();

    clearButton.hidden =
      query.length === 0;

    queryVersion += 1;

    const currentVersion =
      queryVersion;

    if (!query) {
      setBusy(false);
      renderIdle();
      return;
    }

    setBusy(true);
    setStatus('正在搜索……');

    try {
      const pagefind =
        await loadPagefind();

      if (
        currentVersion !==
        queryVersion
      ) {
        return;
      }

      const response =
        await pagefind.debouncedSearch(
          query,
          {},
          SEARCH_DEBOUNCE_MS
        );

      if (
        !response ||
        currentVersion !==
          queryVersion
      ) {
        return;
      }

      const selectedResults =
        response.results.slice(
          0,
          MAX_PAGE_RESULTS
        );

      const pages =
        await Promise.all(
          selectedResults.map(
            (result) =>
              result.data()
          )
        );

      if (
        currentVersion !==
        queryVersion
      ) {
        return;
      }

      renderResults(
        pages,
        response.results.length
      );
    } catch (error) {
      if (
        currentVersion ===
        queryVersion
      ) {
        console.error(
          'Course search failed:',
          error
        );

        renderError();
      }
    } finally {
      if (
        currentVersion ===
        queryVersion
      ) {
        setBusy(false);
      }
    }
  }

  function afterDialogClosed() {
    document.documentElement
      .classList.remove(
        'course-search-is-open'
      );

    activeResultIndex = -1;

    if (
      lastFocusedElement
        instanceof HTMLElement
    ) {
      lastFocusedElement.focus({
        preventScroll: true
      });
    }
  }

  function open() {
    if (isDialogOpen()) {
      input.focus({
        preventScroll: true
      });
      return;
    }

    lastFocusedElement =
      document.activeElement;

    document.documentElement
      .classList.add(
        'course-search-is-open'
      );

    if (
      typeof dialog.showModal ===
      'function'
    ) {
      dialog.showModal();
    } else {
      dialog.setAttribute(
        'open',
        ''
      );
    }

    window.requestAnimationFrame(
      () => {
        input.focus({
          preventScroll: true
        });
      }
    );

    void loadPagefind().catch(
      (error) => {
        console.error(
          'Pagefind failed to initialize:',
          error
        );

        renderError();
      }
    );
  }

  function close() {
    if (!isDialogOpen()) {
      return;
    }

    if (
      typeof dialog.close ===
        'function' &&
      dialog.open
    ) {
      dialog.close();
    } else {
      dialog.removeAttribute(
        'open'
      );

      afterDialogClosed();
    }
  }

  function clearSearch() {
    input.value = '';
    clearButton.hidden = true;
    queryVersion += 1;

    renderIdle();

    input.focus({
      preventScroll: true
    });
  }

  closeButton.addEventListener(
    'click',
    close
  );

  clearButton.addEventListener(
    'click',
    clearSearch
  );

  input.addEventListener(
    'focus',
    () => {
      void loadPagefind()
        .catch(() => {});
    }
  );

  input.addEventListener(
    'input',
    () => {
      void performSearch();
    }
  );

  dialog.addEventListener(
    'close',
    afterDialogClosed
  );

  dialog.addEventListener(
    'click',
    (event) => {
      if (
        event.target !== dialog
      ) {
        return;
      }

      const bounds =
        panel.getBoundingClientRect();

      const clickedOutsidePanel =
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom;

      if (clickedOutsidePanel) {
        close();
      }
    }
  );

  dialog.addEventListener(
    'keydown',
    (event) => {
      if (
        event.key ===
          'ArrowDown' &&
        resultLinks.length > 0
      ) {
        event.preventDefault();

        focusResult(
          activeResultIndex < 0
            ? 0
            : activeResultIndex + 1
        );
      } else if (
        event.key ===
          'ArrowUp' &&
        resultLinks.length > 0
      ) {
        event.preventDefault();

        focusResult(
          activeResultIndex < 0
            ? resultLinks.length - 1
            : activeResultIndex - 1
        );
      } else if (
        event.key === 'Enter' &&
        event.target === input &&
        resultLinks.length > 0
      ) {
        event.preventDefault();
        resultLinks[0].click();
      }
    }
  );

  async function enableResultHighlighting() {
    if (!highlightModuleUrl) {
      return;
    }

    if (
      !new URLSearchParams(
        window.location.search
      ).has('highlight')
    ) {
      return;
    }

    try {
      const highlightModule =
        await import(
          highlightModuleUrl
        );

      const Highlight =
        highlightModule
          .PagefindHighlight ||
        window.PagefindHighlight;

      if (
        typeof Highlight ===
        'function'
      ) {
        new Highlight({
          highlightParam:
            'highlight',
          markContext:
            '#main-content main',
          addStyles: false
        });
      }
    } catch (error) {
      console.warn(
        'Pagefind result highlighting was skipped:',
        error
      );
    }
  }

  const api =
    Object.freeze({
      open,
      close
    });

  instances.set(root, api);

  renderIdle();

  void enableResultHighlighting();

  return api;
}