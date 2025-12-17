import { useState } from "react";
import { useDragDrop } from "../../hooks/useDragDrop";

/**
 * 最简单的拖拽测试 - 使用鼠标事件（Tauri webview 不支持 HTML5 拖放）
 */
export default function SimpleDragTest() {
  const { isDragging, draggedItem, handleMouseDown, handleMouseUp } = useDragDrop<string>();
  const [dropZoneHover, setDropZoneHover] = useState(false);
  const [result, setResult] = useState<string>('');

  return (
    <div
      style={{ padding: "50px", backgroundColor: "#f0f0f0", minHeight: "100vh" }}
      onMouseUp={handleMouseUp}
    >
      <h1>拖拽测试 - 鼠标事件方案</h1>

      <div style={{ marginBottom: "20px", padding: "10px", backgroundColor: isDragging ? "#ffffcc" : "#fff", border: "2px solid #ccc" }}>
        <strong>状态:</strong> {isDragging ? `正在拖拽 ${draggedItem}` : '未拖拽'}
      </div>

      <h2>可拖拽项目：</h2>
      {['文件1.vibe.md', '文件2.vibe.md', '文件夹A'].map((item) => (
        <div
          key={item}
          onMouseDown={(e) => handleMouseDown(item, e)}
          style={{
            width: "300px",
            padding: "20px",
            margin: "10px 0",
            backgroundColor: isDragging && draggedItem === item ? "#ccc" : "#4CAF50",
            color: "white",
            cursor: isDragging && draggedItem === item ? "grabbing" : "grab",
            userSelect: "none",
            opacity: isDragging && draggedItem === item ? 0.5 : 1,
          }}
        >
          {item}
        </div>
      ))}

      <h2>拖放目标：</h2>
      <div
        onMouseEnter={() => setDropZoneHover(true)}
        onMouseLeave={() => setDropZoneHover(false)}
        onMouseUp={() => {
          if (isDragging && draggedItem) {
            setResult(`✅ 成功：将 ${draggedItem} 拖放到目标区域`);
            console.log('✅ 拖放成功:', draggedItem);
          }
        }}
        style={{
          width: "500px",
          height: "200px",
          padding: "20px",
          margin: "20px 0",
          backgroundColor: dropZoneHover && isDragging ? "#e3f2fd" : "#f5f5f5",
          border: dropZoneHover && isDragging ? "3px dashed #2196F3" : "3px dashed #ccc",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "18px",
          color: "#666",
        }}
      >
        {dropZoneHover && isDragging ? "松开鼠标放下" : "将项目拖到这里"}
      </div>

      {result && (
        <div style={{ padding: "15px", backgroundColor: "#4CAF50", color: "white", borderRadius: "4px", marginTop: "20px" }}>
          {result}
        </div>
      )}

      <div style={{ marginTop: "40px", padding: "20px", backgroundColor: "#fff", border: "2px solid #ccc" }}>
        <h3>使用说明：</h3>
        <ul>
          <li>✅ 按住鼠标左键在项目上</li>
          <li>✅ 移动鼠标（至少 5 像素）</li>
          <li>✅ 拖到目标区域</li>
          <li>✅ 松开鼠标完成拖放</li>
        </ul>
        <p><strong>这个方法使用鼠标事件而非 HTML5 拖放 API，可以在 Tauri webview 中工作！</strong></p>
      </div>
    </div>
  );
}
