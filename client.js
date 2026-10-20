/**
 * @local/effort-slider —— 推理等级滑动变阻器
 *
 * 作用：整体替换 DSH 官方模型选择器（conversation.input.model slot），
 *      把「推理等级」从按钮列表改成可拖动滑块，视觉参考 Codex。
 *
 * 结构：
 *   第一层  ─ 模型 / 推理等级 两个入口行
 *   第二层  ─ 点「模型」看模型列表；点「推理等级」看滑块
 *
 * 数据：
 *   ctx.modelDirectories.directoryFor(sessionId)  → ModelDirectory
 *   directory.store.getSnapshot() / subscribe()    → 状态
 *   directory.select({provider, model, reasoningEffort})  → 提交
 *
 * 关键：ctx.inject 必须含 'remote' 和 'remote.session'，
 *      否则 directoryFor() 报 cannot get property "remote.session" without inject。
 *
 * 可调参数见下方 `const lw`（卡片宽度）、`maxH`（最大高度）、
 * `GAP_V`（垂直间距），以及 CSS 里的 .ms-track / thumb 尺寸。
 *
 * 详见同目录 README.md
 */
window.__ModuleLoader__.load({
  id: '@local/effort-slider',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const useSyncExternalStore = React.useSyncExternalStore;
    const useState = React.useState;
    const useEffect = React.useEffect;
    const useRef = React.useRef;

    const CSS = [
      '.ms-root{position:relative;display:inline-flex;min-width:0}',
      '.ms-trigger{display:flex;align-items:center;gap:4px;height:28px;padding:0 6px 0 8px;',
      '  border:none;background:0 0;outline:none;cursor:pointer;border-radius:var(--dsw-radius-sm);',
      '  color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px;font-weight:400;min-width:0}',
      '.ms-trigger:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}',
      '.ms-trigger:disabled{color:var(--dsw-alias-label-dimmed);cursor:default}',
      '.ms-trigger-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}',
      '.ms-trigger-effort{color:var(--dsw-alias-label-caption);flex-shrink:1000;overflow:hidden;',
      '  text-overflow:ellipsis;white-space:nowrap}',
      '.ms-chevron{color:var(--dsw-alias-label-caption);flex:none;transition:transform .12s}',
      '.ms-root[data-open="true"] .ms-chevron{transform:rotate(180deg)}',
      '.ms-menu{position:fixed;z-index:1100;height:auto;box-sizing:border-box;',
      '  display:flex;flex-direction:column;overflow:hidden;',
      '  border-radius:var(--dsw-radius-md);padding:4px;',
      '  background:var(--dsw-alias-bg-elevated,#ffffff);',
      '  color:var(--dsw-alias-label-primary);',
      '  box-shadow:var(--dsw-elevation-prominent,0 8px 24px rgba(0,0,0,.18));',
      '  --dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);',
      '  --dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2)}',
      '.ms-list{min-height:0;overflow-y:auto}',
      '.ms-group{padding:8px 7px 4px;font-size:11px;line-height:15px;font-weight:500;',
      '  color:var(--dsw-alias-label-tertiary);letter-spacing:0;text-transform:none}',
      '.ms-item{box-sizing:border-box;display:flex;align-items:center;gap:6px;width:auto;min-width:100%;',
      '  min-height:34px;padding:5px 7px;border:none;background:0 0;',
      '  border-radius:var(--dsw-radius-md);cursor:pointer;color:inherit;',
      '  font-size:13px;line-height:18px;font-weight:400;text-align:left;outline:none}',
      '.ms-item:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}',
      '.ms-item:disabled{color:var(--dsw-alias-label-dimmed);cursor:default}',
      '.ms-item-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.ms-item-check{flex:0 0 14px;display:grid;place-items:center;color:var(--dsw-alias-label-primary)}',
      '.ms-item-check svg{width:14px;height:14px}',
      '.ms-item-check svg{width:14px;height:14px}',
      '.ms-empty{padding:12px 8px;color:var(--dsw-alias-label-tertiary);font-size:12px}',
      '.ms-debug{font-size:9px;color:#f60;padding:6px 10px;font-family:monospace;max-width:340px;overflow:hidden}',
      '.ms-pane{display:flex;flex-direction:column;height:auto;min-height:0;overflow:hidden}',
      '.ms-pane-body{min-height:0;overflow-y:auto;overflow-x:hidden}',
      '.ms-pane-head{display:flex;align-items:center;gap:4px;padding:4px 4px 6px}',
      '.ms-back{display:grid;place-items:center;width:22px;height:22px;border:none;background:0 0;',
      '  cursor:pointer;border-radius:var(--dsw-radius-sm);color:var(--dsw-alias-label-secondary);outline:none}',
      '.ms-back:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.ms-pane-title{font-size:11px;line-height:14px;color:var(--dsw-alias-label-caption)}',
      '.ms-row{box-sizing:border-box;display:flex;align-items:center;gap:6px;width:auto;min-width:100%;',
      '  height:34px;padding:0 8px;border:none;background:0 0;',
      '  border-radius:var(--dsw-radius-md);cursor:pointer;',
      '  color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px;text-align:left;outline:none}',
      '.ms-row:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}',
      '.ms-row:disabled{color:var(--dsw-alias-label-dimmed);cursor:default}',
      '.ms-row-label{flex:none;font-weight:400}',
      '.ms-row-value{flex:auto;min-width:0;text-align:right;color:var(--dsw-alias-label-tertiary);',
      '  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.ms-row-arrow{flex:0 0 12px;width:12px;height:12px;display:grid;place-items:center;',
      '  color:var(--dsw-alias-menu-icon)}',
      '.ms-effort{padding:6px 10px 8px;display:flex;flex-direction:column;gap:8px}',
      '.ms-effort-head{display:flex;align-items:baseline;justify-content:space-between}',
      '.ms-effort-title{font-size:11px;line-height:14px;color:var(--dsw-alias-label-caption)}',
      '.ms-effort-value{font-size:12px;line-height:14px;font-weight:600;',
      '  color:var(--dsw-alias-state-business-primary,#7b6cf6)}',
      '.ms-track-wrap{position:relative;display:flex;align-items:center;height:32px}',
      '.ms-track{position:absolute;left:0;right:0;height:12px;border-radius:6px;',
      '  background:var(--dsw-alias-border-l1,rgba(140,140,165,.30));pointer-events:none}',
      '.ms-fill{position:absolute;left:0;top:50%;transform:translateY(-50%);height:12px;border-radius:6px;',
      '  pointer-events:none;background:linear-gradient(90deg,#6b8cff 0%,#9d7bf5 55%,#d18ae8 100%);',
      '  transition:box-shadow .15s}',
      '.ms-track-wrap:hover .ms-fill{box-shadow:0 0 8px rgba(157,123,245,.45)}',
      '.ms-range{-webkit-appearance:none;appearance:none;position:absolute;left:0;right:0;width:100%;',
      '  height:32px;margin:0;padding:0;background:transparent;cursor:pointer;outline:none;z-index:2}',
      '.ms-range::-webkit-slider-runnable-track{height:32px;background:transparent}',
      '.ms-range::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:24px;height:24px;',
      '  border-radius:50%;background:#fff;border:none;',
      '  box-shadow:0 1px 3px rgba(0,0,0,.32),0 0 0 2px rgba(255,255,255,.92);',
      '  transition:box-shadow .15s,transform .12s}',
      '.ms-track-wrap:hover .ms-range::-webkit-slider-thumb{',
      '  box-shadow:0 2px 7px rgba(0,0,0,.38),0 0 0 2px #fff;transform:scale(1.08)}',
      '.ms-range::-moz-range-track{height:22px;background:transparent}',
      '.ms-range::-moz-range-thumb{width:24px;height:24px;border-radius:50%;background:#fff;border:none;',
      '  box-shadow:0 1px 3px rgba(0,0,0,.32)}',
      '.ms-range:disabled{opacity:.45;cursor:default}',
      '.ms-effort-ticks{display:flex;justify-content:space-between;padding:0 2px;margin-top:-2px}',
      '.ms-tick{flex:1;text-align:center;font-size:10px;line-height:13px;',
      '  color:var(--dsw-alias-label-caption);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.ms-tick[data-active="true"]{color:var(--dsw-alias-state-business-primary,#7b6cf6);font-weight:600}',
    ].join('\n');

    let directoriesService = null;

    function IcoCheck() {
      return h('svg', { viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' },
        h('path', { d: 'M3 8.5l3.2 3.2L13 5', stroke: 'currentColor', strokeWidth: 1.6,
          strokeLinecap: 'round', strokeLinejoin: 'round' }));
    }
    function IcoChevron() {
      return h('svg', { className: 'ms-chevron', viewBox: '0 0 16 16', width: 12, height: 12,
        fill: 'none', 'aria-hidden': 'true' },
        h('path', { d: 'M4 6l4 4 4-4', stroke: 'currentColor', strokeWidth: 1.5,
          strokeLinecap: 'round', strokeLinejoin: 'round' }));
    }
    function IcoLeft() {
      return h('svg', { viewBox: '0 0 16 16', width: 14, height: 14, fill: 'none', 'aria-hidden': 'true' },
        h('path', { d: 'M10 4l-4 4 4 4', stroke: 'currentColor', strokeWidth: 1.6,
          strokeLinecap: 'round', strokeLinejoin: 'round' }));
    }
    function IcoRight() {
      return h('svg', { viewBox: '0 0 16 16', width: 14, height: 14, fill: 'none', 'aria-hidden': 'true' },
        h('path', { d: 'M6 4l4 4-4 4', stroke: 'currentColor', strokeWidth: 1.5,
          strokeLinecap: 'round', strokeLinejoin: 'round' }));
    }

    function ModelPicker(props) {
      const sessionId = props.sessionId;
      const locked = props.locked;
      const [open, setOpen] = useState(false);
      const [pane, setPane] = useState('root');
      const [dragPct, setDragPct] = useState(null);
      const [menuPos, setMenuPos] = useState(null);
      const rootRef = useRef(null);
      const menuRef = useRef(null);
      const dirErrRef = useRef('');

      const directory = React.useMemo(function () {
        dirErrRef.current = '';
        if (!directoriesService) { dirErrRef.current = 'svc=null'; return null; }
        if (!sessionId) { dirErrRef.current = 'sid=null'; return null; }
        try {
          const d = directoriesService.directoryFor(sessionId);
          if (!d) dirErrRef.current = 'ret=null';
          return d || null;
        } catch (e) {
          dirErrRef.current = 'ERR:' + (e && e.message ? e.message.slice(0, 50) : 'unknown');
          return null;
        }
      }, [sessionId]);

      useEffect(function () {
        if (!directory) return;
        try { Promise.resolve(directory.load()).catch(function () {}); } catch (e) {}
      }, [directory]);

      const store = directory && directory.store ? directory.store : null;
      const subscribe = React.useCallback(function (fn) {
        try {
          if (store && typeof store.subscribe === 'function') {
            const un = store.subscribe(fn);
            return typeof un === 'function' ? un : function () {};
          }
        } catch (e) {}
        return function () {};
      }, [store]);
      const getSnapshot = React.useCallback(function () {
        try { if (store && typeof store.getSnapshot === 'function') return store.getSnapshot(); } catch (e) {}
        return null;
      }, [store]);

      const snap = useSyncExternalStore(subscribe, getSnapshot);

      useEffect(function () {
        if (!open) return undefined;
        function onDown(ev) {
          if (rootRef.current && rootRef.current.contains(ev.target)) return;
          if (menuRef.current && menuRef.current.contains(ev.target)) return;
          setOpen(false);
        }
        function onKey(ev) {
          if (ev.key !== 'Escape') return;
          setPane(function (cur) {
            if (cur !== 'root') return 'root';
            setOpen(false);
            return cur;
          });
        }
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return function () {
          document.removeEventListener('mousedown', onDown);
          document.removeEventListener('keydown', onKey);
        };
      }, [open]);

      useEffect(function () {
        if (!open) { setMenuPos(null); return undefined; }
        let alive = true;
        const timers = [];

        function measure() {
          if (!alive) return;
          const root = rootRef.current;
          const menu = menuRef.current;
          const rect = root ? root.getBoundingClientRect() : null;

          const lw = 260;   // 卡片宽度（改这里调宽窄）
          const lh = menu ? (menu.offsetHeight || 160) : 160;

          let x, y;
          if (rect) {
            // 官方：右边缘对齐按钮右边缘，向上 8px
            x = rect.right - lw;
            y = rect.top - 8 - lh;
          } else {
            x = 100; y = 100;
          }

          const m = 8;
          if (x < m) x = m;
          if (x + lw > window.innerWidth - m) x = Math.max(m, window.innerWidth - lw - m);
          if (y < m) y = m;
          if (y + lh > window.innerHeight - m) y = Math.max(m, window.innerHeight - lh - m);

          const maxH = Math.min(300, window.innerHeight - m * 2);   // 卡片最大高度，超出内部滚动
          setMenuPos(function (prev) {
            if (prev && Math.abs(prev.left - x) < .5 && Math.abs(prev.top - y) < .5 &&
                prev.availH === maxH) return prev;
            return { left: x, top: y, width: lw, availH: maxH };
          });
        }

        [0, 16, 50, 120].forEach(function (ms) { timers.push(setTimeout(measure, ms)); });
        window.addEventListener('resize', measure);

        return function () {
          alive = false;
          timers.forEach(clearTimeout);
          window.removeEventListener('resize', measure);
        };
      }, [open, pane]);

      if (!snap) {
        return h('div', { className: 'ms-root' },
          h('style', null, CSS),
          h('span', { className: 'ms-debug' }, 'MS:' + (dirErrRef.current || 'loading')));
      }

      const current = snap.current;
      const groups = snap.groups || [];
      if (!current) {
        return h('div', { className: 'ms-root' },
          h('style', null, CSS),
          h('span', { className: 'ms-debug' }, 'MS:no current (groups=' + groups.length + ')'));
      }

      let efforts = [];
      for (let gi = 0; gi < groups.length; gi++) {
        const g = groups[gi];
        if (g.id !== current.provider) continue;
        const models = g.models || [];
        for (let mi = 0; mi < models.length; mi++) {
          const m = models[mi];
          if (m.id !== current.model) continue;
          if (m.reasoning && Array.isArray(m.reasoning.efforts)) efforts = m.reasoning.efforts;
        }
      }

      const currentEffort = current.reasoningEffort;
      let curIdx = efforts.findIndex(function (e) { return e.id === currentEffort; });
      const hasEffort = efforts.length > 0;
      const effortLabel = hasEffort
        ? ((efforts[curIdx] || {}).name || (curIdx < 0 ? '' : String(currentEffort)))
        : '';

      let modelName = current.model;
      for (let gi = 0; gi < groups.length; gi++) {
        const g = groups[gi];
        if (g.id !== current.provider) continue;
        const models = g.models || [];
        for (let mi = 0; mi < models.length; mi++) {
          if (models[mi].id === current.model) modelName = models[mi].name || models[mi].id;
        }
      }

      const busy = snap.status === 'selecting' || !!locked;

      const chooseModel = function (providerId, modelId) {
        if (!directory) return;
        let model = null;
        for (let gi = 0; gi < groups.length; gi++) {
          const g = groups[gi];
          if (g.id !== providerId) continue;
          const models = g.models || [];
          for (let mi = 0; mi < models.length; mi++) {
            if (models[mi].id === modelId) model = models[mi];
          }
        }
        const sel = { provider: providerId, model: modelId };
        if (model && model.reasoning && model.reasoning.defaultEffort !== undefined) {
          sel.reasoningEffort = model.reasoning.defaultEffort;
        }
        try { Promise.resolve(directory.select(sel)).catch(function () {}); } catch (e) {}
      };

      const commitEffort = function (pct) {
        if (!directory || efforts.length === 0) return;
        const maxIdx = Math.max(1, efforts.length - 1);
        const idx = Math.round((pct / 100) * maxIdx);
        const target = efforts[idx];
        if (!target || target.id === currentEffort) return;
        try {
          Promise.resolve(directory.select({
            provider: current.provider, model: current.model, reasoningEffort: target.id,
          })).catch(function () {});
        } catch (e) {}
      };

      const maxIdx = Math.max(1, efforts.length - 1);
      const basePct = curIdx >= 0 ? (curIdx / maxIdx) * 100 : 0;
      const shownPct = dragPct !== null ? dragPct : basePct;
      const shownIdx = Math.round((shownPct / 100) * maxIdx);
      const shownEffortLabel = hasEffort ? ((efforts[shownIdx] || {}).name || effortLabel) : '';

      const trigger = h('button', {
        type: 'button',
        className: 'ms-trigger',
        disabled: busy,
        'aria-haspopup': 'menu',
        'aria-expanded': open ? 'true' : 'false',
        onClick: function () {
          setOpen(function (v) {
            if (!v) { setPane('root'); setDragPct(null); }
            return !v;
          });
        },
      },
        h('span', { className: 'ms-trigger-name' }, modelName),
        effortLabel ? h('span', { className: 'ms-trigger-effort' }, effortLabel) : null,
        h(IcoChevron)
      );

      let menu = null;
      if (open) {
        const pos = menuPos || { left: -9999, top: -9999, width: 280, availH: 300 };
        // ===== 子页：模型列表 =====
        const modelPaneBlocks = [];
        for (let gi = 0; gi < groups.length; gi++) {
          const g = groups[gi];
          const models = g.models || [];
          if (models.length === 0) continue;
          modelPaneBlocks.push(h('div', { className: 'ms-group', key: 'g-' + g.id }, g.name || g.id));
          for (let mi = 0; mi < models.length; mi++) {
            const m = models[mi];
            const selected = current.provider === g.id && current.model === m.id;
            modelPaneBlocks.push(h('button', {
              type: 'button', key: 'm-' + g.id + '-' + m.id,
              className: 'ms-item', disabled: busy,
              role: 'menuitemradio',
              'aria-checked': selected ? 'true' : 'false',
              onClick: (function (pid, mid) {
                return function () { chooseModel(pid, mid); };
              })(g.id, m.id),
            },
              h('span', { className: 'ms-item-name' }, m.name || m.id),
              h('span', { className: 'ms-item-check' }, selected ? h(IcoCheck) : null)
            ));
          }
        }
        if (modelPaneBlocks.length === 0) {
          modelPaneBlocks.push(h('div', { className: 'ms-empty', key: 'empty' }, '暂无可用模型'));
        }

        const modelPane = h('div', { className: 'ms-pane' },
          h('div', { className: 'ms-pane-head' },
            h('button', {
              type: 'button', className: 'ms-back',
              onClick: function () { setPane('root'); },
              'aria-label': '返回',
            }, h(IcoLeft)),
            h('span', { className: 'ms-pane-title' }, '模型')
          ),
          h('div', { className: 'ms-pane-body' }, modelPaneBlocks)
        );

        // ===== 子页：推理等级滑块 =====
        const effortPane = h('div', { className: 'ms-pane' },
          h('div', { className: 'ms-pane-head' },
            h('button', {
              type: 'button', className: 'ms-back',
              onClick: function () { setPane('root'); },
              'aria-label': '返回',
            }, h(IcoLeft)),
            h('span', { className: 'ms-pane-title' }, '推理等级')
          ),
          h('div', { className: 'ms-pane-body' },
            hasEffort
              ? h('div', { className: 'ms-effort' },
                  h('div', { className: 'ms-effort-head' },
                    h('span', { className: 'ms-effort-title' }, '当前'),
                    h('span', { className: 'ms-effort-value' }, shownEffortLabel)
                  ),
                  h('div', { className: 'ms-track-wrap' },
                    h('div', { className: 'ms-track' }),
                    h('div', { className: 'ms-fill', style: { width: shownPct + '%' } }),
                    h('input', {
                      className: 'ms-range', type: 'range', min: 0, max: 100, step: 1,
                      value: Math.round(shownPct), disabled: busy, 'aria-label': '推理等级',
                      onChange: function (e) { setDragPct(Number(e.target.value)); },
                      onPointerUp: function (e) { commitEffort(Number(e.currentTarget.value)); setDragPct(null); },
                      onKeyUp: function (e) {
                        const keys = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'];
                        if (keys.indexOf(e.key) === -1) return;
                        commitEffort(Number(e.currentTarget.value));
                        setDragPct(null);
                      },
                      onBlur: function () { setDragPct(null); }
                    })
                  ),
                  h('div', { className: 'ms-effort-ticks' },
                    efforts.map(function (lv, k) {
                      return h('span', { className: 'ms-tick', key: lv.id,
                        'data-active': k === shownIdx ? 'true' : 'false' }, lv.name);
                    })
                  )
                )
              : h('div', { className: 'ms-empty' }, '当前模型未提供推理等级。')
          )
        );

        // ===== root：两个入口行（官方 cell 样式） =====
        const rootContent = h('div', { className: 'ms-pane-body' },
          h('button', {
            type: 'button', className: 'ms-row', key: 'row-model',
            disabled: busy,
            onClick: function () { setPane('model'); },
          },
            h('span', { className: 'ms-row-label' }, '模型'),
            h('span', { className: 'ms-row-value' }, modelName),
            h('span', { className: 'ms-row-arrow' }, h(IcoRight))
          ),
          hasEffort ? h('button', {
            type: 'button', className: 'ms-row', key: 'row-effort',
            disabled: busy,
            onClick: function () { setPane('effort'); },
          },
            h('span', { className: 'ms-row-label' }, '推理等级'),
            h('span', { className: 'ms-row-value' }, effortLabel),
            h('span', { className: 'ms-row-arrow' }, h(IcoRight))
          ) : null
        );

        const body = pane === 'model' ? modelPane : (pane === 'effort' ? effortPane : rootContent);

        menu = h('div', {
          className: 'ms-menu', ref: menuRef,
          role: 'menu', 'aria-label': '模型与推理等级',
          style: {
            left: pos.left + 'px',
            top: pos.top + 'px',
            width: pos.width + 'px',
            maxHeight: pos.availH + 'px',
            visibility: menuPos ? 'visible' : 'hidden',
          },
        }, body);
      }

      return h(React.Fragment, null,
        h('style', null, CSS),
        h('div', { className: 'ms-root', ref: rootRef, 'data-open': open ? 'true' : 'false' },
          trigger,
          menu
        )
      );
    }

    return {
      apply: function (ctx) {
        ctx.inject(['slots', 'sessions', 'modelDirectories', 'remote', 'remote.session'], function (scope) {
          directoriesService = scope.modelDirectories;
          scope.effect(function () {
            return scope.slots.inject('conversation.input.model', function () {
              return scope.slots.register(
                { name: 'conversation.input.model' },
                ModelPicker
              );
            });
          }, 'effort-slider: picker');
        });
      },
    };
  },
});
