import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { useState } from 'react';

export default function FeishuGuide() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-amber-200 rounded-lg bg-amber-50 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-amber-900 font-medium hover:bg-amber-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5" />
          <span>如何获取飞书配置信息？</span>
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>
      
      {isOpen && (
        <div className="p-4 bg-white text-sm space-y-4 border-t border-amber-200">
          <div className="space-y-2">
            <h4 className="font-bold text-gray-900">第一步：创建飞书自建应用</h4>
            <ol className="list-decimal pl-5 space-y-1 text-gray-600">
              <li>访问 <a href="https://open.feishu.cn/app" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">飞书开放平台</a> 并登录。</li>
              <li>点击“创建企业自建应用”，填写应用名称（如“杯测工具”）和描述。</li>
              <li>创建成功后，在“凭证与基础信息”页面，获取 <strong>App ID</strong> 和 <strong>App Secret</strong>。</li>
            </ol>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-gray-900">第二步：开通权限</h4>
            <ol className="list-decimal pl-5 space-y-1 text-gray-600">
              <li>在应用详情页，点击左侧“开发配置” &gt; “权限管理”。</li>
              <li>搜索并开通以下权限：
                <ul className="list-disc pl-5 mt-1">
                  <li><code>bitable:app:readonly</code> (查看多维表格应用)</li>
                  <li><code>bitable:app.table.record:create</code> (新增记录)</li>
                  <li><code>bitable:app.table.record:view</code> (查看记录)</li>
                </ul>
              </li>
              <li>点击“发布版本”，创建并发布一个新版本以生效权限。</li>
            </ol>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-gray-900">第三步：创建多维表格并授权</h4>
            <ol className="list-decimal pl-5 space-y-1 text-gray-600">
              <li>在飞书云文档中创建一个新的“多维表格”。</li>
              <li>点击右上角“...”，选择“添加应用”，搜索刚才创建的应用并添加，赋予“编辑”权限。</li>
            </ol>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-gray-900">第四步：获取 Token 和 Table ID</h4>
            <ol className="list-decimal pl-5 space-y-1 text-gray-600">
              <li>打开多维表格，查看浏览器地址栏 URL：
                <div className="bg-gray-100 p-2 rounded mt-1 break-all font-mono text-xs">
                  https://.../base/<strong>[App Token]</strong>?table=<strong>[Table ID]</strong>...
                </div>
              </li>
              <li><code>base/</code> 后面的一串字符即为 <strong>App Token</strong>。</li>
              <li><code>table=</code> 后面的一串字符（通常以 tbl 开头）即为 <strong>Table ID</strong>。</li>
            </ol>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-gray-900">第五步：设计数据表结构</h4>
            <p className="text-gray-600">请确保多维表格包含以下列（列名必须完全一致）：</p>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs border border-gray-200 mt-2">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border p-2 text-left">列名</th>
                    <th className="border p-2 text-left">类型</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td className="border p-2">杯测活动</td><td className="border p-2">单行文本</td></tr>
                  <tr><td className="border p-2">杯测日期</td><td className="border p-2">日期</td></tr>
                  <tr><td className="border p-2">烘焙日期</td><td className="border p-2">日期</td></tr>
                  <tr><td className="border p-2">样品名称</td><td className="border p-2">单行文本</td></tr>
                  <tr><td className="border p-2">产地</td><td className="border p-2">单行文本</td></tr>
                  <tr><td className="border p-2">处理方式</td><td className="border p-2">单行文本</td></tr>
                  <tr><td className="border p-2">杯测人</td><td className="border p-2">单行文本</td></tr>
                  <tr><td className="border p-2">香气</td><td className="border p-2">数字</td></tr>
                  <tr><td className="border p-2">风味</td><td className="border p-2">数字</td></tr>
                  <tr><td className="border p-2">余韵</td><td className="border p-2">数字</td></tr>
                  <tr><td className="border p-2">酸度</td><td className="border p-2">数字</td></tr>
                  <tr><td className="border p-2">醇厚度</td><td className="border p-2">数字</td></tr>
                  <tr><td className="border p-2">平衡度</td><td className="border p-2">数字</td></tr>
                  <tr><td className="border p-2">一致性</td><td className="border p-2">数字</td></tr>
                  <tr><td className="border p-2">干净度</td><td className="border p-2">数字</td></tr>
                  <tr><td className="border p-2">甜度</td><td className="border p-2">数字</td></tr>
                  <tr><td className="border p-2">总分</td><td className="border p-2">数字</td></tr>
                  <tr><td className="border p-2">风味笔记</td><td className="border p-2">多行文本</td></tr>
                  <tr><td className="border p-2">缺陷记录</td><td className="border p-2">多行文本</td></tr>
                  <tr><td className="border p-2">创建时间</td><td className="border p-2">日期</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}