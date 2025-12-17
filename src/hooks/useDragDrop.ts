import { useState, useCallback, useRef } from 'react';

/**
 * 自定义拖拽钩子 - 使用鼠标事件模拟拖拽（Tauri webview 不支持 HTML5 拖放）
 */
export function useDragDrop<T>() {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItem, setDraggedItem] = useState<T | null>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  const handleMouseDown = useCallback((item: T, e: React.MouseEvent) => {
    // 只响应左键
    if (e.button !== 0) return;

    dragStartPos.current = { x: e.clientX, y: e.clientY };
    hasMoved.current = false;

    console.log('🖱️ 鼠标按下:', item);

    // 延迟设置拖拽状态，避免误触
    const checkDrag = (moveEvent: MouseEvent) => {
      const deltaX = Math.abs(moveEvent.clientX - dragStartPos.current.x);
      const deltaY = Math.abs(moveEvent.clientY - dragStartPos.current.y);

      // 移动超过 5 像素才认为是拖拽
      if (deltaX > 5 || deltaY > 5) {
        if (!hasMoved.current) {
          hasMoved.current = true;
          setIsDragging(true);
          setDraggedItem(item);
          console.log('🚀 开始拖拽:', item);
        }
      }
    };

    const stopDrag = () => {
      document.removeEventListener('mousemove', checkDrag);
      document.removeEventListener('mouseup', stopDrag);

      if (!hasMoved.current) {
        // 没有移动，当作点击处理
        console.log('👆 点击（未拖动）');
      }
    };

    document.addEventListener('mousemove', checkDrag);
    document.addEventListener('mouseup', stopDrag);

    // 阻止默认行为（文本选择等）
    e.preventDefault();
  }, []);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      console.log('✅ 拖拽结束');
      setIsDragging(false);
      setDraggedItem(null);
    }
  }, [isDragging]);

  const cancelDrag = useCallback(() => {
    setIsDragging(false);
    setDraggedItem(null);
  }, []);

  return {
    isDragging,
    draggedItem,
    handleMouseDown,
    handleMouseUp,
    cancelDrag,
  };
}
