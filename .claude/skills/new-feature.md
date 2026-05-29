---
name: new-feature
description: 在 viral-script-generator 项目中创建新功能页面，含骨架代码 + AppShell 注册
---

# /new-feature

在当前项目的 `src/pages/` 下创建新功能页面，并自动注册到 `AppShell.vue`。

## 用法

```
/new-feature <英文名(kebab-case)> <中文名>
```

示例：
```
/new-feature book-recommender 书籍推荐器
/new-feature meal-planner 菜谱生成器
```

## 执行步骤

### 1. 解析参数

输入格式：`<feature-name> <display-name>`

- `feature-name`: kebab-case，如 `book-recommender`
- `display-name`: 中文标签，如 `书籍推荐器`

转换为：
| 格式 | 示例 |
|------|------|
| PascalCase（组件名） | `BookRecommender` |
| kebab-case（目录名） | `book-recommender` |
| camelCase（composable） | `bookRecommender` |

### 2. 校验

- 检查 `src/pages/<feature-name>/` 是否已存在，若存在则报错退出
- 检查 `src/AppShell.vue` 是否存在
- 从 `src/pages/movie-recommender/` 读取一个参考文件确认目录结构

### 3. 创建目录结构

```
src/pages/<feature-name>/
  index.vue
  composables/
    use<FeatureName>.js
  components/
    (空目录，用于存放该功能的组件)
  services/
    <feature-name>Api.js
```

### 4. 生成骨架文件

#### 4.1 `src/pages/<feature-name>/index.vue`

参照 `src/pages/movie-recommender/index.vue` 的结构：
- `<template>`：hd 区块 + 表单区 + 结果区 + 空状态
- `<script setup>`：导入 composable，初始化调用
- `<style scoped>`：与现有设计一致（暗色主题、css 变量、毛玻璃）

Tabler Icons 选取规则：
- 参考用途从 https://tabler.io/icons 选取，如 `ti ti-books`、`ti ti-plant` 等
- 若不确定，用 `ti ti-sparkles` 兜底

#### 4.2 `src/pages/<feature-name>/composables/use<FeatureName>.js`

标准 composable 骨架：

```js
/**
 * <display-name> 状态管理
 * 独立 composable，不依赖其他功能
 */
import { ref } from 'vue'

export function use<FeatureName>() {
  const loading = ref(false)
  const error = ref('')
  const data = ref([])

  async function fetchData() {
    loading.value = true
    error.value = ''
    try {
      data.value = await load<FeatureName>()
    } catch (e) {
      error.value = e.message || '加载失败'
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    data,
    fetchData,
  }
}
```

#### 4.3 `src/pages/<feature-name>/services/<feature-name>Api.js`

数据服务骨架：

```js
/**
 * <display-name> 数据服务
 */

export async function load<FeatureName>() {
  // TODO: 替换为真实 API 调用或 Mock 数据
  return []
}
```

### 5. 注册到 AppShell.vue

读取 `src/AppShell.vue`，依次执行：

**步骤 5.1**：在 `<script setup>` 的 import 区域添加一行：
```
import <FeatureName>Page from './pages/<feature-name>/index.vue'
```
放在现有 import 行之后，保持缩进一致。

**步骤 5.2**：在 `navItems` 数组末尾添加：
```js
{ id: '<feature-name>', label: '<display-name>', icon: 'ti ti-<icon>' },
```
保持与现有项相同的格式和缩进。

**步骤 5.3**：在 `<template>` 的导航内容区域添加：
```
    <<FeatureName>Page v-show="feature === '<feature-name>'" />
```
放在现有 `v-show` 块之后，与兄弟元素对齐。

### 6. 输出结果

创建完毕后输出：
```
✅ 已创建 <feature-name> 功能

新增文件：
  src/pages/<feature-name>/index.vue
  src/pages/<feature-name>/composables/use<FeatureName>.js
  src/pages/<feature-name>/services/<feature-name>Api.js
  src/pages/<feature-name>/components/

修改文件：
  src/AppShell.vue（注册 nav + import）

运行 npm run dev 即可查看。
```

## 红线

- **禁止修改** App.vue、useGenerator.js、components/（旧）、services/ai.js、prompts/、templates/index.js
- **禁止** 在新功能中引用现有功能的 composable、service 或业务组件
- 可引用 `src/components/CopyButton.vue`
- 保持 scoped CSS，使用 `var(--xxx)` 设计 token
