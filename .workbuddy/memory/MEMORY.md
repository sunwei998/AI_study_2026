# ai_chat_vue 项目长期约定

## 移动端 / 响应式判定（重要陷阱）

项目里有**两套并行且会互相矛盾**的设备判定，混用会导致 UI 与样式错位：

| 机制 | 判定依据 | 用在哪里 |
|---|---|---|
| `<html data-device>` | index.html 内联 IIFE：UA 正则 ‖ maxTouchPoints+ontouchstart ‖ innerWidth<768，监听 resize/orientationchange | **所有驱动布局的 CSS**：`[data-device="mobile"] .console-nav{width:60px}`、`.console-collapse-pin{display:none}` |
| `useDevice.ts` | `matchMedia('(pointer: coarse)')` | 仅 useDevice 消费方 |

在**带触屏的笔记本**上两者结论相反。**凡是 UI 逻辑要跟侧栏/布局的视觉形态保持一致，必须用 `document.documentElement.dataset.device === 'mobile'`**（AdminConsole 原 `isMobileDevice()` 即如此），**禁用 `useDevice` 的 `isMobile`**。需要响应式时同理。

## 响应式写法约定

**禁用 `@media`**，统一用 `[data-device="mobile"]` / `[data-device="desktop"]` 属性选择器（AdminConsole.vue L382 有明确注释）。

## 全局 UI 状态

无 UI store（`/src/stores/` 只有 authStore、chatStore）。跨组件共享控制台级 UI 状态走 **composable 模块级单例**：
- `useConsoleLayout.ts` —— `collapsed`（可写 ref，持久化 localStorage `adminConsoleCollapsed`，值 `'1'`/`'0'`）、`isMobile`（MutationObserver 跟随 data-device）、`showTabs = isMobile || collapsed`
- 返回可写 ref 时，模板里 `collapsed = !collapsed` 依然可用（编译为 `$setup.collapsed = ...`，proxyRefs setter 自动写 `.value`）

## 二级 tab 布局

`AdminTabLayout.vue` 为公共组件（props: `tabs: AdminTabItem[]`，默认插槽 fallback `<RouterView />`）。
`AdminSettingsLayout.vue` / `AdminDataLayout.vue` 只是薄封装（各约 14 行，传 tabs 数组）。
**行为**：侧栏展开时 tab 隐藏、收起时显示（移动端恒显示），高度折叠 + 淡入淡出，显示延迟 0.08s / 隐藏不延迟。
`max-height` 用 `--tab-max-h`（默认 72px）；实测内容高约 58.5px，**不要调到 60px 附近**，否则字体度量波动会裁字。

### 高度折叠动画的 padding 陷阱（已实测，务必记住）

**`max-height: 0` 压不掉 padding 和 border。** `box-sizing: border-box` 下 max-height 约束的是 border-box，但 border-box = 内容 + padding + border，后两者为非负固定值，内容盒无法为负只能钳到 0，元素最终高度仍等于 padding + border。

Chrome headless 实测（`.tabs{padding:12px 16px 8px;border-bottom:1px}`）：可见 58.4px / 仅 `max-height:0` → **21.0px 残留** / 补 `padding-top:0;padding-bottom:0;border-bottom-width:0` → **0.0px**。

结论：写折叠动画时，**`max-height`、`padding-top`、`padding-bottom`、`border-*-width` 必须一起过渡**，`overflow:hidden` 不解决此问题（它只裁子元素，不裁自身盒）。

**同理，折叠元素与相邻元素的间距不能用父容器的 flex `gap`** —— gap 在子项之间恒定生效，元素折叠到 0 高度后仍会残留该间距。必须挂在折叠元素自身的 `margin-bottom` 上并随折叠一起归零（同时纳入 transition）。

### 间距节奏约定
紧邻元素（tab→内容、工具栏→表格、表格→分页）统一 **6px**；区块之间 14–16px。
tab 与下方内容当前用 `.admin-tab-layout__tabs{margin-bottom:6px}`（隐藏态归零）。

## AppButton 使用约定（重要）

**`type` 的默认值是 `'primary'`**（渐变 `linear-gradient(135deg,var(--color-primary),var(--color-accent))` + 发光阴影 `box-shadow:0 4px 14px var(--color-glow)`）。
**未显式写 `type` 的按钮一律是高亮渐变样式** —— 想要柔和的液态玻璃（边框 + `--color-glass` + blur，无渐变）必须显式写 `type="default"`。

尺寸：`mini` 26 / `small` 32 / `middle` 38 / `large` 44。

控制台工具栏操作按钮（新增/导入/导出/下载模板）统一：`size="middle" type="default"` + **纯图标** + `:title="..."`（不写文字，悬停出原生 tooltip 靠 title 属性，Vue fallthrough 会落到根 `<button>`）。参考 `ModelManage.vue` L4-41。

## AppTable 标题栏（表格附属操作区）

