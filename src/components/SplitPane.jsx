import { useState, useRef, useEffect } from 'react'
import './SplitPane.css'

function SplitPane({ children, mobileView }) {
    const [leftWidth, setLeftWidth] = useState(50) // percentage
    const [isDragging, setIsDragging] = useState(false)
    const containerRef = useRef(null)

    const MIN_WIDTH = 20 // minimum 20%
    const MAX_WIDTH = 80 // maximum 80%

    const handleMouseDown = (e) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleMouseMove = (e) => {
        if (!isDragging || !containerRef.current) return

        const container = containerRef.current
        const containerRect = container.getBoundingClientRect()
        const offsetX = e.clientX - containerRect.left
        const newLeftWidth = (offsetX / containerRect.width) * 100

        // Constrain to min/max
        const constrainedWidth = Math.min(Math.max(newLeftWidth, MIN_WIDTH), MAX_WIDTH)
        setLeftWidth(constrainedWidth)
    }

    const handleMouseUp = () => {
        setIsDragging(false)
    }

    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)
            document.body.style.cursor = 'col-resize'
            document.body.style.userSelect = 'none'
        } else {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
            document.body.style.cursor = ''
            document.body.style.userSelect = ''
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
            document.body.style.cursor = ''
            document.body.style.userSelect = ''
        }
    }, [isDragging])

    return (
        <div className={`split-pane ${mobileView ? `view-${mobileView}` : ''}`} ref={containerRef}>
            <div
                className="split-pane-left"
                style={{ width: `${leftWidth}%` }}
            >
                {children[0]}
            </div>

            <div
                className={`split-pane-divider ${isDragging ? 'dragging' : ''}`}
                onMouseDown={handleMouseDown}
            >
                <div className="divider-handle">
                    <div className="divider-dot"></div>
                    <div className="divider-dot"></div>
                    <div className="divider-dot"></div>
                    <div className="divider-dot"></div>
                    <div className="divider-dot"></div>
                    <div className="divider-dot"></div>
                    <div className="divider-dot"></div>
                    <div className="divider-dot"></div>
                </div>
            </div>

            <div
                className="split-pane-right"
                style={{ width: `${100 - leftWidth}%` }}
            >
                {children[1]}
            </div>
        </div>
    )
}

export default SplitPane
