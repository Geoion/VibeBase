import { useState } from "react";

/**
 * 最简单的拖拽测试组件
 * 用于验证浏览器拖拽功能是否正常
 */
export default function DragTest() {
  const [message, setMessage] = useState("等待拖拽...");

  const handleDragStart = (e: React.DragEvent) => {
    console.log("✅ 测试组件：拖拽开始");
    setMessage("拖拽中...");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", "test");
  };

  const handleDragEnd = () => {
    console.log("✅ 测试组件：拖拽结束");
    setMessage("拖拽结束");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    console.log("✅ 测试组件：拖拽经过目标");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    console.log("✅ 测试组件：拖放完成");
    setMessage("拖放成功！");
  };

  return (
    <div style={{ padding: "20px", border: "2px solid #666" }}>
      <h3>拖拽功能测试</h3>
      <p>状态: {message}</p>

      <div
        draggable={true}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        style={{
          width: "200px",
          padding: "20px",
          margin: "10px 0",
          backgroundColor: "#4CAF50",
          color: "white",
          cursor: "move",
          userSelect: "none",
        }}
      >
        拖动我
      </div>

      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{
          width: "200px",
          height: "100px",
          padding: "20px",
          margin: "10px 0",
          border: "2px dashed #ccc",
          backgroundColor: "#f0f0f0",
        }}
      >
        拖放到这里
      </div>

      <button
        onClick={() => {
          console.log("检查元素:");
          console.log("可拖拽元素数量:", document.querySelectorAll('[draggable="true"]').length);
        }}
        style={{ padding: "10px", marginTop: "10px" }}
      >
        检查拖拽元素
      </button>
    </div>
  );
}