`AppTable` 提供**卡片内**、表头上方的标题栏，插槽分左右两区：
- `#table-title-left` —— 标题类内容（名称/编码/说明等），自带 `font-weight:600`
- `#table-title-right` —— 操作按钮，`gap:8px`、`flex:none`
- 另有旧 `title` prop / `#title` 插槽（**目前无页面使用**）

标题栏 `padding:8px 16px` + `border-bottom`，按钮为 `size=middle`(38px) 时整条 **56px**。
`font-weight/size/color` 只加在 `.app-table__title-left` 上，**不要放回 `.app-table__title-bar`**，否则右侧按钮会被加粗。

**约定：带表格的操作按钮一律放进 `#table-title-right`，不要在页面里另起外部工具栏行。**
这样按钮在视觉上属于表格卡片，且省掉一整行高度。已适配：`AdminSettingsDict`（左：名称+编码+说明）、`AdminSettingsBase`、`ModelManage`（4 个按钮）。

注意：左侧内容必须 `min-width:0` + `overflow:hidden` + `text-overflow:ellipsis` + `white-space:nowrap`，否则长名称/说明会把右侧按钮挤出卡片。

## 表格行内编辑校验（useRowValidation）

`src/composables/useRowValidation.ts` —— 维表配置页与数据字典配置页共用的行级字段校验：
- `fieldError(id, field)` → AppInput `:error`（红框）与 `:title`（提示）
- `check(row)` → 失焦/保存时调用，返回首条错误（无错 `''`）
- `clearRow(id)` → 保存成功后清理
- 用法：每个行内插槽加 `:error` / `:title` / `@blur="check(row)"`；`save()` 里 `const err = check(row); if (err) { toast(err); return }` —— **校验不过不发请求**。

**约定/坑**：
- 数字列（如 sort_order）保持 `type="text"`，用 `parseSort`（`/^\d{1,6}$/`）在保存前收敛为 `number`，**禁止 `Number(x) || 0`**（会把 `NaN` 静默写成 0，毁掉原值）；校验不过即 return，请求根本不发。
- 前端永不向 PUT 传 `null`（后端 Optional 字段 `if x is not None` 视 null 为"不更新"，会"用户以为改了却没变"）。
- 后端 Pydantic 422 的 `detail` 是数组，`adminService.parseError` 里要 `Array.isArray(d) → api.validationFailed`，否则 `[object Object]`。
- `Object.values()` 对泛型映射类型推断为 `{}`，需 `as string | undefined` 断言。

## 本地运行环境

- 后端：`cd ../ai-chat-server && .venv/bin/uvicorn ai_chat_server.main:app --host 127.0.0.1 --port 8000`（**只绑 IPv4**）
- 前端：`npm run dev` → **只监听 IPv6 `[::1]:5173`**，curl 测试须用 `http://[::1]:5173`，用 `127.0.0.1` 会连接失败
- 代理：vite.config.ts 把 `/api` 代理到 `http://localhost:8000`（localhost 先解析 127.0.0.1，故能命中只绑 IPv4 的后端）
- 验证命令：`npm run type-check`、`npm run build`、`npm run lint`
- 后台管理员：admin / admin123（super_admin）

## 后端约定（ai-chat-server）

### fetch_one / fetch_all 返回 sqlite3.Row，无 .get() 方法（重要坑）

`db.fetch_one()` 返回 `sqlite3.Row`，**不是 dict**：支持 `row["key"]` 下标访问和 `row.keys()`，但**没有 `.get()`**。在 helper 里想用 `.get(key, default)` 时必须先 `dict(row)` 转换，否则运行时报 `AttributeError: 'sqlite3.Row' object has no attribute 'get'` → 接口 500。

- 参考：`admin.py` 的 `update_setting` 里 `old = dict(row)`；三个 diff 日志函数 `_model_diff_logs` / `_dim_value_diff_logs` / `_user_diff_logs` 开头都 `old = dict(old)` 兜底。
- 教训：给接口加「字段级 diff 日志」这类纯函数 helper 时，单元测试若只传普通 dict 是测不出来的——必须用真实 `sqlite3.Row`（或 `conn.row_factory=sqlite3.Row` 取一行）回归，才能暴露 `.get()` 缺失。

### FastAPI 路由顺序：字面量段必须注册在动态段之前（重要坑）

新增「带字面量段的路径」（如 `GET /users/export`、`GET /models/check`）必须**注册在**对应的「动态段路径」（`GET /users/{user_id}`）**之前**。FastAPI/Starlette 按注册顺序匹配，`/users/export` 若在 `/users/{user_id}` 之后注册，会被 `{user_id}` 捕获 → `"export"` 转 int 失败 → 422（不是 404/500，很隐蔽）。

- 现状：`admin.py` 里 `export_users` 已上移到 `get_user` 之前；`/models/check`、`/dim-tables/by-code/{code}/values` 等原有路由本就靠前。
- 教训：加任何 `GET /xxx/some-literal` 前，先确认没有 `GET /xxx/{id}` 排在其后；有则把 literal 路由放在动态段之前。
