import { useState } from "react";
import { useDragDrop } from "../../hooks/useDragDrop";

/**
 * Simplest drag test - using mouse events (Tauri webview doesn't support HTML5 drag and drop)
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
      <h1>Drag Test - Mouse Event Solution</h1>

      <div style={{ marginBottom: "20px", padding: "10px", backgroundColor: isDragging ? "#ffffcc" : "#fff", border: "2px solid #ccc" }}>
        <strong>Status:</strong> {isDragging ? `Dragging ${draggedItem}` : 'Not dragging'}
      </div>

      <h2>Draggable Items:</h2>
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

      <h2>Drop Target:</h2>
      <div
        onMouseEnter={() => setDropZoneHover(true)}
        onMouseLeave={() => setDropZoneHover(false)}
        onMouseUp={() => {
          if (isDragging && draggedItem) {
            setResult(`✅ Success: Dropped ${draggedItem} into target area`);
            console.log('✅ Drop successful:', draggedItem);
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
        {dropZoneHover && isDragging ? "Release mouse to drop" : "Drag items here"}
      </div>

      {result && (
        <div style={{ padding: "15px", backgroundColor: "#4CAF50", color: "white", borderRadius: "4px", marginTop: "20px" }}>
          {result}
        </div>
      )}

      <div style={{ marginTop: "40px", padding: "20px", backgroundColor: "#fff", border: "2px solid #ccc" }}>
        <h3>Instructions:</h3>
        <ul>
          <li>✅ Hold left mouse button on item</li>
          <li>✅ Move mouse (at least 5 pixels)</li>
          <li>✅ Drag to target area</li>
          <li>✅ Release mouse to complete drop</li>
        </ul>
        <p><strong>This method uses mouse events instead of HTML5 drag and drop API, and works in Tauri webview!</strong></p>
      </div>
    </div>
  );
}

