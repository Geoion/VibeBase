import { useState, useCallback, useRef } from 'react';

/**
 * Custom drag-and-drop hook - Uses mouse events to simulate drag-and-drop (Tauri webview doesn't support HTML5 drag-and-drop)
 */
export function useDragDrop<T>() {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItem, setDraggedItem] = useState<T | null>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  const handleMouseDown = useCallback((item: T, e: React.MouseEvent) => {
    // Only respond to left button
    if (e.button !== 0) return;

    dragStartPos.current = { x: e.clientX, y: e.clientY };
    hasMoved.current = false;

    console.log('🖱️ Mouse down:', item);

    // Delay drag state setting to avoid accidental triggers
    const checkDrag = (moveEvent: MouseEvent) => {
      const deltaX = Math.abs(moveEvent.clientX - dragStartPos.current.x);
      const deltaY = Math.abs(moveEvent.clientY - dragStartPos.current.y);

      // Only consider as drag if moved more than 5 pixels
      if (deltaX > 5 || deltaY > 5) {
        if (!hasMoved.current) {
          hasMoved.current = true;
          setIsDragging(true);
          setDraggedItem(item);
          console.log('🚀 Drag started:', item);
        }
      }
    };

    const stopDrag = () => {
      document.removeEventListener('mousemove', checkDrag);
      document.removeEventListener('mouseup', stopDrag);

      if (!hasMoved.current) {
        // No movement, treat as click
        console.log('👆 Click (not dragged)');
      }
    };

    document.addEventListener('mousemove', checkDrag);
    document.addEventListener('mouseup', stopDrag);

    // Prevent default behavior (text selection, etc.)
    e.preventDefault();
  }, []);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      console.log('✅ Drag ended');
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

