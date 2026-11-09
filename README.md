# 权盾智检 - 检验科试剂管理系统（网页端）

基于已有后端（uni-app + Supabase PostgreSQL）架构打造的现代化、响应式检验科试剂管理系统网页端。全面适配手机浏览器竖屏操作与桌面端宽屏展示，复用后端核心逻辑，支持手机后置摄像头实时扫码出入库、GS1 条码三级匹配、试剂预录、效期与低库存多级预警、出入库流水查询。

---

## 一、技术栈与架构

- **构建工具**: Vite 6
- **前端框架**: Vue 3 (Composition API / `<script setup>`，与原 uni-app Vue 3 语法保持高度一致)
- **路由管理**: Vue Router 4
- **云端数据库**: `@supabase/supabase-js` (直接复用现有 Supabase 项目与表结构，未改动数据库)
- **条码与二维码扫码**: `html5-qrcode` (原生调用 `getUserMedia`，优先后置环境摄像头 `facingMode: "environment"`，支持手电筒补光与翻转镜头)
- **移动端视觉规范**: 临床检验风格（Medical Slate & Blue），适配 iOS/Android 安全区域 (`env(safe-area-inset-bottom)`) 与触屏大按钮交互。

---

## 二、后端核心逻辑复用与移植说明

本项目完全继承并复用工作区《核心代码.md》中的数据模型与业务规则：

| 模块文件 | 对应位置 | 功能说明 |
| :--- | :--- | :--- |
| **Supabase 连接** | `src/utils/supabase.js` | 初始化 Supabase Client，连接现有项目 `https://jtshtmhjplhapdwnulbk.supabase.co` |
| **字段双向映射** | `src/utils/fields.js` | `toDbFields` / `fromDbFields`（reagents 表驼峰与下划线互转）、`toStockFields` / `fromStockFields`（stock_records 表字段映射，日期字段兼容 PostgreSQL DATE 类型） |
| **数据库操作封装** | `src/utils/db.js` | 封装 `dbAdd`, `dbPut`, `dbGet`, `dbGetAll`, `dbDelete`，支持 reagents 表和 stock_records 表 |
| **条码解析与三级匹配** | `src/utils/scanner.js` | `cleanFNC1` 清理特殊字符；`parseBarcode` 解析 GS1 结构；`extractFieldsByRules` 根据切割规则提取批号、生产日期与有效期；`matchReagentByScan` 按三级优先级自动匹配试剂 |

### 扫码三级匹配优先级规则
1. **优先级 1（scanRule 匹配）**：扫描结果包含试剂设定的 `scanRule` 前缀，并结合 `scanSegments` 切割规则精准提取 GTIN、批号 (10)、生产日期 (11)、有效期 (17)、序列号 (21)。
2. **优先级 2（code 匹配）**：扫描结果包含试剂的 GTIN 编码，并按切割规则提取字段。
3. **优先级 3（简单条码匹配）**：无 GS1 结构或未设定规则的条码，直接按条码匹配试剂，由操作员手动补充批号和效期。

---

## 三、系统核心功能

### 1. 试剂库存与多维预警 (`/reagents`)
- **顶部统计卡片**：一览全部试剂总数、低库存缺货数、30天内近效期预警数、已过期数。
- **实时检索与过滤**：支持试剂名称、GTIN 编码、生产厂家、规格、存放货位模糊搜索；支持检验科常见分类（免疫、生化、临检等）快速胶囊切换。
- **试剂卡片详情**：直观展示当前库存 vs 最低安全库存状态标签、剩余效期状态标签（正常 / 近效期 / 已过期），并提供“+快捷入库”、“-快捷出库”、“详情”、“编辑”操作。
- **GS1 切割规则可视化**：详情弹窗以彩色标签段清晰展示各 AI 标识符（01, 10, 11, 17, 21 等）的起始位置与字节长度。

### 2. 扫码入库 / 出库与批量提交 (`/stock`)
- **模式切换**：支持“扫码入库”与“扫码出库”随时无缝切换。
- **摄像头实时扫码**：直接调用手机后置镜头实时扫描一维条码、GS1 DataMatrix 与二维码；提供动态激光扫描线对焦框，识别成功伴随蜂鸣提示与触感震动。
- **出库库存严格核验**：出库时系统根据当前试剂库存减去已在待出库清单中的预扣数量，计算真实可用库存。若出库数量超过可用库存，**实时标红并阻断提交**，杜绝超量出库。
- **批量提交清单**：扫码后自动填充提取的批号与效期，支持增减数量、补充备注后加入清单；支持多批次、多种试剂一次性批量提交入库/出库，事务更新 Supabase `reagents` 表库存并在 `stock_records` 表写入明细流水。

