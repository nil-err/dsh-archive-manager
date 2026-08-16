/**
 * dsh-archive-manager — browser half (Codex UI style).
 *
 * Implements an exact 1:1 match of the Codex Archive Manager UI inside
 * the DSH settings panel under the "Plugins" (插件) tab.
 *
 * Features:
 *   - Search input with search icon ("搜索已归档聊天")
 *   - Workspace filter dropdown ("所有项目")
 *   - Sort/view dropdown ("全部聊天" / 时间排序)
 *   - Grouping by project/workspace with folder icon, item count, and actions menu
 *   - Project-less fallback ("无项目")
 *   - Card item with title, formatted date ("2026年8月15日, 1:34"), trash icon (delete), and "取消归档" (unarchive) button
 *   - Batch operations, confirmation dialogs, toast notifications
 */

(function () {
  'use strict';

  window.__ModuleLoader__.load({
    id: '@mlgbnb/dsh-archive-manager',
    factory: function (require) {
      var module = { exports: {} };
      var exports = module.exports;

      var API_BASE = '/api/dsh-archive-manager';
      var CARD_CONTAINER_ATTR = 'data-dsh-archive-manager';
      var CSS_ID = 'dsh-archive-manager-codex-styles';

      // ---- SVG Icons ----
      var ICONS = {
        search: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" fill="currentColor"/></svg>',
        folder: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h3.172a1.5 1.5 0 0 1 1.06.44l1.328 1.328a.5.5 0 0 0 .354.146H13.5A1.5 1.5 0 0 1 15 5.414V12.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5v-9zM2.5 3a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5V5.414a.5.5 0 0 0-.5-.5H8.414a1.5 1.5 0 0 1-1.06-.44L6.026 3.146A.5.5 0 0 0 5.672 3H2.5z" fill="currentColor"/></svg>',
        trash: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" fill="currentColor"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" fill="currentColor"/></svg>',
        filter: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.5 3a.5.5 0 0 1 .5-.5h12a.5.5 0 0 1 0 1H2a.5.5 0 0 1-.5-.5zm2 4a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 0 1H4a.5.5 0 0 1-.5-.5zm3 4a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1H7a.5.5 0 0 1-.5-.5z" fill="currentColor"/></svg>',
        chevron: '<svg width="10" height="10" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.8486 5.5L11.4238 5.92383L8.69727 8.65137C8.44157 8.90706 8.21562 9.13382 8.01172 9.29785C7.79912 9.46883 7.55595 9.61756 7.25 9.66602C7.08435 9.69222 6.91565 9.69222 6.75 9.66602C6.44405 9.61756 6.20088 9.46883 5.98828 9.29785C5.78438 9.13382 5.55843 8.90706 5.30273 8.65137L2.57617 5.92383L2.15137 5.5L3 4.65137L3.42383 5.07617L6.15137 7.80273C6.42595 8.07732 6.59876 8.24849 6.74023 8.3623C6.87291 8.46904 6.92272 8.47813 6.9375 8.48047C6.97895 8.48703 7.02105 8.48703 7.0625 8.48047C7.07728 8.47813 7.12709 8.46904 7.25977 8.3623C7.40124 8.24849 7.57405 8.07732 7.84863 7.80273L10.5762 5.07617L11 4.65137L11.8486 5.5Z" fill="currentColor"/></svg>',
        check: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" fill="currentColor" stroke="currentColor" stroke-width="0.8"/></svg>',
        cardChevron: '<svg width="14" height="14" class="YyYd_a_chevron" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.8486 5.5L11.4238 5.92383L8.69727 8.65137C8.44157 8.90706 8.21562 9.13382 8.01172 9.29785C7.79912 9.46883 7.55595 9.61756 7.25 9.66602C7.08435 9.69222 6.91565 9.69222 6.75 9.66602C6.44405 9.61756 6.20088 9.46883 5.98828 9.29785C5.78438 9.13382 5.55843 8.90706 5.30273 8.65137L2.57617 5.92383L2.15137 5.5L3 4.65137L3.42383 5.07617L6.15137 7.80273C6.42595 8.07732 6.59876 8.24849 6.74023 8.3623C6.87291 8.46904 6.92272 8.47813 6.9375 8.48047C6.97895 8.48703 7.02105 8.48703 7.0625 8.48047C7.07728 8.47813 7.12709 8.46904 7.25977 8.3623C7.40124 8.24849 7.57405 8.07732 7.84863 7.80273L10.5762 5.07617L11 4.65137L11.8486 5.5Z" fill="currentColor"></path></svg>',
        close: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12.854 3.146a.5.5 0 0 0-.708 0L8 7.293 3.854 3.146a.5.5 0 0 0-.708.708L7.293 8l-4.147 4.146a.5.5 0 0 0 .708.708L8 8.707l4.146 4.147a.5.5 0 0 0 .708-.708L8.707 8l4.147-4.146a.5.5 0 0 0 0-.708z" fill="currentColor"/></svg>',
        more: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="3" cy="8" r="1.5" fill="currentColor"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/><circle cx="13" cy="8" r="1.5" fill="currentColor"/></svg>'
      };

      // ---- CSS ----
      var CSS_TEXT = [
        '[data-dsh-archive-manager] { list-style: none; }',
        '[data-dsh-archive-manager] .YyYd_a_chevron { transition: transform 0.16s ease; }',
        '[data-dsh-archive-manager] button[aria-expanded="true"] .YyYd_a_chevron { transform: rotate(180deg); }',
        '.cdx-am-container { padding: 12px 0 6px 0; display: flex; flex-direction: column; gap: 14px; box-sizing: border-box; width: 100%; }',
        '.cdx-am-container * { box-sizing: border-box; }',
        '.cdx-am-search-row { width: 100%; position: relative; box-sizing: border-box; }',
        '.cdx-am-search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--dsw-alias-label-tertiary, #86909c); pointer-events: none; }',
        '.cdx-am-search-input { width: 100%; height: 36px; padding: 0 34px 0 34px; background: var(--dsw-alias-bg-module-platform, #f5f6f7); border: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.1)); border-radius: 18px; color: var(--dsw-alias-label-primary, #0f1115); font-size: 13px; outline: none; box-sizing: border-box; transition: border-color 0.15s, background 0.15s; }',
        '.cdx-am-search-input:focus { border-color: var(--dsw-alias-brand-primary, #3b82f6); background: var(--dsw-alias-bg-base, #ffffff); }',
        '.cdx-am-search-input::placeholder { color: var(--dsw-alias-label-tertiary, #86909c); }',
        '.cdx-am-search-clear { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); width: 20px; height: 20px; border-radius: 50%; background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, 0.06)); border: none; color: var(--dsw-alias-label-tertiary, #86909c); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.12s; }',
        '.cdx-am-search-clear:hover { background: var(--dsw-alias-interactive-bg-active, rgba(0, 0, 0, 0.12)); color: var(--dsw-alias-label-primary, #0f1115); }',
        
        /* Dropdown row & custom popover */
        '.cdx-am-filter-row { display: flex; align-items: center; gap: 10px; width: 100%; box-sizing: border-box; }',
        '.cdx-am-dropdown-container { flex: 1; min-width: 0; position: relative; }',
        '.cdx-am-dropdown-btn { width: 100%; height: 34px; padding: 0 12px; background: var(--dsw-alias-bg-module-platform, #f5f6f7); border: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.08)); border-radius: 18px; color: var(--dsw-alias-label-primary, #0f1115); font-size: 13px; outline: none; cursor: pointer; display: inline-flex; align-items: center; justify-content: space-between; gap: 8px; user-select: none; box-sizing: border-box; transition: background 0.15s, border-color 0.15s; }',
        '.cdx-am-dropdown-btn:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, 0.05)); border-color: var(--dsw-alias-label-dimmed, rgba(0, 0, 0, 0.16)); }',
        '.cdx-am-dropdown-icon { color: var(--dsw-alias-label-tertiary, #86909c); display: inline-flex; align-items: center; flex-shrink: 0; }',
        '.cdx-am-dropdown-label { flex: 1; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; font-weight: 400; color: var(--dsw-alias-label-primary, inherit); }',
        '.cdx-am-dropdown-chevron { color: var(--dsw-alias-label-tertiary, #86909c); display: inline-flex; align-items: center; flex-shrink: 0; transition: transform 0.15s ease; }',
        '.cdx-am-dropdown-chevron.open { transform: rotate(180deg); }',
        
        '.cdx-am-dropdown-popover { position: absolute; left: 0; top: calc(100% + 4px); min-width: 100%; max-height: 240px; overflow-y: auto; z-index: 1000; background: var(--dsw-alias-bg-layer-2, #ffffff); border: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.1)); border-radius: 10px; padding: 4px; box-shadow: var(--dsw-shadow-lv2, 0 8px 24px rgba(0, 0, 0, 0.14)); display: none; box-sizing: border-box; }',
        '.cdx-am-dropdown-popover[data-open="true"] { display: flex; flex-direction: column; gap: 2px; animation: cdxFadeIn 0.12s ease-out; }',
        '.cdx-am-dropdown-item { width: 100%; min-height: 32px; padding: 6px 10px; border-radius: 6px; background: transparent; border: none; color: var(--dsw-alias-label-primary, #0f1115); font-size: 13px; text-align: left; cursor: pointer; display: flex; align-items: center; gap: 8px; box-sizing: border-box; transition: background 0.12s; }',
        '.cdx-am-dropdown-item:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, 0.05)); }',
        '.cdx-am-dropdown-item.selected { font-weight: 500; color: var(--dsw-alias-brand-primary, #3b82f6); }',
        '.cdx-am-dropdown-item-check { width: 14px; height: 14px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--dsw-alias-brand-primary, #3b82f6); }',
        '.cdx-am-dropdown-item-text { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',

        '.cdx-am-group { display: flex; flex-direction: column; gap: 8px; margin-top: 4px; }',
        '.cdx-am-group-header { display: flex; align-items: center; justify-content: space-between; padding: 4px 4px; color: var(--dsw-alias-label-secondary, #61666b); font-size: 13px; position: relative; }',
        '.cdx-am-btn-more { width: 28px; height: 28px; border-radius: 6px; background: transparent; border: none; color: var(--dsw-alias-label-tertiary, #86909c); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: color 0.15s, background 0.15s; }',
        '.cdx-am-btn-more:hover { color: var(--dsw-alias-label-primary, inherit); background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, 0.05)); }',
        '.cdx-am-menu-popover { position: absolute; right: 0; top: calc(100% + 4px); z-index: 100; background: var(--dsw-alias-bg-layer-2, #ffffff); border: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.1)); border-radius: 8px; padding: 4px; box-shadow: var(--dsw-shadow-lv2, 0 8px 24px rgba(0, 0, 0, 0.12)); white-space: nowrap; width: max-content; display: none; }',
        '.cdx-am-menu-popover[data-open="true"] { display: block; animation: cdxFadeIn 0.12s ease-out; }',
        '.cdx-am-menu-item { width: 100%; height: 32px; padding: 0 12px; border-radius: 4px; background: transparent; border: none; color: var(--dsw-alias-state-error-primary, #dc2626); font-size: 13px; text-align: left; cursor: pointer; display: flex; align-items: center; gap: 8px; white-space: nowrap; transition: background 0.12s; }',
        '.cdx-am-menu-item:hover { background: var(--dsw-alias-interactive-bg-hover-danger, rgba(220, 38, 38, 0.08)); color: var(--dsw-alias-state-error-primary, #dc2626); }',
        '.cdx-am-group-title { display: inline-flex; align-items: center; gap: 8px; font-weight: 500; color: var(--dsw-alias-label-primary, inherit); }',
        '.cdx-am-group-meta { display: inline-flex; align-items: center; gap: 8px; color: var(--dsw-alias-label-tertiary, #86909c); font-size: 12px; }',
        '.cdx-am-group-list { background: var(--dsw-alias-bg-layer-1, rgba(0, 0, 0, 0.02)); border: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.08)); border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; }',
        '.cdx-am-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.06)); transition: background 0.12s; gap: 12px; }',
        '.cdx-am-item:last-child { border-bottom: none; }',
        '.cdx-am-item:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, 0.04)); }',
        '.cdx-am-item-main { display: flex; flex-direction: column; gap: 4px; min-width: 0; flex: 1; }',
        '.cdx-am-item-title { color: var(--dsw-alias-label-primary, inherit); font-size: 13.5px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.4; }',
        '.cdx-am-item-date { color: var(--dsw-alias-label-tertiary, #86909c); font-size: 12px; line-height: 1.3; }',
        '.cdx-am-item-actions { display: inline-flex; align-items: center; gap: 8px; flex-shrink: 0; }',
        '.cdx-am-btn-icon { width: 32px; height: 32px; border-radius: 6px; background: transparent; border: none; color: var(--dsw-alias-label-tertiary, #86909c); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: color 0.15s, background 0.15s; }',
        '.cdx-am-btn-icon:hover { color: var(--dsw-alias-state-error-primary, #dc2626); background: var(--dsw-alias-interactive-bg-hover-danger, rgba(220, 38, 38, 0.08)); }',
        '.cdx-am-btn-unarchive { height: 28px; padding: 0 12px; border-radius: 6px; background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, 0.06)); border: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.1)); color: var(--dsw-alias-label-primary, inherit); font-size: 12px; font-weight: 500; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: all 0.15s; }',
        '.cdx-am-btn-unarchive:hover { background: var(--dsw-alias-interactive-bg-active, rgba(0, 0, 0, 0.1)); border-color: var(--dsw-alias-label-dimmed, rgba(0, 0, 0, 0.2)); }',
        '.cdx-am-empty { padding: 32px 16px; text-align: center; color: var(--dsw-alias-label-tertiary, #86909c); font-size: 13px; }',
        '.cdx-am-loading { padding: 24px; text-align: center; color: var(--dsw-alias-label-tertiary, #86909c); font-size: 13px; }',
        '.cdx-am-toast { padding: 8px 12px; border-radius: 6px; font-size: 12.5px; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between; gap: 8px; animation: cdxFadeIn 0.15s ease-out; }',
        '.cdx-am-toast-error { background: var(--dsw-alias-interactive-bg-hover-danger, rgba(239, 68, 68, 0.12)); color: var(--dsw-alias-state-error-primary, #ef4444); border: 1px solid var(--dsw-alias-state-error-secondary, rgba(239, 68, 68, 0.3)); }',
        '.cdx-am-toast-success { background: var(--dsw-alias-state-success-tertiary, rgba(34, 197, 94, 0.12)); color: var(--dsw-alias-state-success-primary, #22c55e); border: 1px solid var(--dsw-alias-state-success-secondary, rgba(34, 197, 94, 0.3)); }',
        '.cdx-am-toast-close { background: transparent; border: none; color: inherit; opacity: 0.7; cursor: pointer; padding: 2px; border-radius: 4px; display: flex; align-items: center; justify-content: center; }',
        '.cdx-am-toast-close:hover { opacity: 1; background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, 0.08)); }',
        
        /* Dark Mode Overrides */
        'body[data-ds-dark-theme] .cdx-am-search-input { background: var(--dsw-alias-bg-module-platform, #353638); border-color: var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.12)); color: var(--dsw-alias-label-primary, #f9fafb); }',
        'body[data-ds-dark-theme] .cdx-am-search-input:focus { background: var(--dsw-alias-bg-base, #151517); }',
        'body[data-ds-dark-theme] .cdx-am-dropdown-btn { background: var(--dsw-alias-bg-module-platform, #353638); border-color: var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.12)); color: var(--dsw-alias-label-primary, #f9fafb); }',
        'body[data-ds-dark-theme] .cdx-am-dropdown-btn:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.08)); border-color: var(--dsw-alias-label-dimmed, rgba(255, 255, 255, 0.22)); }',
        'body[data-ds-dark-theme] .cdx-am-dropdown-popover { background: var(--dsw-alias-bg-layer-2, #262628); border-color: var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.15)); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45); }',
        'body[data-ds-dark-theme] .cdx-am-dropdown-item { color: var(--dsw-alias-label-primary, #f9fafb); }',
        'body[data-ds-dark-theme] .cdx-am-dropdown-item:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.08)); }',
        'body[data-ds-dark-theme] .cdx-am-dropdown-item.selected { color: var(--dsw-alias-brand-primary-new-colorprimary-new-color, var(--dsw-alias-brand-primary, #60a5fa)); }',
        'body[data-ds-dark-theme] .cdx-am-dropdown-item-check { color: var(--dsw-alias-brand-primary-new-colorprimary-new-color, var(--dsw-alias-brand-primary, #60a5fa)); }',
        'body[data-ds-dark-theme] .cdx-am-menu-popover { background: var(--dsw-alias-bg-layer-2, #262628); border-color: var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.15)); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4); }',
        'body[data-ds-dark-theme] .cdx-am-btn-unarchive { background: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.08)); border-color: var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.12)); }',
        'body[data-ds-dark-theme] .cdx-am-btn-unarchive:hover { background: var(--dsw-alias-interactive-bg-active, rgba(255, 255, 255, 0.15)); border-color: var(--dsw-alias-label-dimmed, rgba(255, 255, 255, 0.25)); }',
        '@keyframes cdxFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }'
      ].join('\n');

      function injectStyles() {
        if (typeof document === 'undefined') return;
        if (document.querySelector('style[data-plugin-css="' + CSS_ID + '"]')) return;
        var tag = document.createElement('style');
        tag.dataset.plugin = 'dsh-archive-manager';
        tag.dataset.pluginCss = CSS_ID;
        tag.textContent = CSS_TEXT;
        document.head.appendChild(tag);
      }

      // ---- State ----
      var state = {
        open: false,
        loading: false,
        archives: [],
        query: '',
        selectedWorkspace: 'ALL',
        sortOrder: 'NEWEST',
        openDropdown: null, // 'sort' | 'workspace' | null
        openMenuWorkspace: null,
        error: null,
        success: null,
        busy: false
      };

      function notify() {
        render();
      }

      function escapeHtml(str) {
        if (!str) return '';
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }

      // Chinese/English formatted dates matching Codex (e.g., "2026年8月15日, 1:34")
      function formatCodexDate(ts) {
        if (!ts) return '—';
        var d = new Date(ts);
        if (isNaN(d.getTime())) return '—';
        var year = d.getFullYear();
        var month = d.getMonth() + 1;
        var day = d.getDate();
        var hours = d.getHours();
        var minutes = d.getMinutes();
        var minStr = minutes < 10 ? '0' + minutes : minutes;
        return year + '年' + month + '月' + day + '日, ' + hours + ':' + minStr;
      }

      var toastTimer = null;
      function showToast(kind, msg) {
        if (toastTimer) {
          clearTimeout(toastTimer);
          toastTimer = null;
        }
        if (kind === 'success') {
          state.success = msg;
          state.error = null;
        } else {
          state.error = msg;
          state.success = null;
        }
        notify();
        toastTimer = setTimeout(function () {
          state.success = null;
          state.error = null;
          notify();
        }, 3500);
      }

      var pollTimer = null;
      function startPolling() {
        if (pollTimer) return;
        pollTimer = setInterval(function () {
          if (state.open && document.visibilityState === 'visible' && !state.busy) {
            fetchJson(API_BASE + '/archives').then(function (data) {
              var list = Array.isArray(data.archives) ? data.archives : [];
              if (JSON.stringify(list) !== JSON.stringify(state.archives)) {
                state.archives = list;
                notify();
              }
            }).catch(function () {});
          }
        }, 1500);
      }

      function stopPolling() {
        if (pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
      }

      // API helpers
      function fetchJson(url, options) {
        return fetch(url, options).then(function (res) {
          if (!res.ok) {
            return res.text().then(function (text) {
              try {
                var j = JSON.parse(text);
                throw new Error(j.error || text);
              } catch (e) {
                throw new Error(text || res.statusText);
              }
            });
          }
          return res.json();
        });
      }

      function loadArchives() {
        state.loading = true;
        state.error = null;
        notify();

        fetchJson(API_BASE + '/archives')
          .then(function (data) {
            state.loading = false;
            state.archives = Array.isArray(data.archives) ? data.archives : [];
            notify();
          })
          .catch(function (err) {
            state.loading = false;
            state.error = '加载失败: ' + (err.message || String(err));
            notify();
          });
      }

      function unarchiveSession(sid, title) {
        if (state.busy) return;
        state.busy = true;
        state.error = null;
        state.success = null;
        notify();

        fetchJson(API_BASE + '/unarchive', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ sessionId: sid })
        })
          .then(function () {
            state.busy = false;
            showToast('success', '已恢复对话「' + (title || sid) + '」');
            loadArchives();
          })
          .catch(function (err) {
            state.busy = false;
            showToast('error', '取消归档失败: ' + (err.message || String(err)));
            notify();
          });
      }

      function deleteSession(sid, title) {
        if (state.busy) return;
        if (!confirm('确认彻底删除归档「' + (title || sid) + '」？此操作不可恢复。')) return;

        state.busy = true;
        state.error = null;
        state.success = null;
        notify();

        fetchJson(API_BASE + '/delete', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ sessionId: sid })
        })
          .then(function () {
            state.busy = false;
            showToast('success', '已删除归档');
            loadArchives();
          })
          .catch(function (err) {
            state.busy = false;
            showToast('error', '删除失败: ' + (err.message || String(err)));
            notify();
          });
      }

      function deleteWorkspaceArchives(wsTitle, sids) {
        if (state.busy || !sids || sids.length === 0) return;
        if (!confirm('确认删除「' + wsTitle + '」项目中的全部 ' + sids.length + ' 个归档对话？此操作不可恢复。')) return;

        state.busy = true;
        state.error = null;
        state.success = null;
        state.openMenuWorkspace = null;
        notify();

        fetchJson(API_BASE + '/delete', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ sessionIds: sids })
        })
          .then(function () {
            state.busy = false;
            showToast('success', '已删除「' + wsTitle + '」项目中的全部归档');
            loadArchives();
          })
          .catch(function (err) {
            state.busy = false;
            showToast('error', '删除项目归档失败: ' + (err.message || String(err)));
            notify();
          });
      }

      function renderGroupListHtml() {
        var html = '';
        var groups = getFilteredGroups();
        var groupNames = Object.keys(groups);

        if (groupNames.length === 0) {
          html += '<div class="cdx-am-empty">未找到匹配的归档对话。</div>';
        } else {
          for (var g = 0; g < groupNames.length; g++) {
            var gTitle = groupNames[g];
            var items = groups[gTitle];
            
            // Sort items in group
            items.sort(function (a, b) {
              var tA = a.createdAt || 0;
              var tB = b.createdAt || 0;
              return state.sortOrder === 'OLDEST' ? tA - tB : tB - tA;
            });

            var sidsInGroup = items.map(function(x) { return x.sessionId; });
            var isMenuOpen = state.openMenuWorkspace === gTitle;

            html += '<div class="cdx-am-group">';
            html += '<div class="cdx-am-group-header">';
            html += '<div class="cdx-am-group-title">' + ICONS.folder + ' <span>' + escapeHtml(gTitle) + '</span></div>';
            html += '<div class="cdx-am-group-meta" style="position: relative;">';
            html += '<span>' + items.length + ' 个聊天</span>';
            html += '<button type="button" class="cdx-am-btn-more" data-am-more-btn="' + escapeHtml(gTitle) + '" title="项目操作">' + ICONS.more + '</button>';
            html += '<div class="cdx-am-menu-popover" data-open="' + (isMenuOpen ? 'true' : 'false') + '">';
            html += '<button type="button" class="cdx-am-menu-item" data-am-del-ws="' + escapeHtml(gTitle) + '" data-sids="' + escapeHtml(JSON.stringify(sidsInGroup)) + '">';
            html += ICONS.trash + ' <span>删除项目中的全部内容</span>';
            html += '</button>';
            html += '</div>'; // End cdx-am-menu-popover
            html += '</div>'; // End cdx-am-group-meta
            html += '</div>'; // End cdx-am-group-header

            html += '<div class="cdx-am-group-list">';
            for (var it = 0; it < items.length; it++) {
              var item = items[it];
              html += '<div class="cdx-am-item">';
              html += '<div class="cdx-am-item-main">';
              html += '<div class="cdx-am-item-title" title="' + escapeHtml(item.title) + '">' + escapeHtml(item.title) + '</div>';
              html += '<div class="cdx-am-item-date">' + formatCodexDate(item.createdAt) + '</div>';
              html += '</div>';

              html += '<div class="cdx-am-item-actions">';
              html += '<button type="button" class="cdx-am-btn-icon" data-am-del="' + escapeHtml(item.sessionId) + '" data-title="' + escapeHtml(item.title) + '" title="删除归档">' + ICONS.trash + '</button>';
              html += '<button type="button" class="cdx-am-btn-unarchive" data-am-unarchive="' + escapeHtml(item.sessionId) + '" data-title="' + escapeHtml(item.title) + '">取消归档</button>';
              html += '</div>';

              html += '</div>'; // End item
            }
            html += '</div>'; // End group-list
            html += '</div>'; // End group
          }
        }
        return html;
      }

      // Group archives by workspace
      function getFilteredGroups() {
        var q = state.query.trim().toLowerCase();
        var wsFilter = state.selectedWorkspace;

        var list = state.archives.filter(function (item) {
          if (wsFilter !== 'ALL') {
            var currentWs = item.workspaceTitle || '无项目';
            if (currentWs !== wsFilter) return false;
          }
          if (q) {
            var matchTitle = (item.title || '').toLowerCase().includes(q);
            var matchWs = (item.workspaceTitle || '').toLowerCase().includes(q);
            if (!matchTitle && !matchWs) return false;
          }
          return true;
        });

        // Grouping map
        var groups = {};
        for (var i = 0; i < list.length; i++) {
          var a = list[i];
          var gName = a.workspaceTitle || '无项目';
          if (!groups[gName]) {
            groups[gName] = [];
          }
          groups[gName].push(a);
        }

        return groups;
      }

      // All unique workspaces for the dropdown filter
      function getUniqueWorkspaces() {
        var set = new Set();
        for (var i = 0; i < state.archives.length; i++) {
          var title = state.archives[i].workspaceTitle || '无项目';
          set.add(title);
        }
        return Array.from(set);
      }

      // ---- Render ----
      function renderCard(container) {
        injectStyles();

        var html = '';
        html += '<button type="button" class="YyYd_a_header" data-am-toggle aria-expanded="' + (state.open ? 'true' : 'false') + '" aria-label="展开设置: 归档管理">';
        html += '<span class="YyYd_a_headText">';
        html += '<span class="YyYd_a_name">归档管理</span>';
        html += '<span class="YyYd_a_description">查看、恢复或删除已归档的会话。</span>';
        html += '</span>';
        html += ICONS.cardChevron;
        html += '</button>';

        if (state.open) {
          html += '<div class="YyYd_a_body" style="padding: 12px 14px 16px 14px;">';
          html += '<div class="cdx-am-container">';

          // Messages with dismiss button
          if (state.error) {
            html += '<div class="cdx-am-toast cdx-am-toast-error"><span>' + escapeHtml(state.error) + '</span><button type="button" class="cdx-am-toast-close" data-am-toast-close>' + ICONS.close + '</button></div>';
          }
          if (state.success) {
            html += '<div class="cdx-am-toast cdx-am-toast-success"><span>' + escapeHtml(state.success) + '</span><button type="button" class="cdx-am-toast-close" data-am-toast-close>' + ICONS.close + '</button></div>';
          }

          // Row 1: Search box (full row with clear button)
          html += '<div class="cdx-am-search-row">';
          html += '<span class="cdx-am-search-icon">' + ICONS.search + '</span>';
          html += '<input type="text" class="cdx-am-search-input" data-am-search placeholder="搜索已归档聊天" value="' + escapeHtml(state.query) + '">';
          if (state.query) {
            html += '<button type="button" class="cdx-am-search-clear" data-am-search-clear title="清空搜索">' + ICONS.close + '</button>';
          }
          html += '</div>';

          // Row 2: Two custom dropdown filters sharing one row
          html += '<div class="cdx-am-filter-row">';

          // Sort dropdown
          var sortLabel = state.sortOrder === 'OLDEST' ? '最早优先' : '全部聊天';
          var isSortOpen = state.openDropdown === 'sort';
          html += '<div class="cdx-am-dropdown-container">';
          html += '<button type="button" class="cdx-am-dropdown-btn" data-am-dropdown-toggle="sort" aria-expanded="' + (isSortOpen ? 'true' : 'false') + '">';
          html += '<span class="cdx-am-dropdown-icon">' + ICONS.filter + '</span>';
          html += '<span class="cdx-am-dropdown-label">' + escapeHtml(sortLabel) + '</span>';
          html += '<span class="cdx-am-dropdown-chevron' + (isSortOpen ? ' open' : '') + '">' + ICONS.chevron + '</span>';
          html += '</button>';
          html += '<div class="cdx-am-dropdown-popover" data-open="' + (isSortOpen ? 'true' : 'false') + '">';
          html += '<button type="button" class="cdx-am-dropdown-item' + (state.sortOrder === 'NEWEST' ? ' selected' : '') + '" data-am-select-sort="NEWEST">';
          html += '<span class="cdx-am-dropdown-item-check">' + (state.sortOrder === 'NEWEST' ? ICONS.check : '') + '</span>';
          html += '<span class="cdx-am-dropdown-item-text">全部聊天</span>';
          html += '</button>';
          html += '<button type="button" class="cdx-am-dropdown-item' + (state.sortOrder === 'OLDEST' ? ' selected' : '') + '" data-am-select-sort="OLDEST">';
          html += '<span class="cdx-am-dropdown-item-check">' + (state.sortOrder === 'OLDEST' ? ICONS.check : '') + '</span>';
          html += '<span class="cdx-am-dropdown-item-text">最早优先</span>';
          html += '</button>';
          html += '</div>';
          html += '</div>';

          // Workspace dropdown
          var wsList = getUniqueWorkspaces();
          var wsLabel = state.selectedWorkspace === 'ALL' ? '所有项目' : state.selectedWorkspace;
          var isWsOpen = state.openDropdown === 'workspace';
          html += '<div class="cdx-am-dropdown-container">';
          html += '<button type="button" class="cdx-am-dropdown-btn" data-am-dropdown-toggle="workspace" aria-expanded="' + (isWsOpen ? 'true' : 'false') + '">';
          html += '<span class="cdx-am-dropdown-icon">' + ICONS.folder + '</span>';
          html += '<span class="cdx-am-dropdown-label">' + escapeHtml(wsLabel) + '</span>';
          html += '<span class="cdx-am-dropdown-chevron' + (isWsOpen ? ' open' : '') + '">' + ICONS.chevron + '</span>';
          html += '</button>';
          html += '<div class="cdx-am-dropdown-popover" data-open="' + (isWsOpen ? 'true' : 'false') + '">';
          html += '<button type="button" class="cdx-am-dropdown-item' + (state.selectedWorkspace === 'ALL' ? ' selected' : '') + '" data-am-select-ws="ALL">';
          html += '<span class="cdx-am-dropdown-item-check">' + (state.selectedWorkspace === 'ALL' ? ICONS.check : '') + '</span>';
          html += '<span class="cdx-am-dropdown-item-text">所有项目</span>';
          html += '</button>';
          for (var w = 0; w < wsList.length; w++) {
            var wsName = wsList[w];
            var isSel = state.selectedWorkspace === wsName;
            html += '<button type="button" class="cdx-am-dropdown-item' + (isSel ? ' selected' : '') + '" data-am-select-ws="' + escapeHtml(wsName) + '">';
            html += '<span class="cdx-am-dropdown-item-check">' + (isSel ? ICONS.check : '') + '</span>';
            html += '<span class="cdx-am-dropdown-item-text">' + escapeHtml(wsName) + '</span>';
            html += '</button>';
          }
          html += '</div>';
          html += '</div>';

          html += '</div>'; // End filter-row

          // Content body
          if (state.loading) {
            html += '<div class="cdx-am-loading">加载已归档对话中…</div>';
          } else if (state.archives.length === 0) {
            html += '<div class="cdx-am-empty">没有已归档的对话。</div>';
          } else {
            html += '<div class="cdx-am-list-slot">';
            html += renderGroupListHtml();
            html += '</div>';
          }

          html += '</div>'; // End cdx-am-container
          html += '</div>'; // End YyYd_a_body
        }

        if (container.innerHTML === html) return;
        container.innerHTML = html;
        bindEvents(container);
      }

      function bindListEvents(container) {
        // Unarchive buttons
        var unarchiveBtns = container.querySelectorAll('[data-am-unarchive]');
        unarchiveBtns.forEach(function (btn) {
          btn.onclick = function () {
            var sid = btn.getAttribute('data-am-unarchive');
            var title = btn.getAttribute('data-title');
            unarchiveSession(sid, title);
          };
        });

        // Delete buttons
        var delBtns = container.querySelectorAll('[data-am-del]');
        delBtns.forEach(function (btn) {
          btn.onclick = function () {
            var sid = btn.getAttribute('data-am-del');
            var title = btn.getAttribute('data-title');
            deleteSession(sid, title);
          };
        });

        // More actions button toggle
        var moreBtns = container.querySelectorAll('[data-am-more-btn]');
        moreBtns.forEach(function (btn) {
          btn.onclick = function (e) {
            e.stopPropagation();
            var wsName = btn.getAttribute('data-am-more-btn');
            state.openMenuWorkspace = state.openMenuWorkspace === wsName ? null : wsName;
            state.openDropdown = null;
            notify();
          };
        });

        // Delete all in workspace button
        var delWsBtns = container.querySelectorAll('[data-am-del-ws]');
        delWsBtns.forEach(function (btn) {
          btn.onclick = function (e) {
            e.stopPropagation();
            var wsName = btn.getAttribute('data-am-del-ws');
            try {
              var sids = JSON.parse(btn.getAttribute('data-sids') || '[]');
              deleteWorkspaceArchives(wsName, sids);
            } catch (err) {
              console.error(err);
            }
          };
        });
      }

      function bindEvents(container) {
        var toggle = container.querySelector('[data-am-toggle]');
        if (toggle) {
          toggle.addEventListener('click', function () {
            state.open = !state.open;
            if (state.open) {
              loadArchives();
              startPolling();
            } else {
              stopPolling();
            }
            notify();
          });
        }

        var searchInput = container.querySelector('[data-am-search]');
        var searchRow = container.querySelector('.cdx-am-search-row');
        var listSlot = container.querySelector('.cdx-am-list-slot');

        function updateListOnly() {
          if (!listSlot) {
            notify();
            return;
          }
          listSlot.innerHTML = renderGroupListHtml();
          bindListEvents(container);

          // Update clear button visibility
          var clearBtn = searchRow ? searchRow.querySelector('[data-am-search-clear]') : null;
          if (state.query && !clearBtn && searchRow) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'cdx-am-search-clear';
            btn.setAttribute('data-am-search-clear', '');
            btn.title = '清空搜索';
            btn.innerHTML = ICONS.close;
            btn.onclick = function() {
              state.query = '';
              if (searchInput) searchInput.value = '';
              updateListOnly();
              if (searchInput) searchInput.focus();
            };
            searchRow.appendChild(btn);
          } else if (!state.query && clearBtn) {
            clearBtn.remove();
          }
        }

        if (searchInput) {
          var isComposing = false;
          searchInput.addEventListener('compositionstart', function () {
            isComposing = true;
          });
          searchInput.addEventListener('compositionend', function (e) {
            isComposing = false;
            state.query = e.target.value;
            updateListOnly();
          });
          searchInput.addEventListener('input', function (e) {
            if (isComposing) return;
            state.query = e.target.value;
            updateListOnly();
          });
        }

        var clearBtn = container.querySelector('[data-am-search-clear]');
        if (clearBtn) {
          clearBtn.onclick = function () {
            state.query = '';
            if (searchInput) searchInput.value = '';
            updateListOnly();
            if (searchInput) searchInput.focus();
          };
        }

        var toastClose = container.querySelector('[data-am-toast-close]');
        if (toastClose) {
          toastClose.addEventListener('click', function () {
            state.error = null;
            state.success = null;
            if (toastTimer) {
              clearTimeout(toastTimer);
              toastTimer = null;
            }
            notify();
          });
        }

        // Custom dropdown toggles
        var dropdownToggles = container.querySelectorAll('[data-am-dropdown-toggle]');
        dropdownToggles.forEach(function (btn) {
          btn.onclick = function (e) {
            e.stopPropagation();
            var which = btn.getAttribute('data-am-dropdown-toggle');
            state.openDropdown = state.openDropdown === which ? null : which;
            state.openMenuWorkspace = null;
            notify();
          };
        });

        // Dropdown item selection: Sort
        var sortItems = container.querySelectorAll('[data-am-select-sort]');
        sortItems.forEach(function (btn) {
          btn.onclick = function (e) {
            e.stopPropagation();
            var val = btn.getAttribute('data-am-select-sort');
            state.sortOrder = val;
            state.openDropdown = null;
            notify();
          };
        });

        // Dropdown item selection: Workspace
        var wsItems = container.querySelectorAll('[data-am-select-ws]');
        wsItems.forEach(function (btn) {
          btn.onclick = function (e) {
            e.stopPropagation();
            var val = btn.getAttribute('data-am-select-ws');
            state.selectedWorkspace = val;
            state.openDropdown = null;
            notify();
          };
        });

        bindListEvents(container);

        // Global click to dismiss menu & dropdowns
        var onDocClick = function (e) {
          var closeDropdown = false;
          var closeMenu = false;

          if (!e.target.closest('[data-am-dropdown-toggle]') && !e.target.closest('.cdx-am-dropdown-popover')) {
            if (state.openDropdown) {
              state.openDropdown = null;
              closeDropdown = true;
            }
          }
          if (!e.target.closest('[data-am-more-btn]') && !e.target.closest('.cdx-am-menu-popover')) {
            if (state.openMenuWorkspace) {
              state.openMenuWorkspace = null;
              closeMenu = true;
            }
          }
          if (closeDropdown || closeMenu) {
            notify();
          }
        };
        document.removeEventListener('click', container._amDocClick || function(){});
        container._amDocClick = onDocClick;
        document.addEventListener('click', onDocClick);
      }

      // Check whether current active tab is "Plugins" (插件)
      function isPluginsTabActive() {
        var navCell = document.querySelector('button.VOzbGW_navCell[aria-current="true"], button.VOzbGW_navCell.VOzbGW_active');
        if (navCell && navCell.textContent.includes('插件')) return true;
        var tabTitle = document.querySelector('h2.pbvGtq_heading');
        if (tabTitle && tabTitle.textContent.includes('插件')) return true;
        var tabNav = Array.from(document.querySelectorAll('button.VOzbGW_navCell')).find(function (b) {
          return b.textContent.includes('插件') && (b.getAttribute('aria-current') === 'true' || b.classList.contains('VOzbGW_active'));
        });
        return Boolean(tabNav);
      }

      // Find insertion point inside the Plugins tab's card list
      function findCardHost() {
        if (!isPluginsTabActive()) return null;
        var ul = document.querySelector('ul.pbvGtq_cards, ul[class*="cards"]');
        if (ul && ul.isConnected) return ul;
        var panel = document.querySelector('.pbvGtq_section, [data-slot="settings.plugins.tab"]');
        if (panel && panel.isConnected) return panel;
        return null;
      }

      function ensureCard() {
        var host = findCardHost();
        var existing = document.querySelector('[' + CARD_CONTAINER_ATTR + ']');

        if (!host) {
          if (existing) existing.remove();
          return null;
        }

        if (existing && existing.isConnected) {
          if (existing.parentElement !== host) {
            host.appendChild(existing);
          }
          return existing;
        }

        var isUl = host.tagName === 'UL';
        var card = document.createElement(isUl ? 'li' : 'div');
        card.className = 'YyYd_a_card';
        card.setAttribute(CARD_CONTAINER_ATTR, '');
        host.appendChild(card);
        return card;
      }

      function render() {
        var container = ensureCard();
        if (!container) return;
        renderCard(container);
      }

      var observer = new MutationObserver(function (mutations) {
        var card = document.querySelector('[' + CARD_CONTAINER_ATTR + ']');
        var externalMutation = false;
        for (var i = 0; i < mutations.length; i++) {
          var m = mutations[i];
          if (!card || (!card.contains(m.target) && m.target !== card)) {
            externalMutation = true;
            break;
          }
        }
        if (!externalMutation) return;
        render();
      });

      function apply(ctx) {
        injectStyles();
        observer.observe(document.body, { childList: true, subtree: true });
        setTimeout(render, 300);

        if (ctx && typeof ctx.effect === 'function') {
          ctx.effect(function () {
            return function () {
              stopPolling();
              observer.disconnect();
              var existing = document.querySelector('[' + CARD_CONTAINER_ATTR + ']');
              if (existing) existing.remove();
              var styleTag = document.querySelector('style[data-plugin-css="' + CSS_ID + '"]');
              if (styleTag) styleTag.remove();
            };
          }, 'dsh-archive-manager: ui mount');
        }
      }

      exports.apply = apply;
      exports.default = { apply: apply };
      return module.exports;
    }
  });
})();
