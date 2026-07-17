const root = document.querySelector('[data-course-search]');

if (root) {
  const trigger = root.querySelector('[data-search-open]');
  const moduleUrl = root.dataset.searchModule;

  let searchApiPromise = null;

  const isEditableTarget = (target) =>
    target instanceof HTMLElement &&
    Boolean(
      target.closest(
        'input, textarea, select, [contenteditable="true"]'
      )
    );

  const loadSearchApi = () => {
    if (!searchApiPromise) {
      searchApiPromise = import(moduleUrl)
        .then((module) => module.initCourseSearch(root))
        .catch((error) => {
          searchApiPromise = null;
          throw error;
        });
    }

    return searchApiPromise;
  };

  const openSearch = async () => {
    if (!trigger || !moduleUrl) return;

    trigger.setAttribute('aria-busy', 'true');

    try {
      const searchApi = await loadSearchApi();
      searchApi.open();
    } catch (error) {
      console.error('Course search failed to load:', error);
      trigger.title = '搜索组件加载失败，请刷新页面后重试。';
    } finally {
      trigger.removeAttribute('aria-busy');
    }
  };

  trigger?.addEventListener('click', () => {
    void openSearch();
  });

  document.addEventListener('keydown', (event) => {
    if (event.isComposing) return;

    const key = event.key.toLowerCase();

    const usesSearchShortcut =
      (event.metaKey || event.ctrlKey) &&
      key === 'k';

    const usesSlashShortcut =
      event.key === '/' &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey &&
      !isEditableTarget(event.target);

    if (usesSearchShortcut || usesSlashShortcut) {
      event.preventDefault();
      void openSearch();
    }
  });

  const shortcutLabel =
    root.querySelector('[data-search-shortcut-label]');

  const isApplePlatform =
    /Mac|iPhone|iPad|iPod/i.test(
      navigator.userAgentData?.platform ||
      navigator.platform ||
      navigator.userAgent
    );

  if (shortcutLabel) {
    shortcutLabel.textContent =
      isApplePlatform ? '⌘ K' : 'Ctrl K';
  }

  /*
   * 普通页面不会加载完整搜索模块。
   * 只有从搜索结果进入并带有 highlight 参数时，
   * 才提前加载高亮功能。
   */
  if (
    new URLSearchParams(window.location.search)
      .has('highlight')
  ) {
    void loadSearchApi().catch((error) => {
      console.warn(
        'Search result highlighting was skipped:',
        error
      );
    });
  }
}