### 3. 试剂预录与规则生成 (`/reagent-form`)
- **扫码自动解析**：在预录页面扫描或粘贴新试剂条码，系统调用 `parseBarcode` 自动解析出 GTIN 码并生成 `scanRule` 与 `scanSegments` 切割规则 JSON。
- **完整字段录入**：包含试剂名称、GTIN 编码、分类、规格型号、厂家、包装单位、初始库存、最低安全库存、存储条件（室温 / 2-8℃冷藏 / -20℃冷冻 / 避光干燥）、存放货位、医疗器械注册证号等。
- **修改已有试剂**：支持根据 ID 编辑已有试剂资料。

### 4. 出入库流水记录查询 (`/records`)
- **出入库总览**：汇总统计累计入库总件数与出库总件数。
- **多维度筛选**：一键切换“全部记录”、“入库流水”、“出库流水”；支持搜索试剂名称、编码、批号、操作人。
- **明细展示**：按时间倒序清晰展示类型徽标、变动数量（绿色+ / 红色-）、试剂编码、批号、效期、操作人及操作时间。

---

## 四、本地运行指南

工作区已预配置好所有依赖与运行环境，可直接启动：

### 1. 安装依赖
```bash
npm install
```

### 2. 启动本地开发服务
```bash
npm run dev
```
启动后终端将输出访问地址，例如：`http://localhost:5173/`。

### 3. 生产环境打包与预览
```bash
npm run build
npm run preview
```

---

## 五、手机端运行与摄像头扫码权限说明

根据 W3C 现代浏览器安全规范，调用设备摄像头 (`navigator.mediaDevices.getUserMedia`) **必须处于安全上下文 (Secure Context)**：
1. **本机访问**：访问 `http://localhost:5173`（或 `http://127.0.0.1:5173`）属于被浏览器信任的安全上下文，可以直接调用摄像头。
2. **手机局域网访问（同 Wi-Fi 访问电脑 IP）**：
   - 如果手机直接访问电脑局域网 IP（如 `http://192.168.x.x:5173`），非 localhost 且为普通 HTTP 协议，部分移动端浏览器（尤其是 iOS Safari / Chrome）会出于安全考量禁用摄像头权限。
   - **手机测试摄像头的推荐方式**：
     - **方案 A（USB 调试端口转发）**：安卓手机连接电脑 USB 并开启开发者调试，执行 `adb reverse tcp:5173 tcp:5173`，手机浏览器直接打开 `http://localhost:5173`，即可使用 localhost 安全上下文完美开启摄像头。
     - **方案 B（配置 HTTPS）**：可在 Vite 中配置 `@vitejs/plugin-basic-ssl` 插件开启本地自签名 HTTPS (`npm run dev -- --https`)，手机信任证书后即可直接调用后置摄像头。
     - **方案 C（部署到支持 HTTPS 的云服务器）**：部署至 Vercel, Netlify 或配置了 SSL 证书的生产服务器，手机端通过 `https://` 域名访问，即可直接授权调用摄像头。
3. **内置备用测试模式**：
   - 扫码页面和试剂预录页面均贴心内置了 **“⌨️ 手动输入/测试”** 模式，提供了常用安图清洗液、幽门螺旋杆菌、肺炎衣原体等真实 GS1 条码快捷测试按钮，在电脑或无摄像头设备上亦可一键测试三级匹配与出入库全流程。

---

## 六、部署说明

本项目为标准的 Vite SPA 纯静态前端应用，编译产物位于 `dist/` 目录。

### Nginx 静态托管配置参考
```nginx
server {
    listen 80;
    server_name reagent.yourdomain.com;
    root /var/www/quandun-reagent/dist;
    index index.html;

    # 支持 Vue Router HTML5 History 模式
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 启用 Gzip 提升移动端加载速度
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
}
```

如需覆盖默认 Supabase 配置，可在部署环境注入环境变量：
- `VITE_SUPABASE_URL`: 你的 Supabase 项目 URL
- `VITE_SUPABASE_ANON_KEY`: 你的 Supabase 项目 Anon Public Key
